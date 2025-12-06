# Database Migration Guide

This document explains how to run database migrations and seed data for the new schema changes (DB-001).

## Prerequisites

Make sure you have:
- PostgreSQL database running
- DATABASE_URL environment variable configured
- Node.js dependencies installed (`pnpm install`)

## Migration Steps

### 1. Run the Migration

The new migration file `0003_glorious_norman_osborn.sql` will create three new tables:
- `projects` - For organizing related content
- `templates` - For storing reusable content templates
- `language_configs` - For localized settings and AI prompts

```bash
# Generate migration (already done)
pnpm db:generate

# Run migration against your database
pnpm db:migrate
```

### 2. Seed Language Configurations

After running the migration, seed the database with default language configurations:

```bash
# Run the seeding script
npx tsx api/_shared/seed-language-configs.ts
```

This will create language configurations for:
- Chinese (zh) - Default language with comprehensive educational settings
- English (en) - International English education standards
- Vietnamese (vi) - Vietnamese educational system and cultural context
- Japanese (ja) - Japanese language education with kanji focus

### 3. Verify Migration

Check that the new tables were created:

```sql
-- List tables
\dt

-- Check new tables exist
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('projects', 'templates', 'language_configs');

-- Verify seeded data
SELECT language_code, language_name FROM language_configs;
```

## New Tables Summary

### Projects Table
- Organizes related educational content
- Supports multiple languages
- User-specific with soft delete capability
- Flexible settings via JSONB

### Templates Table
- Stores reusable content templates
- Supports file storage (Vercel Blob, S3)
- Template variable system
- Project-based organization

### Language Configs Table
- Language-specific AI prompts
- Cultural and educational settings
- Translation preferences
- Local educational standards

## API Usage Examples

After migration, you can use the new tables in your API:

```typescript
import { db } from './api/_shared/database.js';
import { projects, templates, languageConfigs } from './api/_shared/db-schema.js';

// Create a new project
const newProject = await db.insert(projects).values({
  name: 'Chinese Beginner Course',
  description: 'Introductory Chinese for young learners',
  language: 'zh',
  createdBy: userId,
  status: 'active'
}).returning();

// Create a template
const newTemplate = await db.insert(templates).values({
  projectId: newProject[0].id,
  name: 'Vocabulary Flashcard Template',
  type: 'flashcard',
  variables: [
    { name: 'words', type: 'array', required: true },
    { name: 'difficulty', type: 'string', defaultValue: 'beginner' }
  ],
  createdBy: userId
}).returning();

// Get language-specific AI prompts
const chineseConfig = await db.select()
  .from(languageConfigs)
  .where(eq(languageConfigs.languageCode, 'zh'));
```

## Rollback

If you need to rollback the migration:

```bash
# Create rollback migration
pnpm db:generate

# Manually drop the new tables (be careful!)
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS language_configs;
```

## Troubleshooting

### Migration Fails
- Check DATABASE_URL is correct
- Ensure database user has CREATE TABLE permissions
- Verify database connection

### Seeding Fails
- Make sure migration was completed first
- Check for existing language_code conflicts
- Verify database write permissions

### Permission Errors
- Ensure database user has sufficient permissions
- Check row-level security policies if implemented

## Next Steps

1. Update frontend to use new project management features
2. Implement template management UI
3. Add language configuration interface
4. Integrate with Vercel Blob for file storage
5. Add proper error handling and validation
6. Implement user permissions and sharing features