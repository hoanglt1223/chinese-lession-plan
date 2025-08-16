# API Reference

This document provides comprehensive documentation for all EduFlow API endpoints.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Currently, the API does not require authentication for development. In production, consider implementing API key authentication.

## Content Types

All endpoints accept and return JSON unless otherwise specified.

```
Content-Type: application/json
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "message": "Error description",
  "error": "Error code (optional)"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error
- `408` - Request Timeout (for AI operations)

---

## Endpoints

### Health Check

Check if the API is running.

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-15T18:00:00.000Z"
}
```

---

### File Upload

Upload PDF files for lesson analysis.

```http
POST /api/upload
```

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `files` field

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "files=@lesson.pdf"
```

**Response:**
```json
{
  "files": [
    {
      "name": "lesson.pdf",
      "content": "Extracted text content...",
      "size": 156789
    }
  ]
}
```

**Error Responses:**
- `400` - No files uploaded
- `413` - File too large (max 10MB)

---

### Content Analysis

Analyze lesson content using AI.

```http
POST /api/analyze
```

**Request:**
```json
{
  "content": "Lesson content text to analyze"
}
```

**Response:**
```json
{
  "vocabulary": ["小鸟", "朋友", "飞", "你好"],
  "activities": ["Listen & Repeat", "Story Reading"],
  "learningObjectives": [
    "Students can recognize key vocabulary",
    "Students can understand story sequence"
  ],
  "detectedLevel": "N1",
  "ageAppropriate": "preschool",
  "mainTheme": "Animals and Greetings",
  "duration": "45 minutes"
}
```

**Error Responses:**
- `400` - Missing content
- `408` - AI analysis timeout
- `500` - Analysis failed

---

### Lesson Management

#### Create Lesson

```http
POST /api/lessons
```

**Request:**
```json
{
  "title": "Lesson Title",
  "level": "N1",
  "ageGroup": "preschool",
  "status": "draft"
}
```

**Response:**
```json
{
  "lesson": {
    "id": "uuid-string",
    "title": "Lesson Title",
    "level": "N1",
    "ageGroup": "preschool",
    "status": "draft",
    "createdAt": "2025-08-15T18:00:00.000Z"
  }
}
```

#### Get All Lessons

```http
GET /api/lessons
```

**Response:**
```json
[
  {
    "id": "uuid-string",
    "title": "Lesson Title",
    "level": "N1",
    "ageGroup": "preschool",
    "status": "draft",
    "createdAt": "2025-08-15T18:00:00.000Z"
  }
]
```

#### Get Single Lesson

```http
GET /api/lessons/:id
```

**Response:**
```json
{
  "id": "uuid-string",
  "title": "Lesson Title",
  "level": "N1",
  "ageGroup": "preschool",
  "status": "draft",
  "createdAt": "2025-08-15T18:00:00.000Z"
}
```

---

### Lesson Plan Generation

Generate detailed lesson plans using AI.

```http
POST /api/generate-plan
```

**Request:**
```json
{
  "analysis": {
    "vocabulary": ["小鸟", "朋友"],
    "activities": ["Listen & Repeat"],
    "learningObjectives": ["Students can recognize vocabulary"],
    "detectedLevel": "N1",
    "ageAppropriate": "preschool",
    "mainTheme": "Animals",
    "duration": "45 minutes"
  },
  "ageGroup": "preschool"
}
```

**Response:**
```json
{
  "lessonPlan": "# Lesson Plan: Animals\n\n## Objectives\n...(Markdown content)"
}
```

**Error Responses:**
- `400` - Missing analysis data
- `500` - Plan generation failed

---

### Flashcard Generation

Create vocabulary flashcards with AI-generated images.

```http
POST /api/generate-flashcards
```

**Request:**
```json
{
  "vocabulary": ["小鸟", "朋友", "飞"]
}
```

**Response:**
```json
{
  "flashcards": [
    {
      "id": "uuid-string",
      "word": "小鸟",
      "pinyin": "xiǎo niǎo",
      "vietnamese": "chim nhỏ",
      "partOfSpeech": "名词",
      "imageQuery": "small bird on branch",
      "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/..."
    }
  ]
}
```

**Notes:**
- Image generation takes 30-60 seconds per flashcard
- Uses DALL-E 3 for AI-generated images
- Includes Vietnamese translations

**Error Responses:**
- `400` - Missing vocabulary array
- `500` - Flashcard generation failed

---

### Summary Generation

Generate parent/student lesson summaries.

```http
POST /api/generate-summary
```

**Request:**
```json
{
  "lessonPlan": "# Lesson Plan content...",
  "vocabulary": ["小鸟", "朋友"]
}
```

**Response:**
```json
{
  "summary": "# LESSON SUMMARY\n\n## Vocabulary\n...(Markdown content)"
}
```

**Error Responses:**
- `400` - Missing lesson plan
- `500` - Summary generation failed

---

### Workflow Management

#### Get Workflow by Lesson

```http
GET /api/workflows/lesson/:lessonId
```

**Response:**
```json
{
  "id": "workflow-uuid",
  "lessonId": "lesson-uuid",
  "currentStep": 1,
  "completedSteps": [0],
  "stepData": {
    "analysis": {...},
    "lessonPlan": "...",
    "flashcards": [...],
    "summary": "..."
  },
  "createdAt": "2025-08-15T18:00:00.000Z",
  "updatedAt": "2025-08-15T18:00:00.000Z"
}
```

#### Update Workflow Step

```http
PATCH /api/workflows/:workflowId
```

**Request:**
```json
{
  "currentStep": 2,
  "stepData": {
    "analysis": {...},
    "lessonPlan": "Updated lesson plan content"
  },
  "completedSteps": [0, 1]
}
```

**Response:**
```json
{
  "id": "workflow-uuid",
  "currentStep": 2,
  "completedSteps": [0, 1],
  "stepData": {...},
  "updatedAt": "2025-08-15T18:00:00.000Z"
}
```

---

## AI Model Configuration

### Current Models

- **Text Generation**: gpt-5-nano
- **Image Generation**: DALL-E 3 (standard quality)

### Model Parameters

```javascript
// Text generation
{
  model: "gpt-5-nano",
  response_format: { type: "json_object" }
  // Note: temperature parameter not supported
}

// Image generation
{
  model: "dall-e-3",
  size: "1024x1024",
  quality: "standard",
  n: 1
}
```

---

## Rate Limits

Current API has no rate limits in development. For production deployment, consider:

- 100 requests per minute per IP
- 10 concurrent AI operations per user
- File upload limit: 10MB per file

---

## Examples

### Complete Workflow Example

```bash
# 1. Upload PDF
curl -X POST http://localhost:5000/api/upload \
  -F "files=@lesson.pdf"

# 2. Analyze content
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"content": "Lesson content here..."}'

# 3. Create lesson
curl -X POST http://localhost:5000/api/lessons \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Lesson", "level": "N1", "ageGroup": "preschool"}'

# 4. Generate lesson plan
curl -X POST http://localhost:5000/api/generate-plan \
  -H "Content-Type: application/json" \
  -d '{"analysis": {...}, "ageGroup": "preschool"}'

# 5. Generate flashcards
curl -X POST http://localhost:5000/api/generate-flashcards \
  -H "Content-Type: application/json" \
  -d '{"vocabulary": ["小鸟", "朋友"]}'

# 6. Generate summary
curl -X POST http://localhost:5000/api/generate-summary \
  -H "Content-Type: application/json" \
  -d '{"lessonPlan": "...", "vocabulary": [...]}'
```

### JavaScript/TypeScript Example

```typescript
// Helper function for API requests
async function apiRequest(method: string, endpoint: string, data?: any) {
  const response = await fetch(`http://localhost:5000/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}

// Example usage
const analysis = await apiRequest('POST', '/analyze', {
  content: 'Lesson content...'
});

const flashcards = await apiRequest('POST', '/generate-flashcards', {
  vocabulary: analysis.vocabulary
});
```

---

## Webhook Support (Future)

Planned webhook support for:
- Lesson completion notifications
- AI generation status updates
- Error notifications

```json
{
  "event": "flashcards.generated",
  "data": {
    "lessonId": "uuid",
    "flashcardCount": 5,
    "generatedAt": "2025-08-15T18:00:00.000Z"
  }
}
```