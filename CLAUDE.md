# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
# Install dependencies
pnpm install

# Setup database
pnpm db:generate  # Generate migrations from schema
pnpm db:migrate   # Run migrations against database
pnpm db:studio    # Open Drizzle Studio for database inspection
```

### Development Workflow
```bash
# Start development server with hot reload
pnpm dev

# Type checking
pnpm check          # Run TypeScript compiler
pnpm type-check     # Type check without emitting files

# Code formatting
pnpm format         # Format code with Prettier
pnpm format:check   # Check formatting without changes

# Build for production
pnpm build          # Build frontend assets
pnpm build:vercel   # Build for Vercel deployment
pnpm start          # Preview production build locally
```

## Important Development Constraints

### Windows/PowerShell Compatibility
- All commands must support Windows 10 and PowerShell
- Do NOT use `&&` operator - replace with `;` instead
- Example: `pnpm install; pnpm run dev` (not `pnpm install && pnpm run dev`)

### Code Style Guidelines
- **Implement AS SIMPLE AS POSSIBLE** - avoid adding unnecessary code or layers
- **SMALLEST CHANGES** for bug fixes - make minimal modifications to fix issues
- **DO NOT REMOVE GPT-5-nano** - keep the GPT-5-nano model in all AI integrations
- **NO MOCK API/INTEGRATION** - always implement real functionality
- **CREATE TEST PLAN AFTER IMPLEMENTATION** - don't create tests during development
- **AVOID LONG WAITS** in tool calls - implement efficiently

### Vercel Serverless Constraints
- Maximum of 12 API endpoints allowed
- Group related functionality into single endpoints with method/type differentiation
- All APIs must be compatible with Vercel serverless environment
- Maximum function timeout: 300 seconds

## Architecture Overview

This is a Chinese education platform built as a modern full-stack web application with AI integration for educational content generation.

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI API for content generation
- **Deployment**: Vercel serverless functions

### Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   ├── workflow/  # Workflow management components
│   │   │   ├── flashcards/ # Flashcard creation/editing
│   │   │   ├── export/    # Content export features
│   │   │   └── vocabulary/ # Vocabulary editing
│   │   ├── contexts/      # React contexts (AI, Translation, Workflow)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and API client
│   │   └── pages/         # Route-level components
│   └── index.html
├── api/                   # Backend API routes
│   ├── _shared/          # Shared utilities and services
│   │   ├── database.ts    # Database connection
│   │   ├── storage.ts     # Data access layer
│   │   ├── openai-services.ts # AI service integration
│   │   └── export/        # Export utilities (PDF, DOCX)
│   ├── upload.ts          # File upload handling
│   ├── analyze.ts         # AI content analysis
│   ├── generate-*.ts      # AI generation endpoints
│   └── export.ts          # Content export endpoints
├── drizzle/               # Database migrations
├── shared/                # Shared types and schemas
└── docs/                  # Documentation
```

### Core Features

1. **File Processing**: Upload and extract text from PDF/DOCX files
2. **AI-Powered Analysis**: Analyze educational content and extract vocabulary
3. **Lesson Plan Generation**: Create structured lesson plans using AI
4. **Flashcard Creation**: Generate educational flashcards with images
5. **Multi-format Export**: Export content as PDF, DOCX, or for other platforms
6. **Workflow Management**: Guided multi-step process for content creation

### Database Schema

Key tables:
- `lessons`: Stores lesson metadata (title, level, age group, status)
- `workflows`: Tracks progress through multi-step content creation process
- `users`: User management and authentication (future enhancement)

### API Endpoints Structure

```
/api/
├── upload          # File upload and text extraction
├── analyze         # AI content analysis and vocabulary extraction
├── generate-plan   # AI lesson plan generation
├── generate-flashcards # AI flashcard creation with images
├── generate-summary    # AI summary for parents/students
├── export          # Content export in various formats
└── lessons         # CRUD operations for lessons
```

### Development Environment

- **Database**: PostgreSQL (local or cloud via DATABASE_URL)
- **Environment Variables**: Copy `.env.example` to `.env` and configure:
  - `DATABASE_URL`: PostgreSQL connection string
  - `OPENAI_API_KEY`: OpenAI API key for AI features
  - `DEEPL_AUTH_KEY`: DeepL API key for translation (optional)
  - `VITE_SKIP_LOGIN`: Set to 'true' to bypass authentication in dev

### Build and Deployment

The application is configured for Vercel deployment:
- Frontend builds to `dist/public`
- API routes deploy as serverless functions with 300s timeout
- Uses pnpm for package management
- Environment-specific configurations in `vercel.json`

### AI Integration

Uses OpenAI API for:
- Content analysis and vocabulary extraction (gpt-5-nano)
- Lesson plan generation
- Flashcard content creation
- Summary generation for parents/students
- Image generation for flashcards (DALL-E 3)

**IMPORTANT**: Always include GPT-5-nano model in AI implementations - do not remove or replace it.

### Current Development Status

Based on the todo.md file:
- **Completed**: Authentication system, UI/UX improvements, AI tools integration, core workflow system
- **In Progress**: Database integration with PostgreSQL, object storage, credit system implementation
- **Priorities**: Database implementation, credit system with usage tracking, object storage setup

### Key Development Patterns

1. **Type Safety**: Full TypeScript coverage with shared schemas
2. **Component Composition**: Uses shadcn/ui for consistent design system
3. **State Management**: TanStack Query for server state, React Context for app state
4. **Error Handling**: Comprehensive error boundaries and API error handling
5. **Progressive Enhancement**: Steps can be completed independently with data persistence