import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { db } from './_shared/database.js';
import { lessons } from './_shared/db-schema.js';
import { eq, sql } from 'drizzle-orm';
import { CourseLesson, parseCourseOutline } from './_shared/course-processor.js';
import { generateSingleLessonPlan, generateFlashcards } from './_shared/openai-services.js';
import { createLessonPlanDocx, createFlashcardPdf } from './_shared/document-generator.js';
import { cronjobService } from './_shared/cronjob-service.js';


// Helper function to group lessons by unit for parallel processing
function groupLessonsByUnit(lessons: CourseLesson[]): Record<string, CourseLesson[]> {
  const grouped: Record<string, CourseLesson[]> = {};

  lessons.forEach(lesson => {
    const unitKey = `Unit ${lesson.unitNumber}`;
    if (!grouped[unitKey]) {
      grouped[unitKey] = [];
    }
    grouped[unitKey].push(lesson);
  });

  // Sort lessons within each unit
  Object.keys(grouped).forEach(unit => {
    grouped[unit].sort((a, b) => {
      const nA = parseInt(String(a.lessonNumber).match(/\d+/)?.[0] || '0');
      const nB = parseInt(String(b.lessonNumber).match(/\d+/)?.[0] || '0');
      return nA - nB;
    });
  });

  return grouped;
}

// Process individual lesson
async function processLesson(
  lesson: CourseLesson,
  jobOptions: any,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update status to processing
    await cronjobService.upsertLessonStatus(
      jobId,
      lesson.unitNumber,
      lesson.lessonNumber,
      lesson.title,
      'processing',
      0
    );

    // Check if lesson already exists in database
    const existingLesson = await db.select().from(lessons).where(
      sql`ai_analysis->>'unitNumber' = ${String(lesson.unitNumber)} AND ai_analysis->>'lessonNumber' = ${String(lesson.lessonNumber)}`
    ).limit(1);

    const hasExistingPlan = existingLesson.length > 0 &&
                          existingLesson[0].lessonPlans &&
                          existingLesson[0].lessonPlans.length > 0;

    // Skip if already exists and option is set
    if (jobOptions.skipExisting && hasExistingPlan) {
      await cronjobService.upsertLessonStatus(
        jobId,
        lesson.unitNumber,
        lesson.lessonNumber,
        lesson.title,
        'completed',
        100
      );
      return { success: true };
    }

    const MODEL_NAME = 'GLM-4.6';

    // Update progress
    await cronjobService.upsertLessonStatus(
      jobId,
      lesson.unitNumber,
      lesson.lessonNumber,
      lesson.title,
      'processing',
      20
    );

    // Generate lesson plan
    const planContent = await generateSingleLessonPlan(lesson, MODEL_NAME);

    // Update progress
    await cronjobService.upsertLessonStatus(
      jobId,
      lesson.unitNumber,
      lesson.lessonNumber,
      lesson.title,
      'processing',
      50
    );

    // Generate flashcards if vocabulary exists and not skipped
    let flashcardsData: any[] = [];
    if (!jobOptions.skipFlashcards && lesson.vocabulary && lesson.vocabulary.length > 0) {
      flashcardsData = await generateFlashcards(
        lesson.vocabulary,
        lesson.title,
        lesson.level || 'Beginner',
        lesson.ageGroup || 'Preschool',
        MODEL_NAME,
        'api'
      );
    }

    // Update progress
    await cronjobService.upsertLessonStatus(
      jobId,
      lesson.unitNumber,
      lesson.lessonNumber,
      lesson.title,
      'processing',
      80
    );

    // Save to database
    const updateData: any = {
      updatedAt: new Date(),
      lessonPlans: [{
        content: planContent,
        createdAt: new Date().toISOString()
      }]
    };

    if (flashcardsData.length > 0) {
      updateData.flashcards = flashcardsData;
      updateData.status = 'completed';
    } else {
      updateData.status = 'plan';
    }

    if (existingLesson.length > 0) {
      await db.update(lessons)
        .set(updateData)
        .where(eq(lessons.id, existingLesson[0].id));
    } else {
      await db.insert(lessons).values({
        title: lesson.title,
        level: lesson.level || 'N1',
        ageGroup: lesson.ageGroup || 'Primary',
        status: updateData.status,
        aiAnalysis: lesson,
        lessonPlans: updateData.lessonPlans,
        flashcards: updateData.flashcards || null
      });
    }

    // Mark as completed
    await cronjobService.upsertLessonStatus(
      jobId,
      lesson.unitNumber,
      lesson.lessonNumber,
      lesson.title,
      'completed',
      100
    );

    return { success: true };

  } catch (error: any) {
    console.error(`Failed to process lesson ${lesson.unitNumber}-${lesson.lessonNumber}:`, error);

    // Mark as failed
    await cronjobService.upsertLessonStatus(
      jobId,
      lesson.unitNumber,
      lesson.lessonNumber,
      lesson.title,
      'failed',
      0,
      error.message
    );

    return { success: false, error: error.message };
  }
}

// Process lessons in parallel with concurrency control
async function processLessonsInParallel(
  lessonsByUnit: Record<string, CourseLesson[]>,
  jobOptions: any,
  jobId: string
): Promise<void> {
  const job = await cronjobService.getJob(jobId);
  if (!job) throw new Error('Job not found');

  await cronjobService.updateJobStatus(jobId, 'running');

  let processedCount = 0;
  let failedCount = 0;

  // Create processing queue for all lessons
  const allLessons: (CourseLesson & { unitKey: string })[] = [];
  Object.entries(lessonsByUnit).forEach(([unitKey, unitLessons]) => {
    unitLessons.forEach(lesson => {
      allLessons.push({ ...lesson, unitKey });
    });
  });

  // Process with concurrency control
  const maxConcurrent = jobOptions.maxConcurrent;
  const chunks: typeof allLessons[] = [];

  for (let i = 0; i < allLessons.length; i += maxConcurrent) {
    chunks.push(allLessons.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    // Process lessons in this chunk in parallel
    const promises = chunk.map(async (lesson) => {
      const result = await processLesson(lesson, jobOptions, jobId);
      if (result.success) {
        processedCount++;
      } else {
        failedCount++;
      }
    });

    await Promise.allSettled(promises);

    // Update job progress
    await cronjobService.updateJobProgress(jobId, processedCount, failedCount);
  }

  // Update final job status
  const finalStatus = failedCount === 0 ? 'completed' : 'failed';
  await cronjobService.updateJobStatus(jobId, finalStatus);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const action = (req.query.action as string) || (req.body && (req.body as any).action) || 'unknown';

  try {
    // --- Get all cronjobs ---
    if (req.method === 'GET' && action === 'jobs') {
      const jobs = await cronjobService.getAllJobs();
      return res.json(jobs);
    }

    // --- Get job statuses ---
    if (req.method === 'GET' && action === 'statuses') {
      const { jobId } = req.query;
      const statuses = await cronjobService.getJobStatuses(jobId as string);
      return res.json(statuses);
    }

    // --- Create new cronjob ---
    if (req.method === 'POST' && action === 'create') {
      const { name, schedule, options = {} } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Job name is required' });
      }

      const jobOptions = {
        skipExisting: options.skipExisting ?? true,
        skipFlashcards: options.skipFlashcards ?? false,
        maxConcurrent: options.maxConcurrent ?? 3,
        retryFailures: options.retryFailures ?? true
      };

      try {
        const job = await cronjobService.createJob(
          name,
          schedule || '0 * * * *', // Default to every hour
          jobOptions
        );

        return res.status(201).json(job);
      } catch (error: any) {
        return res.status(404).json({ message: error.message });
      }
    }

    // --- Run cronjob manually ---
    if (req.method === 'POST' && action === 'run') {
      const { jobId } = req.body;

      if (!jobId) {
        return res.status(400).json({ message: 'jobId is required' });
      }

      const job = await cronjobService.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.status === 'running') {
        return res.status(409).json({ message: 'Job is already running' });
      }

      // Get course outline
      const courseLessonsRows = await db.select().from(lessons).where(eq(lessons.status, 'outline'));
      const courseLessons: CourseLesson[] = courseLessonsRows.map((row: any) => row.aiAnalysis as CourseLesson);

      // Group lessons by unit
      const lessonsByUnit = groupLessonsByUnit(courseLessons);

      // Start processing in background (don't await for response)
      processLessonsInParallel(lessonsByUnit, job.options, jobId)
        .catch(error => {
          console.error(`Job ${jobId} failed:`, error);
          cronjobService.updateJobStatus(jobId, 'failed');
        });

      return res.json({
        message: 'Job started',
        jobId,
        totalUnits: Object.keys(lessonsByUnit).length,
        totalLessons: courseLessons.length
      });
    }

    // --- Pause/Resume job ---
    if (req.method === 'POST' && action === 'pause') {
      const { jobId } = req.body;

      if (!jobId) {
        return res.status(400).json({ message: 'jobId is required' });
      }

      const job = await cronjobService.getJob(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.status === 'running') {
        await cronjobService.updateJobStatus(jobId, 'paused');
      }

      const updatedJob = await cronjobService.getJob(jobId);
      return res.json(updatedJob);
    }

    // --- Delete job ---
    if (req.method === 'DELETE' && action === 'delete') {
      const { jobId } = req.query;

      if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ message: 'jobId is required' });
      }

      try {
        await cronjobService.deleteJob(jobId);
        return res.json({ message: 'Job deleted successfully' });
      } catch (error) {
        return res.status(404).json({ message: 'Job not found' });
      }
    }

    // --- Get job statistics ---
    if (req.method === 'GET' && action === 'stats') {
      const { jobId } = req.query;
      const stats = await cronjobService.getJobStats(jobId as string);
      return res.json(stats);
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });

  } catch (error: any) {
    return handleError(res, error, `Cronjob API (${action})`);
  }
}