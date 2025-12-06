// Template schema additions to be merged with existing db-schema.ts

// Import existing schema and add template tables
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum
} from 'drizzle-orm/pg-core';

// Mock lessons table for reference - should be imported from main db-schema
const lessons = {} as any; // This will be replaced by proper import when merged

// Enums
export const templateTypeEnum = pgEnum('template_type', [
  'lesson_plan',
  'flashcard',
  'summary',
  'activity',
  'other'
]);

export const variableTypeEnum = pgEnum('variable_type', [
  'string',
  'number',
  'date',
  'lesson',
  'vocabulary',
  'boolean'
]);

// Templates table
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: templateTypeEnum('type').notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables'), // Array of TemplateVariable objects
  fileMetadata: jsonb('file_metadata'), // Original file info
  tags: jsonb('tags'), // Array of string tags
  isPublic: boolean('is_public').notNull().default(false),
  usageCount: integer('usage_count').notNull().default(0),
  createdBy: uuid('created_by'), // References users.id when auth is implemented
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  validationScore: integer('validation_score'), // 0-100 quality score
  lastValidatedAt: timestamp('last_validated_at')
});

// Template usage tracking
export const templateUsages = pgTable('template_usages', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }),
  variablesUsed: jsonb('variables_used'), // Record of actual values used
  processingTime: integer('processing_time'), // Time in milliseconds
  success: boolean('success').notNull().default(true),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Template versions for change tracking
export const templateVersions = pgTable('template_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables'),
  changeDescription: text('change_description'),
  createdBy: uuid('created_by'), // References users.id when auth is implemented
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Template collections/folders
export const templateCollections = pgTable('template_collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false),
  createdBy: uuid('created_by'), // References users.id when auth is implemented
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Template collection memberships
export const templateCollectionMemberships = pgTable('template_collection_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => templateCollections.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  addedBy: uuid('added_by'), // References users.id when auth is implemented
  addedAt: timestamp('added_at').notNull().defaultNow()
});

// Template analytics
export const templateAnalytics = pgTable('template_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull().defaultNow(),
  views: integer('views').notNull().default(0),
  downloads: integer('downloads').notNull().default(0),
  shares: integer('shares').notNull().default(0),
  averageProcessingTime: integer('average_processing_time'), // in milliseconds
  successRate: integer('success_rate'), // 0-100 percentage
});

// Relations
export const templatesRelations = {
  usages: {
    relationName: 'template_usages',
    fields: [templateUsages.templateId],
    references: [templates.id]
  },
  versions: {
    relationName: 'template_versions',
    fields: [templateVersions.templateId],
    references: [templates.id]
  },
  collectionMemberships: {
    relationName: 'template_collection_memberships',
    fields: [templateCollectionMemberships.templateId],
    references: [templates.id]
  },
  analytics: {
    relationName: 'template_analytics',
    fields: [templateAnalytics.templateId],
    references: [templates.id]
  }
};

export const templateCollectionsRelations = {
  memberships: {
    relationName: 'template_collection_memberships',
    fields: [templateCollectionMemberships.collectionId],
    references: [templateCollections.id]
  }
};

// Types for TypeScript
export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
export type TemplateUsage = typeof templateUsages.$inferSelect;
export type NewTemplateUsage = typeof templateUsages.$inferInsert;
export type TemplateVersion = typeof templateVersions.$inferSelect;
export type NewTemplateVersion = typeof templateVersions.$inferInsert;
export type TemplateCollection = typeof templateCollections.$inferSelect;
export type NewTemplateCollection = typeof templateCollections.$inferInsert;
export type TemplateCollectionMembership = typeof templateCollectionMemberships.$inferSelect;
export type NewTemplateCollectionMembership = typeof templateCollectionMemberships.$inferInsert;
export type TemplateAnalytics = typeof templateAnalytics.$inferSelect;
export type NewTemplateAnalytics = typeof templateAnalytics.$inferInsert;

// Template variable interface (matches frontend)
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'lesson' | 'vocabulary' | 'boolean';
  position: number;
  context?: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

// File metadata interface
export interface FileMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  lastModified?: string;
}

// Template validation result interface
export interface ValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  validatedAt: string;
}