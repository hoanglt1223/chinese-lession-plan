import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateSummary } from './_shared/openai-services.js';
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
    const { lessonPlan, vocabulary } = req.body;
    if (!lessonPlan) {
      return res.status(400).json({ message: "Lesson plan is required" });
    }

    const result = await generateSummary(lessonPlan, vocabulary || []);
    
    return res.json({ 
      summaries: result.individualSummaries, // Individual summary files
      fullSummary: result.fullSummary // Full summary for reference
    });
  } catch (error: any) {
    return handleError(res, error, 'Generate summary API');
  }
}
