import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cronjobService } from './_shared/cronjob-service.js';
import { db } from './_shared/database.js';
import { lessons } from './_shared/db-schema.js';
import { eq } from 'drizzle-orm';
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
import { CourseLesson } from './_shared/course-processor.js';

// Vercel Cron Job handler - this endpoint is called by Vercel's cron scheduler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow scheduled requests from Vercel
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting scheduled cron job execution...');

    // Get all active cronjobs that are due to run
    const now = new Date();
    const jobs = await cronjobService.getAllJobs();

    const jobsToRun = jobs.filter(job =>
      job.status === 'pending' &&
      job.nextRun &&
      new Date(job.nextRun) <= now
    );

    console.log(`Found ${jobsToRun.length} jobs to run`);

    for (const job of jobsToRun) {
      try {
        console.log(`Starting job: ${job.name} (${job.id})`);

        // Update job status to running
        await cronjobService.updateJobStatus(job.id, 'running');

        // Get course outline
        const courseLessons = await db.select().from(lessons).where(eq(lessons.status, 'outline'));

        if (courseLessons.length === 0) {
          console.log(`No course outline found for job: ${job.name}`);
          await cronjobService.updateJobStatus(job.id, 'failed');
          continue;
        }

        const lessonsData: CourseLesson[] = courseLessons.map((row: any) => row.aiAnalysis as CourseLesson);
        const lessonsByUnit = groupLessonsByUnit(lessonsData);

        // Process lessons in parallel (import from main cronjob file)
        await processLessonsInParallel(lessonsByUnit, job.options, job.id);

        console.log(`Completed job: ${job.name} (${job.id})`);

      } catch (error) {
        console.error(`Job ${job.name} (${job.id}) failed:`, error);
        await cronjobService.updateJobStatus(job.id, 'failed');
      }
    }

    return res.status(200).json({
      message: 'Cron jobs executed successfully',
      jobsRun: jobsToRun.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job execution failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Reuse the parallel processing function from main cronjob
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

// Process individual lesson (reuse from main cronjob)
async function processLesson(
  lesson: CourseLesson,
  jobOptions: any,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import services dynamically to avoid circular dependencies
    const { generateSingleLessonPlan, generateFlashcards } = await import('./_shared/openai-services.js');
    const { sql } = await import('drizzle-orm');

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