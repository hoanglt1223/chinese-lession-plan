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