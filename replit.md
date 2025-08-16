# Overview

EduFlow is a comprehensive Vietnamese Chinese teacher education workflow automation web application. The system streamlines a 5-step pedagogical process for creating Chinese language learning materials targeting preschool, primary, and lower-secondary students. The application integrates AI-powered content analysis, lesson planning, flashcard generation, and summary creation to automate the teacher's workflow from initial PDF input to final deliverable materials.

The platform now includes standalone AI tools with file upload support, comprehensive external resource links for enhanced teaching capabilities, and a secure user authentication system with credit tracking.

The core learning methodology follows a simple sequence: Listen & Repeat → Listen & Pick Image → See Image & Speak the Word. The application supports the complete content creation pipeline including PDF analysis, lesson plan generation, vocabulary flashcard creation with visual elements, and parent/student summary generation.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**React-based SPA**: Built with React 18, TypeScript, and Vite for development tooling. The application uses Wouter for client-side routing and TanStack Query for server state management and caching.

**UI Components**: Implements shadcn/ui component library with Radix UI primitives for consistent, accessible interface components. Tailwind CSS provides utility-first styling with custom design tokens for colors, spacing, and typography.

**State Management**: Uses TanStack Query for server state with custom hooks for workflow management (`useWorkflow`). Local component state handles form inputs and temporary UI states.

**Responsive Design**: Mobile-first approach with breakpoint-aware components using custom `useIsMobile` hook and responsive Tailwind classes.

## Backend Architecture

**Express.js Server**: RESTful API server with Express.js handling HTTP requests, file uploads via Multer, and middleware for logging and error handling.

**Database Integration**: Drizzle ORM with PostgreSQL dialect for type-safe database operations. Schema defines users, lessons, and workflows tables with JSON columns for flexible data storage.

**File Processing**: PDF text extraction using pdf.js-extract library, with memory-based storage for uploaded files and content processing pipeline.

**Storage Layer**: Modular storage interface (`IStorage`) with in-memory implementation for development, designed to support database persistence in production.

**Authentication System**: Session-based authentication with Express sessions, user credential management, and credit balance tracking. Pre-configured users: thuthao/310799 and thanhhoang/090800, each with $1000 initial credit balance. Includes responsive header with navigation, autofill-enabled login form, and consistent user state management across the platform.

## External Dependencies

**Database**: PostgreSQL with Neon Database serverless driver for cloud-based database hosting and connection management.

**AI Services**: OpenAI GPT-4o integration for content analysis, lesson plan generation, flashcard creation, and summary writing. Structured prompts guide AI to produce education-specific content.

**File Processing**: 
- PDF text extraction via pdf.js-extract
- Document format conversion capabilities (PDF ↔ Markdown ↔ DOCX)
- docx library for DOCX file generation
- Planned integration with stock image APIs and AI image generation for flashcard visuals

**Development Tools**:
- Vite for frontend build tooling and development server
- ESBuild for production server bundling
- TypeScript for type safety across the entire stack
- Drizzle Kit for database schema management and migrations

**UI Enhancement**:
- Radix UI primitives for accessible component foundations
- Tailwind CSS for responsive utility-first styling
- Lucide React for consistent iconography
- Custom fonts (Nunito Sans, Inter, JetBrains Mono) for typography hierarchy

The architecture supports a workflow-driven approach where each step (Input → Review → Plan → Flashcards → Summary) represents a distinct phase in the content creation pipeline, with AI assistance integrated at each stage to automate the teacher's manual processes.