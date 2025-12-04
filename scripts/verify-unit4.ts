
import 'dotenv/config';
import { parseCourseOutline } from '../api/_shared/course-processor';
import { generateLessonFiles } from '../api/_shared/lesson-generator';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const COURSE_OUTLINE_PATH = path.join(PROJECT_ROOT, 'docs/final-real-work/Super Learners Course Outline.xlsx');
const OUTPUT_BASE_DIR = path.join(PROJECT_ROOT, 'docs/final-real-work/generated');

async function run() {
  console.log('Reading course outline...');
  if (!fs.existsSync(COURSE_OUTLINE_PATH)) {
    console.error('Excel file not found at:', COURSE_OUTLINE_PATH);
    process.exit(1);
  }

  const lessons = parseCourseOutline(COURSE_OUTLINE_PATH);
  console.log(`Found ${lessons.length} total lessons.`);

  // Filter for Unit 4
  const targetUnit = '4';
  const unit4Lessons = lessons.filter(l => String(l.unitNumber) === targetUnit);

  if (unit4Lessons.length === 0) {
    console.error(`No lessons found for Unit ${targetUnit}`);
    process.exit(1);
  }

  console.log(`Found ${unit4Lessons.length} lessons in Unit ${targetUnit}. Starting batch generation...`);

  let successCount = 0;
  let failCount = 0;

  for (const lesson of unit4Lessons) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processing Unit ${lesson.unitNumber} Lesson ${lesson.lessonNumber}: ${lesson.title}`);
    
    try {
      const result = await generateLessonFiles(lesson, OUTPUT_BASE_DIR, { force: true }); // Set force: false to skip existing if desired
      
      if (result.results.error) {
        console.error(`❌ Failed: ${result.results.error}`);
        failCount++;
      } else {
        console.log(`✅ Success! Output: ${result.path}`);
        if (result.results.plan) console.log(`   - Plan: ${result.results.plan}`);
        if (result.results.flashcards) console.log(`   - Flashcards: ${result.results.flashcards}`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`❌ Exception:`, error.message);
      failCount++;
    }
  }

  console.log(`\n--------------------------------------------------`);
  console.log(`Batch Generation Complete.`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

run().catch(console.error);
