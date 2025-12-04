import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { parseCourseOutline } from '../api/_shared/course-processor.js';
import { generateSingleLessonPlan, generateFlashcards } from '../api/_shared/openai-services.js';
import { createLessonPlanDocx, createFlashcardPdf } from '../api/_shared/document-generator.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('Starting script...');
  const filePath = 'd:\\Projects\\chinese-lession-plan\\docs\\final-real-work\\Super Learners Course Outline.xlsx';
  const outputDir = path.join(__dirname, '../generated-output');
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Parsing course outline...');
  const lessons = parseCourseOutline(filePath);
  console.log(`Found ${lessons.length} total lessons.`);
  
  // Filter for Unit 4 to match user request context
  const targetLessons = lessons.filter(l => String(l.unitNumber) === '4');
  console.log(`Found ${targetLessons.length} lessons in Unit 4.`);

  if (targetLessons.length === 0) {
    console.log('No lessons found for Unit 4. Processing first 3 lessons instead.');
    targetLessons.push(...lessons.slice(0, 3));
  }

  function sanitizeName(name: string) {
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
  }

  for (const lesson of targetLessons) {
    const lessonDirName = sanitizeName(`Unit ${lesson.unitNumber} - Lesson ${lesson.lessonNumber}`);
    const lessonDir = path.join(outputDir, lessonDirName);
    
    if (!fs.existsSync(lessonDir)) {
      fs.mkdirSync(lessonDir, { recursive: true });
    }

    console.log(`\n--- Processing ${lessonDirName} ---`);
    console.log(`Title: ${lesson.title}`);
    console.log(`Vocabulary: ${lesson.vocabulary.join(', ')}`);

    // 1. Generate Lesson Plan
    let planContent = '';
    try {
      console.log('Generating Lesson Plan...');
      planContent = await generateSingleLessonPlan(lesson, 'gpt-5-nano');
    } catch (error) {
      console.error('Error generating lesson plan (using mock):', error);
      planContent = `# Lesson Plan: ${lesson.title}
      
## Objectives
${lesson.objectives.map(o => `- ${o}`).join('\n')}

## Vocabulary
${lesson.vocabulary.map(v => `- ${v}`).join('\n')}

## Procedure
| Stage | Teacher Activity | Student Activity | Materials |
|---|---|---|---|
| Warm-up | Greet students | Sing hello song | None |
| Presentation | Show flashcards | Repeat words | Flashcards |
| Practice | Game: ${lesson.activities?.[0] || 'Guessing Game'} | Play game | Game props |
| Wrap-up | Review | Sing goodbye song | None |
`;
    }

    // Save Markdown
    fs.writeFileSync(path.join(lessonDir, `${lessonDirName}.md`), planContent);
    
    // Generate and Save DOCX
    const docxBuffer = await createLessonPlanDocx(lesson, planContent);
    fs.writeFileSync(path.join(lessonDir, `${lessonDirName}.docx`), docxBuffer);
    console.log('Lesson Plan DOCX saved.');


    // 2. Generate Flashcards
    let flashcards: any[] = [];
    try {
      if (lesson.vocabulary && lesson.vocabulary.length > 0) {
        console.log('Generating Flashcards...');
        flashcards = await generateFlashcards(
          lesson.vocabulary,
          lesson.title,
          lesson.level || 'Beginner',
          lesson.ageGroup || 'Preschool',
          'gpt-5-nano',
          'api'
        );
      } else {
        console.log('No vocabulary found for flashcard generation.');
      }
    } catch (error) {
      console.error('Error generating flashcards (using mock):', error);
      flashcards = lesson.vocabulary.map(word => ({
        word,
        pinyin: 'pīn yīn',
        vietnamese: 'Vietnamese Meaning',
        imageUrl: 'https://placehold.co/400x400/png?text=' + encodeURIComponent(word)
      }));
    }

    if (flashcards.length > 0) {
      // Save JSON
      fs.writeFileSync(path.join(lessonDir, 'flashcards.json'), JSON.stringify(flashcards, null, 2));
      
      // Generate and Save PDF
      console.log('Generating Flashcard PDF...');
      const pdfBuffer = await createFlashcardPdf(flashcards);
      fs.writeFileSync(path.join(lessonDir, 'flashcards.pdf'), pdfBuffer);
      console.log('Flashcard PDF saved.');
    }
  }
  
  console.log('\nAll done! Check generated-output folder.');
}

main();
