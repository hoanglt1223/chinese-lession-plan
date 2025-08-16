import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_shared/storage';
import { setCorsHeaders, handleOptions } from '../_shared/cors';
import { handleError } from '../_shared/error-handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Lesson ID is required' });
    }

    switch (req.method) {
      case 'GET':
        const lesson = await storage.getLesson(id);
        if (!lesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        return res.json(lesson);

      case 'PUT':
        const updatedLesson = await storage.updateLesson(id, req.body);
        if (!updatedLesson) {
          return res.status(404).json({ message: "Lesson not found" });
        }
        return res.json(updatedLesson);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    return handleError(res, error, 'Lesson by ID API');
  }
}
