import { type User, type InsertUser, type Lesson, type InsertLesson } from "./schema.js";
import { randomUUID } from "crypto";

// In-memory storage for serverless environments
let memoryStorage = {
  users: new Map<string, User>(),
  lessons: new Map<string, Lesson>(),
  initialized: false
};

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
}

export class ServerlessStorage implements IStorage {
  constructor() {
    this.initializeStorage();
  }

  private initializeStorage() {
    if (memoryStorage.initialized) return;
    
    // Initialize with default users
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
    
    memoryStorage.users.set(user1.id, user1);
    memoryStorage.users.set(user2.id, user2);
    memoryStorage.initialized = true;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return memoryStorage.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(memoryStorage.users.values()).find(
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
    memoryStorage.users.set(id, user);
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
    const user = memoryStorage.users.get(userId);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      memoryStorage.users.set(userId, user);
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
      lessonPlans: insertLesson.lessonPlans || null,
      flashcards: insertLesson.flashcards || null,
      summaries: insertLesson.summaries || null,
      id,
      createdAt: now,
      updatedAt: now
    };
    memoryStorage.lessons.set(id, lesson);
    return lesson;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    return memoryStorage.lessons.get(id);
  }

  async getAllLessons(): Promise<Lesson[]> {
    return Array.from(memoryStorage.lessons.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    const lesson = memoryStorage.lessons.get(id);
    if (!lesson) return undefined;
    
    const updated = { ...lesson, ...updates, updatedAt: new Date() };
    memoryStorage.lessons.set(id, updated);
    return updated;
  }

  
}

export const storage = new ServerlessStorage();
