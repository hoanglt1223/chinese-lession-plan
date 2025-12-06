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
  createdBy: string | null;
  status: string;
  settings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export const insertProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  language: z.string().min(1).default('zh'),
  createdBy: z.string().optional(),
  status: z.string().default('active'),
  settings: z.record(z.any()).optional(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;

// Template types
export interface Template {
  id: string;
  projectId: string | null;
  name: string;
  type: string;
  description: string | null;
  filePath: string | null;
  fileContent: string | null;
  variables: TemplateVariable[] | null;
  metadata: Record<string, any> | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  filePath: z.string().optional(),
  fileContent: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string().optional(),
    defaultValue: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  createdBy: z.string().optional(),
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

// Language Configuration types
export interface LanguageConfig {
  id: string;
  languageCode: string;
  languageName: string;
  aiPrompts: LanguageAIPrompts | null;
  culturalSettings: CulturalSettings | null;
  translationSettings: TranslationSettings | null;
  educationalStandards: EducationalStandards | null;
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

export interface TranslationSettings {
  targetLanguage: string;
  sourceLanguage: string;
  translationStyle: string;
  culturalAdaptation: boolean;
  idiomHandling: string;
}

export interface EducationalStandards {
  system: string;
  levels: string[];
  ageGroups: {
    preschool: string;
    primary: string;
    secondary: string;
  };
  assessmentTypes: string[];
}

export const insertLanguageConfigSchema = z.object({
  languageCode: z.string().min(1),
  languageName: z.string().min(1),
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
  translationSettings: z.object({
    targetLanguage: z.string(),
    sourceLanguage: z.string(),
    translationStyle: z.string(),
    culturalAdaptation: z.boolean(),
    idiomHandling: z.string(),
  }).optional(),
  educationalStandards: z.object({
    system: z.string(),
    levels: z.array(z.string()),
    ageGroups: z.object({
      preschool: z.string(),
      primary: z.string(),
      secondary: z.string(),
    }),
    assessmentTypes: z.array(z.string()),
  }).optional(),
  isActive: z.boolean().default(true),
});

export type InsertLanguageConfig = z.infer<typeof insertLanguageConfigSchema>;