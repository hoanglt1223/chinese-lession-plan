import { type User, type InsertUser, type Lesson, type InsertLesson, type Project, type InsertProject, type ProjectListQuery } from "../../shared/schema.js";
import { postgresStorage, PostgresStorage } from "./postgres-storage.js";
import { randomUUID } from "crypto";

// Fallback in-memory storage for development/testing
let memoryStorage = {
  users: new Map<string, User>(),
  lessons: new Map<string, Lesson>(),
  projects: new Map<string, Project>(),
  initialized: false
};

// Debug: Log memory state
const logMemoryState = () => {
  console.log('Memory storage state:', {
    usersCount: memoryStorage.users.size,
    lessonsCount: memoryStorage.lessons.size,
    projectsCount: memoryStorage.projects.size,
    initialized: memoryStorage.initialized,
    lessonIds: Array.from(memoryStorage.lessons.keys()),
    projectIds: Array.from(memoryStorage.projects.keys())
  });
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

  // Project methods
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjects(query?: ProjectListQuery): Promise<Project[]>;
  getProjectsWithCounts(query?: ProjectListQuery): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  getProjectStats(id: string): Promise<{ templateCount: number; lessonCount: number }>;
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
    console.log('Created lesson with ID:', id);
    logMemoryState();
    return lesson;
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    logMemoryState();
    console.log('Getting lesson with ID:', id);
    const lesson = memoryStorage.lessons.get(id);
    console.log('Found lesson:', lesson ? 'YES' : 'NO');
    return lesson;
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

  // Project methods
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = {
      id,
      name: insertProject.name,
      description: insertProject.description || null,
      language: insertProject.language || 'zh',
      inputFormat: insertProject.inputFormat || 'excel',
      settings: insertProject.settings || null,
      createdBy: insertProject.createdBy || null,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      isArchived: false,
    };
    memoryStorage.projects.set(id, project);
    console.log('Created project with ID:', id);
    logMemoryState();
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    logMemoryState();
    console.log('Getting project with ID:', id);
    return memoryStorage.projects.get(id);
  }

  async getProjects(query?: ProjectListQuery): Promise<Project[]> {
    let projects = Array.from(memoryStorage.projects.values());

    // Apply filters
    if (query) {
      if (query.language) {
        projects = projects.filter(p => p.language === query.language);
      }
      if (query.inputFormat) {
        projects = projects.filter(p => p.inputFormat === query.inputFormat);
      }
      if (query.isActive !== undefined) {
        projects = projects.filter(p => p.isActive === query.isActive);
      }
      if (query.isArchived !== undefined) {
        projects = projects.filter(p => p.isArchived === query.isArchived);
      }
    }

    // Apply sorting
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    projects.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    if (query?.offset) {
      projects = projects.slice(query.offset);
    }
    if (query?.limit) {
      projects = projects.slice(0, query.limit);
    }

    return projects;
  }

  async getProjectsWithCounts(query?: ProjectListQuery): Promise<Project[]> {
    const projects = await this.getProjects(query);

    // Add computed counts for in-memory storage
    return projects.map(project => ({
      ...project,
      templateCount: 0, // In memory storage doesn't track templates
      lessonCount: 0,   // Could count lessons that belong to this project if needed
    }));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = memoryStorage.projects.get(id);
    if (!project) return undefined;

    const updated = { ...project, ...updates, updatedAt: new Date() };
    memoryStorage.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = memoryStorage.projects.delete(id);
    if (deleted) {
      logMemoryState();
    }
    return deleted;
  }

  async getProjectStats(id: string): Promise<{ templateCount: number; lessonCount: number }> {
    // In memory storage, return default values
    return { templateCount: 0, lessonCount: 0 };
  }


}

// Use PostgreSQL storage if DATABASE_URL is configured, otherwise fallback to in-memory
function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL storage');
    return postgresStorage;
  } else {
    console.log('Using in-memory storage (fallback)');
    return new ServerlessStorage();
  }
}

export const storage = createStorage();
