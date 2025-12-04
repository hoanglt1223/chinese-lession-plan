
import * as fs from 'fs';
import * as path from 'path';
import { CourseLesson } from './course-processor.js';
import { generateSingleLessonPlan, generateFlashcards } from './openai-services.js';
import { createLessonPlanDocx, createFlashcardPdf } from './document-generator.js';

// Mock data generators (simple versions to avoid circular deps or complex imports if possible)
// Ideally these should be in a shared mock-data file. 
// For now, I'll assume the caller handles errors or I'll simple mock strings if needed.
// Actually, I should probably import them from the script location or move them to shared.
// Moving mock-data-generator.ts to api/_shared is better.

const MODEL_NAME = 'GLM-4.6';

export async function generateLessonFiles(
  lesson: CourseLesson, 
  outputBaseDir: string,
  options: { force?: boolean; skipFlashcards?: boolean } = {}
) {
  const sanitizeName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
  const lessonDirName = sanitizeName(`Unit ${lesson.unitNumber} - Lesson ${lesson.lessonNumber}`);
  const lessonDir = path.join(outputBaseDir, lessonDirName);
  
  if (!fs.existsSync(lessonDir)) {
    fs.mkdirSync(lessonDir, { recursive: true });
  }

  const results: { plan?: string; flashcards?: string; error?: string } = {};

  // A. Generate Lesson Plan (DOCX)
  const docxPath = path.join(lessonDir, `${lessonDirName}.docx`);
  if (fs.existsSync(docxPath) && !options.force) {
    results.plan = 'skipped (exists)';
  } else {
    try {
      const planContent = await generateSingleLessonPlan(lesson, MODEL_NAME);
      
      // Save Markdown
      fs.writeFileSync(path.join(lessonDir, `${lessonDirName}.md`), planContent);
      
      // Convert to DOCX
      const docxBuffer = await createLessonPlanDocx(lesson, planContent);
      fs.writeFileSync(docxPath, docxBuffer);
      results.plan = 'generated';
    } catch (error: any) {
      console.error(`Error generating lesson plan for ${lessonDirName}:`, error);
      results.error = error.message;
      // Fallback logic could go here if needed, but API should probably fail or report error
    }
  }

  // B. Generate Flashcards (PDF)
  if (!options.skipFlashcards && lesson.vocabulary && lesson.vocabulary.length > 0) {
    const flashcardPdfPath = path.join(lessonDir, `${lessonDirName} - Flashcards.pdf`);
    if (fs.existsSync(flashcardPdfPath) && !options.force) {
      results.flashcards = 'skipped (exists)';
    } else {
      try {
        // Use 'api' source for images (Unsplash/etc) as requested
        const flashcards = await generateFlashcards(
          lesson.vocabulary,
          lesson.title,
          lesson.level || 'Beginner',
          lesson.ageGroup || 'Preschool',
          MODEL_NAME,
          'api'
        );

        if (flashcards.length > 0) {
          const pdfBuffer = await createFlashcardPdf(flashcards);
          fs.writeFileSync(flashcardPdfPath, Buffer.from(pdfBuffer));
          results.flashcards = 'generated';
        } else {
          results.flashcards = 'no data';
        }
      } catch (error: any) {
        console.error(`Error generating flashcards for ${lessonDirName}:`, error);
        if (!results.error) results.error = "";
        results.error += ` Flashcard error: ${error.message}`;
      }
    }
  }

  return { path: lessonDir, results };
}
