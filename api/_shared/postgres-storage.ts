import { eq, and, desc, asc, ilike, count } from 'drizzle-orm';
import { db, users, lessons, workflows, translationCache, projects, templates } from './database.js';
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
import type { InsertProject, Project as SchemaProject } from '../../shared/schema.js';
import { IStorage } from './storage.js';
import type { ProjectListQuery } from '../../shared/schema.js';

export class PostgresStorage implements IStorage {

  private transformProject(dbProject: any): SchemaProject {
    return {
      ...dbProject,
      settings: dbProject.settings as Record<string, any> | null,
      metadata: dbProject.metadata as Record<string, any> | null,
    };
  }

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

  // Project methods
  async createProject(insertProject: InsertProject): Promise<SchemaProject> {
    const result = await db.insert(projects).values(insertProject).returning();
    return this.transformProject(result[0]);
  }

  async getProject(id: string): Promise<SchemaProject | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0] ? this.transformProject(result[0]) : undefined;
  }

  async getProjects(query?: ProjectListQuery): Promise<SchemaProject[]> {
    let baseQuery = db.select().from(projects);

    // Apply filters
    const conditions = [];
    if (query?.language) {
      conditions.push(eq(projects.language, query.language));
    }
    if (query?.inputFormat) {
      conditions.push(eq(projects.inputFormat, query.inputFormat));
    }
    if (query?.isActive !== undefined) {
      conditions.push(eq(projects.isActive, query.isActive));
    }
    if (query?.isArchived !== undefined) {
      conditions.push(eq(projects.isArchived, query.isArchived));
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    // Apply sorting
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    const orderBy = sortOrder === 'desc' ? desc(projects[sortBy]) : asc(projects[sortBy]);
    baseQuery = baseQuery.orderBy(orderBy);

    // Apply pagination
    if (query?.offset) {
      baseQuery = baseQuery.offset(query.offset);
    }
    if (query?.limit) {
      baseQuery = baseQuery.limit(query.limit);
    }

    const results = await baseQuery;
    return results.map((project: any) => this.transformProject(project));
  }

  async getProjectsWithCounts(query?: ProjectListQuery): Promise<SchemaProject[]> {
    // Get projects with counts using a subquery
    const templateCounts = db
      .select({
        projectId: templates.projectId,
        count: count(templates.id)
      })
      .from(templates)
      .groupBy(templates.projectId);

    // TODO: Add project support to lessons table
    // const lessonCounts = db
    //   .select({
    //     projectId: lessons.projectId,
    //     count: count(lessons.id)
    //   })
    //   .from(lessons)
    //   .groupBy(lessons.projectId);

    const projectsWithCounts = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        language: projects.language,
        inputFormat: projects.inputFormat,
        settings: projects.settings,
        metadata: projects.metadata,
        userId: projects.userId,
        createdBy: projects.createdBy,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        status: projects.status,
        isActive: projects.isActive,
        isArchived: projects.isArchived,
        templateCount: templateCounts.count,
      })
      .from(projects)
      .leftJoin(templateCounts, eq(projects.id, templateCounts.projectId));

    // Apply filters, sorting, and pagination in memory for now
    let filteredProjects = projectsWithCounts.map((row: any) => this.transformProject({
      id: row.id,
      name: row.name,
      description: row.description,
      language: row.language,
      inputFormat: row.inputFormat,
      settings: row.settings,
      metadata: row.metadata,
      userId: row.userId,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      status: row.status,
      isActive: row.isActive,
      isArchived: row.isArchived,
      templateCount: Number(row.templateCount) || 0,
    }));

    // Apply filters
    if (query) {
      if (query.language) {
        filteredProjects = filteredProjects.filter((p: any) => p.language === query.language);
      }
      if (query.inputFormat) {
        filteredProjects = filteredProjects.filter((p: any) => p.inputFormat === query.inputFormat);
      }
      if (query.isActive !== undefined) {
        filteredProjects = filteredProjects.filter((p: any) => p.isActive === query.isActive);
      }
      if (query.isArchived !== undefined) {
        filteredProjects = filteredProjects.filter((p: any) => p.isArchived === query.isArchived);
      }
    }

    // Apply sorting
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    filteredProjects.sort((a: any, b: any) => {
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
      filteredProjects = filteredProjects.slice(query.offset);
    }
    if (query?.limit) {
      filteredProjects = filteredProjects.slice(0, query.limit);
    }

    return filteredProjects;
  }

  async updateProject(id: string, updates: Partial<SchemaProject>): Promise<SchemaProject | undefined> {
    const result = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result[0] ? this.transformProject(result[0]) : undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getProjectStats(id: string): Promise<{ templateCount: number; lessonCount: number }> {
    const templateResult = await db
      .select({ count: count(templates.id) })
      .from(templates)
      .where(eq(templates.projectId, id))
      .limit(1);

    return {
      templateCount: Number(templateResult[0]?.count) || 0,
      lessonCount: 0, // TODO: Add project support to lessons table
    };
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
