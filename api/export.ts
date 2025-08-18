import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';

// Import the individual export handlers
import flashcardPdfHandler from './_shared/export/flashcard-pdf.js';
import docxHandler from './_shared/export/docx.js';
import pdfHandler from './_shared/export/pdf.js';

export type DocumentType = 'flashcard-pdf' | 'docx' | 'pdf';

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
        message: 'documentType is required. Must be one of: flashcard-pdf, docx, pdf' 
      });
    }

    // Validate documentType
    const validTypes: DocumentType[] = ['flashcard-pdf', 'docx', 'pdf'];
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