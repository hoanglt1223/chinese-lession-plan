# Database Schema Documentation

## Overview

This document describes the database schema for the Chinese Education Platform, including tables for users, lessons, workflows, projects, templates, and language configurations.

## Tables

### 1. users

Stores user accounts and authentication information.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `username` (VARCHAR(255), Not Null, Unique) - User's unique username
- `password` (VARCHAR(255), Not Null) - Hashed password
- `creditBalance` (DECIMAL(10,2), Not Null, Default: 1000.00) - Available credits for AI services
- `isActive` (BOOLEAN, Not Null, Default: true) - Account status
- `lastLogin` (TIMESTAMP) - Last login timestamp
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Account creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

**Relationships:**
- One-to-many with `projects` (created_by)
- One-to-many with `templates` (created_by)

### 2. lessons

Stores educational lesson content and metadata.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `title` (VARCHAR(255), Not Null) - Lesson title
- `level` (VARCHAR(50), Not Null) - Proficiency level (N1, N2, etc.)
- `ageGroup` (VARCHAR(100), Not Null) - Target age group (preschool, primary, lower-secondary)
- `status` (VARCHAR(50), Not Null, Default: 'draft') - Lesson status (draft, review, plan, flashcards, summary, completed)
- `originalFiles` (JSONB) - Uploaded file content and metadata
- `aiAnalysis` (JSONB) - AI-generated analysis results
- `lessonPlans` (JSONB) - Generated lesson plan data
- `flashcards` (JSONB) - Generated flashcard data
- `summaries` (JSONB) - Generated summary data
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

### 3. workflows

Tracks progress through multi-step content creation processes.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `lessonId` (UUID, Foreign Key → lessons.id) - Associated lesson
- `currentStep` (INTEGER, Not Null, Default: 0) - Current workflow step
- `stepData` (JSONB) - Data collected in each step
- `completedSteps` (JSONB) - Array of completed step numbers
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

**Relationships:**
- Many-to-one with `lessons`

### 4. projects (NEW)

Organizes related content and resources into project containers.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `name` (VARCHAR(255), Not Null) - Project name
- `description` (TEXT) - Project description
- `language` (VARCHAR(10), Not Null, Default: 'zh') - Primary language code
- `createdBy` (UUID, Foreign Key → users.id) - Project creator
- `status` (VARCHAR(50), Not Null, Default: 'active') - Project status (active, archived, deleted)
- `settings` (JSONB) - Project-specific configuration settings
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

**Relationships:**
- Many-to-one with `users` (created_by)
- One-to-many with `templates`

### 5. templates (NEW)

Stores reusable content templates with file storage support.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `projectId` (UUID, Foreign Key → projects.id, On Delete: CASCADE) - Parent project
- `name` (VARCHAR(255), Not Null) - Template name
- `type` (VARCHAR(50), Not Null) - Template type (lesson_plan, flashcard, worksheet, activity)
- `description` (TEXT) - Template description
- `filePath` (VARCHAR(500)) - Path to stored file (Vercel Blob, S3, etc.)
- `fileContent` (TEXT) - Direct content storage for small templates
- `variables` (JSONB) - Template variable definitions
- `metadata` (JSONB) - Additional template metadata (tags, category, difficulty)
- `isActive` (BOOLEAN, Not Null, Default: true) - Template availability status
- `createdBy` (UUID, Foreign Key → users.id) - Template creator
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

**Relationships:**
- Many-to-one with `projects`
- Many-to-one with `users` (created_by)

### 6. language_configs (NEW)

Stores localized settings and AI prompts for different languages.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `languageCode` (VARCHAR(10), Not Null, Unique) - ISO language code (zh, en, vi, ja)
- `languageName` (VARCHAR(100), Not Null) - Full language name
- `aiPrompts` (JSONB) - Language-specific AI prompt templates
- `culturalSettings` (JSONB) - Cultural preferences and adaptations
- `translationSettings` (JSONB) - Translation preferences and mappings
- `educationalStandards` (JSONB) - Local educational system standards
- `isActive` (BOOLEAN, Not Null, Default: true) - Configuration status
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

### 7. translation_cache

Caches translation results for Redis backup and performance.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `sourceText` (TEXT, Not Null) - Original text to translate
- `sourceLang` (VARCHAR(10), Not Null) - Source language code
- `targetLang` (VARCHAR(10), Not Null) - Target language code
- `translatedText` (TEXT, Not Null) - Translated text
- `provider` (VARCHAR(50), Not Null) - Translation provider (deepl, openai)
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Cache creation time

### 8. prompt_templates

Stores customizable AI prompt templates.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `name` (VARCHAR(255), Not Null) - Template name
- `type` (VARCHAR(50), Not Null) - Template type (analysis, lesson_plan, flashcard, summary)
- `description` (TEXT) - Template description
- `isDefault` (BOOLEAN, Not Null, Default: false) - Whether this is a default template
- `isActive` (BOOLEAN, Not Null, Default: true) - Template availability
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

**Relationships:**
- One-to-many with `prompt_components`

### 9. prompt_components

Stores modular components for building prompts.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `templateId` (UUID, Foreign Key → prompt_templates.id, On Delete: CASCADE) - Parent template
- `name` (VARCHAR(255), Not Null) - Component name (role_definition, task_instructions, etc.)
- `type` (VARCHAR(50), Not Null) - Component type (system, user, instruction, example)
- `content` (TEXT, Not Null) - Component content
- `order` (INTEGER, Not Null, Default: 0) - Component order in prompt
- `variables` (JSONB) - Variables used in this component
- `isRequired` (BOOLEAN, Not Null, Default: true) - Whether component is required
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

**Relationships:**
- Many-to-one with `prompt_templates`

### 10. activities

Stores reusable lesson activities and games.

**Columns:**
- `id` (UUID, Primary Key) - Unique identifier
- `name` (VARCHAR(255), Not Null, Unique) - Activity name
- `type` (VARCHAR(50), Not Null, Default: 'game') - Activity type (game, song, worksheet, drill)
- `description` (TEXT) - Short description
- `instructions` (TEXT) - Detailed instructions
- `duration` (VARCHAR(50)) - Activity duration
- `ageGroup` (VARCHAR(100)) - Target age group
- `materials` (JSONB) - Required materials list
- `benefits` (TEXT) - Learning outcomes and benefits
- `createdAt` (TIMESTAMP, Not Null, Default: NOW()) - Creation time
- `updatedAt` (TIMESTAMP, Not Null, Default: NOW()) - Last update time

## JSONB Schema Definitions

### projects.settings

```json
{
  "theme": "light|dark",
  "defaultTemplateType": "lesson_plan",
  "autoSave": boolean,
  "notificationSettings": {
    "email": boolean,
    "push": boolean
  },
  "collaboration": {
    "allowSharing": boolean,
    "defaultPermissions": "read|write|admin"
  }
}
```

### templates.variables

```json
[
  {
    "name": "student_age",
    "type": "number",
    "description": "Age of target students",
    "defaultValue": "8",
    "required": true
  },
  {
    "name": "vocabulary_list",
    "type": "array",
    "description": "List of vocabulary words",
    "required": true
  }
]
```

### templates.metadata

```json
{
  "tags": ["beginner", "vocabulary", "interactive"],
  "category": "language_arts",
  "difficulty": "easy|medium|hard",
  "estimatedTime": "30 minutes",
  "learningObjectives": ["recognize characters", "use in sentences"],
  "prerequisites": ["basic pinyin knowledge"]
}
```

### language_configs.aiPrompts

```json
{
  "analysis": "Analyze this content and extract key vocabulary...",
  "lessonPlan": "Create a comprehensive lesson plan with...",
  "flashcard": "Generate flashcards with definitions and examples...",
  "summary": "Create a summary highlighting key points..."
}
```

### language_configs.culturalSettings

```json
{
  "culturalContext": "Description of cultural context",
  "writingSystem": "Latin alphabet, Simplified Chinese, etc.",
  "pronunciationSystem": "IPA, Pinyin, etc.",
  "culturalThemes": ["theme1", "theme2"],
  "educationalApproach": "Description of teaching approach"
}
```

## Database Constraints

### Foreign Keys

1. `projects.created_by` → `users.id` (ON DELETE NO ACTION)
2. `templates.project_id` → `projects.id` (ON DELETE CASCADE)
3. `templates.created_by` → `users.id` (ON DELETE NO ACTION)
4. `workflows.lesson_id` → `lessons.id` (ON DELETE NO ACTION)
5. `prompt_components.template_id` → `prompt_templates.id` (ON DELETE CASCADE)

### Unique Constraints

1. `users.username` - Unique username
2. `language_configs.language_code` - Unique language code
3. `activities.name` - Unique activity name

### Default Values

- `projects.language` → 'zh'
- `projects.status` → 'active'
- `templates.isActive` → true
- `language_configs.isActive` → true
- `users.creditBalance` → 1000.00
- `users.isActive` → true
- `lessons.status` → 'draft'

## Indexes

All foreign key columns are automatically indexed by PostgreSQL. Additional indexes should be considered for:

1. `lessons.status` - For filtering by status
2. `projects.status` - For filtering active projects
3. `templates.type` - For filtering by template type
4. `templates.isActive` - For filtering active templates
5. `language_configs.languageCode` - For quick language lookup

## Migration History

- **0000**: Initial schema (users, lessons, workflows)
- **0001**: Added translation cache and prompt system
- **0002**: Added activities table
- **0003**: Added projects, templates, and language_configs tables (DB-001)

## Seeding Data

Default language configurations are automatically seeded for:
- Chinese (zh)
- English (en)
- Vietnamese (vi)
- Japanese (ja)

See `api/_shared/seed-language-configs.ts` for seeding script.

## Usage Examples

### Creating a Project with Templates

```sql
-- Create project
INSERT INTO projects (name, description, language, created_by)
VALUES ('Chinese Beginner Course', 'Introductory Chinese for young learners', 'zh', 'user-uuid');

-- Create template for project
INSERT INTO templates (project_id, name, type, variables, created_by)
VALUES (
  'project-uuid',
  'Basic Vocabulary Flashcards',
  'flashcard',
  '[{"name": "words", "type": "array", "required": true}]',
  'user-uuid'
);
```

### Querying with Language Configuration

```sql
-- Get projects with language-specific settings
SELECT p.*, lc.ai_prompts->'lessonPlan' as lesson_prompt
FROM projects p
JOIN language_configs lc ON p.language = lc.language_code
WHERE p.status = 'active' AND lc.is_active = true;
```

## Best Practices

1. **Use JSONB for flexible data** - Store structured data that may vary between records
2. **Implement soft deletes** - Use status fields instead of DELETE for audit trails
3. **Add appropriate indexes** - Index frequently queried columns and foreign keys
4. **Use UUIDs** - Provides better security and distribution than sequential IDs
5. **Cascade deletes appropriately** - Use CASCADE for dependent data, NO ACTION for references
6. **Validate JSON schemas** - Implement application-level validation for JSONB fields
7. **Consider row-level security** - Implement RLS policies for multi-tenant access control