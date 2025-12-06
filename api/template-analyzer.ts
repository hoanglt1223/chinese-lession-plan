import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { TemplateAnalyzer } from './_shared/template-analyzer.js';
import {
  TemplateAnalysis,
  AnalysisOptions,
  ValidationResult,
  TemplateStructure
} from '../shared/schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const action = (req.query.action as string) || (req.body && req.body.action) || 'unknown';

  try {
    // --- Template Analysis ---
    if (req.method === 'POST' && action === 'analyze-template') {
      const {
        content,
        options = {},
        providedVariables = {}
      } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          message: 'Template content is required and must be a string'
        });
      }

      const analysisOptions: AnalysisOptions = {
        detectLanguage: options.detectLanguage ?? true,
        extractVariables: options.extractVariables ?? true,
        analyzeStructure: options.analyzeStructure ?? true,
        scoreQuality: options.scoreQuality ?? true,
        variablePatterns: options.variablePatterns,
        targetLanguages: options.targetLanguages ?? ['chinese', 'vietnamese', 'english'],
      };

      // Perform comprehensive analysis
      const analysis = TemplateAnalyzer.analyze(content, analysisOptions);

      // Validate completeness
      const validation = TemplateAnalyzer.validateCompleteness(analysis, providedVariables);

      // Generate structure summary
      const structure = TemplateAnalyzer.generateTemplateStructure(analysis);

      return res.json({
        success: true,
        analysis,
        validation,
        structure,
        summary: {
          totalVariables: analysis.variables.length,
          requiredVariables: analysis.variables.filter(v => v.required).length,
          detectedLanguages: analysis.languages.map(l => l.language),
          hasTables: analysis.structure.tables.length > 0,
          qualityScore: analysis.quality.overall,
          wordCount: analysis.structure.wordCount,
        }
      });
    }

    // --- Variable Detection Only ---
    if (req.method === 'POST' && action === 'detect-variables') {
      const { content, customPatterns } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          message: 'Template content is required and must be a string'
        });
      }

      const variables = TemplateAnalyzer.detectVariables(content, customPatterns);

      return res.json({
        success: true,
        variables,
        summary: {
          totalVariables: variables.length,
          requiredVariables: variables.filter(v => v.required).length,
          optionalVariables: variables.filter(v => !v.required).length,
          variableTypes: [...new Set(variables.map(v => v.type))],
        }
      });
    }

    // --- Structure Extraction Only ---
    if (req.method === 'POST' && action === 'extract-structure') {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          message: 'Template content is required and must be a string'
        });
      }

      const structure = TemplateAnalyzer.extractStructure(content);

      return res.json({
        success: true,
        structure,
        summary: {
          headingsCount: structure.headings.length,
          tablesCount: structure.tables.length,
          listsCount: structure.lists.length,
          codeBlocksCount: structure.codeBlocks.length,
          linksCount: structure.links.length,
          imagesCount: structure.images.length,
          wordCount: structure.wordCount,
          lineCount: structure.lineCount,
        }
      });
    }

    // --- Language Detection Only ---
    if (req.method === 'POST' && action === 'detect-languages') {
      const { content, targetLanguages } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          message: 'Template content is required and must be a string'
        });
      }

      const languages = TemplateAnalyzer.detectLanguages(
        content,
        targetLanguages ?? ['chinese', 'vietnamese', 'english']
      );

      return res.json({
        success: true,
        languages,
        summary: {
          primaryLanguage: languages[0]?.language || 'unknown',
          languageCount: languages.length,
          multilingual: languages.length > 1,
          confidenceScores: languages.map(l => ({
            language: l.language,
            confidence: l.confidence,
            characterCount: l.characterCount,
          })),
        }
      });
    }

    // --- Quality Assessment Only ---
    if (req.method === 'POST' && action === 'assess-quality') {
      const { content, options = {} } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({
          message: 'Template content is required and must be a string'
        });
      }

      // Get full analysis to access quality metrics
      const analysis = TemplateAnalyzer.analyze(content, {
        ...options,
        scoreQuality: true,
      });

      return res.json({
        success: true,
        quality: analysis.quality,
        recommendations: analysis.quality.issues.map(issue => issue.suggestion).filter(Boolean),
        summary: {
          overallScore: analysis.quality.overall,
          grade: analysis.quality.overall >= 90 ? 'A' :
                 analysis.quality.overall >= 80 ? 'B' :
                 analysis.quality.overall >= 70 ? 'C' :
                 analysis.quality.overall >= 60 ? 'D' : 'F',
          issuesCount: analysis.quality.issues.length,
          criticalIssues: analysis.quality.issues.filter(i => i.type === 'error').length,
        }
      });
    }

    // --- Template Comparison ---
    if (req.method === 'POST' && action === 'compare-templates') {
      const { template1, template2 } = req.body;

      if (!template1 || !template2 || typeof template1 !== 'string' || typeof template2 !== 'string') {
        return res.status(400).json({
          message: 'Both template contents are required and must be strings'
        });
      }

      const analysis1 = TemplateAnalyzer.analyze(template1);
      const analysis2 = TemplateAnalyzer.analyze(template2);

      const comparison = {
        complexity: {
          template1: TemplateAnalyzer.generateTemplateStructure(analysis1).complexity,
          template2: TemplateAnalyzer.generateTemplateStructure(analysis2).complexity,
        },
        variables: {
          template1: analysis1.variables.length,
          template2: analysis2.variables.length,
          common: analysis1.variables.filter(v1 =>
            analysis2.variables.some(v2 => v1.name === v2.name)
          ).map(v => v.name),
          uniqueTo1: analysis1.variables.filter(v1 =>
            !analysis2.variables.some(v2 => v1.name === v2.name)
          ).map(v => v.name),
          uniqueTo2: analysis2.variables.filter(v2 =>
            !analysis1.variables.some(v1 => v1.name === v2.name)
          ).map(v => v.name),
        },
        structure: {
          template1: {
            headings: analysis1.structure.headings.length,
            tables: analysis1.structure.tables.length,
            wordCount: analysis1.structure.wordCount,
          },
          template2: {
            headings: analysis2.structure.headings.length,
            tables: analysis2.structure.tables.length,
            wordCount: analysis2.structure.wordCount,
          },
        },
        quality: {
          template1: analysis1.quality.overall,
          template2: analysis2.quality.overall,
          winner: analysis1.quality.overall >= analysis2.quality.overall ? 'template1' : 'template2',
        },
        languages: {
          template1: analysis1.languages.map(l => l.language),
          template2: analysis2.languages.map(l => l.language),
          overlap: analysis1.languages.filter(l1 =>
            analysis2.languages.some(l2 => l1.language === l2.language)
          ).map(l => l.language),
        },
      };

      return res.json({
        success: true,
        comparison,
        summary: {
          similarity: this.calculateSimilarity(analysis1, analysis2),
          recommended: comparison.quality.winner,
        }
      });
    }

    // --- Batch Analysis ---
    if (req.method === 'POST' && action === 'batch-analyze') {
      const { templates, options = {} } = req.body;

      if (!Array.isArray(templates) || templates.length === 0) {
        return res.status(400).json({
          message: 'Templates array is required and cannot be empty'
        });
      }

      if (templates.length > 10) {
        return res.status(400).json({
          message: 'Maximum 10 templates allowed for batch analysis'
        });
      }

      const results = await Promise.all(
        templates.map((template, index) => {
          if (!template.content || typeof template.content !== 'string') {
            throw new Error(`Template at index ${index} has invalid content`);
          }

          const analysis = TemplateAnalyzer.analyze(template.content, options);
          const validation = TemplateAnalyzer.validateCompleteness(analysis, template.providedVariables || {});
          const structure = TemplateAnalyzer.generateTemplateStructure(analysis);

          return {
            id: template.id || index,
            name: template.name || `Template ${index + 1}`,
            analysis,
            validation,
            structure,
          };
        })
      );

      // Generate batch summary
      const batchSummary = {
        totalTemplates: results.length,
        averageQuality: results.reduce((sum, r) => sum + r.analysis.quality.overall, 0) / results.length,
        totalVariables: results.reduce((sum, r) => sum + r.analysis.variables.length, 0),
        languageDistribution: this.aggregateLanguages(results),
        complexityDistribution: this.aggregateComplexity(results),
        topTemplates: results
          .sort((a, b) => b.analysis.quality.overall - a.analysis.quality.overall)
          .slice(0, 3)
          .map(r => ({ id: r.id, name: r.name, score: r.analysis.quality.overall })),
      };

      return res.json({
        success: true,
        results,
        batchSummary,
      });
    }

    // Invalid action
    return res.status(400).json({
      message: 'Invalid action',
      availableActions: [
        'analyze-template',
        'detect-variables',
        'extract-structure',
        'detect-languages',
        'assess-quality',
        'compare-templates',
        'batch-analyze'
      ]
    });

  } catch (error) {
    return handleError(res, error);
  }
}

// Helper functions for batch operations
function calculateSimilarity(analysis1: TemplateAnalysis, analysis2: TemplateAnalysis): number {
  let similarity = 0;
  let factors = 0;

  // Variable similarity
  const commonVars = analysis1.variables.filter(v1 =>
    analysis2.variables.some(v2 => v1.name === v2.name)
  ).length;
  const totalVars = new Set([
    ...analysis1.variables.map(v => v.name),
    ...analysis2.variables.map(v => v.name)
  ]).size;
  if (totalVars > 0) {
    similarity += commonVars / totalVars;
    factors++;
  }

  // Language similarity
  const commonLangs = analysis1.languages.filter(l1 =>
    analysis2.languages.some(l2 => l1.language === l2.language)
  ).length;
  const totalLangs = new Set([
    ...analysis1.languages.map(l => l.language),
    ...analysis2.languages.map(l => l.language)
  ]).size;
  if (totalLangs > 0) {
    similarity += commonLangs / totalLangs;
    factors++;
  }

  // Quality similarity
  const qualityDiff = Math.abs(analysis1.quality.overall - analysis2.quality.overall);
  similarity += 1 - (qualityDiff / 100);
  factors++;

  return factors > 0 ? similarity / factors : 0;
}

function aggregateLanguages(results: any[]): Record<string, number> {
  const languageCount: Record<string, number> = {};

  results.forEach(result => {
    result.analysis.languages.forEach((lang: any) => {
      languageCount[lang.language] = (languageCount[lang.language] || 0) + 1;
    });
  });

  return languageCount;
}

function aggregateComplexity(results: any[]): Record<string, number> {
  const complexityCount: Record<string, number> = {
    simple: 0,
    medium: 0,
    complex: 0,
  };

  results.forEach(result => {
    const complexity = result.structure.complexity;
    if (complexityCount.hasOwnProperty(complexity)) {
      complexityCount[complexity]++;
    }
  });

  return complexityCount;
}