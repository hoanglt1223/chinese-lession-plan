import { eq, and } from 'drizzle-orm';
import { db, users, lessons, workflows, translationCache } from './database.js';
import type { 
  User, 
  InsertUser, 
  Lesson, 
  InsertLesson, 
  Workflow, 
  InsertWorkflow,
  TranslationCache,
  InsertTranslationCache 
} from './database.js';
import { IStorage } from './storage.js';

export class PostgresStorage implements IStorage {
  
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      creditBalance: '1000.00',
      isActive: true,
    }).returning();
    return result[0];
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password && user.isActive) {
      return user;
    }
    return null;
  }

  async updateUserLogin(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Lesson methods
  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const result = await db.insert(lessons).values(insertLesson).returning();
    return result[0];
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    return result[0];
  }

  async getAllLessons(): Promise<Lesson[]> {
    return await db.select().from(lessons).orderBy(lessons.createdAt);
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    const result = await db.update(lessons)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .returning();
    return result[0];
  }

  // Workflow methods
  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const result = await db.insert(workflows).values(insertWorkflow).returning();
    return result[0];
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    const result = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
    return result[0];
  }

  async getWorkflowByLessonId(lessonId: string): Promise<Workflow | undefined> {
    const result = await db.select().from(workflows).where(eq(workflows.lessonId, lessonId)).limit(1);
    return result[0];
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | undefined> {
    const result = await db.update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return result[0];
  }

  // Translation cache methods
  async getCachedTranslation(sourceText: string, sourceLang: string, targetLang: string): Promise<string | null> {
    const result = await db.select()
      .from(translationCache)
      .where(
        and(
          eq(translationCache.sourceText, sourceText),
          eq(translationCache.sourceLang, sourceLang),
          eq(translationCache.targetLang, targetLang)
        )
      )
      .limit(1);
    
    return result[0]?.translatedText || null;
  }

  async setCachedTranslation(
    sourceText: string,
    sourceLang: string,
    targetLang: string,
    translatedText: string,
    provider: string
  ): Promise<void> {
    await db.insert(translationCache).values({
      sourceText,
      sourceLang,
      targetLang,
      translatedText,
      provider,
    }).onConflictDoNothing();
  }

  // Initialize with default users (for development)
  async initializeDefaultUsers(): Promise<void> {
    try {
      // Check if users already exist
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length > 0) {
        return; // Users already exist
      }

      // Create default users
      await db.insert(users).values([
        {
          username: 'thuthao',
          password: '310799',
          creditBalance: '1000.00',
          isActive: true,
        },
        {
          username: 'thanhhoang',
          password: '090800',
          creditBalance: '1000.00',
          isActive: true,
        }
      ]);

      console.log('Default users created successfully');
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  }
}

// Create and export the storage instance
export const postgresStorage = new PostgresStorage();
