import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../_shared/storage.js';
import { setCorsHeaders, handleOptions } from '../../_shared/cors.js';
import { handleError } from '../../_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    const { lessonId } = req.query;
    
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ message: 'Lesson ID is required' });
    }

    switch (req.method) {
      case 'GET':
        const workflow = await storage.getWorkflowByLessonId(lessonId);
        if (!workflow) {
          return res.status(404).json({ message: "Workflow not found" });
        }
        return res.json(workflow);

      case 'PUT':
        const updatedWorkflow = await storage.updateWorkflow(lessonId, req.body);
        if (!updatedWorkflow) {
          return res.status(404).json({ message: "Workflow not found" });
        }
        return res.json(updatedWorkflow);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    return handleError(res, error, 'Workflow by lesson ID API');
  }
}
