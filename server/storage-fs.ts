import { type User, type InsertUser, type Lesson, type InsertLesson, type Workflow, type InsertWorkflow } from "@shared/schema";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";

// Storage paths
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const USERS_FILE = join(DATA_DIR, 'users.json');
const LESSONS_FILE = join(DATA_DIR, 'lessons.json');
const WORKFLOWS_FILE = join(DATA_DIR, 'workflows.json');

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

export class FileSystemStorage implements IStorage {
  private initialized = false;

  constructor() {
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await this.initializeFiles();
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize data directory:", error);
    }
  }

  private async initializeFiles() {
    // Initialize users file with default users
    try {
      await fs.access(USERS_FILE);
    } catch {
      const defaultUsers: User[] = [
        {
          id: "user1",
          username: "thuthao",
          password: "310799",
          creditBalance: "1000.00",
          isActive: true,
          lastLogin: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "user2", 
          username: "thanhhoang",
          password: "090800",
          creditBalance: "1000.00",
          isActive: true,
          lastLogin: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ];
      await this.writeJsonFile(USERS_FILE, defaultUsers);
    }

    // Initialize lessons file
    try {
      await fs.access(LESSONS_FILE);
    } catch {
      await this.writeJsonFile(LESSONS_FILE, []);
    }

    // Initialize workflows file
    try {
      await fs.access(WORKFLOWS_FILE);
    } catch {
      await this.writeJsonFile(WORKFLOWS_FILE, []);
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T[]> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
      return [];
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T[]): Promise<void> {
    try {
      await this.ensureDataDirectory();
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error);
      throw error;
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const users = await this.readJsonFile<User>(USERS_FILE);
    return users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.readJsonFile<User>(USERS_FILE);
    return users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = await this.readJsonFile<User>(USERS_FILE);
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
    users.push(user);
    await this.writeJsonFile(USERS_FILE, users);
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
    const users = await this.readJsonFile<User>(USERS_FILE);
    const userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
      users[userIndex].lastLogin = new Date();
      users[userIndex].updatedAt = new Date();
      await this.writeJsonFile(USERS_FILE, users);
    }
  }

  // Lesson methods
  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const lessons = await this.readJsonFile<Lesson>(LESSONS_FILE);
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
    lessons.push(lesson);
    await this.writeJsonFile(LESSONS_FILE, lessons);
    return lesson;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const lessons = await this.readJsonFile<Lesson>(LESSONS_FILE);
    return lessons.find(lesson => lesson.id === id);
  }

  async getAllLessons(): Promise<Lesson[]> {
    const lessons = await this.readJsonFile<Lesson>(LESSONS_FILE);
    return lessons.sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    const lessons = await this.readJsonFile<Lesson>(LESSONS_FILE);
    const lessonIndex = lessons.findIndex(lesson => lesson.id === id);
    if (lessonIndex === -1) return undefined;
    
    const updated = { ...lessons[lessonIndex], ...updates, updatedAt: new Date() };
    lessons[lessonIndex] = updated;
    await this.writeJsonFile(LESSONS_FILE, lessons);
    return updated;
  }

  // Workflow methods
  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const workflows = await this.readJsonFile<Workflow>(WORKFLOWS_FILE);
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
    workflows.push(workflow);
    await this.writeJsonFile(WORKFLOWS_FILE, workflows);
    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    const workflows = await this.readJsonFile<Workflow>(WORKFLOWS_FILE);
    return workflows.find(workflow => workflow.id === id);
  }

  async getWorkflowByLessonId(lessonId: string): Promise<Workflow | undefined> {
    const workflows = await this.readJsonFile<Workflow>(WORKFLOWS_FILE);
    return workflows.find(workflow => workflow.lessonId === lessonId);
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const workflows = await this.readJsonFile<Workflow>(WORKFLOWS_FILE);
    const workflowIndex = workflows.findIndex(workflow => workflow.id === id);
    if (workflowIndex === -1) return undefined;
    
    const updated = { ...workflows[workflowIndex], ...updates, updatedAt: new Date() };
    workflows[workflowIndex] = updated;
    await this.writeJsonFile(WORKFLOWS_FILE, workflows);
    return updated;
  }
}

export const storage = new FileSystemStorage();
