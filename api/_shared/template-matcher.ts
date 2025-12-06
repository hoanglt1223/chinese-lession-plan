import { PromptVariables } from './prompt-service.js';
import { SAMPLE_TEMPLATES, SampleTemplate, SampleTemplateService } from './sample-templates.js';

export interface TemplateMatch {
  template: SampleTemplate;
  matchScore: number;
  reason: string;
}

export interface FormatValidation {
  isValid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface GenerationQuality {
  overallScore: number;
  formatAccuracy: number;
  contentQuality: number;
  completeness: number;
  consistency: number;
  validation: FormatValidation;
}

export class TemplateMatcher {
  /**
   * Find the best matching template(s) for given input
   */
  static findBestTemplates(type: string, input: PromptVariables, maxResults: number = 3): TemplateMatch[] {
    const samples = SampleTemplateService.getSamplesByType(type);
    if (samples.length === 0) {
      return [];
    }

    const matches: TemplateMatch[] = samples.map(template => {
      const matchScore = this.calculateDetailedMatchScore(template, input);
      return {
        template,
        matchScore: matchScore.score,
        reason: matchScore.reason
      };
    });

    // Sort by match score and return top results
    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  }

  /**
   * Calculate detailed match score with reasoning
   */
  private static calculateDetailedMatchScore(template: SampleTemplate, input: PromptVariables): {
    score: number;
    reason: string;
  } {
    let totalScore = 0;
    let maxScore = 0;
    const reasons: string[] = [];

    // Compare vocabulary overlap
    if (input.vocabulary && template.sampleInput.vocabulary) {
      maxScore += 30;
      const inputWords = input.vocabulary.split(/[,，\s]+/).filter(w => w.trim());
      const templateWords = template.sampleInput.vocabulary.split(/[,，\s]+/).filter(w => w.trim());
      const overlap = this.calculateOverlap(inputWords, templateWords);
      const vocabScore = (overlap.length / Math.max(inputWords.length, templateWords.length)) * 30;
      totalScore += vocabScore;

      if (vocabScore > 20) {
        reasons.push(`High vocabulary similarity (${Math.round(vocabScore/30*100)}%)`);
      }
    }

    // Compare theme/topic
    if (input.topic || input.theme) {
      maxScore += 25;
      const inputTheme = (input.topic || input.theme) as string;
      const templateTheme = (template.sampleInput.topic || template.sampleInput.theme) as string;

      if (inputTheme && templateTheme) {
        const themeSimilarity = this.calculateTextSimilarity(inputTheme, templateTheme);
        totalScore += themeSimilarity * 25;

        if (themeSimilarity > 0.5) {
          reasons.push(`Theme match: ${inputTheme} vs ${templateTheme}`);
        }
      }
    }

    // Compare level
    if (input.level && template.sampleInput.level) {
      maxScore += 20;
      if (input.level === template.sampleInput.level) {
        totalScore += 20;
        reasons.push(`Perfect level match: ${input.level}`);
      } else {
        // Partial credit for similar levels
        const levelSimilarity = this.calculateLevelSimilarity(input.level, template.sampleInput.level);
        totalScore += levelSimilarity * 20;
      }
    }

    // Compare age group
    if (input.ageGroup && template.sampleInput.ageGroup) {
      maxScore += 15;
      const ageSimilarity = this.calculateAgeGroupSimilarity(input.ageGroup, template.sampleInput.ageGroup);
      totalScore += ageSimilarity * 15;

      if (ageSimilarity > 0.7) {
        reasons.push(`Age group compatibility`);
      }
    }

    // Compare lesson type
    if (input.type && template.sampleInput.type) {
      maxScore += 10;
      if (input.type === template.sampleInput.type) {
        totalScore += 10;
        reasons.push(`Lesson type match: ${input.type}`);
      }
    }

    const finalScore = maxScore > 0 ? totalScore / maxScore : 0;
    const qualityBonus = template.qualityScore * 0.2; // 20% bonus for template quality
    const finalScoreWithQuality = Math.min(1, finalScore + qualityBonus);

    return {
      score: finalScoreWithQuality,
      reason: reasons.join('; ') || 'General template match'
    };
  }

  /**
   * Calculate word overlap between two arrays
   */
  private static calculateOverlap(arr1: string[], arr2: string[]): string[] {
    return arr1.filter(word =>
      arr2.some(templateWord =>
        word.toLowerCase().includes(templateWord.toLowerCase()) ||
        templateWord.toLowerCase().includes(word.toLowerCase())
      )
    );
  }

  /**
   * Calculate text similarity using multiple methods
   */
  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    // Jaccard similarity
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    const jaccard = intersection.length / union.length;

    // Contains check
    const contains1 = text1.toLowerCase().includes(text2.toLowerCase()) ? 0.8 : 0;
    const contains2 = text2.toLowerCase().includes(text1.toLowerCase()) ? 0.8 : 0;

    return Math.max(jaccard, contains1, contains2);
  }

  /**
   * Calculate similarity between language levels
   */
  private static calculateLevelSimilarity(level1: string, level2: string): number {
    const levels = ['beginner', 'level 1', 'level 2', 'level 3', 'n1', 'n2', 'n3', 'n4', 'n5'];
    const index1 = levels.findIndex(l => level1.toLowerCase().includes(l));
    const index2 = levels.findIndex(l => level2.toLowerCase().includes(l));

    if (index1 === -1 || index2 === -1) return 0.3; // Default low similarity

    const distance = Math.abs(index1 - index2);
    return Math.max(0, 1 - (distance * 0.2));
  }

  /**
   * Calculate similarity between age groups
   */
  private static calculateAgeGroupSimilarity(age1: string, age2: string): number {
    const extractAge = (age: string): [number, number] => {
      const matches = age.match(/(\d+)-?(\d+)?/);
      if (matches) {
        return [parseInt(matches[1]), parseInt(matches[2] || matches[1])];
      }
      return [0, 0];
    };

    const [min1, max1] = extractAge(age1);
    const [min2, max2] = extractAge(age2);

    if (min1 === 0 || min2 === 0) return 0.5;

    // Check for overlap
    const overlap = Math.min(max1, max2) - Math.max(min1, min2);
    if (overlap > 0) return 1.0;

    // Calculate distance
    const distance = Math.max(min1, min2) - Math.min(max1, max2);
    return Math.max(0, 1 - (distance * 0.1));
  }

  /**
   * Validate generated content against template structure
   */
  static validateFormat(template: SampleTemplate, generatedContent: string): FormatValidation {
    const structure = template.formatStructure;
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 1.0;

    // Check for required structure elements
    if (structure.hasHeaderTable && !generatedContent.includes('|')) {
      issues.push('Missing table format structure');
      score -= 0.3;
      suggestions.push('Add proper table structure with pipes |');
    }

    if (structure.bilingualHeaders) {
      const hasChinese = /[\u4e00-\u9fff]/.test(generatedContent);
      const hasEnglish = /[a-zA-Z]/.test(generatedContent);
      if (!hasChinese || !hasEnglish) {
        issues.push('Missing bilingual content (Chinese/English)');
        score -= 0.2;
        suggestions.push('Include both Chinese characters and English text');
      }
    }

    if (structure.chineseContent) {
      const chineseRatio = (generatedContent.match(/[\u4e00-\u9fff]/g) || []).length / generatedContent.length;
      if (chineseRatio < 0.3) {
        issues.push('Insufficient Chinese content');
        score -= 0.25;
        suggestions.push('Include more Chinese text in activity descriptions');
      }
    }

    if (structure.timeAllocations) {
      const hasTime = /分钟|min|mins/.test(generatedContent);
      if (!hasTime) {
        issues.push('Missing time allocations');
        score -= 0.15;
        suggestions.push('Add specific time allocations (e.g., "5分钟")');
      }
    }

    if (structure.specificMaterials) {
      const hasMaterials = /教具|Materials|闪卡|卡片/.test(generatedContent);
      if (!hasMaterials) {
        issues.push('Missing materials section');
        score -= 0.1;
        suggestions.push('Include materials/tools needed for each activity');
      }
    }

    // Check for consistent formatting
    const lines = generatedContent.split('\n');
    const tableRows = lines.filter(line => line.includes('|'));

    if (tableRows.length > 0) {
      const firstRowCols = (tableRows[0].match(/\|/g) || []).length;
      const inconsistentRows = tableRows.filter(line =>
        (line.match(/\|/g) || []).length !== firstRowCols
      ).length;

      if (inconsistentRows > 0) {
        issues.push(`Inconsistent table formatting in ${inconsistentRows} rows`);
        score -= 0.2;
        suggestions.push('Ensure all table rows have the same number of columns');
      }
    }

    return {
      isValid: score >= 0.7,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  /**
   * Calculate overall quality score for generated content
   */
  static calculateQuality(
    template: SampleTemplate,
    generatedContent: string,
    input: PromptVariables
  ): GenerationQuality {
    const validation = this.validateFormat(template, generatedContent);

    // Format accuracy
    const formatAccuracy = validation.score;

    // Content quality (based on template quality and validation)
    const contentQuality = template.qualityScore * 0.7 + validation.score * 0.3;

    // Completeness (check if all input variables are addressed)
    const completeness = this.calculateCompleteness(input, generatedContent);

    // Consistency (check format consistency throughout)
    const consistency = this.calculateConsistency(generatedContent);

    // Overall score
    const overallScore = (
      formatAccuracy * 0.3 +
      contentQuality * 0.3 +
      completeness * 0.2 +
      consistency * 0.2
    );

    return {
      overallScore,
      formatAccuracy,
      contentQuality,
      completeness,
      consistency,
      validation
    };
  }

  /**
   * Check if generated content addresses all input variables
   */
  private static calculateCompleteness(input: PromptVariables, content: string): number {
    let addressedCount = 0;
    const totalCount = Object.keys(input).length;

    for (const [key, value] of Object.entries(input)) {
      if (value && content.toLowerCase().includes(String(value).toLowerCase())) {
        addressedCount++;
      }
    }

    return totalCount > 0 ? addressedCount / totalCount : 1.0;
  }

  /**
   * Check formatting consistency throughout content
   */
  private static calculateConsistency(content: string): number {
    let consistencyScore = 1.0;
    const lines = content.split('\n').filter(line => line.trim());

    // Check header consistency
    const headers = lines.filter(line => line.includes('|') && line.includes('---'));
    if (headers.length > 1) {
      const firstHeaderFormat = headers[0];
      const inconsistentHeaders = headers.filter(header => {
        const colCount = (header.match(/\|/g) || []).length;
        const firstColCount = (firstHeaderFormat.match(/\|/g) || []).length;
        return colCount !== firstColCount;
      });

      if (inconsistentHeaders.length > 0) {
        consistencyScore -= 0.2;
      }
    }

    // Check language consistency
    const hasMixedLanguages = lines.some(line => {
      const hasChinese = /[\u4e00-\u9fff]/.test(line);
      const hasEnglish = /[a-zA-Z]{3,}/.test(line);
      return hasChinese && hasEnglish && line.includes('|');
    });

    if (hasMixedLanguages) {
      consistencyScore += 0.1; // Bonus for proper bilingual format
    }

    return Math.max(0, consistencyScore);
  }
}