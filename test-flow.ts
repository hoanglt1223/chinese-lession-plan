import fs from 'fs';
import path from 'path';

// Using global fetch and FormData (Node 18+)

const BASE_URL = 'http://localhost:5000';
const OUTLINE_FILE = path.join(process.cwd(), 'docs/final-real-work/Super Learners Course Outline.xlsx');

async function runTest() {
  console.log('\x1b[36m%s\x1b[0m', '1. Checking API Health...');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    const data = await res.json();
    console.log('\x1b[32m%s\x1b[0m', `OK Health Check Passed: ${JSON.stringify(data)}`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `ERROR Health Check Failed: ${error}`);
    process.exit(1);
  }

  console.log('\x1b[36m%s\x1b[0m', '\n2. Uploading Course Outline...');
  try {
    const fileBuffer = fs.readFileSync(OUTLINE_FILE);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const formData = new FormData();
    formData.append('file', blob, 'Super Learners Course Outline.xlsx');
    
    const res = await fetch(`${BASE_URL}/api/course-ops?action=import`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Import failed: ${res.status} ${txt}`);
    }
    
    const data = await res.json();
    console.log('\x1b[32m%s\x1b[0m', `OK Import Successful. Lessons: ${data.lessonCount}, Storage: ${data.storage}`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `ERROR Upload Failed: ${error}`);
    process.exit(1);
  }

  console.log('\x1b[36m%s\x1b[0m', '\n3. Fetching Course Structure...');
  let unitNum, lessonNum;
  try {
    const res = await fetch(`${BASE_URL}/api/course-ops?action=structure`);
    if (!res.ok) throw new Error(`Structure fetch failed: ${res.statusText}`);
    const data = await res.json();
    
    const units = Object.keys(data.structure);
    if (units.length === 0) throw new Error('No units found');
    
    const firstUnit = data.structure[units[0]];
    if (firstUnit.length === 0) throw new Error('No lessons in first unit');
    
    const target = firstUnit[0];
    unitNum = target.unitNumber;
    lessonNum = target.lessonNumber;
    
    console.log('\x1b[32m%s\x1b[0m', `OK Found Target Lesson: Unit ${unitNum}, Lesson ${lessonNum} (${target.title})`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `ERROR Fetch Structure Failed: ${error}`);
    process.exit(1);
  }

  console.log('\x1b[36m%s\x1b[0m', '\n4. Generating Plan (GLM-4.6)...');
  try {
    const payload = {
      unitNumber: unitNum,
      lessonNumber: lessonNum,
      force: true,
      skipFlashcards: false
    };
    
    console.log('Sending payload:', JSON.stringify(payload));
    
    const res = await fetch(`${BASE_URL}/api/course-ops?action=generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Generate failed: ${res.status} ${txt}`);
    }
    
    const data = await res.json();
    console.log('\x1b[32m%s\x1b[0m', `OK Generation Successful!`);
    console.log(`   - Plan: ${data.results.plan}`);
    console.log(`   - Flashcards: ${data.results.flashcards}`);
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `ERROR Generate Call Failed: ${error}`);
    process.exit(1);
  }
  
  console.log('\x1b[32m%s\x1b[0m', '\nAll Tests Completed Successfully!');
}

runTest();
