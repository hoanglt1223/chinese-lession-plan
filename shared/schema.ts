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
  originalFiles: Array<{name: string, content: string, type: string}> | null;
  aiAnalysis: {
    vocabulary: string[];
    activities: string[];
    learningObjectives: string[];
    detectedLevel: string;
    ageAppropriate: string;
  } | null;
  lessonPlan: string | null; // Markdown content
  flashcards: Array<{
    word: string;
    pinyin: string;
    vietnamese: string;
    imageUrl: string;
    id: string;
  }> | null;
  summary: string | null; // DOCX content
  createdAt: Date;
  updatedAt: Date;
}

export const insertLessonSchema = z.object({
  title: z.string().min(1),
  level: z.string().min(1),
  ageGroup: z.string().min(1),
  status: z.string().default("draft"),
  originalFiles: z.array(z.object({
    name: z.string(),
    content: z.string(),
    type: z.string()
  })).optional(),
  aiAnalysis: z.object({
    vocabulary: z.array(z.string()),
    activities: z.array(z.string()),
    learningObjectives: z.array(z.string()),
    detectedLevel: z.string(),
    ageAppropriate: z.string(),
  }).optional(),
  lessonPlan: z.string().optional(),
  flashcards: z.array(z.object({
    word: z.string(),
    pinyin: z.string(),
    vietnamese: z.string(),
    imageUrl: z.string(),
    id: z.string(),
  })).optional(),
  summary: z.string().optional(),
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