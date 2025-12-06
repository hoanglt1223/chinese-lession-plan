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

// Generic Activities table for reusable lesson activities
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(), // e.g., "Sticky Ball", "Fruit Squat"
  type: varchar('type', { length: 50 }).notNull().default('game'), // 'game', 'song', 'worksheet', 'drill'
  description: text('description'), // Short description
  instructions: text('instructions'), // Detailed how-to-play
  duration: varchar('duration', { length: 50 }), // e.g., "5-10 mins"
  ageGroup: varchar('age_group', { length: 100 }), // e.g., "Preschool", "Primary"
  materials: jsonb('materials'), // Array of required materials
  benefits: text('benefits'), // Learning outcomes/benefits
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }), // Project this activity belongs to (null for generic activities)
  language: varchar('language', { length: 10 }).notNull().default('zh'), // Language of the activity
  isGeneric: boolean('is_generic').notNull().default(false), // Whether this activity can be used across different projects
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Projects table for multi-project support
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  language: varchar('language', { length: 10 }).notNull().default('zh'), // 'zh', 'vi', 'en'
  inputFormat: varchar('input_format', { length: 50 }).notNull().default('excel'), // 'excel', 'pdf', 'text', 'markdown'
  settings: jsonb('settings').default({}), // Project-specific settings
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
});

// Templates table for sample file storage and analysis
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('lesson_plan'), // 'lesson_plan', 'summary', 'flashcard', 'vocabulary'
  description: text('description'),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }),
  fileSize: integer('file_size'), // File size in bytes
  fileType: varchar('file_type', { length: 50 }),
  fileContent: text('file_content'), // Raw file content
  processedContent: jsonb('processed_content'), // Processed template structure
  variables: jsonb('variables').default([]), // Detected variables from template
  structure: jsonb('structure').default({}), // Template structure analysis
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100 quality score
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  isProcessed: boolean('is_processed').notNull().default(false),
  processingStatus: varchar('processing_status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
});

// Language configurations table for multi-language support
export const languageConfigs = pgTable('language_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  languageCode: varchar('language_code', { length: 10 }).notNull().unique(),
  languageName: varchar('language_name', { length: 100 }).notNull(),
  direction: varchar('direction', { length: 3 }).notNull().default('ltr'), // 'ltr' or 'rtl'
  aiPrompts: jsonb('ai_prompts').default({}), // Language-specific AI prompts
  culturalSettings: jsonb('cultural_settings').default({}), // Cultural and educational adaptations
  formatting: jsonb('formatting').default({}), // Language-specific formatting rules
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

// Template analyses table for detailed analysis results
export const templateAnalyses = pgTable('template_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'cascade' }).notNull(),
  analysisVersion: varchar('analysis_version', { length: 20 }).notNull().default('1.0'),
  analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
  sections: jsonb('sections').default([]), // Extracted sections from template
  tables: jsonb('tables').default([]), // Table structures
  headers: jsonb('headers').default([]), // Headers found
  detectedVariables: jsonb('detected_variables').default([]), // Variables detected in template
  variablePatterns: jsonb('variable_patterns').default([]), // Pattern matches
  markdownStyle: varchar('markdown_style', { length: 50 }), // Markdown format style
  tableFormat: varchar('table_format', { length: 50 }), // Table format type
  languagePatterns: jsonb('language_patterns').default([]), // Language-specific patterns
  completenessScore: decimal('completeness_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100
  consistencyScore: decimal('consistency_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100
  complexityScore: decimal('complexity_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100
  analyzerConfig: jsonb('analyzer_config').default({}), // Analysis configuration
});

// Updated lessons table with project and template references
export const enhancedLessons = pgTable('enhanced_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
  unit: integer('unit').notNull(),
  lesson: integer('lesson').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  formatMatchScore: decimal('format_match_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100 format matching score
  usedTemplates: jsonb('used_templates').default([]), // Array of template IDs used
  language: varchar('language', { length: 10 }).notNull().default('zh'),
  generationMetadata: jsonb('generation_metadata').default({}), // AI generation metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

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
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
