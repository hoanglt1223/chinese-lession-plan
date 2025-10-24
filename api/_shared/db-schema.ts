import { pgTable, varchar, timestamp, boolean, decimal, uuid, text, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  creditBalance: decimal('credit_balance', { precision: 10, scale: 2 }).notNull().default('1000.00'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Lessons table
export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  level: varchar('level', { length: 50 }).notNull(), // N1, N2, etc.
  ageGroup: varchar('age_group', { length: 100 }).notNull(), // preschool, primary, lower-secondary
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, review, plan, flashcards, summary, completed
  originalFiles: jsonb('original_files'), // Array<{name: string, content: string, type: string}> | null
  aiAnalysis: jsonb('ai_analysis'), // Analysis object | null
  lessonPlans: jsonb('lesson_plans'), // Array of lesson plan objects | null
  flashcards: jsonb('flashcards'), // Array of flashcard objects | null
  summaries: jsonb('summaries'), // Array of summary objects | null
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Workflows table
export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').references(() => lessons.id),
  currentStep: integer('current_step').notNull().default(0),
  stepData: jsonb('step_data'), // Record<string, any> | null
  completedSteps: jsonb('completed_steps'), // number[] | null
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Translation cache table for Redis backup
export const translationCache = pgTable('translation_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceText: text('source_text').notNull(),
  sourceLang: varchar('source_lang', { length: 10 }).notNull(),
  targetLang: varchar('target_lang', { length: 10 }).notNull(),
  translatedText: text('translated_text').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'deepl' or 'openai'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Prompt templates table for customizable AI prompts
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'analysis', 'lesson_plan', 'flashcard', 'summary'
  description: text('description'),
  isDefault: boolean('is_default').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Prompt components table for modular prompt parts
export const promptComponents = pgTable('prompt_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => promptTemplates.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // e.g., 'role_definition', 'task_instructions', 'output_format'
  type: varchar('type', { length: 50 }).notNull(), // 'system', 'user', 'instruction', 'example'
  content: text('content').notNull(),
  order: integer('order').notNull().default(0), // Order of component in the prompt
  variables: jsonb('variables'), // Array of variable names used in this component: {name, type, description, defaultValue}
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const lessonsRelations = relations(lessons, ({ many }) => ({
  workflows: many(workflows),
}));

export const workflowsRelations = relations(workflows, ({ one }) => ({
  lesson: one(lessons, {
    fields: [workflows.lessonId],
    references: [lessons.id],
  }),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ many }) => ({
  components: many(promptComponents),
}));

export const promptComponentsRelations = relations(promptComponents, ({ one }) => ({
  template: one(promptTemplates, {
    fields: [promptComponents.templateId],
    references: [promptTemplates.id],
  }),
}));

// Types for export
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = typeof lessons.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;
export type TranslationCache = typeof translationCache.$inferSelect;
export type InsertTranslationCache = typeof translationCache.$inferInsert;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;
export type PromptComponent = typeof promptComponents.$inferSelect;
export type InsertPromptComponent = typeof promptComponents.$inferInsert;
