import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../cors.js';
import { handleError } from '../error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { flashcards, analysisData, step } = req.body;
    
    // For now, create a simple PDF content string
    let pdfContent = '';
    
    if (step === 1 && analysisData) {
      // Export analyzed results for Step 1
      pdfContent = `# Analysis Results\n\n`;
      pdfContent += `**Detected Level:** ${analysisData.detectedLevel || 'N/A'}\n`;
      pdfContent += `**Age Appropriate:** ${analysisData.ageAppropriate || 'N/A'}\n`;
      pdfContent += `**Main Theme:** ${analysisData.mainTheme || 'N/A'}\n\n`;
      
      if (analysisData.vocabulary && analysisData.vocabulary.length > 0) {
        pdfContent += `**Vocabulary:**\n`;
        analysisData.vocabulary.forEach((word: string) => {
          pdfContent += `- ${word}\n`;
        });
        pdfContent += '\n';
      }
      
      if (analysisData.activities && analysisData.activities.length > 0) {
        pdfContent += `**Learning Activities:**\n`;
        analysisData.activities.forEach((activity: string) => {
          pdfContent += `- ${activity}\n`;
        });
      }
    } else if (flashcards && flashcards.length > 0) {
      // Export flashcards for Step 3
      pdfContent = `# Flashcards\n\n`;
      flashcards.forEach((card: any, index: number) => {
        pdfContent += `**Card ${index + 1}: ${card.word}**\n`;
        pdfContent += `Pinyin: ${card.pinyin || 'N/A'}\n`;
        pdfContent += `Translation: ${card.translation || 'N/A'}\n`;
        pdfContent += `Example: ${card.example || 'N/A'}\n`;
        if (card.imageUrl) {
          pdfContent += `Image: ${card.imageUrl}\n`;
        }
        pdfContent += '\n---\n\n';
      });
    } else {
      pdfContent = '# Export Content\n\nNo content available for export.';
    }

    // Create a simple PDF-like response (for now, just return as text)
    // In a real implementation, you would use a PDF generation library like puppeteer or PDFKit
    const timestamp = Date.now();
    const filename = step === 1 ? `analysis_${timestamp}.pdf` : `flashcards_${timestamp}.pdf`;
    
    // For now, return the content as a text file with PDF extension
    const buffer = Buffer.from(pdfContent, 'utf-8');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.send(buffer);
  } catch (error: any) {
    return handleError(res, error, 'PDF Export API');
  }
}
