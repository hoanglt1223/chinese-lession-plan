import { z } from "zod";

// User types
export interface User {
  id: string;
  username: string;
  password: string;
  creditBalance: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Lesson types
export interface Lesson {
  id: string;
  title: string;
  level: string; // N1, N2, etc.
  ageGroup: string; // preschool, primary, lower-secondary
  status: string; // draft, review, plan, flashcards, summary, completed
  originalFiles: any | null;
  aiAnalysis: any | null;
  lessonPlans: any | null;
  flashcards: any | null;
  summaries: any | null;
  createdAt: Date;
  updatedAt: Date;
}

export const insertLessonSchema = z.object({
  title: z.string().min(1),
  level: z.string().min(1),
  ageGroup: z.string().min(1),
  status: z.string().default("draft"),
  originalFiles: z.any().optional(),
  aiAnalysis: z.any().optional(),
  lessonPlans: z.any().optional(),
  flashcards: z.any().optional(),
  summaries: z.any().optional(),
});

export type InsertLesson = z.infer<typeof insertLessonSchema>;

// Workflow types
export interface Workflow {
  id: string;
  lessonId: string | null;
  currentStep: number;
  stepData: Record<string, any> | null;
  completedSteps: number[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export const insertWorkflowSchema = z.object({
  lessonId: z.string().optional(),
  currentStep: z.number().default(0),
  stepData: z.record(z.any()).optional(),
  completedSteps: z.array(z.number()).default([]),
});

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  language: string;
  inputFormat: string;
  settings: Record<string, any> | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isArchived: boolean;
  // Computed fields
  templateCount?: number;
  lessonCount?: number;
}

export const insertProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  language: z.string().min(2).max(10).default('zh'),
  inputFormat: z.enum(['excel', 'pdf', 'text', 'markdown']).default('excel'),
  settings: z.record(z.any()).optional(),
  createdBy: z.string().optional(),
});

export const updateProjectSchema = insertProjectSchema.partial().extend({
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// API Request/Response types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  language: string;
  inputFormat: 'excel' | 'pdf' | 'text' | 'markdown';
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  language: string;
  inputFormat: string;
  templateCount: number;
  lessonCount: number;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings: Record<string, any> | null;
  createdBy: string | null;
}

export interface ProjectListQuery {
  language?: string;
  inputFormat?: string;
  isActive?: boolean;
  isArchived?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

// Template Analysis types
export interface Variable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  pattern: string; // e.g., "{{variable}}", "%variable%", etc.
  required: boolean;
  defaultValue?: any;
  description?: string;
  examples?: string[];
}

export interface TableStructure {
  rowCount: number;
  columnCount: number;
  headers: string[];
  hasHeader: boolean;
  alignment?: ('left' | 'center' | 'right')[];
  markdown: string;
}

export interface MarkdownStructure {
  headings: {
    level: number;
    text: string;
    position: number;
  }[];
  tables: TableStructure[];
  lists: {
    type: 'ordered' | 'unordered';
    items: string[];
    position: number;
  }[];
  codeBlocks: {
    language: string;
    content: string;
    position: number;
  }[];
  links: {
    text: string;
    url: string;
    position: number;
  }[];
  images: {
    alt: string;
    src: string;
    position: number;
  }[];
  wordCount: number;
  lineCount: number;
}

export interface LanguagePattern {
  language: 'chinese' | 'vietnamese' | 'english';
  confidence: number;
  characterCount: number;
  wordCount: number;
  patterns: string[];
}

export interface QualityMetrics {
  completeness: number; // 0-100
  consistency: number; // 0-100
  readability: number; // 0-100
  structure: number; // 0-100
  overall: number; // 0-100
  issues: {
    type: 'error' | 'warning' | 'info';
    message: string;
    position?: number;
    suggestion?: string;
  }[];
}

export interface TemplateAnalysis {
  id?: string;
  content: string;
  variables: Variable[];
  structure: MarkdownStructure;
  languages: LanguagePattern[];
  quality: QualityMetrics;
  metadata: {
    analyzedAt: Date;
    version: string;
    analyzerVersion: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  completeness: {
    totalVariables: number;
    requiredVariables: number;
    providedVariables: number;
    missingVariables: string[];
  };
  consistency: {
    languageMixing: boolean;
    variableNaming: boolean;
    structureConsistency: boolean;
  };
  recommendations: string[];
}

export interface TemplateStructure {
  type: 'markdown' | 'plain-text' | 'structured' | 'mixed';
  complexity: 'simple' | 'medium' | 'complex';
  hasTables: boolean;
  hasVariables: boolean;
  hasMultilingualContent: boolean;
  estimatedWordCount: number;
  sections: {
    title: string;
    level: number;
    content: string;
  }[];
}

export type AnalysisOptions = {
  detectLanguage?: boolean;
  extractVariables?: boolean;
  analyzeStructure?: boolean;
  scoreQuality?: boolean;
  variablePatterns?: string[]; // Custom patterns to detect
  targetLanguages?: ('chinese' | 'vietnamese' | 'english')[];
};

// Flashcard Image types
export interface FlashcardImage {
  id: string;
  url: string;
  alt: string;
  description: string;
  credit: string;
  sourceUrl: string;
  type: 'photo' | 'illustration';
}

// Freepik Icon types (legacy)
export interface FreepikIcon {
  id: string;
  url: string;
  alt: string;
  description: string;
  credit: string;
  sourceUrl: string;
  type: 'icon';
}

// High-quality SVG Icon types (Heroicons, Lucide, etc.)
export interface SVGIcon {
  id: string;
  url: string;
  alt: string;
  description: string;
  credit: string;
  sourceUrl: string;
  type: 'icon';
  source: 'heroicons' | 'lucide' | 'feather';
  quality: 'high';
  svgContent?: string;
  size?: string;
}

// Enhanced Flashcard Data types
export interface FlashcardData {
  id?: string;
  word: string;
  pinyin: string;
  vietnamese: string;
  partOfSpeech?: string;
  imageQuery?: string;
  imageUrl?: string;
  // Enhanced image options with high-quality SVG icons
  imageOptions?: {
    photos: FlashcardImage[];
    illustrations: FlashcardImage[];
    icons: SVGIcon[]; // High-quality SVG icons from Heroicons, Lucide, etc.
    autoSelected: FlashcardImage | SVGIcon | null;
    all: (FlashcardImage | SVGIcon)[];
  };
  selectedImageId?: string; // Track which image user selected
}

// Enhanced Project types for multi-language support
export interface Project {
  id: string;
  name: string;
  description: string | null;
  language: string;
  inputFormat: string;
  status: string;
  userId: string;
  templateCount: number;
  lessonCount: number;
  settings: Record<string, any> | null;
  metadata: Record<string, any> | null;
  language: string; // 'zh', 'vi', 'en', etc.
  inputFormat: string; // 'excel', 'pdf', 'text', 'markdown'
  settings: Record<string, any> | null;
  createdBy: string | null;
  status: string; // 'active', 'archived', 'deleted'
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Project schemas for API validation
export const insertProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  description: z.string().optional(),
  language: z.string().min(1, "Language is required").max(10, "Language must be less than 10 characters").default("zh"),
  inputFormat: z.enum(["excel", "pdf", "text", "markdown", "docx"], {
    errorMap: () => ({ message: "Input format must be one of: excel, pdf, text, markdown, docx" })
  }).default("excel"),
  settings: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  language: z.string().min(1).default('zh'),
  inputFormat: z.string().default('excel'),
  settings: z.record(z.any()).optional(),
  createdBy: z.string().optional(),
  status: z.string().default('active'),
  isActive: z.boolean().default(true),
  isArchived: z.boolean().default(false),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters").optional(),
  description: z.string().optional(),
  language: z.string().min(1, "Language is required").max(10, "Language must be less than 10 characters").optional(),
  inputFormat: z.enum(["excel", "pdf", "text", "markdown", "docx"], {
    errorMap: () => ({ message: "Input format must be one of: excel, pdf, text, markdown, docx" })
  }).optional(),
  status: z.enum(["active", "archived", "deleted"], {
    errorMap: () => ({ message: "Status must be one of: active, archived, deleted" })
  }).optional(),
  settings: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export const projectFilterSchema = z.object({
  language: z.string().optional(),
  inputFormat: z.enum(["excel", "pdf", "text", "markdown", "docx"]).optional(),
  status: z.enum(["active", "archived", "deleted"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "templateCount", "lessonCount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type ProjectFilter = z.infer<typeof projectFilterSchema>;

// Enhanced Template types for both file uploads and template management
export interface Template {
  id: string;
  projectId: string;
  name: string;
  type: string; // 'lesson_plan', 'flashcard', 'worksheet', 'activity', 'uploaded_file'
  description: string | null;
  fileName: string | null;
  filePath: string | null;
  fileContent: string | null;
  variables: TemplateVariable[] | null;
  structure: Record<string, any> | null;
  qualityScore: string | null;
  createdBy: string | null;

  // File upload specific fields
  filename?: string | null; // Generated filename for storage
  originalName?: string | null; // Original uploaded filename
  fileType?: string | null; // 'md', 'docx', 'pdf', etc.
  fileSize?: number | null; // File size in bytes
  mimeType?: string | null;
  content?: string | null; // Extracted text content
  structure?: TemplateStructure | null; // Parsed structure

  // Storage fields
  storageUrl?: string | null; // Cloud storage URL
  storageKey?: string | null; // Storage key for retrieval
  contentHash?: string | null; // SHA-256 hash for duplicate detection

  // Template management fields
  variables?: TemplateVariable[] | null;
  metadata?: Record<string, any> | null;
  qualityScore?: string | null; // Decimal as string

  uploadedBy: string | null;
  isDeleted: boolean;
  isActive: boolean;
  isProcessed: boolean;
  processingStatus: string; // 'pending', 'processing', 'completed', 'failed'
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isProcessed: boolean;
  processingStatus: string;
}

export interface TemplateVariable {
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

export interface TemplateStructure {
  headings?: Array<{
    level: number;
    text: string;
    position: number;
  }>;
  sections?: Array<{
    title: string;
    content: string;
    position: number;
  }>;
  metadata?: Record<string, any>;
}

export const insertTemplateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  fileName: z.string().optional(),
  filePath: z.string().optional(),
  fileContent: z.string().optional(),

  // File upload fields (optional for template management)
  filename: z.string().optional(),
  originalName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  content: z.string().optional(),
  structure: z.any().optional(),

  // Storage fields (optional)
  storageUrl: z.string().optional(),
  storageKey: z.string().optional(),
  contentHash: z.string().optional(),

  // Template management fields
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
  structure: z.record(z.any()).optional(),
  qualityScore: z.string().optional(),
  createdBy: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  qualityScore: z.string().optional(),

  uploadedBy: z.string().optional(),
  isActive: z.boolean().default(true),
  isProcessed: z.boolean().default(false),
  processingStatus: z.string().default('pending'),
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

// Language Configuration types
export interface LanguageConfig {
  id: string;
  languageCode: string;
  languageName: string;
  direction: string;
  direction: string; // 'ltr' or 'rtl'
  aiPrompts: LanguageAIPrompts | null;
  culturalSettings: CulturalSettings | null;
  formatting: FormattingSettings | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LanguageAIPrompts {
  analysis: string;
  lessonPlan: string;
  flashcard: string;
  summary: string;
}

export interface CulturalSettings {
  culturalContext: string;
  writingSystem: string;
  pronunciationSystem: string;
  culturalThemes: string[];
  educationalApproach: string;
}

export interface FormattingSettings {
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  textDirection: string;
export interface FormattingSettings {
  dateFormat: string;
  numberFormat: string;
  currency: string;
  textDirection: string;
  customStyles?: Record<string, any>;
}

export const insertLanguageConfigSchema = z.object({
  languageCode: z.string().min(1),
  languageName: z.string().min(1),
  direction: z.string().default('ltr'),
  aiPrompts: z.object({
    analysis: z.string(),
    lessonPlan: z.string(),
    flashcard: z.string(),
    summary: z.string(),
  }).optional(),
  culturalSettings: z.object({
    culturalContext: z.string(),
    writingSystem: z.string(),
    pronunciationSystem: z.string(),
    culturalThemes: z.array(z.string()),
    educationalApproach: z.string(),
  }).optional(),
  formatting: z.object({
    dateFormat: z.string(),
    numberFormat: z.string(),
    currencyFormat: z.string(),
    textDirection: z.string(),
  formatting: z.object({
    dateFormat: z.string(),
    numberFormat: z.string(),
    currency: z.string(),
    textDirection: z.string(),
    customStyles: z.record(z.any()).optional(),
  }).optional(),
  isActive: z.boolean().default(true),
});

export type InsertLanguageConfig = z.infer<typeof insertLanguageConfigSchema>;

// Template Analysis types
export interface TemplateAnalysis {
  id: string;
  templateId: string;
  analysisVersion: string;
  analyzedAt: Date;
  sections: AnalysisSection[];
  tables: TableStructure[];
  headers: HeaderInfo[];
  detectedVariables: VariablePattern[];
  variablePatterns: PatternMatch[];
  markdownStyle: string | null;
  tableFormat: string | null;
  languagePatterns: LanguagePattern[];
  completenessScore: string;
  consistencyScore: string;
  complexityScore: string;
  analyzerConfig: Record<string, any>;
}

export interface AnalysisSection {
  id: string;
  name: string;
  content: string;
  type: string;
  startPosition: number;
  endPosition: number;
}

export interface TableStructure {
  id: string;
  rows: number;
  columns: number;
  headers: string[];
  dataTypes: string[];
  hasHeaderRow: boolean;
}

export interface HeaderInfo {
  text: string;
  level: number;
  position: number;
  style: string;
}

export interface VariablePattern {
  name: string;
  pattern: string;
  examples: string[];
  description: string;
  required: boolean;
}

export interface PatternMatch {
  pattern: string;
  matches: string[];
  confidence: number;
  context: string;
}

export interface LanguagePattern {
  pattern: string;
  language: string;
  description: string;
  examples: string[];
}

// Template Analysis types
export interface TemplateAnalysis {
  id: string;
  templateId: string;
  analysisVersion: string;
  analyzedAt: Date;
  sections: Array<any>;
  tables: Array<any>;
  headers: Array<any>;
  detectedVariables: Array<any>;
  variablePatterns: Array<any>;
  markdownStyle?: string | null;
  tableFormat?: string | null;
  languagePatterns: Array<any>;
  completenessScore: string; // Decimal as string
  consistencyScore: string; // Decimal as string
  complexityScore: string; // Decimal as string
  analyzerConfig: Record<string, any>;
}

export const insertTemplateAnalysisSchema = z.object({
  templateId: z.string().min(1),
  analysisVersion: z.string().default('1.0'),
  sections: z.array(z.any()).default([]),
  tables: z.array(z.any()).default([]),
  headers: z.array(z.any()).default([]),
  detectedVariables: z.array(z.any()).default([]),
  variablePatterns: z.array(z.any()).default([]),
  markdownStyle: z.string().optional(),
  tableFormat: z.string().optional(),
  languagePatterns: z.array(z.any()).default([]),
  completenessScore: z.string().default('0.00'),
  consistencyScore: z.string().default('0.00'),
  complexityScore: z.string().default('0.00'),
  analyzerConfig: z.record(z.any()).default({}),
});

export type InsertTemplateAnalysis = z.infer<typeof insertTemplateAnalysisSchema>;

// Activity types
export interface Activity {
  id: string;
  name: string;
  type: string; // 'game', 'song', 'worksheet', 'drill'
  description: string | null;
  instructions: string | null;
  duration: string | null; // e.g., "5-10 mins"
  ageGroup: string | null; // e.g., "Preschool", "Primary"
  materials: Array<any> | null;
  benefits: string | null;
  projectId: string | null;
  language: string;
  isGeneric: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const insertActivitySchema = z.object({
  name: z.string().min(1),
  type: z.string().default('game'),
  description: z.string().optional(),
  instructions: z.string().optional(),
  duration: z.string().optional(),
  ageGroup: z.string().optional(),
  materials: z.array(z.any()).optional(),
  benefits: z.string().optional(),
  projectId: z.string().optional(),
  language: z.string().default('zh'),
  isGeneric: z.boolean().default(false),
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Template upload request types
export interface TemplateUploadRequest {
  files: Array<{
    name: string;
    type: string;
    size: number;
  }>;
  projectId: string;
}

export interface TemplateUploadResponse {
  success: boolean;
  templates?: Array<{
    id: string;
    filename: string;
    originalName: string;
    fileType: string;
    status: 'uploaded' | 'error';
    error?: string;
  }>;
  duplicates?: Array<{
    filename: string;
    originalName: string;
    existingId: string;
  }>;
  errors?: string[];
}