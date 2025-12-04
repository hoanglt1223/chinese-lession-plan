
import * as dotenv from 'dotenv';

console.log('Loaded Environment:', {
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : 'undefined'
});

import { parseCourseOutline, CourseLesson } from '../api/_shared/course-processor.js';
import { generateSingleLessonPlan, generateFlashcards } from '../api/_shared/openai-services.js';
import { createLessonPlanDocx, createFlashcardPdf } from '../api/_shared/document-generator.js';
import { generateMockLessonPlan, generateMockFlashcards } from './mock-data-generator.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const INPUT_FILE = 'd:\\Projects\\chinese-lession-plan\\docs\\final-real-work\\Super Learners Course Outline.xlsx';
const OUTPUT_BASE_DIR = 'd:\\Projects\\chinese-lession-plan\\docs\\final-real-work\\generated';
const MODEL_NAME = 'GLM-4.6'; // Using Z.ai model

async function main() {
  console.log('Starting Course Material Generation...');
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  // 1. Parse the Course Outline
  console.log(`Parsing: ${INPUT_FILE}`);
  let lessons: CourseLesson[] = [];
  try {
    lessons = parseCourseOutline(INPUT_FILE);
    console.log(`Successfully parsed ${lessons.length} lessons.`);
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    process.exit(1);
  }

  // 2. Process Each Lesson
  for (const lesson of lessons) {
    await processLesson(lesson);
  }

  console.log('\nAll lessons processed!');
}

function sanitizeName(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
}

async function processLesson(lesson: CourseLesson) {
  const lessonDirName = sanitizeName(`Unit ${lesson.unitNumber} - Lesson ${lesson.lessonNumber}`);
  const lessonDir = path.join(OUTPUT_BASE_DIR, lessonDirName);
  
  // Ensure directory exists
  if (!fs.existsSync(lessonDir)) {
    fs.mkdirSync(lessonDir, { recursive: true });
  }

  console.log(`\n--- Processing: ${lessonDirName} (${lesson.title}) ---`);

  // A. Generate Lesson Plan (DOCX)
  const docxPath = path.join(lessonDir, `${lessonDirName}.docx`);
  if (fs.existsSync(docxPath)) {
    console.log(`  - DOCX already exists, skipping generation.`);
  } else {
    let planContent = '';
    try {
      console.log('  - Generating Lesson Plan Content (AI)...');
      planContent = await generateSingleLessonPlan(lesson, MODEL_NAME);
    } catch (error) {
      console.warn('  ! AI generation failed (likely invalid API key). Using mock data.');
      planContent = generateMockLessonPlan(lesson);
    }

    try {
      // Save Markdown for reference
      fs.writeFileSync(path.join(lessonDir, `${lessonDirName}.md`), planContent);
      
      // Convert to DOCX
      console.log('  - Converting to DOCX...');
      const docxBuffer = await createLessonPlanDocx(lesson, planContent);
      fs.writeFileSync(docxPath, docxBuffer);
      console.log('  ✓ Lesson Plan DOCX saved.');
    } catch (error) {
      console.error('  x Error saving Lesson Plan:', error);
    }
  }

  // B. Generate Flashcards (PDF)
  // We will create a subfolder for flashcards if there are multiple, or just put them in the lesson folder?
  // The user's structure shows "Unit 4 - Lesson 1/" containing multiple PDFs.
  // So we put PDFs directly in `lessonDir`.
  
  if (!lesson.vocabulary || lesson.vocabulary.length === 0) {
    console.log('  - No vocabulary found, skipping flashcards.');
    return;
  }

  const flashcardPdfPath = path.join(lessonDir, `${lessonDirName} - Flashcards.pdf`);
  if (fs.existsSync(flashcardPdfPath)) {
     console.log(`  - Flashcards PDF already exists, skipping.`);
  } else {
    let flashcards: any[] = [];
    try {
      console.log('  - Generating Flashcard Data (AI)...');
      flashcards = await generateFlashcards(
        lesson.vocabulary,
        lesson.title,
        lesson.level || 'Beginner',
        lesson.ageGroup || 'Preschool',
        MODEL_NAME,
        'api'
      );
    } catch (error) {
      console.warn('  ! AI generation failed. Using mock data.');
      flashcards = generateMockFlashcards(lesson);
    }

    try {
      if (flashcards.length > 0) {
        console.log('  - Creating Flashcard PDF...');
        const pdfBuffer = await createFlashcardPdf(flashcards, `Flashcards: ${lesson.title}`);
        fs.writeFileSync(flashcardPdfPath, Buffer.from(pdfBuffer));
        console.log('  ✓ Flashcards PDF saved.');
      } else {
        console.log('  - No flashcard data generated.');
      }
    } catch (error) {
      console.error('  x Error saving Flashcards PDF:', error);
    }
  }
}

main().catch(console.error);
