import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzePDFContent } from './_shared/openai-services.js';
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
    const { content, aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    console.log(`Starting AI analysis with model: ${aiModel}`);
    
    const analysis = await analyzePDFContent(content, aiModel, outputLanguage);
    console.log(`Analysis completed with model: ${aiModel}`);
    
    return res.json(analysis);
  } catch (error: any) {
    if (error?.message?.includes('timeout') || error?.message?.includes('ECONNRESET')) {
      return res.status(408).json({ message: "AI analysis timed out. Please try again with a shorter document." });
    }
    return handleError(res, error, 'Analysis API');
  }
}
