import type { Express, Request, Response } from "express";
import { storage } from "./storage-serverless";
import { analyzePDFContent, generateLessonPlan, generateFlashcards, generateSummary, generateWithOpenAI, translateChineseToVietnamese } from "./services/openai";
import { fileProcessor } from "./services/fileProcessor";
import multer from "multer";
import { insertLessonSchema, insertWorkflowSchema } from "@shared/schema";
import { randomUUID } from "crypto";

interface MulterRequest extends Request {
  files?: Express.Multer.File[];
  file?: Express.Multer.File;
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export function registerServerlessRoutes(app: Express): void {
  
  // Upload and process files
  app.post("/api/upload", upload.array('files'), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const processedFiles = [];
      for (const file of req.files) {
        if (file.mimetype === 'application/pdf') {
          const processed = await fileProcessor.processPDF(file.buffer, file.originalname);
          processedFiles.push(processed);
        }
      }

      res.json({ files: processedFiles });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to process uploaded files" });
    }
  });

  // Create new lesson
  app.post("/api/lessons", async (req: Request, res: Response) => {
    try {
      const validatedData = insertLessonSchema.parse(req.body);
      const lesson = await storage.createLesson(validatedData);
      
      // Create associated workflow
      const workflow = await storage.createWorkflow({
        lessonId: lesson.id,
        currentStep: 0,
        stepData: {},
        completedSteps: []
      });

      res.json({ lesson, workflow });
    } catch (error: any) {
      console.error("Create lesson error:", error);
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  // Get lesson by ID
  app.get("/api/lessons/:id", async (req: Request, res: Response) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error: any) {
      console.error("Get lesson error:", error);
      res.status(500).json({ message: "Failed to get lesson" });
    }
  });

  // Get all lessons
  app.get("/api/lessons", async (req: Request, res: Response) => {
    try {
      const lessons = await storage.getAllLessons();
      res.json(lessons);
    } catch (error: any) {
      console.error("Get lessons error:", error);
      res.status(500).json({ message: "Failed to get lessons" });
    }
  });

  // AI Analysis endpoint
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { content, aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      console.log(`Starting AI analysis with model: ${aiModel}`);
      
      // Shorter timeout for faster models
      const timeout = aiModel === "gpt-5-nano" ? 60000 : 120000; // 1 min for gpt-5-nano, 2 min for others
      req.setTimeout(timeout);
      res.setTimeout(timeout);

      const analysis = await analyzePDFContent(content, aiModel, outputLanguage);
      console.log(`Analysis completed with model: ${aiModel}`);
      res.json(analysis);
    } catch (error: any) {
      console.error("Analysis error:", error);
      if (error?.message?.includes('timeout') || error?.message?.includes('ECONNRESET')) {
        res.status(408).json({ message: "AI analysis timed out. Please try again with a shorter document." });
      } else {
        res.status(500).json({ message: "Failed to analyze content" });
      }
    }
  });

  // Generate lesson plan
  app.post("/api/generate-plan", async (req: Request, res: Response) => {
    try {
      const { analysis, ageGroup } = req.body;
      if (!analysis) {
        return res.status(400).json({ message: "Analysis data is required" });
      }

      const lessonPlan = await generateLessonPlan(analysis, ageGroup || "preschool");
      res.json({ lessonPlan });
    } catch (error: any) {
      console.error("Generate plan error:", error);
      res.status(500).json({ message: "Failed to generate lesson plan" });
    }
  });

  // Generate flashcards
  app.post("/api/generate-flashcards", async (req: Request, res: Response) => {
    try {
      const { vocabulary, theme, level, ageGroup } = req.body;
      if (!vocabulary || !Array.isArray(vocabulary)) {
        return res.status(400).json({ message: "Vocabulary array is required" });
      }

      const flashcards = await generateFlashcards(vocabulary, theme, level, ageGroup);
      
      // Fetch images for each flashcard
      const flashcardsWithImages = await Promise.all(
        flashcards.map(async (card) => {
          try {
            // Keep the DALL-E generated imageUrl from OpenAI service
            return {
              ...card,
              id: randomUUID(),
              imageUrl: card.imageUrl // Use the DALL-E 3 generated image URL
            };
          } catch (error: any) {
            return {
              ...card,
              id: randomUUID(),
              imageUrl: "https://via.placeholder.com/400x300?text=No+Image"
            };
          }
        })
      );

      res.json({ flashcards: flashcardsWithImages });
    } catch (error: any) {
      console.error("Generate flashcards error:", error);
      res.status(500).json({ message: "Failed to generate flashcards" });
    }
  });

  // Generate summary
  app.post("/api/generate-summary", async (req: Request, res: Response) => {
    try {
      const { lessonPlan, vocabulary } = req.body;
      if (!lessonPlan) {
        return res.status(400).json({ message: "Lesson plan is required" });
      }

      const summary = await generateSummary(lessonPlan, vocabulary || []);
      res.json({ summary });
    } catch (error: any) {
      console.error("Generate summary error:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // Translation endpoint
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { words } = req.body;
      if (!words || !Array.isArray(words)) {
        return res.status(400).json({ message: "Words array is required" });
      }

      // Get DeepL translations
      const translations = await translateChineseToVietnamese(words);
      res.json({ translations });
    } catch (error: any) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Failed to translate words" });
    }
  });

  // Export endpoints
  app.post("/api/export/pdf", async (req: Request, res: Response) => {
    try {
      const { flashcards } = req.body;
      const pdfBuffer = await fileProcessor.generateFlashcardPDF(flashcards);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="flashcards.pdf"');
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Export PDF error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  app.post("/api/export/docx", async (req: Request, res: Response) => {
    try {
      const { content } = req.body;
      const docxBuffer = await fileProcessor.convertMarkdownToDocx(content);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="lesson.docx"');
      res.send(docxBuffer);
    } catch (error: any) {
      console.error("Export DOCX error:", error);
      res.status(500).json({ message: "Failed to export DOCX" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUserLogin(user.id);
      
      // Set session
      (req.session as any).userId = user.id;
      
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          creditBalance: user.creditBalance
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      // Check if login is bypassed via environment variable
      if (process.env.VITE_SKIP_LOGIN === 'true' || process.env.NODE_ENV === 'development' && process.env.VITE_SKIP_AUTH === 'true') {
        // Return a default user for development
        const defaultUser = {
          id: "dev-user",
          username: "developer",
          creditBalance: "9999.00"
        };
        return res.json({ user: defaultUser });
      }

      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          creditBalance: user.creditBalance
        }
      });
    } catch (error: any) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });
}
