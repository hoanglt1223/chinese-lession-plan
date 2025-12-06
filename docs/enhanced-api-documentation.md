# Enhanced API Documentation - Lesson Plan System

## 📋 Overview

This document provides comprehensive API documentation for the enhanced lesson plan generation system, including all new endpoints, request/response formats, and integration examples.

---

## 🏗️ **Base URL & Authentication**

### Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

### Authentication
```typescript
// Header format
Authorization: Bearer <jwt_token>

// Example
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     https://your-domain.com/api/projects
```

### Common Headers
```typescript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>",
  "X-Project-ID": "<project-uuid>" // Optional: For project context
}
```

---

## 🏢 **Project Management APIs**

### **GET /api/projects**
**Description**: List all projects with filtering and pagination

**Query Parameters**:
```typescript
interface ListProjectsQuery {
  page?: number;        // Default: 1
  limit?: number;       // Default: 20, Max: 100
  language?: string;    // Filter by language (zh, vi, en)
  is_active?: boolean;  // Filter by active status
  search?: string;      // Search by name or description
  sort_by?: string;     // created_at, updated_at, name
  sort_order?: 'asc' | 'desc'; // Default: desc
}
```

**Response**:
```typescript
interface ListProjectsResponse {
  success: boolean;
  data: {
    projects: Project[];
    pagination: {
      current_page: number;
      total_pages: number;
      total_count: number;
      limit: number;
    };
  };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  language: string;
  input_format: string;
  settings: Record<string, any>;
  template_count: number;
  lesson_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_archived: boolean;
}
```

**Example Request**:
```bash
curl "https://your-domain.com/api/projects?page=1&limit=10&language=zh&is_active=true" \
     -H "Authorization: Bearer <token>"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Chinese Language Course - Level 1",
        "description": "Beginner Chinese language course for preschoolers",
        "language": "zh",
        "input_format": "excel",
        "template_count": 5,
        "lesson_count": 24,
        "created_by": "user123",
        "created_at": "2024-12-01T10:00:00Z",
        "updated_at": "2024-12-06T15:30:00Z",
        "is_active": true,
        "is_archived": false
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_count": 1,
      "limit": 10
    }
  }
}
```

---

### **POST /api/projects**
**Description**: Create a new project

**Request Body**:
```typescript
interface CreateProjectRequest {
  name: string;
  description?: string;
  language: 'zh' | 'vi' | 'en';
  input_format: 'excel' | 'pdf' | 'text' | 'markdown';
  settings?: {
    default_template_type?: string;
    ai_model?: string;
    quality_threshold?: number;
    custom_prompts?: Record<string, string>;
  };
}
```

**Response**:
```typescript
interface CreateProjectResponse {
  success: boolean;
  data: {
    project: Project;
    message: string;
  };
}
```

**Example Request**:
```bash
curl -X POST "https://your-domain.com/api/projects" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "name": "Vietnamese Language Program",
       "description": "Elementary Vietnamese language course",
       "language": "vi",
       "input_format": "excel",
       "settings": {
         "quality_threshold": 90,
         "ai_model": "glm-4.6"
       }
     }'
```

---

### **GET /api/projects/:id**
**Description**: Get detailed information about a specific project

**Response**:
```typescript
interface GetProjectResponse {
  success: boolean;
  data: {
    project: Project & {
      templates: TemplateSummary[];
      recent_lessons: LessonSummary[];
      statistics: {
        total_lessons: number;
        generated_lessons: number;
        average_quality_score: number;
        last_generation: string | null;
      };
    };
  };
}

interface TemplateSummary {
  id: string;
  name: string;
  type: string;
  quality_score: number;
  created_at: string;
}

interface LessonSummary {
  id: string;
  unit: number;
  lesson: number;
  title: string;
  format_match_score: number;
  generated_at: string;
}
```

---

### **PUT /api/projects/:id**
**Description**: Update project information

**Request Body**:
```typescript
interface UpdateProjectRequest {
  name?: string;
  description?: string;
  language?: 'zh' | 'vi' | 'en';
  input_format?: 'excel' | 'pdf' | 'text' | 'markdown';
  settings?: Record<string, any>;
  is_active?: boolean;
  is_archived?: boolean;
}
```

---

### **DELETE /api/projects/:id**
**Description**: Delete a project (soft delete)

**Response**:
```typescript
interface DeleteProjectResponse {
  success: boolean;
  data: {
    message: string;
    archived_project_id: string;
  };
}
```

---

## 📄 **Template Management APIs**

### **GET /api/projects/:id/templates**
**Description**: List all templates for a project

**Query Parameters**:
```typescript
interface ListTemplatesQuery {
  type?: string;        // lesson_plan, summary, flashcard, vocabulary
  is_active?: boolean;  // Filter by active status
  quality_threshold?: number; // Minimum quality score
  sort_by?: string;     // created_at, quality_score, name
  sort_order?: 'asc' | 'desc';
}
```

**Response**:
```typescript
interface ListTemplatesResponse {
  success: boolean;
  data: {
    templates: Template[];
    count: number;
  };
}

interface Template {
  id: string;
  project_id: string;
  name: string;
  type: string;
  description?: string;
  file_name: string;
  file_size: number;
  file_type: string;
  variables: TemplateVariable[];
  structure: TemplateStructure;
  quality_score: number;
  is_active: boolean;
  is_processed: boolean;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'array' | 'object';
  required: boolean;
  examples: string[];
}

interface TemplateStructure {
  sections: string[];
  tables: Array<{
    columns: string[];
    rows: number;
  }>;
  headers: string[];
}
```

---

### **POST /api/projects/:id/templates**
**Description**: Upload one or more template files

**Request**: `multipart/form-data`
```typescript
interface UploadTemplateRequest {
  templates: File[];    // 1-10 files (.md, .docx)
  type: 'lesson_plan' | 'summary' | 'flashcard' | 'vocabulary';
  description?: string;
  auto_process?: boolean; // Default: true
}
```

**Response**:
```typescript
interface UploadTemplateResponse {
  success: boolean;
  data: {
    uploaded_templates: Array<{
      id: string;
      name: string;
      file_name: string;
      file_size: number;
      processing_status: string;
    }>;
    failed_uploads: Array<{
      file_name: string;
      error: string;
    }>;
    message: string;
  };
}
```

**Example Request (JavaScript)**:
```javascript
const formData = new FormData();
const files = [file1, file2, file3]; // File objects

files.forEach(file => {
  formData.append('templates', file);
});
formData.append('type', 'lesson_plan');
formData.append('description', 'Chinese preschool lesson plans');
formData.append('auto_process', 'true');

const response = await fetch(`/api/projects/${projectId}/templates`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

### **GET /api/projects/:id/templates/:templateId**
**Description**: Get detailed template information including content

**Response**:
```typescript
interface GetTemplateResponse {
  success: boolean;
  data: {
    template: Template & {
      file_content: string;
      analysis: TemplateAnalysis;
      usage_statistics: {
        times_used: number;
        average_format_score: number;
        last_used: string | null;
      };
    };
  };
}

interface TemplateAnalysis {
  sections: Array<{
    title: string;
    content: string;
    variables: string[];
  }>;
  tables: Array<{
    headers: string[];
    rows: Array<string[]>;
    variables: string[];
  }>;
  detected_variables: TemplateVariable[];
  completeness_score: number;
  consistency_score: number;
  complexity_score: number;
}
```

---

### **PUT /api/projects/:id/templates/:templateId/variables**
**Description**: Update manually detected variables for a template

**Request Body**:
```typescript
interface UpdateVariablesRequest {
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'array' | 'object';
    required: boolean;
    examples: string[];
    description?: string;
  }>;
}
```

---

### **DELETE /api/projects/:id/templates/:templateId**
**Description**: Delete a template

**Response**:
```typescript
interface DeleteTemplateResponse {
  success: boolean;
  data: {
    message: string;
  };
}
```

---

## 🤖 **Enhanced Generation APIs**

### **POST /api/projects/:id/generate**
**Description**: Generate lesson plans using uploaded templates

**Request**: `multipart/form-data`
```typescript
interface GenerateRequest {
  input_file: File;     // Excel/CSV with lesson data
  template_ids?: string[]; // Specific templates to use (optional)
  options: {
    language?: string;      // Override project language
    max_samples?: number;   // Max template samples (1-5)
    quality_threshold?: number; // Minimum quality (0-100)
    enforce_format?: boolean;   // Strict format matching
    batch_size?: number;       // Lessons per batch (1-20)
    export_formats?: ('markdown' | 'docx' | 'pdf')[];
  };
}
```

**Response**:
```typescript
interface GenerateResponse {
  success: boolean;
  data: {
    generation_id: string;
    project_id: string;
    status: 'processing' | 'completed' | 'failed';
    total_lessons: number;
    processed_lessons: number;
    estimated_completion: string;
    results?: GenerationResult[];
    errors?: string[];
  };
}

interface GenerationResult {
  lesson_id: string;
  unit: number;
  lesson: number;
  title: string;
  content: string;
  format_match_score: number;
  used_templates: string[];
  generation_metadata: {
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    generation_time: number;
    quality_score: number;
  };
  export_urls: {
    markdown?: string;
    docx?: string;
    pdf?: string;
  };
}
```

**Example Request (JavaScript)**:
```javascript
const formData = new FormData();
formData.append('input_file', inputFile);
formData.append('options', JSON.stringify({
  language: 'zh',
  max_samples: 3,
  quality_threshold: 90,
  enforce_format: true,
  export_formats: ['markdown', 'docx']
}));

const response = await fetch(`/api/projects/${projectId}/generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

### **GET /api/projects/:id/generate/:generationId/status**
**Description**: Check generation progress

**Response**:
```typescript
interface GenerationStatusResponse {
  success: boolean;
  data: {
    generation_id: string;
    status: 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: {
      current_lesson: number;
      total_lessons: number;
      percentage: number;
      estimated_time_remaining: number; // seconds
    };
    current_operation: string;
    errors: string[];
    results: GenerationResult[];
  };
}
```

---

### **POST /api/projects/:id/generate/:generationId/cancel**
**Description**: Cancel ongoing generation

**Response**:
```typescript
interface CancelGenerationResponse {
  success: boolean;
  data: {
    message: string;
    cancelled_lessons: number;
  };
}
```

---

## 📊 **Enhanced Course Operations APIs**

### **POST /api/course-ops?action=generate-enhanced**
**Description**: Generate single lesson with template support

**Request Body**:
```typescript
interface EnhancedGenerateRequest {
  project_id?: string;
  template_ids?: string[];
  unit: number;
  lesson: number;
  options: {
    use_samples?: boolean;
    sample_limit?: number;
    language?: string;
    enforce_format?: boolean;
    quality_threshold?: number;
  };
}
```

**Response**:
```typescript
interface EnhancedGenerateResponse {
  success: boolean;
  data: {
    lesson: {
      id: string;
      unit: number;
      lesson: number;
      content: string;
      format_match_score: number;
      used_templates: string[];
    };
    template_analysis: Array<{
      template_id: string;
      match_score: number;
      used_variables: string[];
      format_preservation: number;
    }>;
  };
}
```

---

### **POST /api/course-ops?action=upload-templates**
**Description**: Upload templates for existing project

**Request**: `multipart/form-data`
```typescript
interface UploadTemplatesRequest {
  project_id?: string;
  templates: File[];
  type: 'lesson_plan' | 'summary' | 'flashcard' | 'vocabulary';
  auto_process?: boolean;
}
```

---

### **GET /api/course-ops?action=template-analysis**
**Description**: Analyze uploaded templates

**Query Parameters**:
```typescript
interface TemplateAnalysisQuery {
  project_id?: string;
  template_ids?: string[];
  include_content?: boolean;
  include_variables?: boolean;
}
```

---

## 🌐 **Language Configuration APIs**

### **GET /api/language-configs**
**Description**: Get all available language configurations

**Response**:
```typescript
interface LanguageConfigsResponse {
  success: boolean;
  data: {
    languages: LanguageConfig[];
  };
}

interface LanguageConfig {
  id: string;
  language_code: string;
  language_name: string;
  direction: 'ltr' | 'rtl';
  ai_prompts: {
    lesson_plan: string;
    analysis: string;
    summary: string;
    flashcard: string;
  };
  cultural_settings: {
    classroom_structure: string;
    teaching_methods: string[];
    assessment_styles: string[];
    formality_level: 'formal' | 'informal' | 'mixed';
  };
  formatting: {
    date_format: string;
    time_format: string;
    number_format: string;
    currency: string;
  };
  is_active: boolean;
}
```

---

### **PUT /api/language-configs/:languageCode**
**Description**: Update language configuration

**Request Body**:
```typescript
interface UpdateLanguageConfigRequest {
  ai_prompts?: Partial<LanguageConfig['ai_prompts']>;
  cultural_settings?: Partial<LanguageConfig['cultural_settings']>;
  formatting?: Partial<LanguageConfig['formatting']>;
}
```

---

## 📈 **Analytics APIs**

### **GET /api/projects/:id/analytics**
**Description**: Get project analytics and statistics

**Query Parameters**:
```typescript
interface AnalyticsQuery {
  date_range?: '7d' | '30d' | '90d' | '1y';
  include_templates?: boolean;
  include_lessons?: boolean;
  include_quality_metrics?: boolean;
}
```

**Response**:
```typescript
interface AnalyticsResponse {
  success: boolean;
  data: {
    project_summary: {
      total_templates: number;
      total_lessons: number;
      total_generations: number;
      average_quality_score: number;
      average_format_match: number;
    };
    generation_trends: Array<{
      date: string;
      generations: number;
      avg_quality: number;
      avg_format_match: number;
    }>;
    template_performance: Array<{
      template_id: string;
      template_name: string;
      usage_count: number;
      avg_format_score: number;
      avg_quality_score: number;
    }>;
    language_distribution: Array<{
      language: string;
      count: number;
      percentage: number;
    }>;
  };
}
```

---

### **GET /api/templates/:templateId/analytics**
**Description**: Get template-specific analytics

**Response**:
```typescript
interface TemplateAnalyticsResponse {
  success: boolean;
  data: {
    template: Template;
    usage_statistics: {
      total_uses: number;
      successful_generations: number;
      average_format_score: number;
      average_quality_score: number;
      last_used: string;
    };
    generation_history: Array<{
      lesson_id: string;
      generated_at: string;
      format_score: number;
      quality_score: number;
      variables_used: string[];
    }>;
    variable_usage: Array<{
      variable_name: string;
      usage_frequency: number;
      examples_used: string[];
    }>;
  };
}
```

---

## 🔍 **Search & Filter APIs**

### **GET /api/search/templates**
**Description**: Search templates across projects

**Query Parameters**:
```typescript
interface SearchTemplatesQuery {
  q?: string;              // Search query
  project_id?: string;     // Filter by project
  type?: string;           // Template type
  language?: string;       // Language filter
  min_quality?: number;    // Minimum quality score
  has_variables?: boolean; // Has detected variables
  limit?: number;          // Results limit
  offset?: number;         // Results offset
}
```

---

### **GET /api/search/lessons**
**Description**: Search generated lessons

**Query Parameters**:
```typescript
interface SearchLessonsQuery {
  q?: string;              // Search query in content
  project_id?: string;     // Filter by project
  unit?: number;           // Filter by unit
  lesson?: number;         // Filter by lesson
  language?: string;       // Language filter
  min_format_score?: number; // Minimum format score
  date_from?: string;      // ISO date string
  date_to?: string;        // ISO date string
  limit?: number;
  offset?: number;
}
```

---

## 📥 **Export APIs**

### **GET /api/projects/:id/export**
**Description**: Export project data and generated content

**Query Parameters**:
```typescript
interface ExportQuery {
  format: 'json' | 'csv' | 'xlsx';
  include_templates?: boolean;
  include_lessons?: boolean;
  include_analytics?: boolean;
  date_range?: string; // ISO date range
}
```

**Response**: Binary file download with appropriate headers

---

### **POST /api/lessons/:lessonId/export**
**Description**: Export specific lesson in different formats

**Request Body**:
```typescript
interface ExportLessonRequest {
  formats: ('markdown' | 'docx' | 'pdf' | 'html')[];
  include_metadata?: boolean;
  include_template_info?: boolean;
  custom_filename?: string;
}
```

**Response**:
```typescript
interface ExportLessonResponse {
  success: boolean;
  data: {
    export_id: string;
    downloads: Array<{
      format: string;
      url: string;
      expires_at: string;
      file_size: number;
    }>;
  };
}
```

---

## ⚠️ **Error Handling**

### Standard Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    request_id: string;
  };
}
```

### Common Error Codes
- `PROJECT_NOT_FOUND`: Project does not exist
- `TEMPLATE_NOT_FOUND`: Template does not exist
- `INVALID_FILE_TYPE`: Unsupported file format
- `FILE_TOO_LARGE`: File exceeds size limit
- `QUOTA_EXCEEDED`: API quota exceeded
- `GENERATION_FAILED`: Lesson generation failed
- `TEMPLATE_ANALYSIS_FAILED`: Template processing failed
- `INVALID_VARIABLES`: Invalid template variables
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Example Error Response
```json
{
  "success": false,
  "error": {
    "code": "TEMPLATE_ANALYSIS_FAILED",
    "message": "Unable to process template file due to invalid format",
    "details": {
      "file_name": "lesson_template.md",
      "error_line": 15,
      "error_message": "Unclosed table header"
    },
    "timestamp": "2024-12-06T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

---

## 🔄 **Rate Limiting**

### Rate Limit Headers
```typescript
interface RateLimitHeaders {
  'X-RateLimit-Limit': number;     // Total requests allowed
  'X-RateLimit-Remaining': number; // Requests remaining
  'X-RateLimit-Reset': number;     // Unix timestamp when limit resets
  'Retry-After': number;           // Seconds to wait if limited
}
```

### Rate Limits by Endpoint
- **Project Management**: 100 requests/hour
- **Template Upload**: 20 requests/hour
- **Generation**: 50 requests/hour
- **Analytics**: 200 requests/hour
- **Export**: 30 requests/hour

---

## 🧪 **Testing Examples**

### Test Project Creation
```bash
curl -X POST "http://localhost:3000/api/projects" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test_token" \
     -d '{
       "name": "Test Project",
       "language": "zh",
       "input_format": "excel"
     }'
```

### Test Template Upload
```bash
curl -X POST "http://localhost:3000/api/projects/test-project-id/templates" \
     -H "Authorization: Bearer test_token" \
     -F "templates=@template1.md" \
     -F "templates=@template2.md" \
     -F "type=lesson_plan"
```

### Test Generation
```bash
curl -X POST "http://localhost:3000/api/projects/test-project-id/generate" \
     -H "Authorization: Bearer test_token" \
     -F "input_file=@lessons.xlsx" \
     -F 'options={"language":"zh","max_samples":3,"quality_threshold":90}'
```

---

## 📚 **SDK Examples**

### JavaScript/TypeScript SDK
```typescript
import { EnhancedLessonPlanAPI } from './sdk';

const api = new EnhancedLessonPlanAPI({
  baseURL: 'https://your-domain.com/api',
  token: 'your-jwt-token'
});

// Create project
const project = await api.projects.create({
  name: 'Chinese Course',
  language: 'zh',
  input_format: 'excel'
});

// Upload templates
const templates = await api.templates.upload(project.id, {
  templates: [file1, file2],
  type: 'lesson_plan'
});

// Generate lessons
const generation = await api.generation.create(project.id, {
  input_file: excelFile,
  options: {
    max_samples: 3,
    quality_threshold: 90
  }
});

// Check status
const status = await api.generation.getStatus(generation.generation_id);
```

---

## 📝 **Changelog**

### Version 2.0.0 (2024-12-06)
- Added project management APIs
- Added template upload and analysis
- Enhanced generation with sample files
- Added multi-language support
- Added analytics and export APIs

### Version 1.0.0 (Previous)
- Basic lesson generation
- File upload and processing
- Simple template system

---

**API Documentation Complete! 🎉**

This documentation provides comprehensive coverage of all enhanced APIs with detailed examples and integration guidance.