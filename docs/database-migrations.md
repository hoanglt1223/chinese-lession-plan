# Database Migrations - Enhanced Lesson Plan System

## 📋 Overview

This document outlines all database schema changes required for the enhanced lesson plan system, including new tables, modifications to existing tables, and migration scripts.

---

## 🗄️ **New Tables**

### 1. Projects Table

**Purpose**: Store project information and configuration
**File**: `001_create_projects_table.sql`

```sql
-- Migration: 001_create_projects_table.sql
-- Description: Create projects table for multi-project support
-- Version: 1.0
-- Date: 2024-12-06

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    language VARCHAR(10) NOT NULL DEFAULT 'zh',
    input_format VARCHAR(50) NOT NULL DEFAULT 'excel',

    -- Project configuration
    settings JSONB DEFAULT '{}',

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,

    -- Constraints
    CONSTRAINT projects_name_check CHECK (length(name) >= 1),
    CONSTRAINT projects_language_check CHECK (language IN ('zh', 'vi', 'en')),
    CONSTRAINT projects_input_format_check CHECK (input_format IN ('excel', 'pdf', 'text', 'markdown'))
);

-- Indexes for performance
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_language ON projects(language);
CREATE INDEX idx_projects_is_active ON projects(is_active);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- Comments
COMMENT ON TABLE projects IS 'Projects table for organizing lesson plan generation work';
COMMENT ON COLUMN projects.language IS 'Primary language for the project (zh, vi, en)';
COMMENT ON COLUMN projects.input_format IS 'Expected input file format';
COMMENT ON COLUMN projects.settings IS 'JSON configuration for project-specific settings';
```

### 2. Templates Table

**Purpose**: Store template files and their analysis
**File**: `002_create_templates_table.sql`

```sql
-- Migration: 002_create_templates_table.sql
-- Description: Create templates table for sample file storage
-- Version: 1.0
-- Date: 2024-12-06

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Template information
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'lesson_plan',
    description TEXT,

    -- File information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    file_type VARCHAR(50),

    -- Content
    file_content TEXT,
    processed_content JSONB, -- Processed template structure

    -- Analysis results
    variables JSONB DEFAULT '[]', -- Detected variables
    structure JSONB DEFAULT '{}', -- Template structure analysis
    quality_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100 quality score

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_processed BOOLEAN DEFAULT false,
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed

    -- Constraints
    CONSTRAINT templates_name_check CHECK (length(name) >= 1),
    CONSTRAINT templates_type_check CHECK (type IN ('lesson_plan', 'summary', 'flashcard', 'vocabulary')),
    CONSTRAINT templates_quality_score_check CHECK (quality_score >= 0 AND quality_score <= 100),
    CONSTRAINT templates_processing_status_check CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Indexes for performance
CREATE INDEX idx_templates_project_id ON templates(project_id);
CREATE INDEX idx_templates_type ON templates(type);
CREATE INDEX idx_templates_is_active ON templates(is_active);
CREATE INDEX idx_templates_quality_score ON templates(quality_score DESC);
CREATE INDEX idx_templates_created_at ON templates(created_at);

-- Full-text search for template content
CREATE INDEX idx_templates_content_search ON templates USING gin(to_tsvector('english', file_content));

-- Comments
COMMENT ON TABLE templates IS 'Template files for lesson plan generation';
COMMENT ON COLUMN templates.type IS 'Type of template (lesson_plan, summary, flashcard, vocabulary)';
COMMENT ON COLUMN templates.processed_content IS 'JSON structure of parsed template';
COMMENT ON COLUMN templates.variables IS 'Auto-detected variables from template';
COMMENT ON COLUMN templates.quality_score IS 'Template quality score (0-100)';
COMMENT ON COLUMN templates.processing_status IS 'Status of template analysis (pending, processing, completed, failed)';
```

### 3. Language Configs Table

**Purpose**: Store language-specific configurations and prompts
**File**: `003_create_language_configs_table.sql`

```sql
-- Migration: 003_create_language_configs_table.sql
-- Description: Create language_configs table for multi-language support
-- Version: 1.0
-- Date: 2024-12-06

CREATE TABLE IF NOT EXISTS language_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Language identification
    language_code VARCHAR(10) NOT NULL UNIQUE,
    language_name VARCHAR(100) NOT NULL,
    direction VARCHAR(3) NOT NULL DEFAULT 'ltr',

    -- AI prompts for this language
    ai_prompts JSONB DEFAULT '{}',

    -- Cultural and educational settings
    cultural_settings JSONB DEFAULT '{}',

    -- Formatting preferences
    formatting JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Constraints
    CONSTRAINT language_configs_direction_check CHECK (direction IN ('ltr', 'rtl')),
    CONSTRAINT language_configs_language_code_check CHECK (length(language_code) >= 2),
    CONSTRAINT language_configs_language_name_check CHECK (length(language_name) >= 1)
);

-- Indexes
CREATE INDEX idx_language_configs_language_code ON language_configs(language_code);
CREATE INDEX idx_language_configs_is_active ON language_configs(is_active);

-- Comments
COMMENT ON TABLE language_configs IS 'Language-specific configurations and prompts';
COMMENT ON COLUMN language_configs.ai_prompts IS 'Localized AI prompt templates';
COMMENT ON COLUMN language_configs.cultural_settings IS 'Cultural and educational adaptations';
COMMENT ON COLUMN language_configs.formatting IS 'Language-specific formatting rules';
```

### 4. Template Analyses Table

**Purpose**: Store detailed analysis results for templates
**File**: `004_create_template_analyses_table.sql`

```sql
-- Migration: 004_create_template_analyses_table.sql
-- Description: Create template_analyses table for detailed analysis results
-- Version: 1.0
-- Date: 2024-12-06

CREATE TABLE IF NOT EXISTS template_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,

    -- Analysis metadata
    analysis_version VARCHAR(20) DEFAULT '1.0',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Structure analysis
    sections JSONB DEFAULT '[]',
    tables JSONB DEFAULT '[]',
    headers JSONB DEFAULT '[]',

    -- Variable analysis
    detected_variables JSONB DEFAULT '[]',
    variable_patterns JSONB DEFAULT '[]',

    -- Formatting analysis
    markdown_style VARCHAR(50),
    table_format VARCHAR(50),
    language_patterns JSONB DEFAULT '[]',

    -- Quality metrics
    completeness_score DECIMAL(5,2) DEFAULT 0.00,
    consistency_score DECIMAL(5,2) DEFAULT 0.00,
    complexity_score DECIMAL(5,2) DEFAULT 0.00,

    -- Analysis configuration
    analyzer_config JSONB DEFAULT '{}',

    -- Constraints
    CONSTRAINT template_analyses_completeness_score_check CHECK (completeness_score >= 0 AND completeness_score <= 100),
    CONSTRAINT template_analyses_consistency_score_check CHECK (consistency_score >= 0 AND consistency_score <= 100),
    CONSTRAINT template_analyses_complexity_score_check CHECK (complexity_score >= 0 AND complexity_score <= 100)
);

-- Indexes
CREATE INDEX idx_template_analyses_template_id ON template_analyses(template_id);
CREATE INDEX idx_template_analyses_analyzed_at ON template_analyses(analyzed_at);
CREATE INDEX idx_template_analyses_completeness_score ON template_analyses(completeness_score DESC);

-- Comments
COMMENT ON TABLE template_analyses IS 'Detailed analysis results for templates';
COMMENT ON COLUMN template_analyses.sections IS 'Extracted sections from template';
COMMENT ON COLUMN template_analyses.detected_variables IS 'Variables detected in template';
COMMENT ON COLUMN template_analyses.completeness_score IS 'Template completeness score (0-100)';
```

---

## 🔄 **Table Modifications**

### 1. Update Lessons Table

**Purpose**: Add project and template references to existing lessons
**File**: `005_update_lessons_table.sql`

```sql
-- Migration: 005_update_lessons_table.sql
-- Description: Update lessons table to support project context and template references
-- Version: 1.0
-- Date: 2024-12-06

-- Add new columns to lessons table
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'zh',
ADD COLUMN IF NOT EXISTS format_match_score DECIMAL(5,2) DEFAULT 0.00, -- 0-100 format matching score
ADD COLUMN IF NOT EXISTS used_templates JSONB DEFAULT '[]', -- Array of template IDs used
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}', -- AI generation metadata

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_lessons_project_id ON lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_lessons_template_id ON lessons(template_id);
CREATE INDEX IF NOT EXISTS idx_lessons_language ON lessons(language);
CREATE INDEX IF NOT EXISTS idx_lessons_format_match_score ON lessons(format_match_score DESC);

-- Add constraints
ALTER TABLE lessons
ADD CONSTRAINT IF NOT EXISTS lessons_language_check CHECK (language IN ('zh', 'vi', 'en')),
ADD CONSTRAINT IF NOT EXISTS lessons_format_match_score_check CHECK (format_match_score >= 0 AND format_match_score <= 100);

-- Add comments
COMMENT ON COLUMN lessons.project_id IS 'Reference to the project this lesson belongs to';
COMMENT ON COLUMN lessons.template_id IS 'Primary template used for generation';
COMMENT ON COLUMN lessons.language IS 'Language of the generated lesson';
COMMENT ON COLUMN lessons.format_match_score IS 'How well the generated content matches the template format (0-100)';
COMMENT ON COLUMN lessons.used_templates IS 'Array of template IDs used in generation';
COMMENT ON COLUMN lessons.generation_metadata IS 'AI generation metadata including models, prompts, and scores';

-- Update existing lessons to have a default project (for backward compatibility)
-- This creates a default project for existing lessons
INSERT INTO projects (id, name, description, language, input_format, created_by)
SELECT
    gen_random_uuid(),
    'Migrated Project',
    'Default project for lessons migrated from previous system',
    COALESCE(MAX(NULLIF(language, '')), 'zh'),
    'excel',
    'system_migration'
FROM lessons
WHERE project_id IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Update existing lessons to reference the default project
UPDATE lessons
SET project_id = (SELECT id FROM projects WHERE name = 'Migrated Project' LIMIT 1)
WHERE project_id IS NULL;
```

### 2. Update Activities Table

**Purpose**: Add project context to activities
**File**: `006_update_activities_table.sql`

```sql
-- Migration: 006_update_activities_table.sql
-- Description: Update activities table to support project context
-- Version: 1.0
-- Date: 2024-12-06

-- Add project_id to activities table
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'zh',
ADD COLUMN IF NOT EXISTS is_generic BOOLEAN DEFAULT false; -- Generic activities can be used across projects

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_language ON activities(language);
CREATE INDEX IF NOT EXISTS idx_activities_is_generic ON activities(is_generic);

-- Add constraints
ALTER TABLE activities
ADD CONSTRAINT IF NOT EXISTS activities_language_check CHECK (language IN ('zh', 'vi', 'en'));

-- Add comments
COMMENT ON COLUMN activities.project_id IS 'Project this activity belongs to (null for generic activities)';
COMMENT ON COLUMN activities.language IS 'Language of the activity';
COMMENT ON COLUMN activities.is_generic IS 'Whether this activity can be used across different projects';

-- Mark existing activities as generic
UPDATE activities
SET is_generic = true
WHERE project_id IS NULL;
```

### 3. Update Prompt Templates Table

**Purpose**: Enhance prompt templates for multi-language support
**File**: `007_update_prompt_templates_table.sql`

```sql
-- Migration: 007_update_prompt_templates_table.sql
-- Description: Update prompt_templates table for enhanced language support
-- Version: 1.0
-- Date: 2024-12-06

-- Add language-specific columns
ALTER TABLE prompt_templates
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'zh',
ADD COLUMN IF NOT EXISTS cultural_context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS template_variables JSONB DEFAULT '[]', -- Expected variables in template
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5,2) DEFAULT 0.00;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_language ON prompt_templates(language);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_quality_score ON prompt_templates(quality_score DESC);

-- Add constraints
ALTER TABLE prompt_templates
ADD CONSTRAINT IF NOT EXISTS prompt_templates_language_check CHECK (language IN ('zh', 'vi', 'en')),
ADD CONSTRAINT IF NOT EXISTS prompt_templates_quality_score_check CHECK (quality_score >= 0 AND quality_score <= 100);

-- Add comments
COMMENT ON COLUMN prompt_templates.language IS 'Language this prompt template is designed for';
COMMENT ON COLUMN prompt_templates.cultural_context IS 'Cultural context and adaptations';
COMMENT ON COLUMN prompt_templates.template_variables IS 'Variables expected in this template';
COMMENT ON COLUMN prompt_templates.quality_score IS 'Effectiveness score of this prompt (0-100)';
```

---

## 📊 **Initial Data Seeding**

### 1. Language Configs Seeding

**Purpose**: Seed initial language configurations
**File**: `008_seed_language_configs.sql`

```sql
-- Migration: 008_seed_language_configs.sql
-- Description: Seed initial language configurations
-- Version: 1.0
-- Date: 2024-12-06

-- Chinese language configuration
INSERT INTO language_configs (
    language_code,
    language_name,
    direction,
    ai_prompts,
    cultural_settings,
    formatting
) VALUES (
    'zh',
    'Chinese',
    'ltr',
    '{
        "lesson_plan": "请根据以下模板创建中文教学计划，保持完全相同的格式和结构。",
        "analysis": "请分析以下教学内容，提取重点词汇和教学目标。",
        "summary": "请为家长和学生创建课程总结。",
        "flashcard": "请创建词汇闪卡，包含图片和发音指南。"
    }',
    '{
        "classroom_structure": "teacher-centered with group activities",
        "teaching_methods": ["repetition", "games", "calligraphy", "storytelling"],
        "assessment_styles": ["written", "oral", "practical"],
        "formality_level": "formal",
        "cultural_elements": ["respect for teachers", "group harmony", "practice-oriented"]
    }',
    '{
        "date_format": "YYYY年MM月DD日",
        "time_format": "HH:mm",
        "number_format": "chinese_numerals",
        "currency": "CNY",
        "text_direction": "ltr"
    }'
) ON CONFLICT (language_code) DO NOTHING;

-- Vietnamese language configuration
INSERT INTO language_configs (
    language_code,
    language_name,
    direction,
    ai_prompts,
    cultural_settings,
    formatting
) VALUES (
    'vi',
    'Vietnamese',
    'ltr',
    '{
        "lesson_plan": "Vui lòng tạo giáo án tiếng Việt dựa trên mẫu sau, giữ nguyên định dạng và cấu trúc.",
        "analysis": "Phân tích nội dung giảng dạy, trích xuất từ vựng và mục tiêu học tập.",
        "summary": "Tạo tóm tắt bài học cho phụ huynh và học sinh.",
        "flashcard": "Tạo thẻ từ vựng với hình ảnh và hướng dẫn phát âm."
    }',
    '{
        "classroom_structure": "student-centered collaborative",
        "teaching_methods": ["discussion", "practice", "group work"],
        "assessment_styles": ["continuous", "project-based"],
        "formality_level": "mixed",
        "cultural_elements": ["respect for elders", "community focus", "practical application"]
    }',
    '{
        "date_format": "DD/MM/YYYY",
        "time_format": "HH:mm",
        "number_format": "western_numerals",
        "currency": "VND",
        "text_direction": "ltr"
    }'
) ON CONFLICT (language_code) DO NOTHING;

-- English language configuration
INSERT INTO language_configs (
    language_code,
    language_name,
    direction,
    ai_prompts,
    cultural_settings,
    formatting
) VALUES (
    'en',
    'English',
    'ltr',
    '{
        "lesson_plan": "Please create an English lesson plan based on the following template, maintaining exact format and structure.",
        "analysis": "Analyze the teaching content and extract key vocabulary and learning objectives.",
        "summary": "Create a lesson summary for parents and students.",
        "flashcard": "Create vocabulary flashcards with images and pronunciation guides."
    }',
    '{
        "classroom_structure": "balanced teacher-student interaction",
        "teaching_methods": ["interactive", "inquiry-based", "collaborative"],
        "assessment_styles": ["formative", "summative", "performance-based"],
        "formality_level": "semi-formal",
        "cultural_elements": ["individual expression", "critical thinking", "innovation"]
    }',
    '{
        "date_format": "MM/DD/YYYY",
        "time_format": "HH:mm AM/PM",
        "number_format": "western_numerals",
        "currency": "USD",
        "text_direction": "ltr"
    }'
) ON CONFLICT (language_code) DO NOTHING;
```

### 2. Generic Activities Seeding

**Purpose**: Seed generic activities that can be used across projects
**File**: `009_seed_generic_activities.sql`

```sql
-- Migration: 009_seed_generic_activities.sql
-- Description: Seed generic activities for use across projects
-- Version: 1.0
-- Date: 2024-12-06

-- Generic warm-up activities
INSERT INTO activities (name, type, description, language, is_generic) VALUES
('拍拍手歌', 'warmup', '拍手唱歌热身活动，帮助学生进入学习状态', 'zh', true),
('Hello Song', 'warmup', 'English greeting song to start the class', 'en', true),
('Chào Hỏi', 'warmup', 'Bài hát chào hỏi tiếng Việt để bắt đầu buổi học', 'vi', true),
('拍一拍', 'game', '用苍蝇拍拍打对应的图片或单词', 'zh', true),
('Clap Game', 'game', 'Clap hands when recognizing correct words', 'en', true),
('Bắt Cái', 'game', 'Bắt đúng từ vựng khi nghe thấy', 'vi', true),
('蹦蹦跳跳', 'practice', '跳过闪卡并读出单词', 'zh', true),
('Jump and Read', 'practice', 'Jump over flashcards and read words', 'en', true),
('Nhảy và Đọc', 'practice', 'Nhảy qua thẻ và đọc từ vựng', 'vi', true),
('大家一起来', 'wrapup', '全班一起复习和总结', 'zh', true),
('All Together', 'wrapup', 'Whole class review and summary', 'en', true),
('Cùng Nhau', 'wrapup', 'Cả lớp ôn tập và tổng kết', 'vi', true)
ON CONFLICT DO NOTHING;
```

---

## 🔧 **Migration Scripts**

### Migration Runner Script

**File**: `run_migrations.js`

```javascript
// Migration runner script
// Usage: node run_migrations.js [--version=specific_version] [--rollback]

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
    constructor(connectionString) {
        this.client = new Client(connectionString);
        this.migrationsDir = path.join(__dirname, 'migrations');
    }

    async init() {
        await this.client.connect();

        // Create migrations table if not exists
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                version VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
    }

    async getExecutedMigrations() {
        const result = await this.client.query(
            'SELECT version FROM migrations ORDER BY version'
        );
        return result.rows.map(row => row.version);
    }

    async getPendingMigrations() {
        const executed = await this.getExecutedMigrations();
        const allMigrations = fs.readdirSync(this.migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sorted by filename ensures proper order

        return allMigrations.filter(migration =>
            !executed.includes(migration.replace('.sql', ''))
        );
    }

    async runMigration(migrationFile) {
        console.log(`Running migration: ${migrationFile}`);

        const filePath = path.join(this.migrationsDir, migrationFile);
        const migrationSQL = fs.readFileSync(filePath, 'utf8');

        const version = migrationFile.replace('.sql', '');
        const description = this.extractDescription(migrationSQL);

        try {
            await this.client.query('BEGIN');
            await this.client.query(migrationSQL);
            await this.client.query(
                'INSERT INTO migrations (version, description) VALUES ($1, $2)',
                [version, description]
            );
            await this.client.query('COMMIT');

            console.log(`✅ Migration ${version} completed successfully`);
        } catch (error) {
            await this.client.query('ROLLBACK');
            console.error(`❌ Migration ${version} failed:`, error.message);
            throw error;
        }
    }

    extractDescription(sqlContent) {
        const match = sqlContent.match(/-- Description:\s*(.+)/);
        return match ? match[1] : 'No description available';
    }

    async runAll() {
        await this.init();

        const pending = await this.getPendingMigrations();

        if (pending.length === 0) {
            console.log('No pending migrations.');
            return;
        }

        console.log(`Found ${pending.length} pending migrations:`);
        pending.forEach(migration => console.log(`  - ${migration}`));

        for (const migration of pending) {
            await this.runMigration(migration);
        }

        console.log('All migrations completed successfully! 🎉');
    }

    async rollback(targetVersion) {
        // Implementation for rollback functionality
        console.log('Rollback functionality not implemented yet');
    }

    async close() {
        await this.client.end();
    }
}

// Usage example
async function main() {
    const runner = new MigrationRunner(process.env.DATABASE_URL);

    try {
        if (process.argv.includes('--rollback')) {
            const targetVersion = process.argv.find(arg =>
                arg.startsWith('--version=')
            )?.split('=')[1];

            await runner.rollback(targetVersion);
        } else {
            await runner.runAll();
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await runner.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = MigrationRunner;
```

### Package.json Scripts

```json
{
    "scripts": {
        "db:migrate": "node migrations/run_migrations.js",
        "db:migrate:rollback": "node migrations/run_migrations.js --rollback",
        "db:migrate:status": "node migrations/check_status.js",
        "db:seed": "node migrations/seed_data.js"
    }
}
```

---

## 🧪 **Testing Scripts**

### Migration Test Script

**File**: `test_migrations.js`

```javascript
// Test migration scripts
const MigrationRunner = require('./run_migrations');
const { Client } = require('pg');

class MigrationTester {
    constructor(testConnectionString) {
        this.testDb = new Client(testConnectionString);
        this.runner = new MigrationRunner(testConnectionString);
    }

    async setup() {
        await this.testDb.connect();

        // Create clean test database
        await this.testDb.query('DROP DATABASE IF EXISTS test_migrations');
        await this.testDb.query('CREATE DATABASE test_migrations');
    }

    async testMigration(migrationFile) {
        console.log(`Testing migration: ${migrationFile}`);

        try {
            await this.runner.runMigration(migrationFile);

            // Add specific test cases here
            await this.validateMigration(migrationFile);

            console.log(`✅ ${migrationFile} test passed`);
            return true;
        } catch (error) {
            console.error(`❌ ${migrationFile} test failed:`, error.message);
            return false;
        }
    }

    async validateMigration(migrationFile) {
        // Add validation logic based on migration file
        switch (migrationFile) {
            case '001_create_projects_table.sql':
                await this.testDb.query('SELECT COUNT(*) FROM projects');
                break;
            case '002_create_templates_table.sql':
                await this.testDb.query('SELECT COUNT(*) FROM templates');
                break;
            // Add more validation cases
        }
    }

    async cleanup() {
        await this.testDb.query('DROP DATABASE IF EXISTS test_migrations');
        await this.testDb.end();
    }
}

// Run tests
async function runTests() {
    const tester = new MigrationTester(process.env.TEST_DATABASE_URL);

    try {
        await tester.setup();

        const migrations = await tester.runner.getPendingMigrations();
        let passed = 0;
        let failed = 0;

        for (const migration of migrations) {
            const success = await tester.testMigration(migration);
            if (success) passed++;
            else failed++;
        }

        console.log(`\nTest Results: ${passed} passed, ${failed} failed`);

        if (failed > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error('Test suite failed:', error);
        process.exit(1);
    } finally {
        await tester.cleanup();
    }
}

if (require.main === module) {
    runTests();
}

module.exports = MigrationTester;
```

---

## 📝 **Checklist**

### Pre-Migration Checklist
- [ ] Database backed up
- [ ] Migration scripts reviewed
- [ ] Test database prepared
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled

### Post-Migration Checklist
- [ ] All migrations executed successfully
- [ ] Data integrity verified
- [ ] Application tested with new schema
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Monitoring set up

### Migration Files
- [x] `001_create_projects_table.sql`
- [x] `002_create_templates_table.sql`
- [x] `003_create_language_configs_table.sql`
- [x] `004_create_template_analyses_table.sql`
- [x] `005_update_lessons_table.sql`
- [x] `006_update_activities_table.sql`
- [x] `007_update_prompt_templates_table.sql`
- [x] `008_seed_language_configs.sql`
- [x] `009_seed_generic_activities.sql`
- [x] `run_migrations.js`
- [x] `test_migrations.js`

---

**Ready for deployment! 🚀**

These migrations provide a solid foundation for the enhanced lesson plan system while maintaining backward compatibility and ensuring data integrity.