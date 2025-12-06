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

// Project types
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

// Template types
export interface Template {
  id: string;
  projectId: string | null;
  name: string;
  type: string;
  description: string | null;
  fileName: string | null;
  filePath: string | null;
  fileContent: string | null;
  variables: TemplateVariable[] | null;
  structure: Record<string, any> | null;
  qualityScore: string | null;
  createdBy: string | null;
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

export const insertTemplateSchema = z.object({
  projectId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  fileName: z.string().optional(),
  filePath: z.string().optional(),
  fileContent: z.string().optional(),
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