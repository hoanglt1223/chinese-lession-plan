import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import path from 'path';
import { parseCourseOutline } from './_shared/course-processor.js';
import { generateSingleLessonPlan, generateFlashcards } from './_shared/openai-services.js';
import { createLessonPlanDocx, createFlashcardPdf } from './_shared/document-generator.js';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { blobStorage } from './_shared/blob-storage.js';
import { db } from './_shared/database.js';
import { activities, lessons } from './_shared/db-schema.js';

// Define course outline path
const COURSE_OUTLINE_PATH = process.env.COURSE_OUTLINE_PATH || path.join(process.cwd(), 'course-outline.json');
import { eq, desc, sql } from 'drizzle-orm';
import { storage } from './_shared/storage.js';
import { initializeDatabase } from './_shared/init-db.js';
import multer from 'multer';

// Configuration - Removed file paths for serverless compatibility

// Multer Setup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Initialize DB if needed (for lessons/activities)
  // We can do this lazily or here. Doing it here for safety.
  /*
  try {
    await initializeDatabase();
  } catch (e) {
    console.error("DB Init failed", e);
  }
  */

  const action = (req.query.action as string) || (req.body && (req.body as any).action) || 'unknown';

  try {
    // --- Course Structure ---
    if (req.method === 'GET' && action === 'structure') {
      // 1. Try to fetch from Database first (Serverless/Production)
      try {
        const dbLessons = await db.select().from(lessons).where(eq(lessons.status, 'outline'));
        
        if (dbLessons.length > 0) {
           // Reconstruct structure from DB
           const structure: Record<string, any[]> = {};
           let totalLessons = 0;

           dbLessons.forEach((row: { aiAnalysis: any; }) => {
             const lessonData = row.aiAnalysis as any; // Store full CourseLesson in aiAnalysis
             if (lessonData && lessonData.unitNumber) {
               const unitKey = `Unit ${lessonData.unitNumber}`;
               if (!structure[unitKey]) {
                 structure[unitKey] = [];
               }
               structure[unitKey].push(lessonData);
               totalLessons++;
             }
           });

           // Sort lessons within units
           Object.keys(structure).forEach(unit => {
             structure[unit].sort((a, b) => {
               const nA = parseInt(String(a.lessonNumber).match(/\d+/)?.[0] || '0');
               const nB = parseInt(String(b.lessonNumber).match(/\d+/)?.[0] || '0');
               return nA - nB;
             });
           });

           return res.json({ 
             structure,
             totalLessons,
             source: 'database'
           });
        }
      } catch (e) {
        console.warn("Failed to fetch from DB, falling back to file:", e);
      }

      // 2. If no data in database, return empty structure instead of 404
      // This prevents frontend error state and allows user to see the Upload button
      return res.json({
        structure: {},
        totalLessons: 0,
        source: 'none',
        message: 'No course outline found. Please upload an Excel file.'
      });
    }

    // --- Import Course (Multipart) ---
    if (req.method === 'POST' && action === 'import') {
       await runMiddleware(req, res, upload.single('file'));

       const file = (req as any).file;
       if (!file) {
         return res.status(400).json({ message: "No file uploaded" });
       }
   
       try {
         // Verify it can be parsed directly from buffer
         const parsedLessons = parseCourseOutline(file.buffer);
         
         if (!parsedLessons || parsedLessons.length === 0) {
            throw new Error("No lessons found in the uploaded Excel file");
         }

         let dbSuccess = false;

         // 1. Save to Database (Persistent Storage)
         try {
            // Clear old outline first to avoid duplicates
            await db.delete(lessons).where(eq(lessons.status, 'outline'));

            // Insert new lessons
            const chunkSize = 50;
            for (let i = 0; i < parsedLessons.length; i += chunkSize) {
                const chunk = parsedLessons.slice(i, i + chunkSize);
                await db.insert(lessons).values(chunk.map(l => ({
                    title: l.title || `Lesson ${l.lessonNumber}`,
                    level: l.level || 'N1',
                    ageGroup: l.ageGroup || 'Primary',
                    status: 'outline',
                    aiAnalysis: l as any, // Store full object
                    originalFiles: null,
                    lessonPlans: null,
                    flashcards: null,
                    summaries: null
                })));
            }
            console.log(`Saved ${parsedLessons.length} lessons to Database`);
            dbSuccess = true;
         } catch (dbError) {
             console.error("Failed to save to Database:", dbError);
             // We continue to try file save, but mark DB as failed
         }
         
         if (!dbSuccess) {
             return res.status(500).json({
                 message: "Failed to save course outline to Database. Please check database configuration."
             });
         }

         return res.json({
            success: true,
            message: "Course outline saved to Database successfully.",
            lessonCount: parsedLessons.length,
            storage: 'database'
         });

       } catch (error: any) {
         console.error("Import error:", error);
         return res.status(500).json({ message: `Failed to process Excel file: ${error.message}` });
       }
    }

    // --- Generate Lesson ---
    if (req.method === 'POST' && action === 'generate') {
      const { unitNumber, lessonNumber, force, skipFlashcards } = req.body;

      if (!unitNumber || !lessonNumber) {
        return res.status(400).json({ message: 'unitNumber and lessonNumber are required' });
      }

      let targetLesson: any = null;
      let lessonDbRecord: any = null;

      // 1. Try to find in Database
      try {
        const dbLessons = await db.select().from(lessons).where(
            sql`ai_analysis->>'unitNumber' = ${String(unitNumber)} AND ai_analysis->>'lessonNumber' = ${String(lessonNumber)}`
        ).limit(1);
        
        if (dbLessons.length > 0) {
            lessonDbRecord = dbLessons[0];
            targetLesson = lessonDbRecord.aiAnalysis;
        }
      } catch (dbError) {
          console.warn("DB lookup for lesson failed:", dbError);
      }

      // 2. Fallback to File
      if (!targetLesson && fs.existsSync(COURSE_OUTLINE_PATH)) {
        const allLessons = parseCourseOutline(COURSE_OUTLINE_PATH);
        targetLesson = allLessons.find(l => 
          String(l.unitNumber) === String(unitNumber) && 
          String(l.lessonNumber) === String(lessonNumber)
        );
      }

      if (!targetLesson) {
        return res.status(404).json({ message: `Lesson not found: Unit ${unitNumber} Lesson ${lessonNumber}` });
      }

      console.log(`Generating content for Unit ${unitNumber} Lesson ${lessonNumber}...`);
      const MODEL_NAME = 'GLM-4.6';
      const results: { plan?: string; flashcards?: string; error?: string; storage?: string } = { storage: 'database' };

      try {
          // A. Generate Lesson Plan
          let planContent = "";
          let docxBuffer: Buffer | null = null;
          
          // Check if already exists in DB and not forced
          if (lessonDbRecord && lessonDbRecord.lessonPlans && lessonDbRecord.lessonPlans.length > 0 && !force) {
              results.plan = 'skipped (exists in DB)';
              planContent = lessonDbRecord.lessonPlans[0].content;
          } else {
              // Generate new
              planContent = await generateSingleLessonPlan(targetLesson, MODEL_NAME);
              docxBuffer = await createLessonPlanDocx(targetLesson, planContent);
              results.plan = 'generated';
              (results as any).docx = docxBuffer.toString('base64'); // Add this line to return DOCX
          }

          // B. Generate Flashcards
          let flashcardsData: any[] = [];
          let pdfBuffer: Buffer | null = null;

          if (!skipFlashcards && targetLesson.vocabulary && targetLesson.vocabulary.length > 0) {
              if (lessonDbRecord && lessonDbRecord.flashcards && lessonDbRecord.flashcards.length > 0 && !force) {
                  results.flashcards = 'skipped (exists in DB)';
                  flashcardsData = lessonDbRecord.flashcards;
              } else {
                  // Generate new
                  flashcardsData = await generateFlashcards(
                      targetLesson.vocabulary,
                      targetLesson.title || `Lesson ${targetLesson.lessonNumber}`,
                      targetLesson.level || 'Beginner',
                      targetLesson.ageGroup || 'Preschool',
                      MODEL_NAME,
                      'api'
                  );
                  if (flashcardsData.length > 0) {
                      pdfBuffer = await createFlashcardPdf(flashcardsData);
                      results.flashcards = 'generated';
                  } else {
                      results.flashcards = 'no data';
                  }
              }
          }

          // C. Save to Database
          if (results.plan === 'generated' || results.flashcards === 'generated') {
              const updateData: any = { updatedAt: new Date() };
              
              if (results.plan === 'generated') {
                  updateData.lessonPlans = [{
                      content: planContent,
                      docx: docxBuffer ? docxBuffer.toString('base64') : null, // Store as base64 if needed, or just content
                      createdAt: new Date().toISOString()
                  }];
              }
              
              if (results.flashcards === 'generated') {
                  updateData.flashcards = flashcardsData;
                  // We might want to store PDF binary too if schema allows, but currently schema defines jsonb
                  // We can store PDF as base64 string inside the JSON or just regenerate on demand
              }

              if (lessonDbRecord) {
                  await db.update(lessons)
                      .set(updateData)
                      .where(eq(lessons.id, lessonDbRecord.id));
              } else {
                  // Create new record if it came from file but wasn't in DB
                  await db.insert(lessons).values({
                      title: targetLesson.title || `Lesson ${targetLesson.lessonNumber}`,
                      level: targetLesson.level || 'N1',
                      ageGroup: targetLesson.ageGroup || 'Primary',
                      status: 'plan',
                      aiAnalysis: targetLesson,
                      lessonPlans: updateData.lessonPlans || null,
                      flashcards: updateData.flashcards || null
                  });
              }
          }

          return res.json({ 
              success: true, 
              results,
              lesson: {
                  ...targetLesson,
                  hasPlan: !!planContent,
                  hasFlashcards: flashcardsData.length > 0
              }
          });

      } catch (genError: any) {
          console.error("Generation failed:", genError);
          return res.status(500).json({ message: `Generation failed: ${genError.message}` });
      }
    }

    // --- Delete Course ---
    if (req.method === 'POST' && action === 'delete-course') {
      try {
        // Delete all lessons with status 'outline' (and potentially others if we want to clear everything)
        // For now, let's just clear the outline and associated plans to "reset" the course
        await db.delete(lessons).where(eq(lessons.status, 'outline'));
        
        // Also delete the physical file if it exists
        if (fs.existsSync(COURSE_OUTLINE_PATH)) {
          fs.unlinkSync(COURSE_OUTLINE_PATH);
        }

        return res.json({ success: true, message: "Course deleted successfully" });
      } catch (error: any) {
        return res.status(500).json({ message: `Failed to delete course: ${error.message}` });
      }
    }

    // --- Activities ---
    if (req.method === 'GET' && action === 'activities') {
      const allActivities = await db.select().from(activities).orderBy(desc(activities.createdAt));
      return res.json(allActivities);
    }

    if (req.method === 'POST' && action === 'create-activity') {
      const { name, type, description, instructions, duration, ageGroup, materials, benefits } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Activity name is required" });
      }

      // Check if exists
      const existing = await db.select().from(activities).where(eq(activities.name, name));
      if (existing.length > 0) {
        return res.status(409).json({ message: "Activity with this name already exists" });
      }

      const [newActivity] = await db.insert(activities).values({
        name,
        type: type || 'game',
        description,
        instructions,
        duration,
        ageGroup,
        materials,
        benefits
      }).returning();

      return res.status(201).json(newActivity);
    }

    // --- Lessons (DB) ---
    if (req.method === 'GET' && action === 'lessons') {
      const { id } = req.query;
      if (id && typeof id === 'string') {
        const lesson = await storage.getLesson(id);
        if (!lesson) return res.status(404).json({ message: "Lesson not found" });
        return res.json(lesson);
      } else {
        const lessons = await storage.getAllLessons();
        return res.json(lessons);
      }
    }

    if (req.method === 'POST' && action === 'update-lesson') {
       const { lessonId, ...data } = req.body;
       if (!lessonId) return res.status(400).json({ message: "lessonId required" });
       const updatedLesson = await storage.updateLesson(lessonId, data);
       return res.json(updatedLesson);
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });

  } catch (error: any) {
    return handleError(res, error, `Course API (${action})`);
  }
}
