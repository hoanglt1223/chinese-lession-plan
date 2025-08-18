import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateLessonPlan } from './_shared/openai-services.js';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { analysis, ageGroup, aiModel } = req.body;
    if (!analysis) {
      return res.status(400).json({ message: "Analysis data is required" });
    }

    const result = await generateLessonPlan(analysis, ageGroup || "preschool", aiModel);
    
    return res.json({ 
      lessonPlans: result.individualLessons, // Individual lesson files
      fullPlan: result.fullPlan // Full plan for reference
    });
  } catch (error: any) {
    return handleError(res, error, 'Generate plan API');
  }
}
