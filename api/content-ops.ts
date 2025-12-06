import type { VercelRequest, VercelResponse } from '@vercel/node';
import multer from 'multer';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { fileProcessor } from './_shared/file-processor.js';
import flashcardPdfHandler from './_shared/export/flashcard-pdf.js';
import docxHandler from './_shared/export/docx.js';
import pdfHandler from './_shared/export/pdf.js';
import { serverlessPDFService } from './_shared/serverless-pdf-service.js';
import { db } from './_shared/database.js';
import { lessons } from './_shared/db-schema.js';
import { eq, and, sql } from 'drizzle-orm';

// Configuration - File paths removed for serverless compatibility

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

        if (action === 'read-file') {
            try {
                // Try to find lesson in DB first
                // We need to match based on unit and lesson number stored in aiAnalysis or title
                // Assuming aiAnalysis has unitNumber and lessonNumber
                const dbLesson = await db.select().from(lessons).where(
                    sql`ai_analysis->>'unitNumber' = ${String(unit)} AND ai_analysis->>'lessonNumber' = ${String(lesson)}`
                ).limit(1);

                if (dbLesson.length > 0 && dbLesson[0].lessonPlans) {
                    // If we have lesson plans stored in DB, return the first one as content
                    // The frontend expects markdown content
                    const plans = dbLesson[0].lessonPlans as any[];
                    if (plans && plans.length > 0) {
                         return res.json({ content: plans[0].content });
                    }
                }
            } catch (dbError) {
                console.warn("Failed to read from DB:", dbError);
            }

            // Return empty content if not found in database (serverless compatible)
            return res.json({ content: '' });
        }

        if (action === 'write-file') {
            if (!content) return res.status(400).json({ message: 'Content is required' });
            
            try {
                // Save to Database
                // Check if lesson exists
                const existingLesson = await db.select().from(lessons).where(
                    sql`ai_analysis->>'unitNumber' = ${String(unit)} AND ai_analysis->>'lessonNumber' = ${String(lesson)}`
                ).limit(1);

                const lessonPlanData = {
                    content: content,
                    updatedAt: new Date().toISOString()
                };

                if (existingLesson.length > 0) {
                    // Update existing lesson
                    await db.update(lessons)
                        .set({ 
                            lessonPlans: [lessonPlanData] as any,
                            updatedAt: new Date()
                        })
                        .where(eq(lessons.id, existingLesson[0].id));
                } else {
                    // Create new lesson entry if not exists (less likely if imported from outline)
                    await db.insert(lessons).values({
                        title: `Unit ${unit} - Lesson ${lesson}`,
                        level: 'N1', // Default
                        ageGroup: 'Primary', // Default
                        status: 'draft',
                        aiAnalysis: { unitNumber: unit, lessonNumber: lesson },
                        lessonPlans: [lessonPlanData] as any
                    });
                }
                
                return res.json({ success: true, storage: 'database' });

            } catch (dbError) {
                console.warn("Failed to save to DB, falling back to file:", dbError);
            }

            // File system operations removed for serverless compatibility
            return res.status(500).json({ message: "Database save failed - no file system fallback available" });
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
