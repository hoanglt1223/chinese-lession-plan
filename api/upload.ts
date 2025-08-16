import type { VercelRequest, VercelResponse } from '@vercel/node';
// Note: File processing disabled for now - can be re-enabled with proper serverless file handling
import { setCorsHeaders, handleOptions } from './_shared/cors';
import { handleError } from './_shared/error-handler';
import multer from 'multer';

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper to handle multer in serverless
function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
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
    // Run multer middleware
    await runMiddleware(req, res, upload.array('files'));

    const files = (req as any).files;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Mock file processing for now
    const processedFiles = files.map(file => ({
      name: file.originalname,
      content: "Mock extracted content from PDF file. This would contain the actual text extracted from the uploaded PDF.",
      type: file.mimetype,
      size: file.size
    }));

    return res.json({ files: processedFiles });
  } catch (error: any) {
    return handleError(res, error, 'Upload API');
  }
}

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
