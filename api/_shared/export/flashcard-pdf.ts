import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../cors.js';
import { handleError } from '../error-handler.js';
import { serverlessPDFService } from '../serverless-pdf-service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { flashcards } = req.body;
    
    if (!flashcards || !Array.isArray(flashcards)) {
      return res.status(400).json({ message: 'Flashcards array is required' });
    }

    if (flashcards.length === 0) {
      return res.status(400).json({ message: 'At least one flashcard is required' });
    }

    console.log(`Generating PDF for ${flashcards.length} flashcards`);

    // Generate the filled PDF
    const pdfBuffer = await serverlessPDFService.generateFlashcardPDF({
      flashcards
    });

    // Generate filename with timestamp
    const timestamp = Date.now();
    const filename = `Flashcard_${timestamp}.pdf`;
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log(`Generated flashcard PDF: ${filename} (${pdfBuffer.length} bytes)`);
    
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Flashcard PDF generation error:', error);
    return handleError(res, error, 'Flashcard PDF Export API');
  }
} 