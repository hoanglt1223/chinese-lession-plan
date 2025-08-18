import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateFlashcards } from './_shared/openai-services.js';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { randomUUID } from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vocabulary, theme, level, ageGroup, aiModel, photoSource } = req.body;
    if (!vocabulary || !Array.isArray(vocabulary)) {
      return res.status(400).json({ message: "Vocabulary array is required" });
    }

    const flashcards = await generateFlashcards(vocabulary, theme, level, ageGroup, aiModel, photoSource);
    
    // Add IDs to flashcards
    const flashcardsWithImages = flashcards.map((card) => ({
      ...card,
      id: randomUUID(),
      imageUrl: card.imageUrl || ""
    }));

    return res.json({ flashcards: flashcardsWithImages });
  } catch (error: any) {
    return handleError(res, error, 'Generate flashcards API');
  }
}
