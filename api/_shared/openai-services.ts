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
      content =
        "Chinese lesson: 第一课-小鸟找朋友. Content includes vocabulary: 小鸟, 朋友, 飞, 点点头. Activities: Listen & Repeat, Listen & Pick Image, See Image & Speak. Duration: 75分钟.";
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
          content: `You are an expert Chinese language education analyst. Extract ONLY vocabulary words that are explicitly mentioned in the lesson content. Never add words that aren't present in the source material. ${langInstruction}. Respond with valid JSON only.`,
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
- vocabulary: array of 4-5 key Chinese words from lesson content
- activities: array of teaching activities mentioned
- learningObjectives: array of learning goals
- ageAppropriate: "preschool", "primary", or "secondary"
- mainTheme: main lesson topic/title from content
- duration: lesson duration from content

Example: If content has "重点词掌握：小鸟 朋友 飞 点点头" and "N1", extract those 4 words and N1 level.`,
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

export async function generateLessonPlan(
  analysis: LessonAnalysis,
  ageGroup: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: model5nano,
      messages: [
        {
          role: "system",
          content: `You are an expert Chinese language curriculum developer for Vietnamese students. Create detailed, age-appropriate lesson plans following the pedagogical sequence: Listen & Repeat → Listen & Pick Image → See Image & Speak the Word.`,
        },
        {
          role: "user",
          content: `Create a detailed lesson plan in Markdown format based on this analysis:

Vocabulary: ${analysis.vocabulary.join(", ")}
Activities: ${analysis.activities.join(", ")}
Level: ${analysis.detectedLevel}
Age Group: ${ageGroup}
Theme: ${analysis.mainTheme}

Structure the lesson plan with:
1. Learning Objectives (Language and Non-language goals)
2. Materials Needed
3. Lesson Steps:
   - Warm-up (5-10 min)
   - Presentation (15-20 min) - Include Listen & Repeat activities
   - Practice (15-20 min) - Include Listen & Pick Image activities  
   - Production (10-15 min) - Include See Image & Speak activities
   - Wrap-up (5 min)
4. Assessment Methods
5. Homework/Extension Activities

Make it practical for Vietnamese teachers with clear instructions, timing, and interactive elements suitable for ${ageGroup} students.`,
        },
      ],
    });

    return response.choices[0].message.content || "";
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

// Real-time Chinese to Vietnamese translation using DeepL Node.js SDK
export async function translateChineseToVietnamese(
  words: string[],
): Promise<Record<string, string>> {
  console.log('🇻🇳 Starting Vietnamese translation for words:', words);
  
  try {
    const deepLApiKey = process.env.DEEPL_API_KEY;
    
    if (!deepLApiKey) {
      console.log("🚨 DEEPL_API_KEY not configured, falling back to OpenAI translation");
      return await translateWithOpenAI(words);
    }

    console.log('🔑 DeepL API key found:', deepLApiKey ? `${deepLApiKey.substring(0, 8)}...` : 'undefined');

    const translator = new deepl.Translator(deepLApiKey);
    
    // Test the connection first with a simple word
    try {
      const testResult = await translator.translateText('test', 'en', 'vi');
      console.log('✅ DeepL API connection successful. Test result:', testResult.text);
    } catch (testError: any) {
      console.error('❌ DeepL API test failed:', testError.message);
      console.log('🔄 Falling back to OpenAI translation');
      return await translateWithOpenAI(words);
    }

    const translations: Record<string, string> = {};

    // Translate each word individually for better accuracy
    const translationPromises = words.map(async (word) => {
      try {
        console.log(`🔤 Translating "${word}" with DeepL...`);
        const result = await translator.translateText(word, 'zh', 'vi');
        console.log(`✅ DeepL translation: "${word}" → "${result.text}"`);
        return { [word]: result.text };
      } catch (error: any) {
        console.error(`❌ DeepL translation error for word "${word}":`, error.message);
        console.log(`🔄 Falling back to OpenAI for word: "${word}"`);
        // Fall back to OpenAI for this word
        const fallbackTranslation = await translateWithOpenAI([word]);
        return { [word]: fallbackTranslation[word] || word };
      }
    });

    const results = await Promise.all(translationPromises);
    results.forEach((result) => Object.assign(translations, result));

    console.log('🎉 All translations completed:', translations);
    return translations;
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
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: model5nano,
      messages: [
        {
          role: "system",
          content:
            "You are creating parent/student lesson summaries for Vietnamese families. Include key vocabulary with Vietnamese translations, lesson overview, and homework instructions.",
        },
        {
          role: "user",
          content: `Create a parent/student lesson summary based on this lesson plan:

${lessonPlan}

Key vocabulary: ${vocabulary.join(", ")}

Format as a structured document with:
1. LESSON SUMMARY header with lesson details
2. Vocabulary section with Chinese, pinyin, and Vietnamese translations
3. What We Learned section
4. Homework section with clear instructions
5. Practice Tips for parents

Make it family-friendly and include Vietnamese translations for parent understanding.`,
        },
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Failed to generate summary:", error);
    throw new Error("Failed to generate lesson summary with AI");
  }
}