# Project Transfer Context: Chinese Lesson Plan Generator

## 1. Project Overview
This project automates the creation of Chinese lesson plans (DOCX) and flashcards (PDF) based on a structured Excel Course Outline.

**Core Tech Stack:**
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query.
- **Backend:** Vercel Serverless Functions (Node.js/TypeScript).
- **AI Provider:** Z.ai (GLM-4.6) compatible with OpenAI SDK.
- **Database:** Neon (PostgreSQL) with Drizzle ORM (for storing reusable activities).
- **File Processing:** `xlsx` (Excel), `docx` (Word), `jspdf` (Flashcards).

## 2. Recent Key Implementations

### A. AI & Activity Reuse
- **Provider Switch:** Migrated from OpenAI to **Z.ai** (Base URL: `https://api.z.ai/api/coding/paas/v4`, Model: `GLM-4.6`).
- **Generic Activities:** 
  - Created `activities` table in database.
  - Implemented logic to **extract** new activities from AI responses and **save** them to DB.
  - Implemented logic to **inject** existing activities into prompts for reuse.
  - **Singleton Pattern:** Implemented `getOpenAI()` singleton in `openai-services.ts` to handle configuration correctly.

### B. Lesson Plan Formatting (Lesson 8 Style)
- **Strict Table Structure:** Updated `api/_shared/prompt-service.ts` to force the AI to output Markdown tables that exactly match the "Unit 4 - Lesson 8" DOCX format.
  - **Header Table:** 7 rows (References, Aims, Type, Content, Duration, etc.).
  - **Procedure Table:** 3 columns (Stage & aim, Activities, Materials).
- **Bilingual Support:** Enforced English/Chinese bilingual headers.

### C. Batch Generation Workflow
- **Course Manager UI:** Created `client/src/pages/course-manager.tsx`.
  - Displays course tree (Units -> Lessons) from Excel.
  - Allows batch selection and sequential generation.
  - Shows real-time status.
- **Backend APIs:**
  - `GET /api/course-structure`: Parses `Super Learners Course Outline.xlsx` and returns hierarchy.
  - `POST /api/course-generate`: Generates DOCX/PDF for a specific lesson (Unit/Lesson pair).
- **Flashcards:** Configured to use **API-based image search** (Unsplash/Freepik) instead of AI generation for speed and cost efficiency.

## 3. Critical Configuration
**Environment Variables (`.env`):**
```env
OPENAI_API_KEY="271c22f9d6e44ed89d40a07ed462f338.4aaNUmJ9gDvlDmaZ"
OPENAI_BASE_URL="https://api.z.ai/api/coding/paas/v4"
# Database URL for generic activities
DATABASE_URL="..." 
```

**Key Files:**
- `api/_shared/openai-services.ts`: AI integration & Activity extraction.
- `api/_shared/prompt-service.ts`: Prompt templates (Lesson 8 style).
- `api/course-generate.ts`: Main generation endpoint.
- `client/src/pages/course-manager.tsx`: Batch UI.
- `client/src/pages/home.tsx`: Main dashboard/workflow UI.

## 4. Current Status & Next Steps
- **Status:** System is fully functional for batch generation. UI is connected to Backend.
- **Immediate Task:** 
  - User wants to continue generating materials for all 8 lessons (and beyond) using the single Excel source.
  - **UI/UX Improvement:** Both the `CourseManager` and the main `Home` page need UI/UX polish to match the new capabilities and provide a better experience.
- **Next Steps:**
  1.  **Improve UI/UX:** Polish `client/src/pages/home.tsx` (dashboard) and `client/src/pages/course-manager.tsx`.
  2.  Run full batch generation for Unit 4 to verify consistency across all 8 lessons.
  3.  Monitor Z.ai usage/limits.
  4.  Refine "Generic Activity" extraction if it captures too much noise.

## 5. Copy-Paste Prompt for New Thread
(Use the text below to start a new session)

---
**Context:**
We are working on the Chinese Lesson Plan Generator. We have just finished setting up a **Batch Generation System** that uses **Z.ai (GLM-4.6)** to generate lesson plans matching the specific **"Lesson 8" table format**.

**Current State:**
1. **Backend:** `api/course-generate.ts` is ready. It generates DOCX (Lesson Plan) and PDF (Flashcards).
2. **Frontend:** `/course-manager` page allows selecting lessons from `Super Learners Course Outline.xlsx` and generating them in bulk.
3. **Database:** We have an `activities` table to store and reuse generic games/activities.
4. **AI:** Using Z.ai with a strict Markdown table prompt.

**Goal:**
1. **UI/UX Improvements (Priority):**
   - **Home Page (`client/src/pages/home.tsx`):** Improve the visual design, user flow, and feedback mechanisms. It currently feels basic and needs to better integrate with the new batch workflows.
   - **Course Manager:** Ensure the batch generation UI is intuitive, with clear progress indicators and error handling.
2. **Verify & Execute:** Continue batch generation for all lessons in Unit 4, ensuring the "Activity Reuse" logic works and file outputs match the expected Lesson 8 style.
---
