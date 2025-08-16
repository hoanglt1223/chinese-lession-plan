import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).default("1000.00"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const lessons = pgTable("lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  level: text("level").notNull(), // N1, N2, etc.
  ageGroup: text("age_group").notNull(), // preschool, primary, lower-secondary
  status: text("status").notNull().default("draft"), // draft, review, plan, flashcards, summary, completed
  originalFiles: jsonb("original_files").$type<Array<{name: string, content: string, type: string}>>(),
  aiAnalysis: jsonb("ai_analysis").$type<{
    vocabulary: string[];
    activities: string[];
    learningObjectives: string[];
    detectedLevel: string;
    ageAppropriate: string;
  }>(),
  lessonPlan: text("lesson_plan"), // Markdown content
  flashcards: jsonb("flashcards").$type<Array<{
    word: string;
    pinyin: string;
    vietnamese: string;
    imageUrl: string;
    id: string;
  }>>(),
  summary: text("summary"), // DOCX content
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lessonId: varchar("lesson_id").references(() => lessons.id),
  currentStep: integer("current_step").notNull().default(0),
  stepData: jsonb("step_data").$type<Record<string, any>>(),
  completedSteps: jsonb("completed_steps").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;
