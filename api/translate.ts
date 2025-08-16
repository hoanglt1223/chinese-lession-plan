import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateChineseToVietnamese } from './_shared/openai-services.js';
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
    const { words } = req.body;
    if (!words || !Array.isArray(words)) {
      return res.status(400).json({ message: "Words array is required" });
    }

    // Get DeepL translations
    const translations = await translateChineseToVietnamese(words);
    return res.json({ translations });
  } catch (error: any) {
    return handleError(res, error, 'Translation API');
  }
}
