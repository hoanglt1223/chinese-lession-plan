import XLSX from 'xlsx';
import { LessonAnalysis } from './openai-services.js';

export interface CourseLesson {
  unitNumber: number | string;
  lessonNumber: number | string;
  title: string;
  type: string; // Learn, Story, Sing, Write, etc.
  vocabulary: string[];
  objectives: string[];
  materials?: string[];
  duration?: string;
  ageGroup?: string;
  level?: string;
  activities?: string[]; // If defined in Excel
}

export function parseCourseOutline(filePath: string): CourseLesson[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Read as array of arrays to find the header row
  const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
  
  // Find the header row (look for 'Unit' or 'Lesson')
  let headerRowIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    if (Array.isArray(row)) {
      const hasUnit = row.some(cell => typeof cell === 'string' && cell.trim().toLowerCase() === 'unit');
      const hasLesson = row.some(cell => typeof cell === 'string' && cell.trim().toLowerCase() === 'lesson');
      
      if (hasUnit || hasLesson) {
        headerRowIndex = i;
        headers = row.map(cell => String(cell).trim());
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    console.error('Could not find header row in Excel file');
    return [];
  }

  console.log('Found headers:', headers);

  const lessons: CourseLesson[] = [];
  
  let lastUnit: string | number = '1';

  // Process rows after the header
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i] as any[];
    if (!row || row.length === 0) continue;

    const rowData: any = {};
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined) {
        const cleanKey = header.toLowerCase().replace(/[\s_-]/g, '');
        rowData[cleanKey] = row[index];
      }
    });

    // Handle merged cells for Unit: if empty, use last seen unit
    let currentUnit = rowData.unit || rowData.unitnumber;
    
    if (currentUnit) {
      lastUnit = currentUnit;
    } else {
      currentUnit = lastUnit;
    }
    
    // Clean Unit Number (remove "Unit" prefix if present)
    let cleanUnitNumber = String(currentUnit).trim();
    if (cleanUnitNumber.toLowerCase().startsWith('unit')) {
      cleanUnitNumber = cleanUnitNumber.replace(/unit\s*/i, '').trim();
    }

    // Skip empty rows or rows without lesson number
    if (!rowData.lesson && !rowData.lessonnumber) continue;
    
    // Normalize keys
    const vocabularyStr = rowData.knowledge || rowData.vocabulary || rowData.keywords || rowData.newwords || '';
    // Filter out common labels found in the data
    const ignoredVocabTerms = ['vocabulary:', 'grammars:', 'strokes:', 'stroke order:', 'characters:', 'pinyin:', '声调：一', 'vocabulary', 'grammars', 'strokes', 'characters', 'pinyin'];
    
    const vocabulary = String(vocabularyStr)
      .split(/[,;、\n]/)
      .map(v => v.trim())
      .filter(v => {
        if (v.length === 0) return false;
        const lowerV = v.toLowerCase();
        // Check if it's a label
        if (ignoredVocabTerms.some(term => lowerV.includes(term))) return false;
        // Check if it ends with colon
        if (v.endsWith(':')) return false;
        return true;
      });
    
    const objectivesStr = rowData.objectives || rowData.aims || rowData.goals || '';
    const objectives = String(objectivesStr).split(/[,;、\n]/).map(v => v.trim()).filter(v => v.length > 0);

    // Infer title from Reference/Content if not present
    let title = rowData.title || rowData.topic || rowData.theme || rowData.referencetextbookcontent;
    if (!title) {
      title = `Unit ${cleanUnitNumber} Lesson ${rowData.lesson || rowData.lessonnumber}`;
    }

    lessons.push({
      unitNumber: cleanUnitNumber,
      lessonNumber: rowData.lesson || rowData.lessonnumber || '1',
      title: String(title).trim(),
      type: rowData.lessontype || rowData.type || 'General',
      vocabulary,
      objectives,
      materials: rowData.materials ? String(rowData.materials).split(/[,;、\n]/) : [],
      duration: rowData.duration || rowData.time || '45 mins',
      ageGroup: rowData.agegroup || rowData.age || 'Preschool',
      level: rowData.level || 'Beginner',
      activities: rowData.activities ? String(rowData.activities).split(/[,;、\n]/) : []
    });
  }
  
  return lessons;
}

export function convertToLessonAnalysis(lesson: CourseLesson): LessonAnalysis {
  return {
    vocabulary: lesson.vocabulary,
    activities: lesson.activities && lesson.activities.length > 0 
      ? lesson.activities 
      : ["Listen & Repeat", "Interactive Game", "Practice", "Review"],
    learningObjectives: lesson.objectives,
    detectedLevel: String(lesson.level),
    ageAppropriate: String(lesson.ageGroup),
    mainTheme: lesson.title,
    duration: String(lesson.duration)
  };
}
