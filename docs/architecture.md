# Architecture Overview

EduFlow is designed as a modern full-stack web application with AI integration for educational content generation.

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Services  │
│   (React)       │◄──►│   (Express)     │◄──►│   (OpenAI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       
         │                       │                       
         ▼                       ▼                       
┌─────────────────┐    ┌─────────────────┐              
│   Client State  │    │   Database      │              
│   (TanStack)    │    │   (PostgreSQL)  │              
└─────────────────┘    └─────────────────┘              
```

## 🖥️ Frontend Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing

### Component Structure

```
src/
├── components/
│   ├── ui/                 # Reusable UI components (shadcn/ui)
│   ├── workflow/           # Workflow-specific components
│   │   ├── step-card.tsx   # Individual workflow step
│   │   └── kanban-board.tsx # Workflow overview
│   ├── flashcards/         # Flashcard management
│   ├── vocabulary/         # Vocabulary editing
│   └── export/            # Content export features
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
└── pages/                 # Route-level components
```

### State Management Strategy

1. **Server State**: TanStack Query for API data caching and synchronization
2. **Local State**: React useState for component-level state
3. **Workflow State**: Custom useWorkflow hook for multi-step process management

### Key Design Patterns

- **Compound Components**: Step cards with embedded editors
- **Render Props**: Flexible component composition
- **Custom Hooks**: Reusable stateful logic
- **Error Boundaries**: Graceful error handling for AI operations

## 🔧 Backend Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Drizzle ORM
- **File Processing**: pdf.js-extract for PDF text extraction
- **Session Management**: express-session with PostgreSQL store

### API Design

```
/api/
├── upload          # File upload and processing
├── analyze         # AI content analysis
├── lessons         # Lesson CRUD operations
├── workflows       # Workflow state management
├── generate-plan   # AI lesson plan generation
├── generate-flashcards # AI flashcard creation
└── generate-summary    # AI summary generation
```

### Database Schema

```sql
-- Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  level TEXT NOT NULL,
  age_group TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  lesson_id UUID REFERENCES lessons(id),
  current_step INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT '{}',
  step_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (future)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Service Layer Architecture

```
server/
├── index.ts           # Express server setup
├── routes.ts          # API route definitions
├── storage.ts         # Data access interface
└── services/
    ├── openai.ts      # AI service integration
    ├── pdf.ts         # PDF processing
    └── export.ts      # Content export utilities
```

## 🤖 AI Integration Architecture

### OpenAI Service Integration

```typescript
// AI Service abstraction
interface AIService {
  analyzeContent(content: string): Promise<LessonAnalysis>;
  generateLessonPlan(analysis: LessonAnalysis): Promise<string>;
  generateFlashcards(vocabulary: string[]): Promise<FlashcardData[]>;
  generateSummary(plan: string, vocabulary: string[]): Promise<string>;
}
```

### AI Workflow Pipeline

1. **Content Analysis**: Extract vocabulary and learning objectives
2. **Lesson Planning**: Generate structured educational content
3. **Visual Creation**: Generate educational images with DALL-E 3
4. **Summary Generation**: Create parent/student communication materials

### Model Configuration

```typescript
// Text Generation (gpt-5-nano)
const textConfig = {
  model: "gpt-5-nano",
  response_format: { type: "json_object" },
  // Note: temperature not supported in gpt-5-nano
};

// Image Generation (DALL-E 3)
const imageConfig = {
  model: "dall-e-3",
  size: "1024x1024",
  quality: "standard",
  n: 1
};
```

## 📊 Data Flow Architecture

### Workflow State Machine

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Input   │───►│ Review  │───►│ Plan    │───►│Flashcard│───►│Summary  │
│ (PDF)   │    │ (AI)    │    │ (AI)    │    │ (AI+IMG)│    │ (AI)    │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  Upload         Analysis     Lesson Plan     Flashcards      Summary
   File           Data         Content          Data           Content
```

### Data Persistence Strategy

1. **Immediate Persistence**: All workflow steps saved to database
2. **Optimistic Updates**: Frontend updates before server confirmation
3. **Error Recovery**: Automatic retry mechanisms for AI operations
4. **State Synchronization**: Real-time updates across browser tabs

## 🔄 Workflow Engine

### Step Management

```typescript
interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  dependencies: number[];
  canSkip: boolean;
  estimatedDuration: number;
}

interface WorkflowState {
  currentStep: number;
  completedSteps: number[];
  stepData: Record<string, any>;
  lessonId: string;
}
```

### Progressive Enhancement

- Steps can be completed independently
- Each step validates its prerequisites
- Data persists at each step completion
- Users can return to previous steps for editing

## 🎨 UI/UX Architecture

### Design System

```
Design Tokens:
├── Colors
│   ├── Primary: Educational blue (#2563eb)
│   ├── Secondary: Warm orange (#f97316)
│   ├── Success: Green (#059669)
│   └── Error: Red (#dc2626)
├── Typography
│   ├── Headings: Inter (variable)
│   ├── Body: Nunito Sans
│   └── Code: JetBrains Mono
└── Spacing: Tailwind's 4px base scale
```

### Responsive Strategy

- **Mobile-first**: Progressive enhancement for larger screens
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Component Adaptation**: Responsive props for layout changes
- **Touch-friendly**: Adequate tap targets for mobile interaction

### Accessibility

- **WCAG 2.1 AA Compliance**: Color contrast, keyboard navigation
- **Screen Reader Support**: Semantic HTML, ARIA labels
- **Focus Management**: Logical tab order, visible focus indicators
- **Internationalization**: Support for Vietnamese and Chinese text

## 🔐 Security Architecture

### Current Security Measures

1. **API Key Protection**: Server-side OpenAI key storage
2. **File Upload Validation**: Type checking, size limits
3. **Input Sanitization**: XSS prevention for user content
4. **Error Handling**: No sensitive information in error messages

### Future Security Enhancements

```typescript
// Planned security features
interface SecurityConfig {
  authentication: 'jwt' | 'session';
  authorization: 'rbac' | 'simple';
  rateLimit: {
    requests: number;
    window: number;
  };
  encryption: {
    sensitiveData: boolean;
    algorithm: string;
  };
}
```

## 📈 Performance Architecture

### Frontend Performance

- **Code Splitting**: Route-based lazy loading
- **Bundle Optimization**: Tree shaking, minification
- **Image Optimization**: WebP format, lazy loading
- **Caching Strategy**: TanStack Query with smart invalidation

### Backend Performance

- **Connection Pooling**: Database connection management
- **Response Caching**: Redis for frequently accessed data
- **Async Processing**: Non-blocking AI operations
- **Resource Monitoring**: Memory and CPU usage tracking

### AI Performance Optimization

```typescript
// Performance strategies
const aiOptimization = {
  batching: 'Group similar requests',
  caching: 'Cache generated content',
  streaming: 'Stream long responses',
  fallbacks: 'Graceful degradation',
  timeouts: 'Prevent hanging requests'
};
```

## 🚀 Deployment Architecture

### Container Strategy

```dockerfile
# Multi-stage build
FROM node:20-alpine AS base
FROM base AS deps      # Install dependencies
FROM base AS builder   # Build application
FROM base AS runner    # Production runtime
```

### Service Orchestration

```yaml
services:
  app:        # Main application
  postgres:   # Database
  redis:      # Caching & sessions
  nginx:      # Reverse proxy (production)
```

### Environment Configuration

```typescript
interface EnvironmentConfig {
  development: {
    database: 'in-memory';
    ai: 'full-featured';
    logging: 'verbose';
  };
  production: {
    database: 'postgresql';
    ai: 'optimized';
    logging: 'structured';
  };
}
```

## 🔧 Development Architecture

### Build Pipeline

1. **Type Checking**: TypeScript compilation
2. **Linting**: ESLint for code quality
3. **Testing**: Jest for unit tests, Playwright for e2e
4. **Building**: Vite for frontend, tsc for backend
5. **Packaging**: Docker for deployment

### Development Workflow

```
Developer → Git Push → CI/CD → Testing → Build → Deploy
     ↓
Local Development
     ↓
Hot Reload (Vite HMR)
     ↓
Live Database Sync
```

## 📚 Extension Points

### Plugin Architecture (Future)

```typescript
interface EduFlowPlugin {
  name: string;
  version: string;
  hooks: {
    beforeAnalysis?: (content: string) => string;
    afterFlashcards?: (cards: FlashcardData[]) => FlashcardData[];
    customExport?: (data: any) => Promise<Buffer>;
  };
}
```

### Integration Points

- **LMS Integration**: Canvas, Moodle, Google Classroom
- **Export Formats**: PDF, DOCX, SCORM packages
- **Third-party AI**: Support for multiple AI providers
- **Custom Vocabularies**: Domain-specific word lists

---

This architecture supports the current educational workflow while providing flexibility for future enhancements and scaling requirements.