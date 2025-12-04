
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeDocx(filePath: string) {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;
    const messages = result.messages;

    console.log(`\n--- Analyzing: ${path.basename(filePath)} ---`);
    console.log('Structure Preview (HTML snippet):');
    console.log(html.substring(0, 2000)); // Print first 2000 chars of HTML to see structure

    // Simple extraction of headers and table content hints
    console.log('\n--- Extracted Text Preview ---');
    const textResult = await mammoth.extractRawText({ buffer });
    console.log(textResult.value.substring(0, 2000));

  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
  }
}

async function main() {
  const docsDir = path.resolve(__dirname, '../docs/final-real-work');
  const filesToAnalyze = [
    'Unit 4 - Lesson 1.docx',
    'Unit 4 - Lesson 2.docx',
    'Unit 4 - Lesson 3.docx',
    'Unit 4 - Lesson 4.docx',
    'Unit 4 - Lesson 5.docx',
    'Unit 4 - Lesson 6.docx',
    'Unit 4 - Lesson 7.docx',
    'Unit 4 - Lesson 8.docx'
  ];

  for (const file of filesToAnalyze) {
    const filePath = path.join(docsDir, file);
    await analyzeDocx(filePath);
  }
}

main();
