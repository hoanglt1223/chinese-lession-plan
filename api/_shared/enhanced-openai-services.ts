import { db } from './database.js';
import { activities } from './db-schema.js';
import { EnhancedGenerationService } from './enhanced-generation.js';
import {
  generateSingleLessonPlan,
  generateFlashcards,
  analyzePDFContent,
  generateSummary
} from './openai-services.js';

// Enhanced Generation Functions with Sample-Based Format Enforcement

/**
 * Enhanced single lesson plan generation with sample template enforcement
 */
export async function generateSingleLessonPlanEnhanced(
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
  options: {
    aiModel?: string;
    useEnhancedGeneration?: boolean;
    qualityThreshold?: number;
    enforceFormat?: boolean;
  } = {}
): Promise<{
  content: string;
  quality?: any;
  success: boolean;
  templateUsed?: any;
  error?: string;
}> {
  try {
    if (!options.useEnhancedGeneration) {
      // Fallback to original function
      const content = await generateSingleLessonPlan(lesson, options.aiModel);
      return { content, success: true };
    }

    console.log(`Generating enhanced single lesson plan for Unit ${lesson.unitNumber} Lesson ${lesson.lessonNumber}`);

    // Fetch existing activities
    let existingActivitiesStr = "";
    try {
      const allActivities = await db.select().from(activities);
      if (allActivities.length > 0) {
        existingActivitiesStr = allActivities.map((a: any) => `- **${a.name}** (${a.type}): ${a.description}`).join("\n");
      }
    } catch (error) {
      console.warn("Failed to fetch activities from DB:", error);
    }

    // Prepare variables for enhanced generation
    const variables = {
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
    };

    // Use enhanced generation service
    const result = await EnhancedGenerationService.generateWithEnhancedPrompt(
      "single_lesson_plan",
      variables,
      {
        model: options.aiModel,
        qualityThreshold: options.qualityThreshold || 0.75,
        enforceFormat: options.enforceFormat !== false,
        useSamples: true,
        maxRetries: 3
      }
    );

    if (result.success && typeof result.content === "string") {
      // Extract and save new activities
      try {
        const { extractAndSaveNewActivities } = await import('./openai-services.js');
        await extractAndSaveNewActivities(result.content);
      } catch (e) {
        console.warn("Failed to extract/save new activities:", e);
      }

      return {
        content: result.content,
        quality: result.quality,
        success: true,
        templateUsed: result.templateUsed
      };
    } else {
      // Fallback to original generation if enhanced fails
      console.warn("Enhanced generation failed, falling back to original method");
      const fallbackContent = await generateSingleLessonPlan(lesson, options.aiModel);
      return {
        content: fallbackContent,
        success: true,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Failed to generate enhanced single lesson plan:", error);
    // Final fallback
    try {
      const content = await generateSingleLessonPlan(lesson, options.aiModel);
      return { content, success: true, error: error instanceof Error ? error.message : "Unknown error" };
    } catch (fallbackError) {
      throw new Error(`Both enhanced and fallback generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/**
 * Enhanced flashcard generation with sample template enforcement
 */
export async function generateFlashcardsEnhanced(
  vocabulary: string[],
  theme?: string,
  level?: string,
  ageGroup?: string,
  options: {
    aiModel?: string;
    useEnhancedGeneration?: boolean;
    qualityThreshold?: number;
    includeImages?: boolean;
  } = {}
): Promise<{
  flashcards: any[];
  quality?: any;
  success: boolean;
  templateUsed?: any;
  error?: string;
}> {
  try {
    if (!options.useEnhancedGeneration) {
      // Fallback to original function
      const flashcards = await generateFlashcards(vocabulary, theme, level, ageGroup, options.aiModel);
      return { flashcards, success: true };
    }

    console.log(`Generating enhanced flashcards for ${vocabulary.length} vocabulary items`);

    const variables = {
      vocabulary: vocabulary.join(", "),
      theme: theme || "General vocabulary",
      level: level || "Beginner",
      ageGroup: ageGroup || "Preschool"
    };

    const result = await EnhancedGenerationService.generateWithEnhancedPrompt(
      "flashcard",
      variables,
      {
        model: options.aiModel,
        qualityThreshold: options.qualityThreshold || 0.7,
        enforceFormat: true,
        useSamples: true,
        maxRetries: 2
      }
    );

    if (result.success && Array.isArray(result.content)) {
      return {
        flashcards: result.content,
        quality: result.quality,
        success: true,
        templateUsed: result.templateUsed
      };
    } else {
      // Fallback to original generation
      console.warn("Enhanced flashcard generation failed, falling back to original method");
      const fallbackFlashcards = await generateFlashcards(vocabulary, theme, level, ageGroup, options.aiModel);
      return {
        flashcards: fallbackFlashcards,
        success: true,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Failed to generate enhanced flashcards:", error);
    // Final fallback
    try {
      const flashcards = await generateFlashcards(vocabulary, theme, level, ageGroup, options.aiModel);
      return { flashcards, success: true, error: error instanceof Error ? error.message : "Unknown error" };
    } catch (fallbackError) {
      throw new Error(`Both enhanced and fallback flashcard generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/**
 * Enhanced content analysis with sample template enforcement
 */
export async function analyzePDFContentEnhanced(
  content: string,
  aiModel: string = "gpt-5-nano",
  outputLanguage: string = "auto",
  options: {
    useEnhancedGeneration?: boolean;
    qualityThreshold?: number;
  } = {}
): Promise<{
  analysis: any;
  quality?: any;
  success: boolean;
  templateUsed?: any;
  error?: string;
}> {
  try {
    if (!options.useEnhancedGeneration) {
      // Fallback to original function
      const analysis = await analyzePDFContent(content, aiModel, outputLanguage);
      return { analysis, success: true };
    }

    console.log("Performing enhanced content analysis");

    const languageInstructions = {
      auto: "Auto-detect language and output primarily in Chinese with English headers",
      chinese: "Output primarily in Chinese",
      english: "Output in English",
    };

    const variables = {
      content: content.length > 8000 ? content.substring(0, 8000) + "..." : content,
      langInstruction: languageInstructions[outputLanguage as keyof typeof languageInstructions] || languageInstructions.auto
    };

    const result = await EnhancedGenerationService.generateWithEnhancedPrompt(
      "analysis",
      variables,
      {
        model: aiModel, // Use gpt-5-nano for better JSON output
        qualityThreshold: options.qualityThreshold || 0.8,
        enforceFormat: true,
        useSamples: true,
        maxRetries: 2
      }
    );

    if (result.success && typeof result.content === "object") {
      return {
        analysis: result.content,
        quality: result.quality,
        success: true,
        templateUsed: result.templateUsed
      };
    } else {
      // Fallback to original generation
      console.warn("Enhanced analysis failed, falling back to original method");
      const fallbackAnalysis = await analyzePDFContent(content, aiModel, outputLanguage);
      return {
        analysis: fallbackAnalysis,
        success: true,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Failed to perform enhanced content analysis:", error);
    // Final fallback
    try {
      const analysis = await analyzePDFContent(content, aiModel, outputLanguage);
      return { analysis, success: true, error: error instanceof Error ? error.message : "Unknown error" };
    } catch (fallbackError) {
      throw new Error(`Both enhanced and fallback analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/**
 * Enhanced summary generation with sample template enforcement
 */
export async function generateSummaryEnhanced(
  lessonPlan: string,
  options: {
    aiModel?: string;
    useEnhancedGeneration?: boolean;
    qualityThreshold?: number;
  } = {}
): Promise<{
  summary: string;
  quality?: any;
  success: boolean;
  templateUsed?: any;
  error?: string;
}> {
  try {
    if (!options.useEnhancedGeneration) {
      // Fallback to original function
      const summaryResult = await generateSummary(lessonPlan, [], options.aiModel);
      return { summary: summaryResult.fullSummary, success: true };
    }

    console.log("Generating enhanced lesson summary");

    const variables = {
      lessonPlan: lessonPlan.length > 2000 ? lessonPlan.substring(0, 2000) + "..." : lessonPlan
    };

    const result = await EnhancedGenerationService.generateWithEnhancedPrompt(
      "summary",
      variables,
      {
        model: options.aiModel || "GLM-4.6",
        qualityThreshold: options.qualityThreshold || 0.7,
        enforceFormat: true,
        useSamples: true,
        maxRetries: 2
      }
    );

    if (result.success && typeof result.content === "string") {
      return {
        summary: result.content,
        quality: result.quality,
        success: true,
        templateUsed: result.templateUsed
      };
    } else {
      // Fallback to original generation
      console.warn("Enhanced summary generation failed, falling back to original method");
      const fallbackSummaryResult = await generateSummary(lessonPlan, [], options.aiModel);
      return {
        summary: fallbackSummaryResult.fullSummary,
        success: true,
        error: result.error
      };
    }
  } catch (error) {
    console.error("Failed to generate enhanced summary:", error);
    // Final fallback
    try {
      const summaryResult = await generateSummary(lessonPlan, [], options.aiModel);
      return { summary: summaryResult.fullSummary, success: true, error: error instanceof Error ? error.message : "Unknown error" };
    } catch (fallbackError) {
      throw new Error(`Both enhanced and fallback summary generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/**
 * Get generation recommendations for given input
 */
export async function getGenerationRecommendations(
  type: string,
  variables: any
) {
  return EnhancedGenerationService.getGenerationRecommendations(type, variables);
}

/**
 * Batch enhanced generation with quality tracking
 */
export async function batchGenerateEnhanced(
  requests: Array<{
    type: string;
    variables: any;
    options?: any;
  }>
): Promise<Array<{
  success: boolean;
  content?: any;
  quality?: any;
  error?: string;
  generationTime?: number;
}>> {
  const results = [];

  for (const request of requests) {
    try {
      const startTime = Date.now();

      let result;
      switch (request.type) {
        case 'single_lesson_plan':
          result = await generateSingleLessonPlanEnhanced(request.variables, request.options);
          break;
        case 'flashcard':
          result = await generateFlashcardsEnhanced(
            request.variables.vocabulary,
            request.variables.theme,
            request.variables.level,
            request.variables.ageGroup,
            request.options
          );
          break;
        case 'analysis':
          result = await analyzePDFContentEnhanced(
            request.variables.content,
            request.options?.aiModel,
            request.variables.outputLanguage,
            request.options
          );
          break;
        case 'summary':
          result = await generateSummaryEnhanced(request.variables.lessonPlan, request.options);
          break;
        default:
          result = {
            content: null,
            success: false,
            error: `Unsupported generation type: ${request.type}`
          };
      }

      results.push({
        ...result,
        generationTime: Date.now() - startTime
      });

    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}