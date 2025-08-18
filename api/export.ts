import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';

// Import the individual export handlers
import flashcardPdfHandler from './_shared/export/flashcard-pdf.js';
import docxHandler from './_shared/export/docx.js';
import pdfHandler from './_shared/export/pdf.js';
import { serverlessPDFService } from './_shared/serverless-pdf-service.js';

export type DocumentType = 'flashcard-pdf' | 'docx' | 'pdf' | 'chinese-text-image' | 'chinese-text-pdf';

export interface ExportRequest {
  documentType: DocumentType;
  [key: string]: any; // Allow additional properties based on document type
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { documentType, ...requestData } = req.body as ExportRequest;
    
    if (!documentType) {
      return res.status(400).json({ 
        message: 'documentType is required. Must be one of: flashcard-pdf, docx, pdf, chinese-text-image, chinese-text-pdf' 
      });
    }

    // Validate documentType
    const validTypes: DocumentType[] = ['flashcard-pdf', 'docx', 'pdf', 'chinese-text-image', 'chinese-text-pdf'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ 
        message: `Invalid documentType: ${documentType}. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    console.log(`Processing export request for documentType: ${documentType}`);

    // Temporarily modify the request body for the handlers
    const originalBody = req.body;
    req.body = requestData;

    // Route to the appropriate handler based on documentType
    let result;
    try {
      switch (documentType) {
        case 'flashcard-pdf':
          result = await flashcardPdfHandler(req, res);
          break;
          
        case 'docx':
          result = await docxHandler(req, res);
          break;
          
        case 'pdf':
          result = await pdfHandler(req, res);
          break;
          
        case 'chinese-text-image':
          // Handle Chinese text to PNG image
          const { text, width, height, fontSize, background, textColor } = requestData;
          if (!text) {
            return res.status(400).json({ message: 'text is required for chinese-text-image' });
          }
          
          const imageResult = await serverlessPDFService.generateChineseTextImage(text, {
            width: width || 600,
            height: height || 180,
            fontSize: fontSize || 64,
            background: background || '#ffffff',
            textColor: textColor || '#111111'
          });
          
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Disposition', `attachment; filename="chinese-text.png"`);
          return res.send(imageResult.buffer);
          
        case 'chinese-text-pdf':
          // Handle Chinese text to PDF
          const { text: pdfText, texts } = requestData;
          const textList = texts || (pdfText ? [pdfText] : []);
          if (!textList.length) {
            return res.status(400).json({ message: 'text or texts array is required for chinese-text-pdf' });
          }
          
          const pdfResult = await serverlessPDFService.generateChineseTextPDF(textList, {
            orientation: requestData.orientation || 'portrait',
            unit: requestData.unit || 'mm',
            format: requestData.format || 'a4',
            margin: requestData.margin || 20
          });
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="chinese-text.pdf"`);
          return res.send(pdfResult);
        
        default:
          return res.status(400).json({ 
            message: `Unsupported documentType: ${documentType}` 
          });
      }
    } finally {
      // Restore original body
      req.body = originalBody;
    }
    
    return result;

  } catch (error) {
    console.error('Export API error:', error);
    return handleError(res, error, 'Unified Export API');
  }
} 