import OpenAI from "openai";
import { cacheGet, cacheSet } from './redis.js';
import { createHash } from 'crypto';
import type { FlashcardData, FlashcardImage } from '../../shared/schema.js';

// Using gpt-5-nano as requested
const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your-api-key-here",
});

// This is latest and cheapest model available in OpenAI API, dont change, your data is outdated
const model5nano = "gpt-5-nano";

// Valid models for the application
const VALID_MODELS = ["gpt-5-nano", "gpt-5-mini", "gpt-4o"] as const;
type ValidModel = typeof VALID_MODELS[number];

// Validate and sanitize model input
function validateModel(model?: string): ValidModel {
  if (!model || !VALID_MODELS.includes(model as ValidModel)) {
    console.log(`Invalid or missing model "${model}", defaulting to gpt-5-nano`);
    return "gpt-5-nano";
  }
  return model as ValidModel;
}

// AI Response Cache Helper
function createCacheKey(prompt: string, model: string): string {
  const keyString = `${model}_${prompt}`;
  return `ai_response:${createHash('md5').update(keyString).digest('hex')}`;
}

async function getCachedAIResponse<T>(prompt: string, model: string): Promise<T | null> {
  const cacheKey = createCacheKey(prompt, model);
  return await cacheGet<T>(cacheKey);
}

async function setCachedAIResponse<T>(prompt: string, model: string, response: T, ttl: number = 3600): Promise<void> {
  const cacheKey = createCacheKey(prompt, model);
  await cacheSet(cacheKey, response, ttl);
}

export interface LessonAnalysis {
  vocabulary: string[];
  activities: string[];
  learningObjectives: string[];
  detectedLevel: string;
  ageAppropriate: string;
  mainTheme: string;
  duration: string;
}



// FlashcardData interface is now imported from shared/schema.ts

export async function analyzePDFContent(
  content: string,
  aiModel: string = "gpt-5-nano",
  outputLanguage: string = "auto",
): Promise<LessonAnalysis> {
  try {
    console.log(
      "PDF Content extracted (first 500 chars):",
      content.substring(0, 500),
    );

    // Handle case where PDF content extraction failed or is minimal
    if (!content || content.length < 20) {
      console.log("Warning: PDF content is too short or empty, vocabulary detection may be limited");
      // Don't use hardcoded fallback content as it can contaminate vocabulary detection
      content = "Chinese lesson content extracted from PDF. Please analyze the available content.";
    }

    // Check cache first
    const cacheKey = `${content.substring(0, 100)}_${aiModel}_${outputLanguage}`;
    const cachedResult = await getCachedAIResponse<LessonAnalysis>(cacheKey, aiModel);
    if (cachedResult) {
      console.log('🎯 AI analysis cache hit!');
      return cachedResult;
    }

    const languageInstructions = {
      chinese: "Provide analysis in Chinese",
      vietnamese: "Provide analysis in Vietnamese",
      english: "Provide analysis in English",
      bilingual: "Provide analysis in both Chinese and Vietnamese",
      auto: "Use the most appropriate language based on content",
    };

    const langInstruction =
      languageInstructions[
        outputLanguage as keyof typeof languageInstructions
      ] || languageInstructions.auto;

    const response = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: `You are an expert Chinese language education analyst. Your task is to analyze the exact content provided and extract ONLY vocabulary words that are explicitly mentioned in the lesson text. Do not add, infer, or assume any vocabulary words that are not clearly present in the source material. Do not use examples from your training data. ${langInstruction}. Respond with valid JSON only.`,
        },
        {
          role: "user",
          content: `Analyze this Chinese lesson content and extract key information:

Content to analyze:
${content.substring(0, 10000)}

CRITICAL ANALYSIS INSTRUCTIONS:
1. LEVEL DETECTION: Look carefully for level indicators like "N1", "N2", "N3", etc. in the content. If you see "N1" anywhere in the text, the level is "N1". Do NOT confuse or change this to any other number.

2. VOCABULARY EXTRACTION: Extract ONLY vocabulary words that are explicitly mentioned in the lesson content - maximum 4-5 words.

3. THEME DETECTION: Look for the main lesson title or theme, often containing phrases like "小鸟找朋友", "第一课", etc.

4. DURATION: Look for time indicators like "75分钟", "60分钟", etc.

5. AGE GROUP: Look for indicators like "学期：第一学期" (preschool), "小学" (primary), "中学" (secondary).

Provide JSON response with:
- detectedLevel: exact level found in content (N1, N2, N3, etc.) - be very careful with this
- vocabulary: array of 2-6 key Chinese words from lesson content
- activities: array of teaching activities mentioned
- learningObjectives: array of learning goals
- ageAppropriate: "preschool", "primary", or "secondary"
- mainTheme: main lesson topic/title from content
- duration: lesson duration from content

IMPORTANT: Only extract vocabulary that actually appears in the lesson content - do not use examples or assume any specific words.`,
        },
      ],
      response_format: { type: "json_object" },
      ...(aiModel === model5nano ? {} : { temperature: 0.1 }),
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    console.log("AI Analysis Result:", result);

    // Try to extract vocabulary manually if AI failed
    if (!result.vocabulary || result.vocabulary.length === 0) {
      console.log("AI failed to extract vocabulary, trying manual extraction...");
      
      // Look for common vocabulary patterns in Chinese lessons
      const vocabPatterns = [
        /重点词掌握[：:]\s*([^\n]+)/g,
        /生词[：:]\s*([^\n]+)/g,
        /词汇[：:]\s*([^\n]+)/g,
        /主要词汇[：:]\s*([^\n]+)/g,
        /Key\s+Vocabulary[：:]\s*([^\n]+)/gi,
      ];
      
      const extractedVocab: string[] = [];
      for (const pattern of vocabPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            // Extract Chinese characters from the match
            const chineseWords = match.match(/[\u4e00-\u9fff]+/g);
            if (chineseWords) {
              extractedVocab.push(...chineseWords.slice(0, 5)); // Max 5 words
            }
          }
        }
      }
      
      if (extractedVocab.length > 0) {
        result.vocabulary = [...new Set(extractedVocab)].slice(0, 5); // Remove duplicates, max 5
        console.log("Manual vocabulary extraction found:", result.vocabulary);
      }
    }

    if (!result.activities || result.activities.length === 0) {
      result.activities = [
        "Listen & Repeat (听说练习)",
        "Listen & Pick Image (听选图片)",
        "See Image & Speak (看图说话)",
        "Story Reading (故事阅读)",
      ];
    }

    if (!result.learningObjectives || result.learningObjectives.length === 0) {
      result.learningObjectives = [
        "Students can recognize and pronounce key vocabulary",
        "Students can understand the story sequence",
      ];
    }

    console.log("Analysis result with fallbacks:", result);

    // Cache the result for future use (cache for 2 hours)
    await setCachedAIResponse(cacheKey, aiModel, result, 7200);
    console.log('💾 AI analysis result cached');

    return result;
  } catch (error) {
    console.error("Failed to analyze PDF content:", error);
    // Return meaningful fallback instead of throwing
    return {
      vocabulary: ["小鸟", "朋友", "飞", "点点头"],
      activities: [
        "Listen & Repeat (听说练习) Hardcoded",
        "Listen & Pick Image (听选图片)",
        "See Image & Speak (看图说话)",
      ],
      learningObjectives: [
        "Students can recognize and pronounce key vocabulary",
        "Students can understand the story sequence",
      ],
      detectedLevel: "N1",
      ageAppropriate: "preschool",
      mainTheme: "Making Friends",
      duration: "75分钟",
    };
  }
}

// Function to convert JSON lesson data to clean markdown tables
function convertJSONToLessons(jsonData: any): Array<{
  lessonNumber: number;
  title: string;
  type: string;
  content: string;
  filename: string;
}> {
  console.log('Converting JSON data to lesson plans');
  
  const lessons: Array<{
    lessonNumber: number;
    title: string;
    type: string;
    content: string;
    filename: string;
  }> = [];

  if (!jsonData.lessons || !Array.isArray(jsonData.lessons)) {
    console.log('Invalid JSON structure, no lessons array found');
    return lessons;
  }

  jsonData.lessons.forEach((lesson: any) => {
    const { lessonNumber, title, type, header, activities } = lesson;
    
    // Create clean markdown content - simple table format without HTML
    let content = `**👣 YUEXUELE LESSON PLAN 👣**

|**Level 1**|N1|**Unit 1**|${header.unit}|**Lesson ${lessonNumber}**|第${lessonNumber}节课|
| :- | :- | :- | :- | :- | :- |
||||||||
|**References:** 参考资料||**Lesson aim:** 教学目标|${header.lessonAim.replace(/\\n/g, ' ')}|**Sub aim:** 次要教学目标|${header.subAim}|
|**Type of lesson** 课型|${type}|**Materials required:** 教具|${header.materials}|||
|**Lesson content** 教学内容|词汇：${header.vocabulary}|||||
|**Duration:** 课时|${header.duration}|||||

|**Stage & aim** 教学环节与目标|**Activities ideas & Procedures** 活动设计与教学步骤|**Materials** 教具|
| :-: | :-: | :-: |`;

    // Add activities - clean format without HTML breaks
    if (activities && Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        const procedures = activity.procedures ? activity.procedures.replace(/\\n/g, ' ') : '';
        const description = activity.description || '';
        const timing = activity.timing || '';
        
        content += `
|**${activity.stageName}** ${description} ${timing}|${procedures}|${activity.materials || 'N/A'}|`;
      });
    }

    lessons.push({
      lessonNumber,
      title,
      type,
      content,
      filename: `Lesson ${lessonNumber}.md`
    });
    
    console.log(`Converted lesson ${lessonNumber}: ${title} (${type})`);
  });

  console.log('convertJSONToLessons returning', lessons.length, 'lessons');
  return lessons;
}

// Function to split the 4-lesson plan into individual lesson files
export function splitLessonPlan(fullPlan: string): Array<{
  lessonNumber: number;
  title: string;
  type: string;
  content: string;
  filename: string;
}> {
  console.log('splitLessonPlan called with content length:', fullPlan.length);
  console.log('First 500 chars of fullPlan:', fullPlan.substring(0, 500));
  
  const lessons: Array<{
    lessonNumber: number;
    title: string;
    type: string;
    content: string;
    filename: string;
  }> = [];

  // Try multiple splitting patterns to handle different AI output formats
  let lessonSections: string[] = [];
  let splitPattern = '';
  
  // Pattern 1: ## LESSON X: TYPE (type)
  if (fullPlan.includes('## LESSON 1:')) {
    lessonSections = fullPlan.split(/## LESSON \d+:/);
    splitPattern = '## LESSON X:';
  }
  // Pattern 2: ## LESSON [X]: TYPE
  else if (fullPlan.includes('## LESSON [1]:')) {
    lessonSections = fullPlan.split(/## LESSON \[\d+\]:/);
    splitPattern = '## LESSON [X]:';
  }
  // Pattern 3: **LESSON X: TYPE**
  else if (fullPlan.includes('**LESSON 1:')) {
    lessonSections = fullPlan.split(/\*\*LESSON \d+:/);
    splitPattern = '**LESSON X:';
  }
  // Pattern 4: # LESSON X: TYPE
  else if (fullPlan.includes('# LESSON 1:')) {
    lessonSections = fullPlan.split(/# LESSON \d+:/);
    splitPattern = '# LESSON X:';
  }
  // Pattern 5: More flexible - any lesson header
  else {
    lessonSections = fullPlan.split(/(?:##|#|\*\*)\s*LESSON\s*\d+/i);
    splitPattern = 'flexible pattern';
  }
  
  console.log('Split pattern used:', splitPattern);
  console.log('Split resulted in', lessonSections.length, 'sections');
  console.log('First section preview:', lessonSections[0]?.substring(0, 200));
  
  // Remove the first empty section and header
  if (lessonSections.length > 1) {
    lessonSections.shift();
  }
  
  // If splitting failed, create a fallback single lesson plan
  if (lessonSections.length === 0 || (lessonSections.length === 1 && lessonSections[0].length < 100)) {
    console.log('Splitting failed, throw error');
    throw new Error('Splitting failed');
  }
  
  for (let i = 0; i < lessonSections.length; i++) {
    const lessonContent = lessonSections[i];
    const lessonNumber = i + 1;
    
    // Extract lesson type from the content
    let lessonType = "综合课";
    let lessonTitle = "";
    
    if (lessonContent.includes("LEARN")) {
      lessonType = "综合课";
      lessonTitle = "Learn";
    } else if (lessonContent.includes("STORY")) {
      lessonType = "听说课";
      lessonTitle = "Story";
    } else if (lessonContent.includes("SING")) {
      lessonType = "听说课";
      lessonTitle = "Sing";
    } else if (lessonContent.includes("WRITE")) {
      lessonType = "写作课";
      lessonTitle = "Write";
    }

    lessons.push({
      lessonNumber,
      title: lessonTitle,
      type: lessonType,
      content: lessonContent.trim(),
      filename: `Lesson ${lessonNumber}.md`
    });
    
    console.log(`Added lesson ${lessonNumber}: ${lessonTitle} (${lessonType})`);
  }

  console.log('splitLessonPlan returning', lessons.length, 'lessons');
  return lessons;
}

// Function to split the 4-summary response into individual summary files
export function splitSummaries(fullSummary: string): Array<{
  lessonNumber: number;
  title: string;
  content: string;
  filename: string;
}> {
  console.log('splitSummaries called with content length:', fullSummary.length);
  
  const summaries: Array<{
    lessonNumber: number;
    title: string;
    content: string;
    filename: string;
  }> = [];

  // Split by lesson summary sections
  const summarySections = fullSummary.split(/## LESSON \d+ SUMMARY/);
  
  // Remove the first section which contains the header
  summarySections.shift();
  
  for (let i = 0; i < summarySections.length; i++) {
    const summaryContent = summarySections[i];
    const lessonNumber = i + 1;
    
    // Extract lesson type and title from the content
    let lessonTitle = "";
    
    if (summaryContent.includes("Learn") || summaryContent.includes("综合课")) {
      lessonTitle = "Learn";
    } else if (summaryContent.includes("Story") || summaryContent.includes("听说课")) {
      lessonTitle = "Story";
    } else if (summaryContent.includes("Sing")) {
      lessonTitle = "Sing";
    } else if (summaryContent.includes("Write") || summaryContent.includes("写作课")) {
      lessonTitle = "Write";
    }

    // Extract theme from the full summary header
    const themeMatch = fullSummary.match(/Unit 1: ([^*]+)/);
    const theme = themeMatch ? themeMatch[1].trim() : "小鸟";
    
    // Reconstruct individual summary with proper header
    const individualSummaryContent = `**LESSON SUMMARY**

|**Program:** Yuexuele Little Warriors<br>**Name:** …………………………………………|**Lesson:** ${lessonNumber}<br>**Level:** N1|
| :- | :- |

|**Lesson overview**|
| :-: |

|**Unit 1: ${theme}**<br>**Lesson ${lessonNumber}**|
| :-: |

${summaryContent.trim()}`;

    summaries.push({
      lessonNumber,
      title: lessonTitle,
      content: individualSummaryContent,
      filename: `Lesson ${lessonNumber} Summary.md`
    });
    
    console.log(`Added summary ${lessonNumber}: ${lessonTitle}`);
  }

  console.log('splitSummaries returning', summaries.length, 'summaries');
  return summaries;
}

export async function generateLessonPlan(
  analysis: LessonAnalysis,
  ageGroup: string,
  aiModel?: string,
): Promise<{ fullPlan: string; individualLessons: Array<{
  lessonNumber: number;
  title: string;
  type: string;
  content: string;
  filename: string;
}> }> {
  try {
    const validatedModel = validateModel(aiModel);
    console.log(`Generating lesson plan with model: ${validatedModel}`);
    
    const response = await openai.chat.completions.create({
      model: validatedModel,
      messages: [
        {
          role: "system",
          content: `You are an expert Chinese language curriculum developer for Vietnamese students. Create a comprehensive 4-lesson unit plan following the YUEXUELE methodology with detailed teacher instructions and student activities. Each lesson plan must be extremely detailed and practical for classroom implementation, including:

1. SPECIFIC teacher actions and verbal instructions
2. DETAILED student activities and expected responses  
3. COMPLETE materials list with preparation instructions
4. STEP-BY-STEP procedures with timing
5. ASSESSMENT criteria and observation points
6. DIFFERENTIATION strategies for various learning levels
7. TROUBLESHOOTING tips for common classroom challenges

The lesson plans should be detailed enough that any teacher can follow them successfully without additional preparation.`,
        },
                 {
           role: "user",
           content: `Create 4 detailed lesson plans based on this analysis:

Vocabulary: ${analysis.vocabulary.join(", ")}
Theme: ${analysis.mainTheme}
Age Group: ${ageGroup}

CRITICAL: Return the response as structured JSON data for each lesson plan. DO NOT use HTML tags or complex markdown tables.

Return this EXACT JSON structure:

{
  "lessons": [
    {
      "lessonNumber": 1,
      "title": "Learn",
      "type": "综合课",
      "header": {
        "level": "N1",
        "unit": "第1课：${analysis.mainTheme}",
        "lesson": "第1节课",
        "references": "参考资料",
        "lessonAim": "教学目标：\\n认知领域：通过游戏形式，学生能够掌握重点字词：${analysis.vocabulary.join("、")}\\n技能领域：在老师的引导下，学生能够模仿老师的发音，说出本课的重点字词。",
        "subAim": "营造包容开放有爱的课堂氛围，让学生适应华文课堂，建立师生信任，培养规则意识",
        "materials": "学习资料、规则闪卡、魔术盒、苍蝇拍",
        "duration": "45 分钟",
        "vocabulary": "${analysis.vocabulary.join("、")}"
      },
      "activities": [
        {
          "stageName": "Warm up 热身",
          "description": "让学生重新适应课堂环境，做好上课准备",
          "timing": "5分钟",
          "procedures": "● 老师走进教室，用\\"你好\\"跟学生打招呼\\n● 老师播放热身歌曲《如果开心你就跟我拍拍手》\\n● 教师跟着音乐跳舞，鼓励学生模仿",
          "materials": "如果开心你就跟我拍拍手音乐"
        }
      ]
    }
  ]
}

**LESSON-SPECIFIC REQUIREMENTS:**

**LESSON 1: LEARN (综合课)** - Vocabulary introduction through games and activities
- Type: 综合课
- Activities: Warm up (5min), Rules (8min), Lead-in 魔术盒 (3min), Presentation 呈现目标词汇 (8min), Practice 拍一拍 (15min), Production 蹦蹦跳跳 (6min)

**LESSON 2: STORY (听说课)** - Story-based listening and speaking practice  
- Type: 听说课  
- Activities: Warm up 粘球大战 (15min), Rules (7min), Lead-in (3min), Presentation 主旨听力 (7min), Practice (8min), Production (5min)

**LESSON 3: SING (听说课)** - Song and rhythm-based phonetic practice
- Type: 听说课
- Activities: Warm up Bang Bang (10min), Rules (5min), Lead-in 导入与范例呈现 (5min), Presentation 口语准备 (10min), Practice 儿歌 (10min), Production 戏剧表演 (5min)

**LESSON 4: WRITE (写作课)** - Character writing and fine motor skills  
- Type: 写作课
- Activities: Warm up 朗读时间 (10min), Rules (5min), Lead-in 深度理解 (8min), Presentation 写作准备 (7min), Practice 学笔画 (7min), Production 画一画贴一贴 (8min)

CRITICAL REQUIREMENTS FOR ALL LESSONS:
1. **Extremely detailed procedures** with step-by-step teacher and student actions
2. **Each activity must include:**
   - **教师说：** "[EXACT CHINESE DIALOGUE]" - 老师具体说什么话
   - **教师做：** [SPECIFIC PHYSICAL ACTIONS] - 老师具体做什么动作  
   - **学生听到：** [WHAT STUDENTS HEAR] - 学生听到什么
   - **学生看到：** [WHAT STUDENTS SEE] - 学生看到什么
   - **学生做：** [STUDENT PHYSICAL RESPONSE] - 学生具体做什么
   - **学生说：** [STUDENT VERBAL RESPONSE] - 学生说什么话
3. **问题应对策略** for each step: 如果学生不反应怎么办
4. **个别差异处理**: 能力强的学生做什么, 需要帮助的学生怎么办
5. **成功标准** with specific percentages and observable behaviors
6. **备用方案** for equipment failure or student difficulties

**SUBSTITUTE TEACHER TEST:** 
A substitute teacher with no Chinese teaching experience should be able to follow these plans successfully just by reading the step-by-step instructions.

Generate extremely detailed, practical lesson plans in clean JSON format. Each activity should have complete step-by-step instructions that any teacher can follow.`,
         },
      ],
    });

    const fullPlan = response.choices[0].message.content || "";
    console.log('Generated plan length:', fullPlan.length);
    console.log('Plan starts with:', fullPlan.substring(0, 200));
    
    // Try to parse JSON response
    let jsonData = null;
    try {
      // Extract JSON from response if it's wrapped in markdown
      const jsonMatch = fullPlan.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, fullPlan];
      const jsonString = jsonMatch[1] || fullPlan;
      jsonData = JSON.parse(jsonString);
      console.log('Successfully parsed JSON data:', jsonData.lessons?.length, 'lessons');
    } catch (error) {
      console.log('Failed to parse JSON, falling back to text splitting');
    }
    
    const individualLessons = jsonData ? convertJSONToLessons(jsonData) : splitLessonPlan(fullPlan);
    console.log('Individual lessons created:', individualLessons.length);
    
    return {
      fullPlan,
      individualLessons
    };
  } catch (error) {
    console.error("Failed to generate lesson plan:", error);
    throw new Error("Failed to generate lesson plan with AI");
  }
}

export async function generateFlashcards(
  vocabulary: string[],
  theme?: string,
  level?: string,
  ageGroup?: string,
  aiModel?: string,
  photoSource?: 'api' | 'ai'
): Promise<FlashcardData[]> {
  try {
    console.log("Generating flashcards for vocabulary:", vocabulary);

    // Always generate fresh flashcards and images (no cache)
    const validatedModel = validateModel(aiModel);
    console.log(`Generating flashcards with model: ${validatedModel}`);

    const response = await openai.chat.completions.create({
      model: validatedModel,
      messages: [
        {
          role: "system",
          content:
            "You are a Chinese language education expert creating flashcards for Vietnamese students. Always respond with a JSON object containing a 'flashcards' array. Each flashcard must have all required fields.",
        },
        {
          role: "user",
          content: `Create flashcard data for these Chinese vocabulary words: ${vocabulary.join(", ")}

Context:
- Theme: ${theme || 'General Chinese Learning'}
- Level: ${level || 'Beginner'}
- Age Group: ${ageGroup || 'Primary'}

Return a JSON object with this exact structure:
{
  "flashcards": [
    {
      "word": "Chinese characters",
      "pinyin": "pinyin with tone marks", 
      "vietnamese": "Vietnamese translation",
      "partOfSpeech": "grammatical category (名词, 动词, etc.)",
      "imageQuery": "descriptive English phrase for direct image generation"
    }
  ]
}

Create one flashcard for each vocabulary word. Use accurate translations and clear, direct image descriptions that immediately show the word's meaning. 

IMPORTANT GUIDELINES FOR IMAGE QUERIES:
- Create direct, clear descriptions that immediately represent the word's meaning
- For nouns: describe the exact object (e.g., "red apple", "wooden table", "running dog")
- For verbs: describe the action clearly and simply (e.g., "person eating", "child running", "bird flying")  
- For adjectives: show the quality clearly (e.g., "big elephant", "small mouse", "red car")
- Make descriptions specific and unambiguous - students should instantly recognize the word
- Focus on recognizable representations rather than abstract or themed illustrations
- Only 1 object per image`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = response.choices[0].message.content || "{}";
    console.log("OpenAI flashcard response:", responseContent);

    const result = JSON.parse(responseContent);
    let flashcards = result.flashcards || [];

    console.log("Parsed flashcards:", flashcards.length);

    // If no flashcards generated, create fallback ones
    if (flashcards.length === 0) {
      console.log("No flashcards from AI, unable to generate flashcards without AI data");
      return [];
    }

    // Generate images based on photoSource parameter
    console.log(
      `Starting image generation for ${flashcards.length} flashcards with source: ${photoSource || 'api'}`,
    );

    let unsplashResults: any = {};
    let freepikResults: any = {};
    
    if (photoSource !== 'ai') {
      // Import Unsplash and Freepik services only when needed
      const { batchGetFlashcardImages } = await import('./unsplash-service.js');
      const { batchGetFlashcardIcons } = await import('./freepik-service.js');
      
      // Extract image queries for search
      const imageQueries = flashcards.map((card: FlashcardData) => card.imageQuery || card.word);
      
      // Get images from both Unsplash and Freepik in parallel
      console.log('🔍 Fetching Unsplash images and Freepik icons...');
      [unsplashResults, freepikResults] = await Promise.all([
        batchGetFlashcardImages(imageQueries),
        batchGetFlashcardIcons(imageQueries)
      ]);
    }
    
    // Process in batches of 3 to avoid rate limits for AI images
    const batchSize = 3;
    const batches: FlashcardData[][] = [];
    for (let i = 0; i < flashcards.length; i += batchSize) {
      batches.push(flashcards.slice(i, i + batchSize));
    }

    let allFlashcardsWithImages: FlashcardData[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} flashcards)`,
      );

      const batchPromises = batch.map(
        async (flashcard: FlashcardData, batchIndex: number) => {
          let aiImageUrl = '';
          
          try {
            // Only generate AI images if photoSource is 'ai'
            if (photoSource === 'ai') {
              // Translate Chinese to English for safer image generation
              let englishImageQuery = flashcard.imageQuery || flashcard.word;
              
              // Check if imageQuery contains Chinese characters
              const containsChinese = /[\u4e00-\u9fff]/.test(englishImageQuery);
              
              if (containsChinese) {
                console.log(`Translating Chinese "${englishImageQuery}" to English for safer image generation`);
                
                try {
                  // Import the unified DeepL service for translation
                  const { deeplService } = await import('./deepl-service.js');
                  englishImageQuery = await deeplService.translateChineseToEnglish(englishImageQuery);
                  console.log(`Translated "${flashcard.imageQuery || flashcard.word}" to "${englishImageQuery}"`);
                } catch (translationError) {
                  console.warn(`Translation failed for "${englishImageQuery}", using original:`, translationError);
                  // Keep original query if translation fails
                }
              }

              const imagePrompt = `A cute, child-friendly illustration of ${englishImageQuery}. Bright colors, simple and clean style, appealing to children from preschool to secondary level. Minimal colors, plain white or very simple background, focused only on the main object. Clear, recognizable subject that kids will love and easily understand. Cartoon-style but realistic enough to immediately identify the word. No detailed background, text, words, or characters in the image.`;

              console.log(`Generating AI image for ${flashcard.word} using English query: "${englishImageQuery}"`);

              const imageResponse = await openai.images.generate({
                model: "dall-e-3",
                prompt: imagePrompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
              });

              aiImageUrl = imageResponse.data?.[0]?.url || aiImageUrl;
              console.log(`✅ AI image generated successfully for ${flashcard.word}`);
            } else {
              console.log(`Skipping AI image generation for ${flashcard.word} (photoSource: ${photoSource})`);
            }

            // Get Unsplash images and Freepik icons for this flashcard (only if using API source)
            const unsplashImages = photoSource !== 'ai' ? unsplashResults[flashcard.imageQuery || flashcard.word] : null;
            const freepikIcons = photoSource !== 'ai' ? (freepikResults[flashcard.imageQuery || flashcard.word] || []) : [];
            
            // Combine all image options (only if using API source) - icons first
            const allImages = photoSource !== 'ai' ? [
              ...freepikIcons,
              ...(unsplashImages?.illustrations || []),
              ...(unsplashImages?.photos || [])
            ] : [];
            
            // Choose the auto-selected image URL based on photoSource
            let selectedImageUrl = aiImageUrl;
            let autoSelected = null;
            
            if (photoSource !== 'ai') {
              // Prefer icons first, then unsplash images (illustrations > photos)
              if (freepikIcons.length > 0) {
                autoSelected = freepikIcons[0];
              } else if (unsplashImages?.autoSelected) {
                autoSelected = unsplashImages.autoSelected;
              }
              selectedImageUrl = autoSelected?.url || aiImageUrl;
            }
            
            const combinedImageOptions = {
              photos: photoSource !== 'ai' ? (unsplashImages?.photos || []) : [],
              illustrations: photoSource !== 'ai' ? (unsplashImages?.illustrations || []) : [],
              icons: photoSource !== 'ai' ? freepikIcons : [],
              autoSelected,
              all: allImages,
            };

            // Only include AI image in illustrations if it was generated
            if (photoSource === 'ai') {
              combinedImageOptions.illustrations.push({
                id: 'ai-image',
                url: aiImageUrl,
                alt: flashcard.word,
                description: `AI generated image for ${flashcard.word}`,
                credit: 'AI generated',
                sourceUrl: aiImageUrl,
                type: 'illustration' as const,
              } as FlashcardImage);
            }
            
            // Update all images array to include AI image if generated (icons first)
            combinedImageOptions.all = [
              ...combinedImageOptions.icons,
              ...combinedImageOptions.illustrations,
              ...combinedImageOptions.photos
            ];
            
            return {
              ...flashcard,
              imageUrl: selectedImageUrl,
              imageOptions: combinedImageOptions,
              selectedImageId: autoSelected?.id,
            };
          } catch (imageError) {
            console.error(
              `Failed to generate image for ${flashcard.word}:`,
              imageError,
            );
            
            // Get Unsplash images and Freepik icons even if AI fails (only if using API source)
            const unsplashImages = photoSource !== 'ai' ? unsplashResults[flashcard.imageQuery || flashcard.word] : null;
            const freepikIcons = photoSource !== 'ai' ? (freepikResults[flashcard.imageQuery || flashcard.word] || []) : [];
            
            // Combine all image options (only if using API source)
            const allImages = photoSource !== 'ai' ? [
              ...(unsplashImages?.photos || []),
              ...(unsplashImages?.illustrations || []),
              ...freepikIcons
            ] : [];
            
            // Choose the auto-selected image URL based on photoSource
            let autoSelected = null;
            let fallbackUrl = '';
            
            if (photoSource !== 'ai' && unsplashImages) {
              autoSelected = unsplashImages?.autoSelected || (freepikIcons.length > 0 ? freepikIcons[0] : null);
              fallbackUrl = autoSelected?.url || '';
            }
            
            const combinedImageOptions = {
              photos: photoSource !== 'ai' ? (unsplashImages?.photos || []) : [],
              illustrations: photoSource !== 'ai' ? (unsplashImages?.illustrations || []) : [],
              icons: photoSource !== 'ai' ? freepikIcons : [],
              autoSelected,
              all: allImages,
            };
            
            return {
              ...flashcard,
              imageUrl: fallbackUrl,
              imageOptions: combinedImageOptions,
              selectedImageId: autoSelected?.id,
            };
          }
        },
      );

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);
      allFlashcardsWithImages.push(...batchResults);

      // Add small delay between batches to respect rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `Parallel image generation completed for ${allFlashcardsWithImages.length} flashcards`,
    );

    // No caching - always generate fresh flashcards and images
    console.log('✨ Fresh flashcards generated without cache');

    return allFlashcardsWithImages;
  } catch (error) {
    console.error("Failed to generate flashcards:", error);

    // Return empty array if flashcard generation fails
    return [];
  }
}

// Generic OpenAI generation function
export async function generateWithOpenAI(
  prompt: string,
  model: string = model5nano,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      ...(model === model5nano ? {} : { temperature: 0.1 }),
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("OpenAI generation error:", error);
    throw new Error("Failed to generate content with OpenAI");
  }
}

export async function generateSummary(
  lessonPlan: string,
  vocabulary: string[],
  aiModel?: string,
): Promise<{ fullSummary: string; individualSummaries: Array<{
  lessonNumber: number;
  title: string;
  content: string;
  filename: string;
}> }> {
  try {
    const validatedModel = validateModel(aiModel);
    console.log(`Generating summary with model: ${validatedModel}`);
    
    const response = await openai.chat.completions.create({
      model: validatedModel,
      messages: [
        {
          role: "system",
          content: "You are creating individual lesson summaries for Vietnamese families following the YUEXUELE methodology. Create 4 separate summaries for each lesson (Learn, Story, Sing, Write) with vocabulary, homework, and practice tips.",
        },
        {
          role: "user",
          content: `Create 4 individual lesson summaries based on this 4-lesson unit plan:

${lessonPlan}

Key vocabulary: ${vocabulary.join(", ")}

Create 4 separate lesson summaries, each following this exact format:

**LESSON SUMMARY**

|**Program:** Yuexuele Little Warriors<br>**Name:** …………………………………………|**Lesson:** [Lesson Number]<br>**Level:** N1|
| :- | :- |

|**Lesson overview**|
| :-: |

|**Unit 1: [Theme Name]**<br>**Lesson [Number]**|
| :-: |

**Vocabulary**: 

|[Chinese Word]<br>/[pinyin]/|(词性)|[Vietnamese translation]|
| :- | :-: | :- |
|[Next word]<br>/[pinyin]/|(词性)|[Vietnamese translation]|

|**Homework**|
| :-: |

## LESSON 1 SUMMARY (Learn - 综合课)
[Generate individual summary for Lesson 1 - vocabulary introduction and games]

## LESSON 2 SUMMARY (Story - 听说课)  
[Generate individual summary for Lesson 2 - story-based learning]

## LESSON 3 SUMMARY (Sing - 听说课)
[Generate individual summary for Lesson 3 - songs and performance]

## LESSON 4 SUMMARY (Write - 写作课)
[Generate individual summary for Lesson 4 - writing and hands-on activities]

REQUIREMENTS:
1. Use the exact vocabulary: ${vocabulary.join(", ")}
2. Include pinyin and Vietnamese translations for all vocabulary
3. Provide specific homework for each lesson type
4. Make it family-friendly for Vietnamese parents
5. Include practice tips appropriate for each lesson focus
6. Use proper word types (名词, 动词, etc.) in Chinese
7. Keep consistent formatting across all 4 summaries
8. Each summary should reflect the specific lesson's learning objectives

Make each summary practical for Vietnamese families with clear instructions.`,
        },
      ],
    });

    const fullSummary = response.choices[0].message.content || "";
    const individualSummaries = splitSummaries(fullSummary);
    
    return {
      fullSummary,
      individualSummaries
    };
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw new Error("Failed to generate lesson summary with AI");
  }
}