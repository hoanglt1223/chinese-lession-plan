import { type User, type InsertUser, type Lesson, type InsertLesson, type Workflow, type InsertWorkflow } from "@shared/schema";
import { randomUUID } from "crypto";
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  authenticateUser(username: string, password: string): Promise<User | null>;
  updateUserLogin(userId: string): Promise<void>;
  
  // Lesson methods
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  getLesson(id: string): Promise<Lesson | undefined>;
  getAllLessons(): Promise<Lesson[]>;
  updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined>;
  
  // Workflow methods
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  getWorkflowByLessonId(lessonId: string): Promise<Workflow | undefined>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private lessons: Map<string, Lesson>;
  private workflows: Map<string, Workflow>;

  constructor() {
    this.users = new Map();
    this.lessons = new Map();
    this.workflows = new Map();
    
    // Initialize with required users
    this.initializeUsers();
  }

  private initializeUsers() {
    const user1: User = {
      id: "user1",
      username: "thuthao",
      password: "310799",
      creditBalance: "1000.00",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const user2: User = {
      id: "user2", 
      username: "thanhhoang",
      password: "090800",
      creditBalance: "1000.00",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      creditBalance: "1000.00",
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password && user.isActive) {
      return user;
    }
    return null;
  }

  async updateUserLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  // Lesson methods
  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const id = randomUUID();
    const now = new Date();
    const lesson: Lesson = { 
      title: insertLesson.title,
      level: insertLesson.level,
      ageGroup: insertLesson.ageGroup,
      status: insertLesson.status || "draft",
      originalFiles: insertLesson.originalFiles || null,
      aiAnalysis: insertLesson.aiAnalysis || null,
      lessonPlan: insertLesson.lessonPlan || null,
      flashcards: insertLesson.flashcards || null,
      summary: insertLesson.summary || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.lessons.set(id, lesson);
    return lesson;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async getAllLessons(): Promise<Lesson[]> {
    return Array.from(this.lessons.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    const lesson = this.lessons.get(id);
    if (!lesson) return undefined;
    
    const updated = { ...lesson, ...updates, updatedAt: new Date() };
    this.lessons.set(id, updated);
    return updated;
  }

  // Workflow methods
  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const id = randomUUID();
    const now = new Date();
    const workflow: Workflow = { 
      lessonId: insertWorkflow.lessonId || null,
      currentStep: insertWorkflow.currentStep || 0,
      stepData: insertWorkflow.stepData || null,
      completedSteps: insertWorkflow.completedSteps || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return this.workflows.get(id);
  }

  async getWorkflowByLessonId(lessonId: string): Promise<Workflow | undefined> {
    return Array.from(this.workflows.values()).find(
      (workflow) => workflow.lessonId === lessonId
    );
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflow = this.workflows.get(id);
    if (!workflow) return undefined;
    
    const updated = { ...workflow, ...updates, updatedAt: new Date() };
    this.workflows.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();

// Translation Cache Service for server environment
interface CacheEntry {
  word: string;
  translation: string;
  timestamp: number;
  source: 'deepl' | 'openai';
}

interface TranslationCache {
  [key: string]: CacheEntry;
}

export class TranslationCacheService {
  private cacheFile: string;
  private cacheDir: string;
  private cache: TranslationCache = {};
  private maxAge: number = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor() {
    this.cacheDir = join(process.cwd(), 'data');
    this.cacheFile = join(this.cacheDir, 'translation-cache.json');
    this.ensureCacheDir();
    this.loadCache();
  }

  private async ensureCacheDir() {
    try {
      if (!existsSync(this.cacheDir)) {
        await mkdir(this.cacheDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }

  private async loadCache() {
    try {
      if (existsSync(this.cacheFile)) {
        const data = await readFile(this.cacheFile, 'utf-8');
        this.cache = JSON.parse(data);
        console.log(`📚 Loaded translation cache with ${Object.keys(this.cache).length} entries`);
        
        // Clean expired entries
        this.cleanExpiredEntries();
      } else {
        console.log('📚 No existing translation cache found, starting fresh');
      }
    } catch (error) {
      console.error('Failed to load translation cache:', error);
      this.cache = {};
    }
  }

  private async saveCache() {
    try {
      await this.ensureCacheDir();
      await writeFile(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf-8');
      console.log(`💾 Saved translation cache with ${Object.keys(this.cache).length} entries`);
    } catch (error) {
      console.error('Failed to save translation cache:', error);
    }
  }

  private cleanExpiredEntries() {
    const now = Date.now();
    const initialCount = Object.keys(this.cache).length;
    
    for (const [key, entry] of Object.entries(this.cache)) {
      if (now - entry.timestamp > this.maxAge) {
        delete this.cache[key];
      }
    }
    
    const finalCount = Object.keys(this.cache).length;
    if (initialCount !== finalCount) {
      console.log(`🧹 Cleaned ${initialCount - finalCount} expired cache entries`);
      this.saveCache(); // Save after cleanup
    }
  }

  private generateCacheKey(word: string, sourceLang: string = 'zh', targetLang: string = 'vi'): string {
    const keyString = `${word.toLowerCase().trim()}_${sourceLang}_${targetLang}`;
    return require('crypto').createHash('md5').update(keyString).digest('hex');
  }

  async get(word: string, sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<string | null> {
    const key = this.generateCacheKey(word, sourceLang, targetLang);
    const entry = this.cache[key];
    
    if (!entry) {
      return null;
    }
    
    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      delete this.cache[key];
      return null;
    }
    
    console.log(`🎯 Cache hit for "${word}" → "${entry.translation}" (source: ${entry.source})`);
    return entry.translation;
  }

  async set(word: string, translation: string, source: 'deepl' | 'openai' = 'deepl', sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<void> {
    const key = this.generateCacheKey(word, sourceLang, targetLang);
    
    this.cache[key] = {
      word: word.trim(),
      translation: translation.trim(),
      timestamp: Date.now(),
      source
    };
    
    console.log(`💾 Cached translation: "${word}" → "${translation}" (source: ${source})`);
    
    // Save cache periodically (every 10 new entries or immediately)
    const cacheSize = Object.keys(this.cache).length;
    if (cacheSize % 10 === 0) {
      await this.saveCache();
    }
  }

  async getMultiple(words: string[], sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<{ cached: Record<string, string>, missing: string[] }> {
    const cached: Record<string, string> = {};
    const missing: string[] = [];
    
    for (const word of words) {
      const translation = await this.get(word, sourceLang, targetLang);
      if (translation) {
        cached[word] = translation;
      } else {
        missing.push(word);
      }
    }
    
    console.log(`📊 Cache stats - Found: ${Object.keys(cached).length}, Missing: ${missing.length}`);
    return { cached, missing };
  }

  async setMultiple(translations: Record<string, string>, source: 'deepl' | 'openai' = 'deepl', sourceLang: string = 'zh', targetLang: string = 'vi'): Promise<void> {
    const promises = Object.entries(translations).map(([word, translation]) =>
      this.set(word, translation, source, sourceLang, targetLang)
    );
    
    await Promise.all(promises);
    await this.saveCache(); // Save after bulk operations
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    deeplEntries: number;
    openaiEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  }> {
    const entries = Object.values(this.cache);
    const deeplCount = entries.filter(e => e.source === 'deepl').length;
    const openaiCount = entries.filter(e => e.source === 'openai').length;
    
    const timestamps = entries.map(e => e.timestamp);
    const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;
    
    return {
      totalEntries: entries.length,
      deeplEntries: deeplCount,
      openaiEntries: openaiCount,
      oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null,
      newestEntry: newestTimestamp ? new Date(newestTimestamp) : null
    };
  }
}
