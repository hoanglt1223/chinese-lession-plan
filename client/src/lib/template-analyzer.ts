import { apiRequest } from './api.js';
import {
  TemplateAnalysis,
  AnalysisOptions,
  ValidationResult,
  TemplateStructure,
  Variable
} from '../../../shared/schema.js';

export interface AnalyzeTemplateRequest {
  content: string;
  options?: AnalysisOptions;
  providedVariables?: Record<string, any>;
}

export interface AnalyzeTemplateResponse {
  success: boolean;
  analysis: TemplateAnalysis;
  validation: ValidationResult;
  structure: TemplateStructure;
  summary: {
    totalVariables: number;
    requiredVariables: number;
    detectedLanguages: string[];
    hasTables: boolean;
    qualityScore: number;
    wordCount: number;
  };
}

export interface DetectVariablesRequest {
  content: string;
  customPatterns?: string[];
}

export interface DetectVariablesResponse {
  success: boolean;
  variables: Variable[];
  summary: {
    totalVariables: number;
    requiredVariables: number;
    optionalVariables: number;
    variableTypes: string[];
  };
}

export interface ExtractStructureRequest {
  content: string;
}

export interface ExtractStructureResponse {
  success: boolean;
  structure: {
    headings: Array<{
      level: number;
      text: string;
      position: number;
    }>;
    tables: Array<{
      rowCount: number;
      columnCount: number;
      headers: string[];
      hasHeader: boolean;
      markdown: string;
    }>;
    lists: Array<{
      type: 'ordered' | 'unordered';
      items: string[];
      position: number;
    }>;
    codeBlocks: Array<{
      language: string;
      content: string;
      position: number;
    }>;
    links: Array<{
      text: string;
      url: string;
      position: number;
    }>;
    images: Array<{
      alt: string;
      src: string;
      position: number;
    }>;
    wordCount: number;
    lineCount: number;
  };
  summary: {
    headingsCount: number;
    tablesCount: number;
    listsCount: number;
    codeBlocksCount: number;
    linksCount: number;
    imagesCount: number;
    wordCount: number;
    lineCount: number;
  };
}

export interface DetectLanguagesRequest {
  content: string;
  targetLanguages?: ('chinese' | 'vietnamese' | 'english')[];
}

export interface DetectLanguagesResponse {
  success: boolean;
  languages: Array<{
    language: 'chinese' | 'vietnamese' | 'english';
    confidence: number;
    characterCount: number;
    wordCount: number;
    patterns: string[];
  }>;
  summary: {
    primaryLanguage: string;
    languageCount: number;
    multilingual: boolean;
    confidenceScores: Array<{
      language: string;
      confidence: number;
      characterCount: number;
    }>;
  };
}

export interface AssessQualityRequest {
  content: string;
  options?: AnalysisOptions;
}

export interface AssessQualityResponse {
  success: boolean;
  quality: {
    completeness: number;
    consistency: number;
    readability: number;
    structure: number;
    overall: number;
    issues: Array<{
      type: 'error' | 'warning' | 'info';
      message: string;
      position?: number;
      suggestion?: string;
    }>;
  };
  recommendations: string[];
  summary: {
    overallScore: number;
    grade: string;
    issuesCount: number;
    criticalIssues: number;
  };
}

export interface CompareTemplatesRequest {
  template1: string;
  template2: string;
}

export interface CompareTemplatesResponse {
  success: boolean;
  comparison: {
    complexity: {
      template1: string;
      template2: string;
    };
    variables: {
      template1: number;
      template2: number;
      common: string[];
      uniqueTo1: string[];
      uniqueTo2: string[];
    };
    structure: {
      template1: {
        headings: number;
        tables: number;
        wordCount: number;
      };
      template2: {
        headings: number;
        tables: number;
        wordCount: number;
      };
    };
    quality: {
      template1: number;
      template2: number;
      winner: string;
    };
    languages: {
      template1: string[];
      template2: string[];
      overlap: string[];
    };
  };
  summary: {
    similarity: number;
    recommended: string;
  };
}

export interface BatchAnalyzeRequest {
  templates: Array<{
    id?: string;
    name?: string;
    content: string;
    providedVariables?: Record<string, any>;
  }>;
  options?: AnalysisOptions;
}

export interface BatchAnalyzeResponse {
  success: boolean;
  results: Array<{
    id: string | number;
    name: string;
    analysis: TemplateAnalysis;
    validation: ValidationResult;
    structure: TemplateStructure;
  }>;
  batchSummary: {
    totalTemplates: number;
    averageQuality: number;
    totalVariables: number;
    languageDistribution: Record<string, number>;
    complexityDistribution: Record<string, number>;
    topTemplates: Array<{
      id: string | number;
      name: string;
      score: number;
    }>;
  };
}

// API Functions
export async function analyzeTemplate(request: AnalyzeTemplateRequest): Promise<AnalyzeTemplateResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=analyze-template', request);
  return response.json();
}

export async function detectVariables(request: DetectVariablesRequest): Promise<DetectVariablesResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=detect-variables', request);
  return response.json();
}

export async function extractStructure(request: ExtractStructureRequest): Promise<ExtractStructureResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=extract-structure', request);
  return response.json();
}

export async function detectLanguages(request: DetectLanguagesRequest): Promise<DetectLanguagesResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=detect-languages', request);
  return response.json();
}

export async function assessQuality(request: AssessQualityRequest): Promise<AssessQualityResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=assess-quality', request);
  return response.json();
}

export async function compareTemplates(request: CompareTemplatesRequest): Promise<CompareTemplatesResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=compare-templates', request);
  return response.json();
}

export async function batchAnalyze(request: BatchAnalyzeRequest): Promise<BatchAnalyzeResponse> {
  const response = await apiRequest('POST', '/template-analyzer?action=batch-analyze', request);
  return response.json();
}

// Utility functions
export function getQualityGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function getQualityColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

export function getQualityBgColor(score: number): string {
  if (score >= 90) return 'bg-green-100';
  if (score >= 80) return 'bg-blue-100';
  if (score >= 70) return 'bg-yellow-100';
  if (score >= 60) return 'bg-orange-100';
  return 'bg-red-100';
}

export function formatVariableType(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'Text',
    'number': 'Number',
    'boolean': 'Yes/No',
    'array': 'List',
    'object': 'Data'
  };
  return typeMap[type] || type;
}

export function formatLanguageName(language: string): string {
  const langMap: Record<string, string> = {
    'chinese': '中文',
    'vietnamese': 'Tiếng Việt',
    'english': 'English'
  };
  return langMap[language] || language;
}

export function formatComplexity(complexity: string): string {
  return complexity.charAt(0).toUpperCase() + complexity.slice(1);
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes / (1024 * 1024)) + ' MB';
}