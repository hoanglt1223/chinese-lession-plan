import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzePDFContent, generateLessonPlan, generateFlashcards, generateSummary, generateWithOpenAI } from "./services/openai";
import { fileProcessor } from "./services/fileProcessor";
import multer from "multer";
import { insertLessonSchema, insertWorkflowSchema } from "@shared/schema";

interface MulterRequest extends Request {
  files?: Express.Multer.File[];
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload and process files
  app.post("/api/upload", upload.array('files'), async (req, res) => {
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
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to process uploaded files" });
    }
  });

  // Create new lesson
  app.post("/api/lessons", async (req, res) => {
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
    } catch (error) {
      console.error("Create lesson error:", error);
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  // Get lesson by ID
  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lesson = await storage.getLesson(req.params.id);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Get lesson error:", error);
      res.status(500).json({ message: "Failed to get lesson" });
    }
  });

  // Get all lessons
  app.get("/api/lessons", async (req, res) => {
    try {
      const lessons = await storage.getAllLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Get lessons error:", error);
      res.status(500).json({ message: "Failed to get lessons" });
    }
  });

  // AI Analysis endpoint
  app.post("/api/analyze", async (req, res) => {
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
    } catch (error) {
      console.error("Analysis error:", error);
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        res.status(408).json({ message: "AI analysis timed out. Please try again with a shorter document." });
      } else {
        res.status(500).json({ message: "Failed to analyze content" });
      }
    }
  });

  // Generate lesson plan
  app.post("/api/generate-plan", async (req, res) => {
    try {
      const { analysis, ageGroup } = req.body;
      if (!analysis) {
        return res.status(400).json({ message: "Analysis data is required" });
      }

      const lessonPlan = await generateLessonPlan(analysis, ageGroup || "preschool");
      res.json({ lessonPlan });
    } catch (error) {
      console.error("Generate plan error:", error);
      res.status(500).json({ message: "Failed to generate lesson plan" });
    }
  });

  // Generate flashcards
  app.post("/api/generate-flashcards", async (req, res) => {
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
              id: crypto.randomUUID(),
              imageUrl: card.imageUrl // Use the DALL-E 3 generated image URL
            };
          } catch (error) {
            return {
              ...card,
              id: crypto.randomUUID(),
              imageUrl: "https://via.placeholder.com/400x300?text=No+Image"
            };
          }
        })
      );

      res.json({ flashcards: flashcardsWithImages });
    } catch (error) {
      console.error("Generate flashcards error:", error);
      res.status(500).json({ message: "Failed to generate flashcards" });
    }
  });

  // Generate summary
  app.post("/api/generate-summary", async (req, res) => {
    try {
      const { lessonPlan, vocabulary } = req.body;
      if (!lessonPlan) {
        return res.status(400).json({ message: "Lesson plan is required" });
      }

      const summary = await generateSummary(lessonPlan, vocabulary || []);
      res.json({ summary });
    } catch (error) {
      console.error("Generate summary error:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // Update workflow step
  app.patch("/api/workflows/:id", async (req, res) => {
    try {
      const { currentStep, stepData, completedSteps } = req.body;
      const workflow = await storage.updateWorkflow(req.params.id, {
        currentStep,
        stepData,
        completedSteps
      });
      res.json(workflow);
    } catch (error) {
      console.error("Update workflow error:", error);
      res.status(500).json({ message: "Failed to update workflow" });
    }
  });

  // Get workflow by lesson ID
  app.get("/api/workflows/lesson/:lessonId", async (req, res) => {
    try {
      const workflow = await storage.getWorkflowByLessonId(req.params.lessonId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Get workflow error:", error);
      res.status(500).json({ message: "Failed to get workflow" });
    }
  });

  // AI Generation endpoints
  app.post("/api/generate/lesson-plan", async (req, res) => {
    try {
      const { analysis, level, ageGroup } = req.body;
      if (!analysis) {
        return res.status(400).json({ message: "Analysis is required" });
      }

      // Generate detailed lesson plan based on analysis
      const lessonPlan = await generateLessonPlan(analysis, level, ageGroup);
      res.json({ lessonPlan });
    } catch (error) {
      console.error("Lesson plan generation error:", error);
      res.status(500).json({ message: "Failed to generate lesson plan" });
    }
  });

  app.post("/api/generate/flashcards", async (req, res) => {
    try {
      const { vocabulary, level, ageGroup } = req.body;
      if (!vocabulary || !Array.isArray(vocabulary)) {
        return res.status(400).json({ message: "Vocabulary array is required" });
      }

      // Generate flashcards with pinyin and Vietnamese
      const flashcards = await generateFlashcards(vocabulary, level, ageGroup);
      res.json({ flashcards });
    } catch (error) {
      console.error("Flashcard generation error:", error);
      res.status(500).json({ message: "Failed to generate flashcards" });
    }
  });

  app.post("/api/generate/summary", async (req, res) => {
    try {
      const { lessonPlan, vocabulary, activities } = req.body;
      if (!lessonPlan) {
        return res.status(400).json({ message: "Lesson plan is required" });
      }

      // Generate parent/student summary
      const summary = await generateSummary(lessonPlan, vocabulary, activities);
      res.json({ summary });
    } catch (error) {
      console.error("Summary generation error:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { words } = req.body;
      if (!words || !Array.isArray(words)) {
        return res.status(400).json({ message: "Words array is required" });
      }

      // Get DeepL translations
      const { translateChineseToVietnamese } = await import("./services/openai.js");
      const translations = await translateChineseToVietnamese(words);
      res.json({ translations });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Failed to translate words" });
    }
  });

  // Export endpoints
  app.post("/api/export/pdf", async (req, res) => {
    try {
      const { flashcards } = req.body;
      const pdfBuffer = await fileProcessor.generatePDFTemplate(flashcards);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="flashcards.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Export PDF error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  app.post("/api/export/docx", async (req, res) => {
    try {
      const { content } = req.body;
      const docxBuffer = await fileProcessor.convertMarkdownToDocx(content);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="lesson.docx"');
      res.send(docxBuffer);
    } catch (error) {
      console.error("Export DOCX error:", error);
      res.status(500).json({ message: "Failed to export DOCX" });
    }
  });

  // Tools endpoints
  
  // File-based Content Conversion Tool
  app.post("/api/tools/convert-file", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      const { from, to, aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      let content = "";
      
      // Extract content based on file type
      if (req.file.mimetype === 'application/pdf') {
        const processed = await fileProcessor.processPDF(req.file.buffer, req.file.originalname);
        content = processed.content;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Handle DOCX files
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        content = result.value;
      } else if (req.file.mimetype === 'text/plain' || req.file.mimetype === 'text/markdown') {
        content = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      // Process conversion similar to text-based conversion
      let result = content;
      
      if (from === "pdf" && to === "markdown") {
        // Use AI to clean up and format PDF content to Markdown
        const OpenAI = require("openai");
        const openai = new OpenAI({ 
          apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
        });

        const response = await openai.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Convert the following extracted PDF content to well-formatted Markdown. Clean up any formatting issues, organize content with proper headers, and maintain readability. Output language preference: ${outputLanguage}.`
            },
            {
              role: "user",
              content: content
            }
          ],
          ...(aiModel === "gpt-5-nano" ? {} : { temperature: 0.3 })
        });

        result = response.choices[0]?.message?.content || content;
      } else if (from === "docx" && to === "markdown") {
        // Convert DOCX to Markdown using AI
        const OpenAI = require("openai");
        const openai = new OpenAI({ 
          apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
        });

        const response = await openai.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system",
              content: `Convert the following DOCX content to well-formatted Markdown. Preserve structure, headings, and formatting. Output language preference: ${outputLanguage}.`
            },
            {
              role: "user",
              content: content
            }
          ],
          ...(aiModel === "gpt-5-nano" ? {} : { temperature: 0.3 })
        });

        result = response.choices[0]?.message?.content || content;
      } else {
        // Apply existing text conversion logic
        if (from === "markdown" && to === "html") {
          result = content
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
        } else if (to === "markdown") {
          result = content
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => {
              if (paragraph.length < 50) {
                return `## ${paragraph}`;
              }
              return paragraph;
            })
            .join('\n\n');
        }
      }

      res.json({ result, originalFilename: req.file.originalname });
    } catch (error) {
      console.error("File conversion error:", error);
      res.status(500).json({ message: "Failed to convert file" });
    }
  });

  // Content Conversion Tool
  app.post("/api/tools/convert", async (req, res) => {
    try {
      const { content, from, to, aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Content is required" });
      }

      let result = content;
      
      if (from === "markdown" && to === "html") {
        result = content
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
          .replace(/\*(.*)\*/gim, '<em>$1</em>')
          .replace(/\n/gim, '<br>');
      } else if (from === "markdown" && to === "docx") {
        result = `DOCX Content:\n\n${content}`;
      } else if (from === "text" && to === "markdown") {
        result = content
          .split('\n\n')
          .map(paragraph => paragraph.trim())
          .filter(paragraph => paragraph.length > 0)
          .map(paragraph => {
            if (paragraph.length < 50) {
              return `## ${paragraph}`;
            }
            return paragraph;
          })
          .join('\n\n');
      }

      res.json({ result });
    } catch (error) {
      console.error("Content conversion error:", error);
      res.status(500).json({ message: "Failed to convert content" });
    }
  });

  // Image Generation Tool
  app.post("/api/tools/generate-image", async (req, res) => {
    try {
      const { description, style = "educational", aiModel = "dall-e-3", outputLanguage = "auto" } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Description is required" });
      }

      let enhancedPrompt = description;
      
      switch (style) {
        case "educational":
          enhancedPrompt = `A simple, clear, educational illustration for children: ${description}. Clean, bright, cartoon-style suitable for educational materials. No text in the image.`;
          break;
        case "realistic":
          enhancedPrompt = `A realistic, high-quality image: ${description}. Professional photography style, clear and detailed.`;
          break;
        case "artistic":
          enhancedPrompt = `An artistic interpretation: ${description}. Creative, stylized artwork with vibrant colors and interesting composition.`;
          break;
        case "simple":
          enhancedPrompt = `A simple, minimalist illustration: ${description}. Clean lines, basic colors, easy to understand.`;
          break;
      }

      const OpenAI = require("openai");
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
      });

      // Use the selected AI model for image generation
      const imageModel = aiModel.includes("dall-e") ? aiModel : "dall-e-3";
      
      const imageResponse = await openai.images.generate({
        model: imageModel,
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      const imageUrl = imageResponse.data?.[0]?.url;
      
      if (!imageUrl) {
        throw new Error("No image URL returned from OpenAI");
      }

      res.json({ imageUrl });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // Translation Tool
  app.post("/api/tools/translate", async (req, res) => {
    try {
      const { text, from, to, aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const OpenAI = require("openai");
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
      });

      const languageMap = {
        chinese: "Chinese (Simplified)",
        vietnamese: "Vietnamese", 
        english: "English"
      };

      const fromLang = languageMap[from] || from;
      const toLang = languageMap[to] || to;

      // Override target language if outputLanguage is specified
      const finalToLang = outputLanguage !== "auto" ? languageMap[outputLanguage] || outputLanguage : toLang;

      const response = await openai.chat.completions.create({
        model: aiModel,
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in educational content. Translate the given text from ${fromLang} to ${finalToLang}. ${outputLanguage === "bilingual" ? "Provide both Chinese and Vietnamese translations." : "Provide only the translation without any explanations."}`
          },
          {
            role: "user",
            content: text
          }
        ],
        ...(aiModel === "gpt-5-nano" ? {} : { temperature: 0.3 })
      });

      const translation = response.choices[0]?.message?.content?.trim();
      
      if (!translation) {
        throw new Error("No translation returned");
      }

      res.json({ translation });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ message: "Failed to translate text" });
    }
  });

  // Vocabulary Extraction Tool
  app.post("/api/tools/extract-vocabulary", async (req, res) => {
    try {
      const { text, level = "preschool", aiModel = "gpt-5-nano", outputLanguage = "auto" } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const OpenAI = require("openai");
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
      });

      const languageInstructions = {
        chinese: "Return vocabulary in Chinese characters with pinyin",
        vietnamese: "Return vocabulary translated to Vietnamese",
        english: "Return vocabulary translated to English", 
        bilingual: "Return vocabulary with Chinese characters, pinyin, and Vietnamese translations",
        auto: "Return vocabulary in Chinese characters"
      };

      const instruction = languageInstructions[outputLanguage] || languageInstructions.auto;

      const response = await openai.chat.completions.create({
        model: aiModel,
        messages: [
          {
            role: "system",
            content: `You are an educational content analyzer. Extract key vocabulary words from the given text that are appropriate for ${level} level Chinese language learners. ${instruction}. Return only a JSON object with a 'vocabulary' array. Limit to 10-15 words maximum.`
          },
          {
            role: "user",
            content: `Extract vocabulary from this text:\n\n${text}`
          }
        ],
        response_format: { type: "json_object" },
        ...(aiModel === "gpt-5-nano" ? {} : { temperature: 0.3 })
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      const vocabulary = result.vocabulary || result.words || [];

      res.json({ vocabulary });
    } catch (error) {
      console.error("Vocabulary extraction error:", error);
      res.status(500).json({ message: "Failed to extract vocabulary" });
    }
  });

  // Text-to-Speech Tool
  app.post("/api/tools/text-to-speech", async (req, res) => {
    try {
      const { text, language = "zh-CN" } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }

      const OpenAI = require("openai");
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY 
      });

      const voiceMap = {
        "zh-CN": "nova",
        "vi-VN": "alloy",
        "en-US": "nova"
      };

      const voice = voiceMap[language] || "nova";

      const mp3Response = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: text,
      });

      const buffer = Buffer.from(await mp3Response.arrayBuffer());
      const base64Audio = buffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

      res.json({ audioUrl });
    } catch (error) {
      console.error("Text-to-speech error:", error);
      res.status(500).json({ message: "Failed to generate audio" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
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
      req.session.userId = user.id;
      
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          creditBalance: user.creditBalance
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      // Check if login is bypassed via environment variable
      if (process.env.SKIP_LOGIN === 'true' || process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
        // Return a default user for development
        const defaultUser = {
          id: "dev-user",
          username: "developer",
          creditBalance: "9999.00"
        };
        return res.json({ user: defaultUser });
      }

      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
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
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  // Prompt optimization endpoint
  app.post('/api/optimize-prompt', async (req, res) => {
    try {
      const { originalPrompt, purpose = 'general', aiModel = 'gpt-5-nano', outputLanguage = 'auto' } = req.body;
      
      if (!originalPrompt) {
        return res.status(400).json({ error: 'Original prompt is required' });
      }

      const languageInstructions = outputLanguage === 'auto' ? 
        'Respond in English.' :
        outputLanguage === 'chinese' ? 'Respond in Chinese (中文).' :
        outputLanguage === 'vietnamese' ? 'Respond in Vietnamese (Tiếng Việt).' :
        outputLanguage === 'english' ? 'Respond in English.' :
        'Respond in English.';

      const purposeGuidelines = {
        'general': 'for general AI assistance',
        'educational': 'for educational content creation and lesson planning',
        'creative': 'for creative writing and storytelling',
        'analysis': 'for text analysis and data interpretation',
        'translation': 'for language translation tasks',
        'coding': 'for code generation and programming assistance',
        'lesson-planning': 'for detailed lesson plan creation',
        'vocabulary': 'for vocabulary learning and language acquisition'
      } as Record<string, string>;

      const prompt = `You are an expert AI prompt engineer. Your task is to optimize the given prompt ${purposeGuidelines[purpose] || 'for general use'}.

${languageInstructions}

Original prompt:
"${originalPrompt}"

Purpose: ${purpose}

Provide a JSON response with:
- optimizedPrompt: string (the improved version of the prompt)
- improvement: object with:
  - improvements: array of strings (what was improved)
  - tips: array of strings (additional tips for better prompting)

Key optimization principles:
1. Be specific and clear
2. Include context and examples when helpful
3. Structure the prompt logically
4. Add relevant constraints or formatting requirements
5. Use appropriate tone and language for the purpose

Format as valid JSON only.`;

      const response = await generateWithOpenAI(prompt, aiModel);
      
      try {
        const optimization = JSON.parse(response);
        res.json(optimization);
      } catch (parseError) {
        res.json({
          optimizedPrompt: originalPrompt + "\n\nPlease provide a detailed and structured response.",
          improvement: {
            improvements: ["Added request for detailed response"],
            tips: ["Try being more specific about the desired output format", "Consider adding examples or context"]
          }
        });
      }

    } catch (error) {
      console.error('Prompt optimization error:', error);
      res.status(500).json({ error: 'Failed to optimize prompt' });
    }
  });

  // Speech to text endpoint
  app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const { language = 'auto' } = req.body;
      
      // For demo purposes, create a mock transcription based on the language
      const mockTranscriptions = {
        chinese: "你好，我是中文语音转文字测试。这个功能可以帮助老师快速记录课堂内容和学生反馈。",
        vietnamese: "Xin chào, đây là bài kiểm tra chuyển đổi giọng nói thành văn bản tiếng Việt. Tính năng này có thể giúp giáo viên ghi lại nội dung lớp học một cách nhanh chóng.",
        english: "Hello, this is a speech-to-text test in English. This feature can help teachers quickly record classroom content and student feedback.",
        auto: "This is a speech-to-text transcription. The audio has been processed and converted to text successfully."
      };

      const transcription = mockTranscriptions[language] || mockTranscriptions.auto;

      res.json({
        transcription,
        language: language,
        duration: 5.2, // Mock duration
        confidence: 0.95
      });
    } catch (error) {
      console.error('Speech to text error:', error);
      res.status(500).json({ error: 'Failed to process speech to text' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
