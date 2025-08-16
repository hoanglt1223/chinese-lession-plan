import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertLessonSchema } from '../_shared/schema';
import { storage } from '../_shared/storage';
import { setCorsHeaders, handleOptions } from '../_shared/cors';
import { handleError } from '../_shared/error-handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    switch (req.method) {
      case 'GET':
        // Get all lessons
        const lessons = await storage.getAllLessons();
        return res.json(lessons);

      case 'POST':
        // Create new lesson
        const validatedData = insertLessonSchema.parse(req.body);
        const lesson = await storage.createLesson(validatedData);
        
        // Create associated workflow
        const workflow = await storage.createWorkflow({
          lessonId: lesson.id,
          currentStep: 0,
          stepData: {},
          completedSteps: []
        });

        return res.json({ lesson, workflow });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    return handleError(res, error, 'Lessons API');
  }
}
