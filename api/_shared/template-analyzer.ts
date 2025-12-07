import {
  TemplateAnalysis,
  Variable,
  TableStructure,
  MarkdownStructure,
  LanguagePattern,
  QualityMetrics,
  ValidationResult,
  TemplateStructure,
  AnalysisOptions
} from '../../shared/schema.js';

/**
 * Intelligent Template Analysis Engine
 *
 * This class provides comprehensive template analysis capabilities including:
 * - Variable pattern detection and extraction
 * - Markdown structure parsing
 * - Language detection and analysis
 * - Quality scoring and validation
 * - Template compatibility assessment
 */
export class TemplateAnalyzer {
  private static readonly DEFAULT_VARIABLE_PATTERNS = [
    /\{\{(\w+)\}\}/g,           // {{variable}}
    /\%\s*(\w+)\s*\%/g,          // % variable %
    /\$\{(\w+)\}/g,              // ${variable}
    /\#\{(\w+)\}/g,              // #{variable}
    /\[\[(\w+)\]\]/g,            // [[variable]]
    /\{{3}([^}]+)\}{3}/g,        // {{{variable}}}
  ];

  private static readonly LANGUAGE_PATTERNS = {
    chinese: /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g,
    vietnamese: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi,
    english: /[a-zA-Z]+/g,
  };

  private static readonly VERSION = '1.0.0';

  /**
   * Analyze template content comprehensively
   */
  static analyze(content: string, options: AnalysisOptions = {}): TemplateAnalysis {
    const mergedOptions: Required<AnalysisOptions> = {
      detectLanguage: options.detectLanguage ?? true,
      extractVariables: options.extractVariables ?? true,
      analyzeStructure: options.analyzeStructure ?? true,
      scoreQuality: options.scoreQuality ?? true,
      variablePatterns: options.variablePatterns ?? this.DEFAULT_VARIABLE_PATTERNS.map(p => p.source),
      targetLanguages: options.targetLanguages ?? ['chinese', 'vietnamese', 'english'],
    };

    const analysis: TemplateAnalysis = {
      id: this.generateId(),
      content,
      variables: [],
      structure: this.initializeStructure(),
      languages: [],
      quality: this.initializeQualityMetrics(),
      metadata: {
        analyzedAt: new Date(),
        version: this.VERSION,
        analyzerVersion: this.VERSION,
      },
    };

    if (mergedOptions.extractVariables) {
      analysis.variables = this.detectVariables(content, mergedOptions.variablePatterns);
    }

    if (mergedOptions.analyzeStructure) {
      analysis.structure = this.extractStructure(content);
    }

    if (mergedOptions.detectLanguage) {
      analysis.languages = this.detectLanguages(content, mergedOptions.targetLanguages);
    }

    if (mergedOptions.scoreQuality) {
      analysis.quality = this.calculateQualityScore(content, analysis);
    }

    return analysis;
  }

  /**
   * Detect and extract template variables
   */
  static detectVariables(content: string, customPatterns?: string[]): Variable[] {
    const patterns = customPatterns
      ? customPatterns.map(p => new RegExp(p, 'g'))
      : this.DEFAULT_VARIABLE_PATTERNS;

    const variableMap = new Map<string, Variable>();

    patterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1];
        const fullMatch = match[0];

        if (!variableMap.has(varName)) {
          variableMap.set(varName, {
            name: varName,
            type: this.inferVariableType(varName, content),
            pattern: fullMatch,
            required: this.isRequiredVariable(varName),
            defaultValue: this.inferDefaultValue(varName, content),
            description: this.inferVariableDescription(varName, content),
            examples: this.extractVariableExamples(varName, content),
          });
        }
      }
    });

    return Array.from(variableMap.values());
  }

  /**
   * Extract markdown structure
   */
  static extractStructure(content: string): MarkdownStructure {
    const structure: MarkdownStructure = {
      headings: [],
      tables: [],
      lists: [],
      codeBlocks: [],
      links: [],
      images: [],
      wordCount: 0,
      lineCount: content.split('\n').length,
    };

    // Extract headings
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      structure.headings.push({
        level: match[1].length,
        text: match[2].trim(),
        position: match.index,
      });
    }

    // Extract tables
    const tableRegex = /\|(.+)\|[\r\n]+\|[-\s|]+\|[\r\n]+((?:\|.*\|[\r\n]*)*)/g;
    while ((match = tableRegex.exec(content)) !== null) {
      const tableContent = match[0];
      const headerRow = match[1].split('|').map(cell => cell.trim()).filter(cell => cell);
      const dataRows = match[2].trim().split('\n').map(row =>
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );

      structure.tables.push({
        rowCount: dataRows.length + 1,
        columnCount: headerRow.length,
        headers: headerRow,
        hasHeader: true,
        markdown: tableContent,
      });
    }

    // Extract lists
    const listRegex = /^(\s*)([-*+]|\d+\.)\s+(.+)$/gm;
    let currentList: MarkdownStructure['lists'][0] | null = null;
    let lastPosition = -1;

    while ((match = listRegex.exec(content)) !== null) {
      const indent = match[1].length;
      const marker = match[2];
      const item = match[3].trim();
      const position = match.index;

      // Start new list if this is significantly separated or different type
      if (!currentList || position - lastPosition > 100 ||
          (currentList.type === 'ordered' && !marker.match(/\d+\./)) ||
          (currentList.type === 'unordered' && marker.match(/\d+\./))) {

        if (currentList) {
          structure.lists.push(currentList);
        }

        currentList = {
          type: marker.match(/\d+\./) ? 'ordered' : 'unordered',
          items: [],
          position,
        };
      }

      currentList.items.push(item);
      lastPosition = position;
    }

    if (currentList) {
      structure.lists.push(currentList);
    }

    // Extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      structure.codeBlocks.push({
        language: match[1] || 'text',
        content: match[2],
        position: match.index,
      });
    }

    // Extract links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    while ((match = linkRegex.exec(content)) !== null) {
      structure.links.push({
        text: match[1],
        url: match[2],
        position: match.index,
      });
    }

    // Extract images
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = imageRegex.exec(content)) !== null) {
      structure.images.push({
        alt: match[1],
        src: match[2],
        position: match.index,
      });
    }

    // Count words (basic implementation)
    const words = content.match(/\b[\w\u4e00-\u9fff]+\b/g) || [];
    structure.wordCount = words.length;

    return structure;
  }

  /**
   * Detect language patterns in content
   */
  static detectLanguages(content: string, targetLanguages: string[]): LanguagePattern[] {
    const patterns: LanguagePattern[] = [];

    for (const lang of targetLanguages as (keyof typeof TemplateAnalyzer['LANGUAGE_PATTERNS'])[]) {
      const regex = TemplateAnalyzer.LANGUAGE_PATTERNS[lang];
      if (!regex) continue;

      const matches = content.match(regex);
      if (matches) {
        const characterCount = matches.join('').length;
        const wordCount = lang === 'chinese'
          ? matches.length // Chinese characters count as words
          : matches.join(' ').split(/\s+/).filter(w => w.length > 0).length;

        patterns.push({
          language: lang,
          confidence: Math.min(100, (characterCount / content.length) * 200),
          characterCount,
          wordCount,
          patterns: [...new Set(matches)].slice(0, 10), // Top 10 unique patterns
        });
      }
    }

    // Sort by confidence
    return patterns.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Generate template structure summary
   */
  static generateTemplateStructure(analysis: TemplateAnalysis): TemplateStructure {
    const hasTables = (analysis.structure?.tables?.length || 0) > 0;
    const hasVariables = (analysis.variables?.length || 0) > 0;
    const hasMultilingualContent = (analysis.languages?.length || 0) > 1;

    let type: TemplateStructure['type'] = 'plain-text';
    if ((analysis.structure?.headings?.length || 0) > 0 || hasTables) {
      type = 'markdown';
    } else if ((analysis.structure?.codeBlocks?.length || 0) > 0 || (analysis.structure?.lists?.length || 0) > 0) {
      type = 'structured';
    }

    let complexity: TemplateStructure['complexity'] = 'simple';
    const complexityScore =
      (analysis.variables?.length || 0) * 2 +
      (analysis.structure?.tables?.length || 0) * 3 +
      (analysis.structure?.headings?.length || 0) +
      (analysis.structure?.codeBlocks?.length || 0);

    if (complexityScore > 10) {
      complexity = 'complex';
    } else if (complexityScore > 5) {
      complexity = 'medium';
    }

    // Extract sections from headings
    const sections: TemplateStructure['sections'] = [];
    const headings = analysis.structure?.headings || [];
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      const startPos = heading.position;
      const endPos = nextHeading ? nextHeading.position : (analysis.content?.length || 0);
      const content = (analysis.content || '').substring(startPos, endPos).trim();

      sections.push({
        title: heading.text,
        level: heading.level,
        content,
      });
    }

    return {
      type,
      complexity,
      hasTables,
      hasVariables,
      hasMultilingualContent,
      estimatedWordCount: analysis.structure?.wordCount,
      sections,
    };
  }

  /**
   * Validate template completeness and consistency
   */
  static validateCompleteness(analysis: TemplateAnalysis, providedVariables: Record<string, any> = {}): ValidationResult {
    const variables = analysis.variables || [];
    const languages = analysis.languages || [];
    const structure = analysis.structure;

    const totalVariables = variables.length;
    const requiredVariables = variables.filter(v => v.required).length;
    const providedVarNames = Object.keys(providedVariables);
    const missingVariables = variables
      .filter(v => v.required && !providedVarNames.includes(v.name))
      .map(v => v.name);

    const isValid = missingVariables.length === 0;
    const completenessScore = requiredVariables > 0 ?
      Math.round(((requiredVariables - missingVariables.length) / requiredVariables) * 100) : 100;

    // Check consistency
    const languageMixing = languages.length > 1;
    const variableNaming = this.checkVariableNamingConsistency(variables);
    const structureConsistency = structure ? this.checkStructureConsistency(structure) : true;

    const recommendations = this.generateRecommendations(analysis, missingVariables);

    return {
      isValid,
      score: completenessScore,
      completeness: {
        totalVariables,
        requiredVariables,
        providedVariables: providedVarNames.length,
        missingVariables,
      },
      consistency: {
        languageMixing,
        variableNaming,
        structureConsistency,
      },
      recommendations,
    };
  }

  /**
   * Calculate quality score for template
   */
  private static calculateQualityScore(content: string, analysis: TemplateAnalysis): QualityMetrics {
    const issues: QualityMetrics['issues'] = [];

    // Completeness score
    let completeness = 100;
    if ((analysis.variables?.length || 0) === 0) {
      completeness = 30;
      issues.push({
        type: 'warning',
        message: 'No variables detected in template',
        suggestion: 'Consider adding variables to make template more flexible',
      });
    }

    // Consistency score
    let consistency = 100;
    if ((analysis.languages?.length || 0) > 1) {
      consistency -= 20;
      issues.push({
        type: 'info',
        message: 'Multiple languages detected in template',
        suggestion: 'Consider separating languages or using clear language markers',
      });
    }

    // Readability score
    let readability = 100;
    const avgLineLength = content.split('\n').reduce((sum, line) => sum + line.length, 0) / content.split('\n').length;
    if (avgLineLength > 120) {
      readability -= 30;
      issues.push({
        type: 'warning',
        message: 'Very long lines detected',
        suggestion: 'Consider breaking long lines for better readability',
      });
    }

    // Structure score
    let structure = 100;
    if ((analysis.structure?.headings?.length || 0) === 0 && (analysis.structure?.tables?.length || 0) === 0) {
      structure -= 40;
      issues.push({
        type: 'info',
        message: 'No clear structure detected',
        suggestion: 'Consider adding headings or tables for better organization',
      });
    }

    const overall = Math.round((completeness + consistency + readability + structure) / 4);

    return {
      completeness,
      consistency,
      readability,
      structure,
      overall,
      issues,
    };
  }

  // Helper methods
  private static generateId(): string {
    return `ta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static initializeStructure(): MarkdownStructure {
    return {
      headings: [],
      tables: [],
      lists: [],
      codeBlocks: [],
      links: [],
      images: [],
      wordCount: 0,
      lineCount: 0,
    };
  }

  private static initializeQualityMetrics(): QualityMetrics {
    return {
      completeness: 0,
      consistency: 0,
      readability: 0,
      structure: 0,
      overall: 0,
      issues: [],
    };
  }

  private static inferVariableType(name: string, content: string): Variable['type'] {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('count') || lowerName.includes('number') || lowerName.includes('amount')) {
      return 'number';
    }
    if (lowerName.includes('is') || lowerName.includes('has') || lowerName.includes('enable')) {
      return 'boolean';
    }
    if (lowerName.includes('list') || lowerName.includes('array') || lowerName.includes('items')) {
      return 'array';
    }
    if (lowerName.includes('data') || lowerName.includes('config') || lowerName.includes('settings')) {
      return 'object';
    }

    return 'string';
  }

  private static isRequiredVariable(name: string): boolean {
    const optionalPatterns = [
      /^optional/i,
      /^default/i,
      /^backup/i,
      /optional$/i,
      /default$/i,
    ];

    return !optionalPatterns.some(pattern => pattern.test(name));
  }

  private static inferDefaultValue(name: string, content: string): any {
    const matches = content.match(new RegExp(`\\{\\{${name}\\}\\}.*?default.*?[:=]\\s*([^\\s\\}]+)`, 'i'));
    return matches ? matches[1] : undefined;
  }

  private static inferVariableDescription(name: string, content: string): string | undefined {
    const matches = content.match(new RegExp(`\\{\\{${name}\\}\\}.*?description.*?[:=]\\s*([^\\n\\}]+)`, 'i'));
    return matches ? matches[1].trim() : undefined;
  }

  private static extractVariableExamples(name: string, content: string): string[] {
    const examples: string[] = [];
    const regex = new RegExp(`\\{\\{${name}\\}\\}.*?example.*?[:=]\\s*([^\\n\\}]+)`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      examples.push(match[1].trim());
    }
    return examples;
  }

  private static checkVariableNamingConsistency(variables: Variable[]): boolean {
    if (variables.length < 2) return true;

    const namingPatterns = variables.map(v => {
      if (v.name.match(/^[A-Z][a-zA-Z]*$/)) return 'PascalCase';
      if (v.name.match(/^[a-z][a-zA-Z]*$/)) return 'camelCase';
      if (v.name.match(/^[a-z]+(_[a-z]+)+$/)) return 'snake_case';
      if (v.name.match(/^[A-Z][A-Z_]*$/)) return 'UPPER_CASE';
      return 'other';
    });

    const uniquePatterns = new Set(namingPatterns);
    return uniquePatterns.size <= 2; // Allow for some flexibility
  }

  private static checkStructureConsistency(structure: MarkdownStructure): boolean {
    // Basic consistency checks
    let consistent = true;

    // Check if all tables have headers
    if (structure.tables.some(table => !table.hasHeader)) {
      consistent = false;
    }

    // Check heading levels (should not skip levels)
    const levels = structure.headings.map(h => h.level);
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        consistent = false;
        break;
      }
    }

    return consistent;
  }

  private static generateRecommendations(analysis: TemplateAnalysis, missingVariables: string[]): string[] {
    const recommendations: string[] = [];
    const variables = analysis.variables || [];
    const structure = analysis.structure;
    const content = analysis.content || '';
    const languages = analysis.languages || [];
    const quality = analysis.quality;

    if (missingVariables.length > 0) {
      recommendations.push(`Provide values for required variables: ${missingVariables.join(', ')}`);
    }

    if (variables.length > 10) {
      recommendations.push('Consider simplifying template by reducing number of variables');
    }

    if (structure?.tables?.length === 0 && content.includes('|')) {
      recommendations.push('Consider using markdown tables for better data organization');
    }

    if (languages.length > 1 && (quality?.consistency || 0) < 80) {
      recommendations.push('Consider separating multilingual content or using language markers');
    }

    if ((quality?.readability || 0) < 70) {
      recommendations.push('Improve readability by adding proper formatting and structure');
    }

    if (recommendations.length === 0) {
      recommendations.push('Template looks well-structured and complete!');
    }

    return recommendations;
  }
}