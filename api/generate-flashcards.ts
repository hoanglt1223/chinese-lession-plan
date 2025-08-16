import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateFlashcards } from './_shared/openai-services';
import { setCorsHeaders, handleOptions } from './_shared/cors';
import { handleError } from './_shared/error-handler';
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
    const { vocabulary, theme, level, ageGroup } = req.body;
    if (!vocabulary || !Array.isArray(vocabulary)) {
      return res.status(400).json({ message: "Vocabulary array is required" });
    }

    const flashcards = await generateFlashcards(vocabulary, theme, level, ageGroup);
    
    // Add IDs to flashcards
    const flashcardsWithImages = flashcards.map((card) => ({
      ...card,
      id: randomUUID(),
      imageUrl: card.imageUrl || "https://via.placeholder.com/400x300?text=No+Image"
    }));

    return res.json({ flashcards: flashcardsWithImages });
  } catch (error: any) {
    return handleError(res, error, 'Generate flashcards API');
  }
}
