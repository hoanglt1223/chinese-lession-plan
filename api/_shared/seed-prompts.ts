import { db } from './database';
import { promptTemplates, promptComponents } from './db-schema';

export async function seedPrompts() {
  console.log('Seeding prompt templates...');

  // Analysis prompt template
  const [analysisTemplate] = await db.insert(promptTemplates).values({
    name: 'Default Content Analysis',
    type: 'analysis',
    description: 'Analyzes PDF content to extract vocabulary, level, theme, duration, and age group',
    isDefault: true,
    isActive: true
  }).returning();

  await db.insert(promptComponents).values([
    {
      templateId: analysisTemplate.id,
      name: 'role_definition',
      type: 'system',
      content: 'You are an expert Chinese language education analyst.',
      order: 1,
      variables: [],
      isRequired: true
    },
    {
      templateId: analysisTemplate.id,
      name: 'task_instructions',
      type: 'system',
      content: 'Your task is to analyze the provided content and extract key information for creating Chinese language lessons for Vietnamese students.',
      order: 2,
      variables: [],
      isRequired: true
    },
    {
      templateId: analysisTemplate.id,
      name: 'output_format',
      type: 'system',
      content: 'You must respond with valid JSON only, no additional text or explanations.',
      order: 3,
      variables: [],
      isRequired: true
    },
    {
      templateId: analysisTemplate.id,
      name: 'content_input',
      type: 'user',
      content: 'Please analyze this content and extract the following information:\n\n{{content}}\n\nExtract and provide:',
      order: 1,
      variables: [{ name: 'content', type: 'string', description: 'The content to analyze' }],
      isRequired: true
    },
    {
      templateId: analysisTemplate.id,
      name: 'extraction_requirements',
      type: 'user',
      content: `1. **Vocabulary**: List all Chinese words/phrases with pinyin and Vietnamese translations
2. **Level**: Determine HSK level (HSK1, HSK2, HSK3, HSK4, HSK5, HSK6)
3. **Theme**: Identify the main topic/theme
4. **Duration**: Estimate lesson duration in minutes
5. **Age Group**: Determine target age (preschool: 3-5, primary: 6-11, lower-secondary: 12-14, upper-secondary: 15-17, adult: 18+)

Respond in this exact JSON format:
{
  "vocabulary": [{"chinese": "word", "pinyin": "pronunciation", "vietnamese": "translation"}],
  "level": "HSK level",
  "theme": "main theme",
  "duration": number,
  "ageGroup": "age group"
}`,
      order: 2,
      variables: [],
      isRequired: true
    }
  ]);

  // Lesson Plan prompt template
  const [lessonPlanTemplate] = await db.insert(promptTemplates).values({
    name: 'YUEXUELE 4-Lesson Unit Plan',
    type: 'lesson_plan',
    description: 'Generates a comprehensive 4-lesson unit plan following YUEXUELE methodology',
    isDefault: true,
    isActive: true
  }).returning();

  await db.insert(promptComponents).values([
    {
      templateId: lessonPlanTemplate.id,
      name: 'role_definition',
      type: 'system',
      content: 'You are an expert Chinese language curriculum designer specializing in the YUEXUELE methodology for Vietnamese students.',
      order: 1,
      variables: [],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplate.id,
      name: 'methodology_instructions',
      type: 'system',
      content: `Create a 4-lesson unit plan following YUEXUELE methodology:
- **Lesson 1 (Learn)**: Vocabulary introduction and basic grammar
- **Lesson 2 (Story)**: Contextual learning through stories
- **Lesson 3 (Sing)**: Musical reinforcement and pronunciation
- **Lesson 4 (Write)**: Character writing and composition practice`,
      order: 2,
      variables: [],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplate.id,
      name: 'structure_requirements',
      type: 'system',
      content: `Each lesson must include:
- **Teacher Actions**: Specific instructor activities
- **Student Activities**: Detailed learner tasks
- **Materials**: Required resources and tools
- **Procedures**: Step-by-step lesson flow
- **Assessment**: Evaluation methods
- **Differentiation**: Adaptations for different learners
- **Troubleshooting**: Common issues and solutions`,
      order: 3,
      variables: [],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplate.id,
      name: 'output_format',
      type: 'system',
      content: 'Respond with valid JSON only, no additional text.',
      order: 4,
      variables: [],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplate.id,
      name: 'analysis_input',
      type: 'user',
      content: `Based on this analysis:
- **Vocabulary**: {{vocabulary}}
- **Theme**: {{theme}}
- **Age Group**: {{ageGroup}}
- **Level**: {{level}}
- **Duration**: {{duration}} minutes per lesson`,
      order: 1,
      variables: [
        { name: 'vocabulary', type: 'array', description: 'List of vocabulary items' },
        { name: 'theme', type: 'string', description: 'Lesson theme' },
        { name: 'ageGroup', type: 'string', description: 'Target age group' },
        { name: 'level', type: 'string', description: 'HSK level' },
        { name: 'duration', type: 'number', description: 'Lesson duration in minutes' }
      ],
      isRequired: true
    },
    {
      templateId: lessonPlanTemplate.id,
      name: 'json_structure',
      type: 'user',
      content: `Create a lesson plan in this exact JSON structure:
{
  "lessons": [
    {
      "title": "Lesson title",
      "type": "learn|story|sing|write",
      "duration": number,
      "objectives": ["objective1", "objective2"],
      "teacherActions": ["action1", "action2"],
      "studentActivities": ["activity1", "activity2"],
      "materials": ["material1", "material2"],
      "procedures": ["step1", "step2"],
      "assessment": ["method1", "method2"],
      "differentiation": ["adaptation1", "adaptation2"],
      "troubleshooting": ["issue1: solution1", "issue2: solution2"]
    }
  ]
}`,
      order: 2,
      variables: [],
      isRequired: true
    }
  ]);

  // Flashcard prompt template
  const [flashcardTemplate] = await db.insert(promptTemplates).values({
    name: 'Interactive Vocabulary Flashcards',
    type: 'flashcard',
    description: 'Creates engaging flashcards with images for vocabulary learning',
    isDefault: true,
    isActive: true
  }).returning();

  await db.insert(promptComponents).values([
    {
      templateId: flashcardTemplate.id,
      name: 'role_definition',
      type: 'system',
      content: 'You are a Chinese language education expert creating flashcards for Vietnamese students.',
      order: 1,
      variables: [],
      isRequired: true
    },
    {
      templateId: flashcardTemplate.id,
      name: 'output_format',
      type: 'system',
      content: 'Respond with a JSON object containing a "flashcards" array only.',
      order: 2,
      variables: [],
      isRequired: true
    },
    {
      templateId: flashcardTemplate.id,
      name: 'vocabulary_input',
      type: 'user',
      content: `Create flashcards for these vocabulary words:
{{vocabulary}}

Context:
- **Theme**: {{theme}}
- **Level**: {{level}}
- **Age Group**: {{ageGroup}}`,
      order: 1,
      variables: [
        { name: 'vocabulary', type: 'array', description: 'Vocabulary words to create flashcards for' },
        { name: 'theme', type: 'string', description: 'Lesson theme' },
        { name: 'level', type: 'string', description: 'HSK level' },
        { name: 'ageGroup', type: 'string', description: 'Target age group' }
      ],
      isRequired: true
    },
    {
      templateId: flashcardTemplate.id,
      name: 'json_structure',
      type: 'user',
      content: `Use this exact JSON structure:
{
  "flashcards": [
    {
      "chinese": "Chinese word",
      "pinyin": "pronunciation",
      "vietnamese": "Vietnamese translation",
      "imageQuery": "Direct, clear description for image generation (no Chinese characters)"
    }
  ]
}

**Image Query Guidelines**:
- Use simple, concrete descriptions
- Avoid abstract concepts
- Be specific and visual
- Use English only
- Example: "red apple on white table" not "苹果"`,
      order: 2,
      variables: [],
      isRequired: true
    }
  ]);

  // Summary prompt template
  const [summaryTemplate] = await db.insert(promptTemplates).values({
    name: 'Family-Friendly Lesson Summaries',
    type: 'summary',
    description: 'Creates comprehensive lesson summaries for Vietnamese families',
    isDefault: true,
    isActive: true
  }).returning();

  await db.insert(promptComponents).values([
    {
      templateId: summaryTemplate.id,
      name: 'role_definition',
      type: 'system',
      content: 'You are a Chinese language education expert creating lesson summaries for Vietnamese families.',
      order: 1,
      variables: [],
      isRequired: true
    },
    {
      templateId: summaryTemplate.id,
      name: 'task_instructions',
      type: 'system',
      content: 'Create four separate lesson summaries (Learn, Story, Sing, Write) that help Vietnamese families support their children\'s Chinese learning at home.',
      order: 2,
      variables: [],
      isRequired: true
    },
    {
      templateId: summaryTemplate.id,
      name: 'output_format',
      type: 'system',
      content: 'Respond with valid JSON only, no additional text.',
      order: 3,
      variables: [],
      isRequired: true
    },
    {
      templateId: summaryTemplate.id,
      name: 'lesson_input',
      type: 'user',
      content: `Based on this lesson plan:
{{lessonPlan}}

Key vocabulary: {{vocabulary}}`,
      order: 1,
      variables: [
        { name: 'lessonPlan', type: 'object', description: 'The complete lesson plan' },
        { name: 'vocabulary', type: 'array', description: 'Key vocabulary items' }
      ],
      isRequired: true
    },
    {
      templateId: summaryTemplate.id,
      name: 'summary_requirements',
      type: 'user',
      content: `Create summaries with this exact format for each lesson:

{
  "summaries": [
    {
      "lessonType": "learn|story|sing|write",
      "title": "Lesson title in Vietnamese",
      "vocabulary": [
        {
          "chinese": "word",
          "pinyin": "pronunciation", 
          "vietnamese": "translation",
          "wordType": "noun|verb|adjective|etc"
        }
      ],
      "homework": "Specific homework in Vietnamese",
      "practiceAtHome": "Family practice tips in Vietnamese"
    }
  ]
}

**Requirements**:
- All text in Vietnamese except Chinese words and pinyin
- Include word types (danh từ, động từ, tính từ, etc.)
- Homework should be specific and actionable
- Practice tips should be family-friendly
- Use consistent formatting`,
      order: 2,
      variables: [],
      isRequired: true
    }
  ]);

  // Single Lesson Plan prompt template
  const [singleLessonPlanTemplate] = await db.insert(promptTemplates).values({
    name: 'Single Lesson Plan (Detailed)',
    type: 'single_lesson_plan',
    description: 'Generates a detailed single lesson plan',
    isDefault: true,
    isActive: true
  }).returning();

  await db.insert(promptComponents).values([
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'role_definition',
      type: 'system',
      content: 'You are an expert Chinese language teacher creating a detailed lesson plan for a specific lesson.',
      order: 1,
      variables: [],
      isRequired: true
    },
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'lesson_context',
      type: 'user',
      content: `Create a detailed lesson plan for:
- **Unit**: {{unit}}
- **Lesson**: {{lesson}}
- **Topic**: {{topic}}
- **Type**: {{type}}
- **Level**: {{level}}
- **Age Group**: {{ageGroup}}
- **Duration**: {{duration}}`,
      order: 1,
      variables: [
        { name: 'unit', type: 'string', description: 'Unit number/name' },
        { name: 'lesson', type: 'string', description: 'Lesson number/name' },
        { name: 'topic', type: 'string', description: 'Lesson topic' },
        { name: 'type', type: 'string', description: 'Lesson type' },
        { name: 'level', type: 'string', description: 'Proficiency level' },
        { name: 'ageGroup', type: 'string', description: 'Student age group' },
        { name: 'duration', type: 'string', description: 'Lesson duration' }
      ],
      isRequired: true
    },
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'content_requirements',
      type: 'user',
      content: `**Content**:
- **Vocabulary**: {{vocabulary}}
- **Objectives**: {{objectives}}
- **Materials**: {{materials}}`,
      order: 2,
      variables: [
        { name: 'vocabulary', type: 'string', description: 'Vocabulary list' },
        { name: 'objectives', type: 'string', description: 'Learning objectives' },
        { name: 'materials', type: 'string', description: 'Materials needed' }
      ],
      isRequired: true
    },
    {
      templateId: singleLessonPlanTemplate.id,
      name: 'structure_instructions',
      type: 'user',
      content: `Generate the lesson plan in Markdown format with the following sections:
1.  **Header Table**: Unit, Lesson, Topic, Objectives, Materials, Duration.
2.  **Procedure Table**: Columns for Stage/Time, Teacher Activity, Student Activity, Materials/Media.
    *   Include Warm-up, Presentation, Practice, Production, and Wrap-up stages.
    *   Make activities highly interactive and suitable for {{ageGroup}}.
    *   Include specific game instructions (like "Fruit Squat", "Sticky Ball", etc. if relevant).

**Style**:
- Professional, clear, and easy to read.
- Use tables for structure.
- Bilingual headings (English/Chinese) where appropriate.`,
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