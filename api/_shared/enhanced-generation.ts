import { PromptVariables, BuiltPrompt } from './prompt-service.js';
import { TemplateMatcher, GenerationQuality, TemplateMatch } from './template-matcher.js';
import { SampleTemplateService } from './sample-templates.js';
import { generateWithOpenAI } from './openai-services.js';

export interface EnhancedGenerationOptions {
  useSamples: boolean;
  enforceFormat: boolean;
  qualityThreshold: number;
  maxRetries: number;
  model?: string;
}

export interface EnhancedGenerationResult {
  content: any;
  quality: GenerationQuality;
  templateUsed?: TemplateMatch;
  retries: number;
  generationTime: number;
  success: boolean;
  error?: string;
}

export class EnhancedGenerationService {
  private static readonly DEFAULT_OPTIONS: EnhancedGenerationOptions = {
    useSamples: true,
    enforceFormat: true,
    qualityThreshold: 0.75,
    maxRetries: 3,
    model: 'GLM-4.6'
  };

  /**
   * Enhanced generation with sample-based format enforcement
   */
  static async generateWithEnhancedPrompt(
    type: string,
    variables: PromptVariables,
    options: Partial<EnhancedGenerationOptions> = {}
  ): Promise<EnhancedGenerationResult> {
    const startTime = Date.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let retries = 0;
    let lastError: string | undefined;
    let bestResult: EnhancedGenerationResult | null = null;

    while (retries < opts.maxRetries) {
      try {
        const result = await this.attemptGeneration(type, variables, opts);

        if (result.success && result.quality.overallScore >= opts.qualityThreshold) {
          return result;
        }

        // Keep the best result if it's better than previous attempts
        if (!bestResult || result.quality.overallScore > bestResult.quality.overallScore) {
          bestResult = result;
        }

        // If format enforcement is enabled and validation failed, retry with stronger prompts
        if (opts.enforceFormat && result.quality.validation.score < 0.7) {
          console.log(`Retry ${retries + 1}: Improving format enforcement...`);
          retries++;
          continue;
        }

        // If content quality is low, try different approach
        if (result.quality.contentQuality < opts.qualityThreshold) {
          console.log(`Retry ${retries + 1}: Improving content quality...`);
          retries++;
          continue;
        }

        // Accept if we've reached max retries or this is good enough
        if (retries >= opts.maxRetries - 1 || result.quality.overallScore >= 0.6) {
          return result;
        }

        retries++;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Retry ${retries + 1}: ${lastError}`);
        retries++;
      }
    }

    // Return best result if available, otherwise return failure
    if (bestResult) {
      return bestResult;
    }

    return {
      content: null,
      quality: {
        overallScore: 0,
        formatAccuracy: 0,
        contentQuality: 0,
        completeness: 0,
        consistency: 0,
        validation: {
          isValid: false,
          score: 0,
          issues: ['Generation failed'],
          suggestions: ['Try again with different parameters']
        }
      },
      retries,
      generationTime: Date.now() - startTime,
      success: false,
      error: lastError || 'Generation failed after maximum retries'
    };
  }

  /**
   * Attempt generation with current parameters
   */
  private static async attemptGeneration(
    type: string,
    variables: PromptVariables,
    options: EnhancedGenerationOptions
  ): Promise<EnhancedGenerationResult> {
    const startTime = Date.now();
    let templateUsed: TemplateMatch | undefined;

    try {
      // Step 1: Find best matching template if samples are enabled
      let enhancedPrompt: BuiltPrompt | null = null;

      if (options.useSamples) {
        const matches = TemplateMatcher.findBestTemplates(type, variables, 2);
        if (matches.length > 0) {
          templateUsed = matches[0];
          enhancedPrompt = await this.buildEnhancedPrompt(type, variables, templateUsed);
        }
      }

      // Step 2: Fallback to standard prompt if no template match
      if (!enhancedPrompt) {
        const { PromptService } = await import('./prompt-service.js');
        enhancedPrompt = await PromptService.buildPrompt(type, variables);
      }

      if (!enhancedPrompt) {
        throw new Error('Failed to build prompt');
      }

      // Step 3: Generate content
      const combinedPrompt = `${enhancedPrompt.systemPrompt}\n\n${enhancedPrompt.userPrompt}`;
      const generatedContent = await generateWithOpenAI(
        combinedPrompt,
        options.model || 'GLM-4.6'
      );

      // Step 4: Parse and validate content
      const parsedContent = this.parseGeneratedContent(type, generatedContent);

      // Step 5: Calculate quality metrics
      let quality: GenerationQuality;
      if (templateUsed && typeof parsedContent === 'string') {
        quality = TemplateMatcher.calculateQuality(templateUsed.template, parsedContent, variables);
      } else {
        // Basic quality assessment for non-template-based generation
        quality = this.calculateBasicQuality(type, parsedContent, variables);
      }

      return {
        content: parsedContent,
        quality,
        templateUsed,
        retries: 0,
        generationTime: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      return {
        content: null,
        quality: {
          overallScore: 0,
          formatAccuracy: 0,
          contentQuality: 0,
          completeness: 0,
          consistency: 0,
          validation: {
            isValid: false,
            score: 0,
            issues: [error instanceof Error ? error.message : 'Generation failed'],
            suggestions: ['Check input parameters', 'Try different model']
          }
        },
        templateUsed,
        retries: 0,
        generationTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build enhanced prompt with sample template
   */
  private static async buildEnhancedPrompt(
    type: string,
    variables: PromptVariables,
    templateMatch: TemplateMatch
  ): Promise<BuiltPrompt> {
    const template = templateMatch.template;

    // Build enhanced system prompt
    const systemPrompt = `You are an expert Chinese language teacher creating educational content.

Follow the EXACT format and structure shown in the golden sample below. Pay special attention to:

1. **Format Structure**: Match the table structure, headers, and organization exactly
2. **Language Requirements**: Follow the same language patterns as the sample
3. **Content Quality**: Maintain the same level of detail and professionalism
4. **Bilingual Elements**: Use Chinese and English headers exactly as shown

**Golden Sample Format:**
${template.sampleOutput}

**Quality Requirements:**
- Format accuracy: >95%
- Content relevance: High
- Professional teaching language
- Age-appropriate activities
- Detailed, step-by-step instructions`;

    // Build enhanced user prompt
    const userPrompt = `Generate content for the following input, following the EXACT format and structure from the golden sample:

**Input Details:**
${Object.entries(variables)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

**Requirements:**
1. Match the format structure exactly as shown in the golden sample
2. Use the same bilingual header approach (Chinese first, English in parentheses)
3. Write all activity descriptions and procedures in Chinese
4. Include specific time allocations
5. List materials in Chinese with quantities
6. Use appropriate games and activities for the age group
7. Maintain professional teaching language

**Important:**
- Do not deviate from the format structure
- Do not add conversational text or explanations
- Output only the formatted content as shown in the sample`;

    return {
      systemPrompt,
      userPrompt,
      templateId: template.id,
      templateName: `Enhanced: ${template.name}`
    };
  }

  /**
   * Parse generated content based on type
   */
  private static parseGeneratedContent(type: string, content: string): any {
    try {
      switch (type) {
        case 'analysis':
        case 'flashcard':
          // Try to parse as JSON first
          return JSON.parse(content);

        case 'lesson_plan':
        case 'single_lesson_plan':
        case 'summary':
        default:
          // Return as string for text-based content
          return content.trim();
      }
    } catch (error) {
      // If JSON parsing fails, return raw content
      console.warn(`Failed to parse ${type} content as JSON, returning raw content`);
      return content.trim();
    }
  }

  /**
   * Calculate basic quality for non-template-based generation
   */
  private static calculateBasicQuality(type: string, content: any, variables: PromptVariables): GenerationQuality {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // Basic validation
    let formatAccuracy = 0.5; // Default score
    let contentQuality = 0.5;
    let completeness = 0.5;
    let consistency = 0.5;

    // Check format based on type
    if (type === 'lesson_plan' || type === 'single_lesson_plan') {
      formatAccuracy = contentStr.includes('|') ? 0.8 : 0.3;
      contentQuality = /[\u4e00-\u9fff]/.test(contentStr) ? 0.8 : 0.3;
    }

    if (type === 'flashcard' && Array.isArray(content)) {
      formatAccuracy = content.length > 0 ? 0.8 : 0.2;
      contentQuality = content.every(item => item.word && item.pinyin) ? 0.8 : 0.3;
    }

    if (type === 'analysis' && typeof content === 'object') {
      formatAccuracy = content.vocabulary && content.vocabulary.length > 0 ? 0.8 : 0.3;
      contentQuality = content.learningObjectives && content.learningObjectives.length > 0 ? 0.8 : 0.3;
    }

    // Calculate completeness
    const addressedVars = Object.keys(variables).filter(key =>
      contentStr.toLowerCase().includes(String(variables[key]).toLowerCase())
    );
    completeness = Object.keys(variables).length > 0 ? addressedVars.length / Object.keys(variables).length : 0.5;

    // Basic consistency check
    consistency = contentStr.length > 50 ? 0.7 : 0.4;

    const overallScore = (formatAccuracy + contentQuality + completeness + consistency) / 4;

    return {
      overallScore,
      formatAccuracy,
      contentQuality,
      completeness,
      consistency,
      validation: {
        isValid: overallScore >= 0.5,
        score: overallScore,
        issues: [],
        suggestions: []
      }
    };
  }

  /**
   * Get generation statistics and recommendations
   */
  static getGenerationRecommendations(
    type: string,
    variables: PromptVariables
  ): {
    recommendedSamples: TemplateMatch[];
    suggestedModel: string;
    estimatedQuality: number;
    tips: string[];
  } {
    const matches = TemplateMatcher.findBestTemplates(type, variables, 3);

    // Determine best model based on type and complexity
    let suggestedModel = 'GLM-4.6';
    if (type === 'analysis') {
      suggestedModel = 'gpt-5-nano'; // Better for structured JSON output
    } else if (variables.vocabulary && variables.vocabulary.split(',').length > 10) {
      suggestedModel = 'gpt-5-mini'; // Better for longer content
    }

    // Generate tips
    const tips: string[] = [];
    if (matches.length === 0) {
      tips.push('No matching templates found - consider adding more specific input');
    } else if (matches[0].matchScore < 0.5) {
      tips.push('Low template match - try to be more specific with vocabulary or theme');
    }

    if (!variables.ageGroup) {
      tips.push('Add age group for better activity suggestions');
    }

    if (!variables.vocabulary && type !== 'analysis') {
      tips.push('Include vocabulary for more targeted content generation');
    }

    const estimatedQuality = matches.length > 0 ?
      Math.min(0.95, matches[0].matchScore * matches[0].template.qualityScore) : 0.6;

    return {
      recommendedSamples: matches,
      suggestedModel,
      estimatedQuality,
      tips
    };
  }
}