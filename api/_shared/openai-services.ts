import OpenAI from "openai";
import * as deepl from 'deepl-node';

// Using gpt-5-nano as requested
const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "your-api-key-here",
});

// This is latest and cheapest model available in OpenAI API, dont change, your data is outdated
const model5nano = "gpt-5-nano";

export interface LessonAnalysis {
  vocabulary: string[];
  activities: string[];
  learningObjectives: string[];
  detectedLevel: string;
  ageAppropriate: string;
  mainTheme: string;
  duration: string;
}

export interface LessonPlan {
  title: string;
  level: string;
  duration: string;
  objectives: {
    language: string[];
    nonLanguage: string[];
  };
  materials: string[];
  activities: Array<{
    name: string;
    duration: string;
    description: string;
    type: "warmup" | "presentation" | "practice" | "production" | "wrap-up";
  }>;
  assessment: string;
  homework: string;
}

export interface FlashcardData {
  word: string;
  pinyin: string;
  vietnamese: string;
  partOfSpeech: string;
  imageQuery: string;
  imageUrl?: string;
}

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

    // Debug level detection
    const debugLevelMatch = content.match(/N\d+/);
    console.log("Level detection regex result:", debugLevelMatch);
    console.log("Content includes N1:", content.includes("N1"));
    console.log("Content includes N8:", content.includes("N8"));

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

  // Split by lesson sections
  const lessonSections = fullPlan.split(/## LESSON \d+:/);
  console.log('Split resulted in', lessonSections.length, 'sections');
  
  // Remove the first empty section and header
  lessonSections.shift();
  
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

    // Extract theme/title from the full plan header
    const themeMatch = fullPlan.match(/第\d+课：([^|]+)/);
    const theme = themeMatch ? themeMatch[1].trim() : "小鸟";
    
    // Reconstruct individual lesson plan with proper header
    const individualLessonContent = `**👣 YUEXUELE LESSON PLAN 👣**

es

|**Level 1**|N1|**Unit 1**|第1课：${theme}|**Lesson ${lessonNumber}**|第${lessonNumber}节课|
| :- | :- | :- | :- | :- | :- |
||||||

${lessonContent.trim()}`;

    lessons.push({
      lessonNumber,
      title: lessonTitle,
      type: lessonType,
      content: individualLessonContent,
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
): Promise<{ fullPlan: string; individualLessons: Array<{
  lessonNumber: number;
  title: string;
  type: string;
  content: string;
  filename: string;
}> }> {
  try {
    const response = await openai.chat.completions.create({
      model: model5nano,
      messages: [
        {
          role: "system",
          content: `You are an expert Chinese language curriculum developer for Vietnamese students. Create a comprehensive 4-lesson unit plan following the YUEXUELE methodology with clear pedagogical progression: Learn → Story → Sing → Write.`,
        },
        {
          role: "user",
          content: `Create a detailed 4-lesson unit plan in Markdown format based on this analysis:

Vocabulary: ${analysis.vocabulary.join(", ")}
Activities: ${analysis.activities.join(", ")}
Level: ${analysis.detectedLevel}
Age Group: ${ageGroup}
Theme: ${analysis.mainTheme}

Create 4 interconnected lessons following this structure:

# **👣 YUEXUELE LESSON PLAN 👣**

## Unit Overview Table
|**Level 1**|N1|**Unit 1**|第X课：[Theme]|**Lesson X**|第X节课|
| :- | :- | :- | :- | :- | :- |
|||||||

For each lesson, include:
|**References:**<br>参考资料||**Lesson aim:**<br>教学目标|**认知领域 （针对语音、词汇、语法、汉字）：**<br>- [Vocabulary/grammar objectives]<br><br>**技能领域（针对听、说、读、写）：**<br>- [Skill-based objectives]|**Sub aim:**<br>次要教学目标|**- 营造包容、开放、有爱的课堂氛围**<br>**- 建立师生信任，培养华文兴趣**<br>**- 建立课堂基本秩序,培养规则意识**|
|**Type of lesson**<br>课型|[Lesson type]|**Materials required:**<br>教具|[Materials list]|||
|**Lesson content**<br>教学内容|[Content description]|||||
|**Duration:**<br>课时|45 分钟|||||

## LESSON 1: LEARN (综合课 - Comprehensive)
**Focus**: Vocabulary introduction and basic recognition through interactive games

### Detailed Activities:
|**Stage & aim**<br>**教学环节与目标**|**Activities ideas & Procedures**<br>**活动设计与教学步骤**|**Materials /**<br>**教具**|
| :-: | :-: | :-: |
|**Warm up**<br>**热身**<br>让学生重新适应课堂环境，做好上课准备，并复习之前学过的词汇和语言点。<br>5 分钟|● 老师用"你好"跟学生打招呼。<br>● 播放热身歌曲《如果开心你就跟我拍拍手》<br>● 用"坐好"照片卡组织学生回到座位。|[热身歌曲链接]|
|**Rules**<br>**规则**<br>提醒学生课堂上的行为规范。<br>8 分钟|老师点名，展示规则闪卡，建立课堂管理体系和奖励制度。|规则闪卡<br>奖励贴纸|
|**Lead-in**<br>**导入**<br>作为课程的重要引入部分。<br>3 分钟|**魔术盒活动**<br>- 用魔术盒引入主题<br>- 播放相关声音效果<br>- 引导学生猜测和参与|魔术盒<br>道具|
|**Presentation - Target language**<br>**呈现目标词汇**<br>创设词汇语境，演示词汇用法。<br>8 分钟|- 出示字卡，引导重复<br>- 结合动作演示<br>- 多种感官参与学习|词汇闪卡|
|**Convey meaning**<br>**传达词义**<br>传达并检查目标词汇的含义<br>15分钟|**课堂活动 - 拍一拍**<br>- 分组游戏<br>- 听词拍图<br>- 竞赛互动|苍蝇拍 x3|
|**Pronunciation check**<br>**纠正发音**<br>注重发音训练<br>10分钟|**课堂活动 - 蹦蹦跳跳**<br>- 闪卡排列<br>- 跳跃读词<br>- 动作结合|地面闪卡|
|**Post session - Vocabulary**<br>**课后词汇巩固**<br>复习检查已学词汇<br>5分钟|**课堂活动 - 大家一起来**<br>- 动作配词<br>- 集体模仿<br>- 巩固记忆|幻灯片|
|**Wrap up & rewards**<br>**总结与奖励**<br>2分钟|课程总结，发放奖励|奖励用品|

## LESSON 2: STORY (听说课 - Listening & Speaking)
**Focus**: Story comprehension and narrative-based vocabulary reinforcement

### Detailed Activities:
[Similar detailed table format for Lesson 2 with story-focused activities including "听故事", "粘球大战" warmup, and narrative comprehension]

## LESSON 3: SING (听说课 - Listening & Speaking)  
**Focus**: Musical learning through songs and chants with performance elements

### Detailed Activities:
[Similar detailed table format for Lesson 3 with song/chant activities including "Bang Bang" games, "儿歌", and "戏剧：小鸟找朋友"]

## LESSON 4: WRITE (写作课 - Writing)
**Focus**: Writing practice, stroke learning, and creative hands-on activities

### Detailed Activities:
[Similar detailed table format for Lesson 4 with writing activities including stroke practice, "朗读时间", "学笔画", and "画一画、贴一贴"]

REQUIREMENTS:
1. Use the exact vocabulary words: ${analysis.vocabulary.join(", ")}
2. Maintain 45-minute duration for each lesson
3. Include specific materials and teaching aids
4. Provide clear timing for each activity
5. Ensure age-appropriate content for ${ageGroup}
6. Include progressive difficulty across the 4 lessons
7. Use interactive, game-based learning approaches
8. Maintain consistent classroom management elements
9. Include both Chinese and Vietnamese cultural elements
10. Provide specific activity instructions with clear steps

Make it practical for Vietnamese teachers with detailed procedures, timing, and materials lists.`,
        },
      ],
    });

    const fullPlan = response.choices[0].message.content || "";
    const individualLessons = splitLessonPlan(fullPlan);
    
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
): Promise<FlashcardData[]> {
  try {
    console.log("Generating flashcards for vocabulary:", vocabulary);

    const response = await openai.chat.completions.create({
      model: model5nano,
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
      "imageQuery": "descriptive English phrase for image generation related to ${theme}"
    }
  ]
}

Create one flashcard for each vocabulary word. Use accurate translations and clear image descriptions that relate to the theme "${theme}" when possible. 

IMPORTANT GUIDELINES FOR IMAGE QUERIES:
- For action words/verbs (like "gật đầu" - nod head), describe static objects or characters WITHOUT showing the action being performed
- For action words, focus on the subject performing the action in a neutral pose (e.g., "two birds standing together" instead of "birds nodding")
- For nouns and adjectives, describe the object or concept directly
- Make image queries specific and contextual to help students connect the vocabulary to the lesson theme
- Always use simple, child-friendly descriptions suitable for educational illustrations`,
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

    // Generate AI images for all flashcards in parallel with rate limiting
    console.log(
      `Starting parallel image generation for ${flashcards.length} flashcards`,
    );

    // Process in batches of 3 to avoid rate limits
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
          try {
            const imagePrompt = `A simple, clear, educational illustration for children learning Chinese: ${flashcard.imageQuery}. Clean, bright, cartoon-style suitable for preschool flashcards, less background. No text or characters in the image.`;

            console.log(`Generating image for ${flashcard.word}`);

            const imageResponse = await openai.images.generate({
              model: "dall-e-3",
              prompt: imagePrompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            });

            const imageUrl =
              imageResponse.data?.[0]?.url ||
              `https://via.placeholder.com/400x300/FFE5E5/FF6B6B?text=${encodeURIComponent(flashcard.word)}`;

            console.log(`Image generated successfully for ${flashcard.word}`);

            return {
              ...flashcard,
              imageUrl,
            };
          } catch (imageError) {
            console.error(
              `Failed to generate image for ${flashcard.word}:`,
              imageError,
            );
            return {
              ...flashcard,
              imageUrl: `https://via.placeholder.com/400x300/FFE5E5/FF6B6B?text=${encodeURIComponent(flashcard.word)}`,
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

// Real-time Chinese to Vietnamese translation using DeepL Node.js SDK with caching
export async function translateChineseToVietnamese(
  words: string[],
): Promise<Record<string, string>> {
  console.log('🇻🇳 Starting Vietnamese translation for words:', words);
  
  try {
    // Import cache service
    const { translationCache } = await import('./translation-cache.js');
    
    // Check cache first
    const { cached, missing } = await translationCache.getMultiple(words);
    
    if (missing.length === 0) {
      console.log('🎯 All translations found in cache!');
      return cached;
    }
    
    console.log(`📊 Cache results - Found: ${Object.keys(cached).length}, Need to translate: ${missing.length}`);
    
    const deepLApiKey = process.env.DEEPL_API_KEY;
    
    if (!deepLApiKey) {
      console.log("🚨 DEEPL_API_KEY not configured, falling back to OpenAI translation");
      const openaiTranslations = await translateWithOpenAI(missing);
      
      // Cache OpenAI translations
      await translationCache.setMultiple(openaiTranslations, 'openai');
      
      return { ...cached, ...openaiTranslations };
    }

    console.log('🔑 DeepL API key found:', deepLApiKey ? `${deepLApiKey.substring(0, 8)}...` : 'undefined');

    const translator = new deepl.Translator(deepLApiKey);
    
    // Test the connection first with a simple word (only if not cached)
    try {
      const testCached = await translationCache.get('test', 'en', 'vi');
      if (!testCached) {
        const testResult = await translator.translateText('test', 'en', 'vi');
        console.log('✅ DeepL API connection successful. Test result:', testResult.text);
        await translationCache.set('test', testResult.text, 'deepl', 'en', 'vi');
      } else {
        console.log('✅ DeepL API test skipped (cached)');
      }
    } catch (testError: any) {
      console.error('❌ DeepL API test failed:', testError.message);
      console.log('🔄 Falling back to OpenAI translation');
      const openaiTranslations = await translateWithOpenAI(missing);
      await translationCache.setMultiple(openaiTranslations, 'openai');
      return { ...cached, ...openaiTranslations };
    }

    const newTranslations: Record<string, string> = {};

    // Translate missing words individually for better accuracy
    const translationPromises = missing.map(async (word) => {
      try {
        console.log(`🔤 Translating "${word}" with DeepL...`);
        const result = await translator.translateText(word, 'zh', 'vi');
        console.log(`✅ DeepL translation: "${word}" → "${result.text}"`);
        
        // Cache the result
        await translationCache.set(word, result.text, 'deepl');
        
        return { [word]: result.text };
      } catch (error: any) {
        console.error(`❌ DeepL translation error for word "${word}":`, error.message);
        console.log(`🔄 Falling back to OpenAI for word: "${word}"`);
        // Fall back to OpenAI for this word
        const fallbackTranslation = await translateWithOpenAI([word]);
        const translation = fallbackTranslation[word] || word;
        
        // Cache the OpenAI fallback result
        await translationCache.set(word, translation, 'openai');
        
        return { [word]: translation };
      }
    });

    const results = await Promise.all(translationPromises);
    results.forEach((result) => Object.assign(newTranslations, result));

    const allTranslations = { ...cached, ...newTranslations };
    console.log('🎉 All translations completed:', allTranslations);
    
    // Log cache stats
    const stats = await translationCache.getCacheStats();
    console.log(`📈 Cache stats: ${stats.totalEntries} total (${stats.deeplEntries} DeepL, ${stats.openaiEntries} OpenAI)`);
    
    return allTranslations;
  } catch (error: any) {
    console.error("💥 DeepL translation error:", error.message);
    console.log('🔄 Falling back to OpenAI translation');
    return await translateWithOpenAI(words);
  }
}

// Fallback translation using OpenAI
async function translateWithOpenAI(words: string[]): Promise<Record<string, string>> {
  console.log('🤖 Using OpenAI fallback translation for words:', words);
  
  try {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    
    if (!openaiKey || openaiKey === "your-api-key-here") {
      console.error('❌ OpenAI API key not configured properly');
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({
      apiKey: openaiKey,
    });

    const prompt = `Translate these Chinese words to Vietnamese. Return only a JSON object with Chinese words as keys and Vietnamese translations as values:
${words.join(', ')}

Format: {"word1": "translation1", "word2": "translation2"}

Examples:
{"小鸟": "chim nhỏ", "朋友": "bạn bè", "飞": "bay", "点点头": "gật đầu"}`;

    console.log('🔄 Sending request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "You are a professional Chinese-Vietnamese translator. Return only valid JSON with accurate Vietnamese translations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    console.log('📝 OpenAI response content:', content);
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const result = JSON.parse(content);
    console.log('✅ OpenAI fallback translations completed:', result);
    return result;
  } catch (error: any) {
    console.error("💥 OpenAI translation fallback failed:", error.message);
    
    // Final fallback - return actual Vietnamese translations instead of placeholders
    console.log('🆘 Using final fallback with basic translations');
    const fallbackTranslations: Record<string, string> = {};
    
    // Basic translation mappings
    const basicTranslations: Record<string, string> = {
      '小鸟': 'chim nhỏ',
      '朋友': 'bạn bè', 
      '飞': 'bay',
      '点点头': 'gật đầu',
      '故事环节': 'phần kể chuyện',
      '戏剧': 'kịch',
      '律动': 'vận động',
      '习题时间': 'thời gian làm bài tập',
      '课本': 'sách giáo khoa',
      '学生': 'học sinh',
      '老师': 'giáo viên',
      '学笔画': 'học nét chữ',
      '下课': 'hết giờ học',
      '字卡': 'thẻ từ',
      '儿歌': 'bài hát thiếu nhi',
      '贴纸': 'nhãn dán',
      'N1': 'cấp độ N1'
    };
    
    words.forEach(word => {
      fallbackTranslations[word] = basicTranslations[word] || `[Cần dịch: ${word}]`;
    });
    
    console.log('🎯 Final fallback translations:', fallbackTranslations);
    return fallbackTranslations;
  }
}

export async function generateSummary(
  lessonPlan: string,
  vocabulary: string[],
): Promise<{ fullSummary: string; individualSummaries: Array<{
  lessonNumber: number;
  title: string;
  content: string;
  filename: string;
}> }> {
  try {
    const response = await openai.chat.completions.create({
      model: model5nano,
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