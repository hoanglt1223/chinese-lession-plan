import { eq } from 'drizzle-orm';
import { db } from './database.js';
import { promptTemplates, promptComponents } from './db-schema.js';

export async function seedPrompts() {
  console.log('🌱 Seeding prompt templates...');

  // 1. AI Analysis Template (Internal)
  const analysisTemplateId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const analysisTemplate = {
    id: analysisTemplateId,
    name: 'Lesson Analysis',
    description: 'Analyzes PDF/Text content to extract vocabulary and structure',
    type: 'analysis',
    isDefault: true,
    isActive: true,
  };

  await db.insert(promptTemplates).values(analysisTemplate).onConflictDoNothing();

  // Analysis Components
  await db.delete(promptComponents).where(eq(promptComponents.templateId, analysisTemplateId));
  await db.insert(promptComponents).values([
    {
      templateId: analysisTemplateId,
      name: 'system_role',
      type: 'system',
      content: 'You are an expert Chinese language curriculum specialist. Your task is to analyze raw lesson content and structure it for the system.',
      order: 0,
      variables: [],
      isRequired: true
    },
    {
      templateId: analysisTemplateId,
      name: 'analysis_instructions',
      type: 'user',
      content: `Analyze the following Chinese lesson content and extract key information.
      
Content:
{{content}}

Output Language: {{langInstruction}}

Return the result in JSON format with the following structure:
{
  "vocabulary": ["word1", "word2", ...], // Key vocabulary items (Chinese characters)
  "activities": ["activity1", "activity2", ...], // Suggested activity types found in content
  "learningObjectives": ["obj1", "obj2", ...], // Main learning goals
  "detectedLevel": "Level 1/2/3", // Estimated difficulty
  "ageAppropriate": "3-5/6-8/9-12", // Target age group
  "mainTheme": "Theme name",
  "duration": "45 mins" // Estimated duration
}`,
      order: 1,
      variables: ['content', 'langInstruction'],
      isRequired: true
    }
  ]);

  // 2. Lesson Plan Generator Template
  const lessonPlanTemplateId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
  const lessonPlanTemplate = {
    id: lessonPlanTemplateId,
    name: 'Standard Lesson Plan',
    description: 'Generates a full lesson plan from analysis results',
    type: 'lesson_plan',
    isDefault: true,
    isActive: true,
  };

  await db.insert(promptTemplates).values(lessonPlanTemplate).onConflictDoNothing();

  // Lesson Plan Components
  await db.delete(promptComponents).where(eq(promptComponents.templateId, lessonPlanTemplateId));
  await db.insert(promptComponents).values([
    {
      templateId: lessonPlanTemplateId,
      name: 'system_role',
      type: 'system',
      content: 'You are an experienced Chinese language teacher creating engaging lesson plans for children.',
      order: 0,
      variables: [],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplateId,
      name: 'context_setup',
      type: 'user',
      content: `Create a lesson plan based on the following analysis:
      
Theme: {{theme}}
Level: {{level}}
Age Group: {{age}}
Duration: {{duration}}
Objectives: {{objectives}}
Key Vocabulary: {{vocabulary}}`,
      order: 1,
      variables: ['theme', 'level', 'age', 'duration', 'objectives', 'vocabulary'],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplateId,
      name: 'structure_requirements',
      type: 'user',
      content: `Please structure the lesson plan with the following sections:
1. Warm-up (5-10 mins)
2. Introduction (10-15 mins)
3. Practice Activities (15-20 mins)
4. Production/Wrap-up (5-10 mins)

For each activity, include:
- Activity Name
- Instructions
- Materials Needed
- Time Allocation`,
      order: 2,
      variables: [],
      isRequired: true
    }
  ]);

  // 3. Flashcard Generator Template
  const flashcardTemplateId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
  const flashcardTemplate = {
    id: flashcardTemplateId,
    name: 'Flashcard Generator',
    description: 'Generates image search queries for vocabulary',
    type: 'flashcard',
    isDefault: true,
    isActive: true,
  };

  await db.insert(promptTemplates).values(flashcardTemplate).onConflictDoNothing();

  // Flashcard Components
  await db.delete(promptComponents).where(eq(promptComponents.templateId, flashcardTemplateId));
  await db.insert(promptComponents).values([
    {
      templateId: flashcardTemplateId,
      name: 'system_role',
      type: 'system',
      content: 'You are a visual learning specialist helping to find the perfect images for Chinese vocabulary flashcards.',
      order: 0,
      variables: [],
      isRequired: true
    },
    {
      templateId: flashcardTemplateId,
      name: 'generation_instructions',
      type: 'user',
      content: `Generate English search queries for the following Chinese vocabulary to find suitable images (photos or illustrations) for children.

Vocabulary: {{vocabulary}}

Return ONLY a JSON object where keys are the Chinese words and values are the English search queries:
{
  "苹果": "red apple fruit white background",
  "香蕉": "yellow banana bunch illustration"
}`,
      order: 1,
      variables: ['vocabulary'],
      isRequired: true
    }
  ]);

  // 4. Summary Generator Template
  const summaryTemplateId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
  const summaryTemplate = {
    id: summaryTemplateId,
    name: 'Lesson Summary',
    description: 'Generates a short summary of the lesson',
    type: 'summary',
    isDefault: true,
    isActive: true,
  };

  await db.insert(promptTemplates).values(summaryTemplate).onConflictDoNothing();

  // Summary Components
  await db.delete(promptComponents).where(eq(promptComponents.templateId, summaryTemplateId));
  await db.insert(promptComponents).values([
    {
      templateId: summaryTemplateId,
      name: 'system_role',
      type: 'system',
      content: 'You are a helpful teaching assistant.',
      order: 0,
      variables: [],
      isRequired: true
    },
    {
      templateId: summaryTemplateId,
      name: 'summarize_instruction',
      type: 'user',
      content: `Summarize this lesson plan in 2-3 sentences for a parent report.
      
Lesson Plan:
{{lessonPlan}}`,
      order: 1,
      variables: ['lessonPlan'],
      isRequired: true
    }
  ]);

  // 5. Single Lesson Plan Template (NEW - for One-Click Generation)
  const singleLessonPlanTemplate = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
    name: 'Single Lesson Plan Generator',
    description: 'Generates a complete lesson plan in one go',
    type: 'single_lesson_plan',
    isDefault: true,
    isActive: true,
  };

  await db.insert(promptTemplates).values(singleLessonPlanTemplate).onConflictDoNothing();

  await db.delete(promptComponents).where(eq(promptComponents.templateId, singleLessonPlanTemplate.id));
  await db.insert(promptComponents).values([
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'system_role',
      type: 'system',
      content: 'You are an expert Chinese language teacher creating detailed, engaging lesson plans for children (ages 3-6). Your teaching style is interactive, game-based, and follows the Super Learners curriculum standards.',
      order: 0,
      variables: [],
      isRequired: true
    },
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'lesson_context',
      type: 'user',
      content: `**Lesson Context:**
- **Unit:** {{unit}}
- **Lesson:** {{lesson}}
- **Topic:** {{topic}}
- **Duration:** {{duration}}
- **Age Group:** {{ageGroup}}
- **Objectives:** {{objectives}}
- **Vocabulary:** {{vocabulary}}

**Existing Activities (Reference):**
{{existingActivities}}`,
      order: 1,
      variables: ['unit', 'lesson', 'topic', 'duration', 'ageGroup', 'objectives', 'vocabulary', 'existingActivities'],
      isRequired: true
    },
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'output_format',
      type: 'user',
      content: 'Please output the lesson plan in **Markdown** format.',
      order: 2,
      variables: [],
      isRequired: true
    },
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'structure_instructions',
      type: 'user',
      content: `\`\`\`markdown
# Structure Instructions for Chinese Lesson Plan

## Language Requirements
- ALL activity descriptions, procedures, and content MUST be written in Chinese (Simplified)
- Only section headers may be bilingual (Chinese/English)
- Use Chinese names for all games and activities, with English translations in parentheses if needed

## Table Structure
Create a table with EXACTLY these columns:
1. 教学环节与目标 (Stage & aim)
2. 活动设计与教学步骤 (Activities ideas & Procedures)
3. 教具 (Materials / 教具)

## Content Requirements
- Include specific time allocations for each activity (in Chinese: "X 分钟")
- Use the exact activity names from Golden Sample:
  * 水果蹲 (Fruit Squat)
  * 无敌大摆锤 (Invincible Pendulum)
  * 数字拍 (Number Clap)
  * 投球入桶 (Throw Ball into Bucket)
  * 猜水果 (Guess the Fruit)
  * 连一连 (Connect the Dots)
- Reference videos with "参考视频" notation
- Include materials in Chinese with quantities (e.g., "闪卡", "杯子x4", "毛绒玩具x1")
- Maintain the bilingual header format: Chinese first, English in parentheses

## Format Enforcement
- Every cell in "活动设计与教学步骤" column MUST be in Chinese
- Activity procedures must be detailed, step-by-step in Chinese
- Include classroom management instructions in Chinese
- Use Chinese punctuation (，。：！)`,
      order: 3,
      variables: [],
      isRequired: true
    }
  ]);

  console.log('✅ Prompt templates seeded successfully!');
  console.log(`Created templates:
  - Analysis: ${analysisTemplate.id}
  - Lesson Plan: ${lessonPlanTemplate.id}
  - Single Lesson Plan: ${singleLessonPlanTemplate.id}
  - Flashcard: ${flashcardTemplate.id}
  - Summary: ${summaryTemplate.id}`);
}

// Export the function for use in other modules
