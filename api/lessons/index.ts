import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertLessonSchema } from '../_shared/schema.js';
import { storage } from '../_shared/storage.js';
import { setCorsHeaders, handleOptions } from '../_shared/cors.js';
import { handleError } from '../_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    switch (req.method) {
      case 'GET':
        // Check if this is a request for a specific lesson
        const { id } = req.query;
        
        if (id && typeof id === 'string') {
          // Get specific lesson by ID
          const lesson = await storage.getLesson(id);
          if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          return res.json(lesson);
        } else {
          // Get all lessons
          const lessons = await storage.getAllLessons();
          return res.json(lessons);
        }

      case 'POST':
        // Check if this is a create or get/update operation
        const { action, lessonId, ...data } = req.body;
        
        if (action === 'get' && lessonId) {
          // Get specific lesson by ID from body
          const lesson = await storage.getLesson(lessonId);
          if (!lesson) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          return res.json(lesson);
        } else if (action === 'update' && lessonId) {
          // Update specific lesson
          const updatedLesson = await storage.updateLesson(lessonId, data);
          if (!updatedLesson) {
            return res.status(404).json({ message: "Lesson not found" });
          }
          return res.json(updatedLesson);
        } else {
          // Create new lesson
          const validatedData = insertLessonSchema.parse(data);
          const lesson = await storage.createLesson(validatedData);
          return res.json({ lesson });
        }

      case 'PUT':
        // Update lesson using body
        const { id: updateId, ...updateData } = req.body;
        if (!updateId) {
          return res.status(400).json({ message: 'Lesson ID is required' });
        }
        
        const updatedLesson = await storage.updateLesson(updateId, updateData);
        if (!updatedLesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        return res.json(updatedLesson);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    return handleError(res, error, 'Lessons API');
  }
}
