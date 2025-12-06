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

// Projects table for project management API and multi-project support
// Enhanced Projects table for multi-project support with language and settings
// Enhanced Projects table for multi-project support with language and settings
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  language: varchar('language', { length: 10 }).notNull().default('zh'), // 'zh', 'vi', 'en', etc.
  inputFormat: varchar('input_format', { length: 50 }).notNull().default('excel'), // 'excel', 'pdf', 'text', 'markdown', 'docx'
  userId: uuid('user_id').references(() => users.id),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived, deleted
  language: varchar('language', { length: 10 }).notNull().default('zh'), // 'zh', 'vi', 'en', etc.
  language: varchar('language', { length: 10 }).notNull().default('zh'), // 'zh', 'vi', 'en', etc.
  inputFormat: varchar('input_format', { length: 50 }).notNull().default('excel'), // 'excel', 'pdf', 'text', 'markdown'
  settings: jsonb('settings').default({}), // Project-specific settings
  templateCount: integer('template_count').notNull().default(0),
  lessonCount: integer('lesson_count').notNull().default(0),
  metadata: jsonb('metadata'), // Additional project metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'archived', 'deleted'
  createdBy: uuid('created_by').references(() => users.id),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'archived', 'deleted'
  isActive: boolean('is_active').notNull().default(true),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Enhanced Templates table for both file uploads and template management
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'lesson_plan', 'flashcard', 'worksheet', 'activity', 'uploaded_file'
  description: text('description'),

  // File upload specific fields
  filename: varchar('filename', { length: 255 }), // Generated filename for storage
  originalName: varchar('original_name', { length: 255 }), // Original uploaded filename
  fileType: varchar('file_type', { length: 10 }), // 'md', 'docx', 'pdf', etc.
  fileSize: integer('file_size'), // File size in bytes
  mimeType: varchar('mime_type', { length: 100 }),
  content: text('content'), // Extracted text content
  structure: jsonb('structure'), // Parsed structure (headings, sections, etc.)
  storageUrl: varchar('storage_url', { length: 500 }), // Cloud storage URL
  storageKey: varchar('storage_key', { length: 500 }), // Storage key for retrieval
  contentHash: varchar('content_hash', { length: 64 }), // SHA-256 hash for duplicate detection

  // Template management fields
  variables: jsonb('variables').default([]), // Template variables
  metadata: jsonb('metadata').default({}), // Additional metadata
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100 quality score
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  uploadedBy: uuid('uploaded_by').references(() => users.id),
  isDeleted: boolean('is_deleted').notNull().default(false),

  uploadedBy: uuid('uploaded_by').references(() => users.id),
  isDeleted: boolean('is_deleted').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isProcessed: boolean('is_processed').notNull().default(false),
  processingStatus: varchar('processing_status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

// Enhanced lessons table with project and template references
export const enhancedLessons = pgTable('enhanced_lessons', {
// Generic Activities table for reusable lesson activities
export const activities = pgTable('activities', {
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
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }), // Project this activity belongs to
  language: varchar('language', { length: 10 }).notNull().default('zh'), // Language of the activity
  isGeneric: boolean('is_generic').notNull().default(false), // Whether this activity can be used across projects
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Generated Content table for tracking AI-generated content
export const generatedContent = pgTable('generated_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 50 }).notNull(), // 'lesson_plan', 'flashcard', 'summary', 'vocabulary'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // Generation metadata (AI model, prompt, tokens, etc.)
  unit: integer('unit').notNull(),
  lesson: integer('lesson').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  formatMatchScore: decimal('format_match_score', { precision: 5, scale: 2 }).default('0.00'), // 0-100 format matching score
  usedTemplates: jsonb('used_templates').default([]), // Array of template IDs used
  language: varchar('language', { length: 10 }).notNull().default('zh'),
  generationMetadata: jsonb('generation_metadata').default({}), // AI generation metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Quality metrics table for tracking generation performance (Enhanced AI Generation)
export const generationMetrics = pgTable('generation_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => promptTemplates.id),
  generationType: varchar('generation_type', { length: 50 }).notNull(), // 'lesson_plan', 'flashcard', 'analysis', 'summary'
  modelUsed: varchar('model_used', { length: 50 }).notNull(), // AI model used
  overallScore: decimal('overall_score', { precision: 3, scale: 2 }).notNull(), // 0.00-1.00
  formatAccuracy: decimal('format_accuracy', { precision: 3, scale: 2 }).notNull(), // 0.00-1.00
  contentQuality: decimal('content_quality', { precision: 3, scale: 2 }).notNull(), // 0.00-1.00
  completeness: decimal('completeness', { precision: 3, scale: 2 }).notNull(), // 0.00-1.00
  consistency: decimal('consistency', { precision: 3, scale: 2 }).notNull(), // 0.00-1.00
  generationTime: integer('generation_time').notNull(), // milliseconds
  retries: integer('retries').notNull().default(0),
  variables: jsonb('variables'), // Input variables used
  validationIssues: jsonb('validation_issues'), // Array of validation issues
  templateMatchScore: decimal('template_match_score', { precision: 3, scale: 2 }), // How well template matched input
  userFeedback: integer('user_feedback'), // 1-5 rating from users
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Template performance aggregation table (Enhanced AI Generation)
export const templatePerformance = pgTable('template_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => promptTemplates.id),
  generationType: varchar('generation_type', { length: 50 }).notNull(),
  totalGenerations: integer('total_generations').notNull().default(0),
  averageScore: decimal('average_score', { precision: 3, scale: 2 }).notNull().default('0.00'),
  averageFormatAccuracy: decimal('average_format_accuracy', { precision: 3, scale: 2 }).notNull().default('0.00'),
  averageGenerationTime: integer('average_generation_time').notNull().default(0),
  successRate: decimal('success_rate', { precision: 3, scale: 2 }).notNull().default('0.00'),
  lastUsed: timestamp('last_used'),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
});

// Enhanced templates with quality tracking (Enhanced AI Generation)
export const enhancedTemplates = pgTable('enhanced_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  baseTemplateId: uuid('base_template_id').references(() => promptTemplates.id),
  sampleOutput: text('sample_output').notNull(), // Golden sample output
  formatStructure: jsonb('format_structure').notNull(), // Structure requirements
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }).notNull(), // 0.00-1.00
  isActive: boolean('is_active').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  averageMatchScore: decimal('average_match_score', { precision: 3, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Template Analysis Results table (additional for comprehensive analysis)
export const templateAnalysisResults = pgTable('template_analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id').references(() => lessons.id),
  templateId: uuid('template_id').references(() => promptTemplates.id),
  analysisType: varchar('analysis_type', { length: 50 }).notNull(), // 'structure', 'variables', 'quality', 'comprehensive'
  content: text('content').notNull(),
  analysisData: jsonb('analysis_data').notNull(), // Full TemplateAnalysis object
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }), // Overall quality score
  recommendations: jsonb('recommendations'), // Array of improvement recommendations
  metadata: jsonb('metadata'), // Analysis metadata (version, analyzer, etc.)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Template Quality Metrics table for historical tracking
export const templateQualityMetrics = pgTable('template_quality_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id').references(() => templateAnalysisResults.id),
  templateId: uuid('template_id').references(() => promptTemplates.id),
  completeness: decimal('completeness', { precision: 5, scale: 2 }).notNull(),
  consistency: decimal('consistency', { precision: 5, scale: 2 }).notNull(),
  readability: decimal('readability', { precision: 5, scale: 2 }).notNull(),
  structure: decimal('structure', { precision: 5, scale: 2 }).notNull(),
  overall: decimal('overall', { precision: 5, scale: 2 }).notNull(),
  issuesCount: integer('issues_count').notNull().default(0),
  variablesCount: integer('variables_count').notNull().default(0),
  wordCount: integer('word_count').notNull().default(0),
  measuredAt: timestamp('measured_at').notNull().defaultNow(),
});

// Template Comparison Results table
export const templateComparisons = pgTable('template_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  template1Id: uuid('template_1_id').references(() => promptTemplates.id),
  template2Id: uuid('template_2_id').references(() => promptTemplates.id),
  comparisonData: jsonb('comparison_data').notNull(), // Full comparison results
  similarityScore: decimal('similarity_score', { precision: 5, scale: 2 }).notNull(),
  winnerId: uuid('winner_id').references(() => promptTemplates.id), // ID of the better template
  comparisonType: varchar('comparison_type', { length: 50 }).notNull(), // 'quality', 'structure', 'variables', 'comprehensive'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Template Usage Analytics table
export const templateUsageAnalytics = pgTable('template_usage_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').references(() => promptTemplates.id),
  lessonId: uuid('lesson_id').references(() => lessons.id),
  userId: uuid('user_id').references(() => users.id),
  usageType: varchar('usage_type', { length: 50 }).notNull(), // 'analysis', 'generation', 'export', 'comparison'
  actionData: jsonb('action_data'), // Details about the action performed
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  duration: integer('duration'), // Time taken in milliseconds
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  templates: many(templates),
  templateUsageAnalytics: many(templateUsageAnalytics),
}));

export const lessonsRelations = relations(lessons, ({ many }) => ({
  workflows: many(workflows),
  templateAnalysisResults: many(templateAnalysisResults),
  templateUsageAnalytics: many(templateUsageAnalytics),
  generatedContent: many(generatedContent),
}));

export const workflowsRelations = relations(workflows, ({ one }) => ({
  lesson: one(lessons, {
    fields: [workflows.lessonId],
    references: [lessons.id],
  }),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ many }) => ({
  components: many(promptComponents),
  templateAnalysisResults: many(templateAnalysisResults),
  templateComparisons: many(templateComparisons, { relationName: 'template1' }),
  templateComparisons2: many(templateComparisons, { relationName: 'template2' }),
  templateQualityMetrics: many(templateQualityMetrics),
  templateUsageAnalytics: many(templateUsageAnalytics),
}));

export const promptComponentsRelations = relations(promptComponents, ({ one }) => ({
  template: one(promptTemplates, {
    fields: [promptComponents.templateId],
    references: [promptTemplates.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  templates: many(templates),
  activities: many(activities),
  enhancedLessons: many(enhancedLessons),
  activities: many(activities),
}));

// Relations for templates
export const templatesRelations = relations(templates, ({ one, many }) => ({
  project: one(projects, {
    fields: [templates.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [templates.uploadedBy],
    references: [users.id],
  }),
  templateAnalyses: many(templateAnalyses),
  enhancedLessons: many(enhancedLessons),
  analyses: many(templateAnalyses),
}));

// Relations for users
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  createdTemplates: many(templates),
}));

// Relations for activities
export const activitiesRelations = relations(activities, ({ one }) => ({
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
}));

// Relations for language configs
export const languageConfigsRelations = relations(languageConfigs, ({ many }) => ({
  // No direct relations needed for now
// Relations for template analyses
export const templateAnalysesRelations = relations(templateAnalyses, ({ one }) => ({
  template: one(templates, {
    fields: [templateAnalyses.templateId],
    references: [templates.id],
  }),
}));

// Relations for template analyses
export const templateAnalysesRelations = relations(templateAnalyses, ({ one }) => ({
  template: one(templates, {
    fields: [templateAnalyses.templateId],
    references: [templates.id],
  }),
// Relations for activities
export const activitiesRelations = relations(activities, ({ one }) => ({
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
}));

// Relations for enhanced lessons
export const enhancedLessonsRelations = relations(enhancedLessons, ({ one }) => ({
  project: one(projects, {
    fields: [enhancedLessons.projectId],
    references: [projects.id],
  }),
  template: one(templates, {
    fields: [enhancedLessons.templateId],
    references: [templates.id],
  }),
}));

// Projects table for organizing related content and resources
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  language: varchar('language', { length: 10 }).notNull().default('zh'), // Language code: zh, en, vi, etc.
  createdBy: uuid('created_by').references(() => users.id),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, archived, deleted
  settings: jsonb('settings'), // Project-specific settings as JSON
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

// Relations for projects
export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  templates: many(templates),
  generatedContent: many(generatedContent),
  activities: many(activities),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  project: one(projects, {
    fields: [templates.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [templates.uploadedBy],
    references: [users.id],
  }),
  analyses: many(templateAnalyses),
  generatedContent: many(generatedContent),
}));

export const templateAnalysesRelations = relations(templateAnalyses, ({ one }) => ({
  template: one(templates, {
    fields: [templateAnalyses.templateId],
    references: [templates.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
}));

export const generatedContentRelations = relations(generatedContent, ({ one }) => ({
  project: one(projects, {
    fields: [generatedContent.projectId],
    references: [projects.id],
  }),
  template: one(templates, {
    fields: [generatedContent.templateId],
    references: [templates.id],
  }),
  lesson: one(lessons, {
    fields: [generatedContent.lessonId],
    references: [lessons.id],
  }),
}));

export const templateAnalysisResultsRelations = relations(templateAnalysisResults, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [templateAnalysisResults.lessonId],
    references: [lessons.id],
  }),
  template: one(promptTemplates, {
    fields: [templateAnalysisResults.templateId],
    references: [promptTemplates.id],
  }),
  qualityMetrics: many(templateQualityMetrics),
}));

export const templateQualityMetricsRelations = relations(templateQualityMetrics, ({ one }) => ({
  analysis: one(templateAnalysisResults, {
    fields: [templateQualityMetrics.analysisId],
    references: [templateAnalysisResults.id],
  }),
  template: one(promptTemplates, {
    fields: [templateQualityMetrics.templateId],
    references: [promptTemplates.id],
  }),
}));

export const templateComparisonsRelations = relations(templateComparisons, ({ one }) => ({
  template1: one(promptTemplates, {
    fields: [templateComparisons.template1Id],
    references: [promptTemplates.id],
    relationName: 'template1',
  }),
  template2: one(promptTemplates, {
    fields: [templateComparisons.template2Id],
    references: [promptTemplates.id],
    relationName: 'template2',
  }),
  winner: one(promptTemplates, {
    fields: [templateComparisons.winnerId],
    references: [promptTemplates.id],
  }),
}));

export const templateUsageAnalyticsRelations = relations(templateUsageAnalytics, ({ one }) => ({
  template: one(promptTemplates, {
    fields: [templateUsageAnalytics.templateId],
    references: [promptTemplates.id],
  }),
  lesson: one(lessons, {
    fields: [templateUsageAnalytics.lessonId],
    references: [lessons.id],
  }),
  user: one(users, {
    fields: [templateUsageAnalytics.userId],
    references: [users.id],
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

// Project-related types
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
export type LanguageConfig = typeof languageConfigs.$inferSelect;
export type InsertLanguageConfig = typeof languageConfigs.$inferInsert;
export type TemplateAnalysis = typeof templateAnalyses.$inferSelect;
export type InsertTemplateAnalysis = typeof templateAnalyses.$inferInsert;
export type EnhancedLesson = typeof enhancedLessons.$inferSelect;
export type InsertEnhancedLesson = typeof enhancedLessons.$inferInsert;
export type TemplateAnalysis = typeof templateAnalyses.$inferSelect;
export type InsertTemplateAnalysis = typeof templateAnalyses.$inferInsert;

// Enhanced AI Generation types
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
export type LanguageConfig = typeof languageConfigs.$inferSelect;
export type InsertLanguageConfig = typeof languageConfigs.$inferInsert;

export type TemplateAnalysis = typeof templateAnalyses.$inferSelect;
export type InsertTemplateAnalysis = typeof templateAnalyses.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
export type GenerationMetrics = typeof generationMetrics.$inferSelect;
export type InsertGenerationMetrics = typeof generationMetrics.$inferInsert;
export type TemplatePerformance = typeof templatePerformance.$inferSelect;
export type InsertTemplatePerformance = typeof templatePerformance.$inferInsert;
export type EnhancedTemplate = typeof enhancedTemplates.$inferSelect;
export type InsertEnhancedTemplate = typeof enhancedTemplates.$inferInsert;

// Additional analysis and tracking types
export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = typeof generatedContent.$inferInsert;
export type TemplateAnalysisResult = typeof templateAnalysisResults.$inferSelect;
export type InsertTemplateAnalysisResult = typeof templateAnalysisResults.$inferInsert;
export type TemplateQualityMetrics = typeof templateQualityMetrics.$inferSelect;
export type InsertTemplateQualityMetrics = typeof templateQualityMetrics.$inferInsert;
export type TemplateComparison = typeof templateComparisons.$inferSelect;
export type InsertTemplateComparison = typeof templateComparisons.$inferInsert;
export type TemplateUsageAnalytics = typeof templateUsageAnalytics.$inferSelect;
export type InsertTemplateUsageAnalytics = typeof templateUsageAnalytics.$inferInsert;