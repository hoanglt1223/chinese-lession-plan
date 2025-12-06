import OpenAI from "openai";
import { eq } from 'drizzle-orm';
import { cacheGet, cacheSet } from './redis.js';
import { createHash } from 'crypto';
import type { FlashcardData, FlashcardImage } from '../../shared/schema.js';
import { PromptService, buildAnalysisPrompt, buildLessonPlanPrompt, buildSingleLessonPlanPrompt, buildFlashcardPrompt, buildSummaryPrompt } from './prompt-service.js';
import { db } from './database.js';
import { activities } from './db-schema.js';

// Using GLM-4.6 as requested
let openaiInstance: OpenAI | null = null;

function getOpenAI() {
  if (!openaiInstance) {
    console.log('Initializing OpenAI with:', {
      baseURL: process.env.OPENAI_BASE_URL,
      apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : 'undefined'
    });
    
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "your-api-key-here",
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  return openaiInstance;
}

// This is latest and cheapest model available in OpenAI API, dont change, your data is outdated
const model5nano = "GLM-4.6";

// Valid models for the application
const VALID_MODELS = ["gpt-5-nano", "gpt-5-mini", "gpt-4o", "GLM-4.6"] as const;
type ValidModel = typeof VALID_MODELS[number];

// Validate and sanitize model input
function validateModel(model?: string): ValidModel {
  if (!model || !VALID_MODELS.includes(model as ValidModel)) {
    console.log(`Invalid or missing model "${model}", defaulting to GLM-4.6`);
    return "GLM-4.6";
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

    // Use the new prompt service to get analysis prompts
    const promptResult = await buildAnalysisPrompt({
      content: content.substring(0, 10000),
      langInstruction
    });
    
    if (!promptResult) {
      throw new Error('Failed to build analysis prompt');
    }
    
    const { systemPrompt, userPrompt } = promptResult;

    const response = await getOpenAI().chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
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
    // Return empty structure instead of hardcoded fallback
    // This prevents contamination of results with fake data
    throw new Error(`AI content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Use the new prompt service to get lesson plan prompts
    const promptResult = await buildLessonPlanPrompt({
      vocabulary: analysis.vocabulary.join(", "),
      theme: analysis.mainTheme,
      ageGroup,
      vocabularyJoined: analysis.vocabulary.join("、")
    });
    
    if (!promptResult) {
      throw new Error('Failed to build lesson plan prompt');
    }
    
    const { systemPrompt, userPrompt } = promptResult;

    const response = await getOpenAI().chat.completions.create({
      model: validatedModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
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

    // Use the new prompt service to get flashcard prompts
    const promptResult = await buildFlashcardPrompt({
      vocabulary: vocabulary.join(", "),
      theme: theme || 'General Chinese Learning',
      level: level || 'Beginner',
      ageGroup: ageGroup || 'Primary'
    });
    
    if (!promptResult) {
      throw new Error('Failed to build flashcard prompt');
    }
    
    const { systemPrompt, userPrompt } = promptResult;

    const response = await getOpenAI().chat.completions.create({
      model: validatedModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = response.choices[0].message.content || "{}";
    console.log("OpenAI flashcard response:", responseContent);

    const result = JSON.parse(responseContent);
    let flashcards = Array.isArray(result) ? result : (result.flashcards || []);

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
    let svgIconResults: any = {};
    let freepikResults: any = {};
    
    if (photoSource !== 'ai') {
      // Import Unsplash, SVG icon, and Freepik services only when needed
      const { batchGetFlashcardImages } = await import('./unsplash-service.js');
      const { batchGetFlashcardSVGIcons } = await import('./svg-icon-service.js');
      const { batchGetFlashcardIcons } = await import('./freepik-service.js');
      
      // Extract image queries for search
      const imageQueries = flashcards.map((card: FlashcardData) => card.imageQuery || card.word);
      
      // Get images from Unsplash, SVG icons, and Freepik icons in parallel
      console.log('🔍 Fetching Unsplash images, SVG icons, and Freepik icons...');
      [unsplashResults, svgIconResults, freepikResults] = await Promise.all([
        batchGetFlashcardImages(imageQueries),
        batchGetFlashcardSVGIcons(imageQueries),
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

              const imageResponse = await getOpenAI().images.generate({
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

            // Get Unsplash images and high-quality SVG icons for this flashcard (only if using API source)
            const unsplashImages = photoSource !== 'ai' ? unsplashResults[flashcard.imageQuery || flashcard.word] : null;
            const svgIcons = photoSource !== 'ai' ? (svgIconResults[flashcard.imageQuery || flashcard.word] || []) : [];
            
            // Combine all image options (only if using API source) - high-quality SVG icons first
            const allImages = photoSource !== 'ai' ? [
              ...svgIcons,
              ...(unsplashImages?.illustrations || []),
              ...(unsplashImages?.photos || [])
            ] : [];
            
            // Choose the auto-selected image URL based on photoSource
            let selectedImageUrl = aiImageUrl;
            let autoSelected = null;
            
            if (photoSource !== 'ai') {
              // Prefer high-quality SVG icons first, then unsplash images (illustrations > photos)
              if (svgIcons.length > 0) {
                autoSelected = svgIcons[0]; // SVG icons are always high quality
                selectedImageUrl = autoSelected.url;
                console.log(`✅ Selected high-quality SVG icon for "${flashcard.word}": ${autoSelected.source} - ${autoSelected.description}`);
              } else if (unsplashImages?.autoSelected) {
                autoSelected = unsplashImages.autoSelected;
                selectedImageUrl = autoSelected.url;
              } else {
                selectedImageUrl = aiImageUrl;
              }
            }
            
            const combinedImageOptions = {
              photos: photoSource !== 'ai' ? (unsplashImages?.photos || []) : [],
              illustrations: photoSource !== 'ai' ? (unsplashImages?.illustrations || []) : [],
              icons: photoSource !== 'ai' ? svgIcons : [],
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
            const svgIcons = photoSource !== 'ai' ? (svgIconResults[flashcard.imageQuery || flashcard.word] || []) : [];
            
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
              icons: photoSource !== 'ai' ? svgIcons : [],
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
    const response = await getOpenAI().chat.completions.create({
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

export async function generateLessonSummary(
  unitNumber: string | number,
  lessonNumber: string | number,
  planContent: string
): Promise<string> {
  try {
    console.log(`Generating summary for Unit ${unitNumber} Lesson ${lessonNumber}`);
    
    const prompt = `
    You are a helpful assistant that summarizes Chinese lesson plans.
    Please provide a concise summary for the following lesson plan (Unit ${unitNumber}, Lesson ${lessonNumber}).
    
    Lesson Plan Content:
    ${planContent}
    
    Output the summary in the following format:
    **LESSON SUMMARY**
    
    |**Program:** Yuexuele Little Warriors<br>**Name:** …………………………………………|**Lesson:** ${lessonNumber}<br>**Level:** N1|
    | :- | :- |
    
    |**Lesson overview**|
    | :-: |
    
    |**Unit ${unitNumber}: [Theme]**<br>**Lesson ${lessonNumber}**|
    | :-: |
    
    [Summary Content in Chinese/English as appropriate]
    `;

    const response = await getOpenAI().chat.completions.create({
      model: model5nano,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Failed to generate lesson summary:", error);
    throw new Error("Failed to generate lesson summary");
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
    
    // Use the new prompt service to get summary prompts
    const promptResult = await buildSummaryPrompt({
      lessonPlan,
      vocabulary: vocabulary.join(", ")
    });
    
    if (!promptResult) {
      throw new Error('Failed to build summary prompt');
    }
    
    const { systemPrompt, userPrompt } = promptResult;

    const response = await getOpenAI().chat.completions.create({
      model: validatedModel,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
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

export async function generateSingleLessonPlan(
  lesson: {
    unitNumber: string | number;
    lessonNumber: string | number;
    title: string;
    type: string;
    vocabulary: string[];
    objectives: string[];
    materials?: string[];
    duration?: string;
    ageGroup?: string;
    level?: string;
  },
  aiModel?: string
): Promise<string> {
  try {
    const validatedModel = validateModel(aiModel);
    console.log(`Generating single lesson plan for Unit ${lesson.unitNumber} Lesson ${lesson.lessonNumber} with model: ${validatedModel}`);
    
    // Fetch existing activities
    let existingActivitiesStr = "";
    try {
      const allActivities = await db.select().from(activities);
      if (allActivities.length > 0) {
        existingActivitiesStr = "\n**Existing Generic Activities (Reuse if appropriate):**\n" + 
          allActivities.map((a: any) => `- **${a.name}** (${a.type}): ${a.description}`).join("\n");
      }
    } catch (error) {
      console.warn("Failed to fetch activities from DB (ignoring):", error);
    }

    const promptResult = await buildSingleLessonPlanPrompt({
      unit: String(lesson.unitNumber),
      lesson: String(lesson.lessonNumber),
      topic: lesson.title,
      type: lesson.type,
      level: lesson.level || "Beginner",
      ageGroup: lesson.ageGroup || "Preschool",
      duration: lesson.duration || "45 mins",
      vocabulary: lesson.vocabulary.join(", "),
      objectives: lesson.objectives.join(", "),
      materials: lesson.materials ? lesson.materials.join(", ") : "Standard classroom materials",
      existingActivities: existingActivitiesStr
    });
    
    if (!promptResult) {
      throw new Error('Failed to build single lesson plan prompt');
    }
    
    const { systemPrompt, userPrompt } = promptResult;

    const response = await getOpenAI().chat.completions.create({
      model: validatedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0].message.content || "";
    
    // Try to extract and save new activities (fire and forget to avoid slowing down response too much, 
    // but await properly if running in script context. For now we await to ensure it happens).
    try {
      await extractAndSaveNewActivities(content);
    } catch (e) {
      console.warn("Failed to extract/save new activities:", e);
    }

    return content;
  } catch (error) {
    console.error("Failed to generate single lesson plan:", error);
    throw new Error("Failed to generate single lesson plan with AI");
  }
}

async function extractAndSaveNewActivities(lessonContent: string) {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: "GLM-4.6",
      messages: [
        {
          role: "system",
          content: `You are an expert curriculum developer. 
          Analyze the provided lesson plan and identify any NEW generic activities (games, drills, songs) that are NOT standard/trivial (like "Greeting" or "Review").
          Extract them into a JSON format.
          
          Return ONLY a JSON object with a key "activities" containing an array of objects:
          {
            "activities": [
              {
                "name": "Activity Name",
                "type": "game/song/drill/worksheet",
                "description": "Short description",
                "instructions": "Step-by-step instructions",
                "duration": "e.g. 5-10 mins",
                "ageGroup": "Target age",
                "materials": ["list", "of", "materials"],
                "benefits": "Learning benefits"
              }
            ]
          }
          If no new generic activities are found, return { "activities": [] }.`
        },
        {
          role: "user",
          content: lessonContent
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    if (result.activities && Array.isArray(result.activities) && result.activities.length > 0) {
      console.log(`Found ${result.activities.length} potential new activities. Saving...`);
      for (const activity of result.activities) {
        // Check if exists
        const existing = await db.select().from(activities).where(eq(activities.name, activity.name));
        if (existing.length === 0) {
          await db.insert(activities).values({
            name: activity.name,
            type: activity.type || 'game',
            description: activity.description,
            instructions: activity.instructions,
            duration: activity.duration,
            ageGroup: activity.ageGroup,
            materials: activity.materials,
            benefits: activity.benefits
          });
          console.log(`Saved new activity: ${activity.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in extractAndSaveNewActivities:", error);
  }
}