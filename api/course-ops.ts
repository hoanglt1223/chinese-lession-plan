import 'dotenv/config';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseCourseOutline } from './_shared/course-processor.js';
import { generateLessonFiles } from './_shared/lesson-generator.js';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { db } from './_shared/database.js';
import { activities } from './_shared/db-schema.js';
import { eq, desc } from 'drizzle-orm';
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
  try {
    await initializeDatabase();
  } catch (e) {
    console.error("DB Init failed", e);
  }

  const action = (req.query.action as string) || (req.body && (req.body as any).action) || 'unknown';

  try {
    // --- Course Structure ---
    if (req.method === 'GET' && action === 'structure') {
      if (!fs.existsSync(COURSE_OUTLINE_PATH)) {
        return res.status(404).json({ message: 'Course Outline Excel file not found at configured path.' });
      }

      const lessons = parseCourseOutline(COURSE_OUTLINE_PATH);
      
      // Group by Unit
      const structure: Record<string, any[]> = {};
      lessons.forEach(lesson => {
        const unitKey = `Unit ${lesson.unitNumber}`;
        if (!structure[unitKey]) {
          structure[unitKey] = [];
        }
        structure[unitKey].push(lesson);
      });

      return res.json({ 
        structure,
        totalLessons: lessons.length,
        filePath: COURSE_OUTLINE_PATH
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
         const lessons = parseCourseOutline(tempFilePath);
         
         // If successful, move to permanent location
         const dir = path.dirname(COURSE_OUTLINE_PATH);
         if (!fs.existsSync(dir)) {
           fs.mkdirSync(dir, { recursive: true });
         }
         
         fs.copyFileSync(tempFilePath, COURSE_OUTLINE_PATH);
         fs.unlinkSync(tempFilePath); // Clean up
         
         return res.json({ 
           success: true, 
           message: "Course outline updated successfully",
           lessonCount: lessons.length
         });
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
