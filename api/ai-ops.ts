import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { generateSingleLessonPlan, generateFlashcards, generateLessonSummary } from './_shared/openai-services.js';
import { deeplService } from './_shared/deepl-service.js';
import { analyzePDFContent } from './_shared/openai-services.js';
import { db } from './_shared/database.js';
import { promptTemplates, promptComponents, InsertPromptComponent } from './_shared/db-schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { callChineseTextAPI } from './_shared/chinese-utils.js';
import { parseCourseOutline } from './_shared/course-processor.js';
import * as path from 'path';
import * as fs from 'fs';

const COURSE_OUTLINE_PATH = path.join(process.cwd(), 'docs/final-real-work/Super Learners Course Outline.xlsx');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const action = (req.query.action as string) || (req.body && req.body.action) || 'unknown';

  try {
    // --- AI Generation ---
    if (req.method === 'POST' && action === 'generate-plan') {
       const { unitNumber, lessonNumber, additionalContext, lesson } = req.body;
       
       let lessonData = lesson;
       
       // If lesson data is not provided, try to fetch it from the outline
       if (!lessonData && unitNumber && lessonNumber) {
          if (fs.existsSync(COURSE_OUTLINE_PATH)) {
              const lessons = parseCourseOutline(COURSE_OUTLINE_PATH);
              lessonData = lessons.find(l => 
                String(l.unitNumber) === String(unitNumber) && 
                String(l.lessonNumber) === String(lessonNumber)
              );
          }
       }

       if (!lessonData) {
          return res.status(400).json({ message: "Lesson data or valid Unit/Lesson numbers required" });
       }
       
       // If additionalContext is provided, append it to the lesson object or handle it
       // Since generateSingleLessonPlan doesn't take additionalContext, we might need to merge it 
       // into objectives or handle it in the prompt service. 
       // For now, we pass the lesson object as is, assuming the prompt service handles it correctly.
       
       const result = await generateSingleLessonPlan(lessonData);
       return res.json({ content: result });
    }

    if (req.method === 'POST' && action === 'text-to-image') {
        const { text, fontSize, fontWeight, fontFamily } = req.body;
        if (!text) return res.status(400).json({ message: "Text is required" });
        
        const result = await callChineseTextAPI(
            text, 
            "png", 
            fontSize || 48, 
            fontWeight || "700", 
            fontFamily || "AaBiMoHengZiZhenBaoKaiShu"
        );
        return res.json({ image: result });
    }

    if (req.method === 'POST' && action === 'generate-flashcards') {
        const { unitNumber, lessonNumber, vocabulary } = req.body;
        const result = await generateFlashcards(unitNumber, lessonNumber, vocabulary);
        return res.json(result);
    }

    if (req.method === 'POST' && action === 'generate-summary') {
        const { unitNumber, lessonNumber, planContent } = req.body;
        const result = await generateLessonSummary(unitNumber, lessonNumber, planContent);
        return res.json(result);
    }

    if (req.method === 'POST' && action === 'translate') {
        const { text, words, targetLang } = req.body;
        
        // Handle batch translation (array of words)
        if (words && Array.isArray(words)) {
            let translations: Record<string, string> = {};
            // Default to Vietnamese for batch translation as per current usage in useTranslation hook
            if (!targetLang || targetLang === 'vi' || targetLang === 'vietnamese') {
                 translations = await deeplService.translateChineseToVietnamese(words);
            } else {
                 // If English batch translation is needed in future, we can implement it here.
                 // For now, map one by one or fallback to VI if not specified.
                 // But since deeplService.translateChineseToEnglish takes string, we do this:
                 if (targetLang === 'en' || targetLang === 'english') {
                     const promises = words.map(async w => {
                         const tr = await deeplService.translateChineseToEnglish(w);
                         return [w, tr];
                     });
                     const results = await Promise.all(promises);
                     translations = Object.fromEntries(results);
                 }
            }
            return res.json({ translations });
        }

        // Handle single text translation
        if (!text) return res.status(400).json({ message: "Text or words required" });
        
        let result;
        if (targetLang === 'vi' || targetLang === 'vietnamese') {
             const dict = await deeplService.translateChineseToVietnamese([text]);
             result = dict[text] || text;
        } else {
             // Default to English or use generic handler if available
             result = await deeplService.translateChineseToEnglish(text);
        }
        return res.json({ translation: result });
    }

    if (req.method === 'POST' && action === 'analyze') {
        const { content, aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
        if (!content) return res.status(400).json({ message: "Content is required" });
        const result = await analyzePDFContent(content, aiModel, outputLanguage);
        return res.json(result);
    }

    // --- Prompts CRUD ---
    if (action === 'list-prompts') {
        const templates = await db.query.promptTemplates.findMany({
            with: { components: { orderBy: [desc(promptComponents.order)] } },
            where: eq(promptTemplates.isActive, true),
            orderBy: [desc(promptTemplates.createdAt)]
        });
        return res.json({ templates });
    }

    if (action === 'get-prompt') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "ID required" });
        const template = await db.query.promptTemplates.findFirst({
            with: { components: { orderBy: [desc(promptComponents.order)] } },
            where: eq(promptTemplates.id, id as string)
        });
        if (!template) return res.status(404).json({ message: "Not found" });
        return res.json({ template });
    }

    if (req.method === 'POST' && action === 'create-prompt') {
        const { name, type, description, isDefault, components } = req.body;
        const [template] = await db.insert(promptTemplates).values({
            name, type, description, isDefault: isDefault || false, isActive: true
        }).returning();

        if (components && Array.isArray(components)) {
            const componentData: InsertPromptComponent[] = components.map((comp: any, index: number) => ({
                templateId: template.id,
                name: comp.name, type: comp.type, content: comp.content,
                order: comp.order || index, variables: comp.variables || [],
                isRequired: comp.isRequired !== false
            }));
            await db.insert(promptComponents).values(componentData);
        }
        return res.status(201).json({ template });
    }

    if (req.method === 'POST' && action === 'update-prompt') {
         // Simplified update logic (full implementation would require handling components update)
         const { id, ...data } = req.body;
         if (!id) return res.status(400).json({ message: "ID required" });
         await db.update(promptTemplates).set(data).where(eq(promptTemplates.id, id));
         return res.json({ success: true });
    }

    if (req.method === 'DELETE' && action === 'delete-prompt') {
        const { id } = req.query;
        if (!id) return res.status(400).json({ message: "ID required" });
        await db.delete(promptTemplates).where(eq(promptTemplates.id, id as string));
        return res.json({ success: true });
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });

  } catch (error: any) {
    return handleError(res, error, `AI API (${action})`);
  }
}
