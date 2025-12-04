import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { fileProcessor } from './_shared/file-processor.js';
import flashcardPdfHandler from './_shared/export/flashcard-pdf.js';
import docxHandler from './_shared/export/docx.js';
import pdfHandler from './_shared/export/pdf.js';
import { serverlessPDFService } from './_shared/serverless-pdf-service.js';

// Configuration
const PROJECT_ROOT = path.join(process.cwd(), 'docs/final-real-work/generated');

// Multer Setup
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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

  const action = (req.query.action as string) || (req.body && req.body.action) || 'unknown';

  try {
    // --- File Content (Read/Write) ---
    if (req.method === 'POST' && (action === 'read-file' || action === 'write-file')) {
        const { unit, lesson, content } = req.body;
        if (!unit || !lesson) {
            return res.status(400).json({ message: 'Unit and Lesson numbers are required' });
        }

        const sanitizeName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
        const lessonDirName = sanitizeName(`Unit ${unit} - Lesson ${lesson}`);
        const lessonDir = path.join(PROJECT_ROOT, lessonDirName);
        const fileName = `${lessonDirName}.md`;
        const filePath = path.join(lessonDir, fileName);

        if (action === 'read-file') {
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'File not found', path: filePath });
            }
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return res.json({ content: fileContent });
        }

        if (action === 'write-file') {
            if (!content) return res.status(400).json({ message: 'Content is required' });
            if (!fs.existsSync(lessonDir)) fs.mkdirSync(lessonDir, { recursive: true });
            fs.writeFileSync(filePath, content, 'utf-8');
            return res.json({ success: true, path: filePath });
        }
    }

    // --- Upload (PDF/Images) ---
    if (req.method === 'POST' && action === 'upload') {
        await runMiddleware(req, res, upload.array('files'));
        const files = (req as any).files;
        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const processedFiles: any[] = [];
        for (const file of files) {
            if (file.mimetype === 'application/pdf') {
                const processed = await fileProcessor.processPDF(file.buffer, file.originalname);
                processedFiles.push(processed);
            } else if (file.mimetype.startsWith('image/')) {
                const processed = await fileProcessor.processImage(file.buffer, file.originalname);
                processedFiles.push(processed);
            }
        }
        return res.json(processedFiles);
    }

    // --- Export ---
    if (req.method === 'POST' && action === 'export') {
        const { documentType, ...requestData } = req.body;
        if (!documentType) return res.status(400).json({ message: 'documentType is required' });

        // Standard Handlers
        const handlers: Record<string, any> = {
            'flashcard-pdf': flashcardPdfHandler,
            'docx': docxHandler,
            'pdf': pdfHandler,
        };

        const exportHandler = handlers[documentType];
        
        if (exportHandler) {
             // Strip documentType and action if needed, but handlers likely check specific fields.
             // Also handlers typically expect specific body structure. 
             // Since we are proxying, we might need to temporarily set req.body to requestData 
             // or ensure handlers are okay with extra fields.
             // The original export.ts did: req.body = requestData;
             const originalBody = req.body;
             req.body = requestData;
             try {
                return await exportHandler(req, res);
             } finally {
                req.body = originalBody;
             }
        }

        // Custom Logic Handlers (ported from export.ts)
        if (documentType === 'chinese-text-image') {
            const { text, method, width, height, fontSize, background, textColor, fontWeight, padding, lineHeight, textAlign, quality } = requestData;
            if (!text) return res.status(400).json({ message: 'text is required for chinese-text-image' });

            const imageResult = await serverlessPDFService.generateChineseTextImage(text, {
                width: width || 800,
                height: height || 200,
                fontSize: fontSize || 24,
                backgroundColor: background || '#ffffff',
                textColor: textColor || '#000000',
                fontWeight: fontWeight || '400',
                padding: padding || 20,
                lineHeight: lineHeight || 1.5,
                textAlign: textAlign || 'center',
                quality: quality || 95
            });
            
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `attachment; filename="chinese-text.png"`);
            return res.send(imageResult.buffer);
        }

        if (documentType === 'chinese-text-pdf') {
            const { text: pdfText, texts } = requestData;
            const textList = texts || (pdfText ? [pdfText] : []);
            if (!textList.length) return res.status(400).json({ message: 'text or texts array is required for chinese-text-pdf' });
            
            const pdfResult = await serverlessPDFService.generateChineseTextPDF(textList, {
                orientation: requestData.orientation || 'portrait',
                unit: requestData.unit || 'mm',
                format: requestData.format || 'a4',
                margin: requestData.margin || 20
            });
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="chinese-text.pdf"`);
            return res.send(pdfResult);
        }

        return res.status(400).json({ message: `Unsupported document type: ${documentType}` });
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });

  } catch (error: any) {
    return handleError(res, error, `Content API (${action})`);
  }
}
