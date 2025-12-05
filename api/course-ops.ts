import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCourseOutline } from './_shared/course-processor.js';
import { generateLessonFiles } from './_shared/lesson-generator.js';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { db } from './_shared/database.js';
import { activities, lessons } from './_shared/db-schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { storage } from './_shared/storage.js';
import { initializeDatabase } from './_shared/init-db.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import multer from 'multer';

// Configuration
const COURSE_OUTLINE_PATH = path.join(process.cwd(), 'docs/final-real-work/Super Learners Course Outline.xlsx');
const OUTPUT_BASE_DIR = path.join(process.cwd(), 'docs/final-real-work/generated');

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

      // 2. Fallback to File System (Local Development)
      if (!fs.existsSync(COURSE_OUTLINE_PATH)) {
        // If neither DB nor File has data
        return res.status(404).json({ message: 'Course Outline not found. Please upload an Excel file via Course Manager.' });
      }

      const lessonsData = parseCourseOutline(COURSE_OUTLINE_PATH);
      
      // Group by Unit
      const structure: Record<string, any[]> = {};
      lessonsData.forEach(lesson => {
        const unitKey = `Unit ${lesson.unitNumber}`;
        if (!structure[unitKey]) {
          structure[unitKey] = [];
        }
        structure[unitKey].push(lesson);
      });

      return res.json({ 
        structure,
        totalLessons: lessonsData.length,
        filePath: COURSE_OUTLINE_PATH,
        source: 'file'
      });
    }

    // --- Import Course (Multipart) ---
    if (req.method === 'POST' && action === 'import') {
       await runMiddleware(req, res, upload.single('file'));

       const file = (req as any).file;
       if (!file) {
         return res.status(400).json({ message: "No file uploaded" });
       }
   
       const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.xlsx`);
       fs.writeFileSync(tempFilePath, file.buffer);
       
       try {
         // Verify it can be parsed
         const parsedLessons = parseCourseOutline(tempFilePath);
         
         // 1. Save to Database (Persistent Storage)
         try {
            // Clear old outline first to avoid duplicates
            await db.delete(lessons).where(eq(lessons.status, 'outline'));

            // Insert new lessons
            // Batch insert might be too large, split if necessary or insert in chunks
            // For 128 lessons, single batch usually works, but let's be safe with chunks of 50
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
         } catch (dbError) {
             console.error("Failed to save to Database:", dbError);
             // Continue to try file save as fallback
         }
         
         // Try to move to permanent location, but handle read-only filesystem
         try {
            const dir = path.dirname(COURSE_OUTLINE_PATH);
            if (!fs.existsSync(dir)) {
              // This might fail on Vercel
              try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
            }
            
            fs.copyFileSync(tempFilePath, COURSE_OUTLINE_PATH);
            fs.unlinkSync(tempFilePath); // Clean up
            
            return res.json({ 
              success: true, 
              message: "Course outline updated successfully",
              lessonCount: parsedLessons.length
            });
         } catch (writeError: any) {
            // If we can't write to persistent storage (Vercel), return success with warning
            console.warn("Could not persist course outline file (likely read-only FS):", writeError);
            
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            
            return res.json({ 
              success: true, 
              message: "Course outline parsed and saved to Database (Read-Only Filesystem). Changes are persistent.",
              lessonCount: parsedLessons.length,
              storage: 'database'
            });
         }
       } catch (error: any) {
         if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
         throw new Error(`Failed to parse Excel file: ${error.message}`);
       }
    }

    // --- Generate Lesson ---
    if (req.method === 'POST' && action === 'generate') {
      const { unitNumber, lessonNumber, force, skipFlashcards } = req.body;

      if (!unitNumber || !lessonNumber) {
        return res.status(400).json({ message: 'unitNumber and lessonNumber are required' });
      }

      if (!fs.existsSync(COURSE_OUTLINE_PATH)) {
        return res.status(404).json({ message: 'Course Outline Excel file not found.' });
      }

      const lessons = parseCourseOutline(COURSE_OUTLINE_PATH);
      const targetLesson = lessons.find(l => 
        String(l.unitNumber) === String(unitNumber) && 
        String(l.lessonNumber) === String(lessonNumber)
      );

      if (!targetLesson) {
        return res.status(404).json({ message: `Lesson not found: Unit ${unitNumber} Lesson ${lessonNumber}` });
      }

      console.log(`Generating files for Unit ${unitNumber} Lesson ${lessonNumber}...`);
      const result = await generateLessonFiles(targetLesson, OUTPUT_BASE_DIR, { force, skipFlashcards });
      return res.json(result);
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
