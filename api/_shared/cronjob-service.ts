import { db } from './database.js';
import { cronjobs, cronjobLessonStatuses, lessons } from './db-schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { CourseLesson } from './course-processor.js';

export interface CronJobOptions {
  skipExisting: boolean;
  skipFlashcards: boolean;
  maxConcurrent: number;
  retryFailures: boolean;
}

export interface CronJobData {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  schedule: string;
  lastRun: Date | null;
  nextRun: Date | null;
  totalLessons: number;
  processedLessons: number;
  failedLessons: number;
  options: CronJobOptions;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobStatusData {
  id: string;
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  unitNumber: string;
  lessonNumber: string;
  lessonTitle: string;
  progress: number;
  error?: string;
  startTime: Date;
  endTime?: Date;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class CronjobService {
  // Create a new cronjob
  async createJob(
    name: string,
    schedule: string,
    options: CronJobOptions,
    createdBy?: string
  ): Promise<CronJobData> {
    // Get course outline from database
    const courseLessons = await db.select().from(lessons).where(eq(lessons.status, 'outline'));

    if (courseLessons.length === 0) {
      throw new Error('No course outline found. Please upload a course outline first.');
    }

    // Extract CourseLesson data from aiAnalysis
    const lessons: CourseLesson[] = courseLessons.map(row => row.aiAnalysis as CourseLesson);

    const [newJob] = await db.insert(cronjobs).values({
      name,
      status: 'pending',
      schedule,
      totalLessons: lessons.length,
      processedLessons: 0,
      failedLessons: 0,
      options,
      createdBy,
    }).returning();

    return this.mapDbJobToData(newJob);
  }

  // Get all cronjobs
  async getAllJobs(): Promise<CronJobData[]> {
    const dbJobs = await db.select().from(cronjobs).orderBy(desc(cronjobs.createdAt));
    return dbJobs.map(job => this.mapDbJobToData(job));
  }

  // Get a specific cronjob
  async getJob(jobId: string): Promise<CronJobData | null> {
    const [dbJob] = await db.select().from(cronjobs).where(eq(cronjobs.id, jobId));
    return dbJob ? this.mapDbJobToData(dbJob) : null;
  }

  // Update job status
  async updateJobStatus(jobId: string, status: CronJobData['status']): Promise<void> {
    await db.update(cronjobs)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === 'completed' || status === 'failed' ? { lastRun: new Date() } : {})
      })
      .where(eq(cronjobs.id, jobId));
  }

  // Update job progress
  async updateJobProgress(
    jobId: string,
    processedLessons: number,
    failedLessons: number
  ): Promise<void> {
    await db.update(cronjobs)
      .set({
        processedLessons,
        failedLessons,
        updatedAt: new Date()
      })
      .where(eq(cronjobs.id, jobId));
  }

  // Delete a cronjob and all its statuses
  async deleteJob(jobId: string): Promise<void> {
    await db.delete(cronjobLessonStatuses).where(eq(cronjobLessonStatuses.jobId, jobId));
    await db.delete(cronjobs).where(eq(cronjobs.id, jobId));
  }

  // Get all lesson statuses for a job
  async getJobStatuses(jobId?: string): Promise<JobStatusData[]> {
    let dbStatuses;

    if (jobId) {
      dbStatuses = await db.select()
        .from(cronjobLessonStatuses)
        .where(eq(cronjobLessonStatuses.jobId, jobId))
        .orderBy(cronjobLessonStatuses.createdAt);
    } else {
      dbStatuses = await db.select()
        .from(cronjobLessonStatuses)
        .orderBy(cronjobLessonStatuses.createdAt);
    }

    return dbStatuses.map(status => this.mapDbStatusToData(status));
  }

  // Create or update lesson status
  async upsertLessonStatus(
    jobId: string,
    unitNumber: string | number,
    lessonNumber: string | number,
    lessonTitle: string,
    status: JobStatusData['status'],
    progress: number,
    error?: string
  ): Promise<void> {
    const existingStatus = await db.select()
      .from(cronjobLessonStatuses)
      .where(
        and(
          eq(cronjobLessonStatuses.jobId, jobId),
          eq(cronjobLessonStatuses.unitNumber, String(unitNumber)),
          eq(cronjobLessonStatuses.lessonNumber, String(lessonNumber))
        )
      )
      .limit(1);

    const statusData = {
      jobId,
      status,
      progress,
      error,
      updatedAt: new Date(),
      ...(status === 'processing' && existingStatus.length === 0 ? { startTime: new Date() } : {}),
      ...(status === 'completed' || status === 'failed' ? { endTime: new Date() } : {})
    };

    if (existingStatus.length > 0) {
      await db.update(cronjobLessonStatuses)
        .set(statusData)
        .where(eq(cronjobLessonStatuses.id, existingStatus[0].id));
    } else {
      await db.insert(cronjobLessonStatuses).values({
        jobId,
        unitNumber: String(unitNumber),
        lessonNumber: String(lessonNumber),
        lessonTitle,
        status,
        progress,
        error,
        startTime: status === 'processing' ? new Date() : new Date(),
        retryCount: 0,
      });
    }
  }

  // Get job statistics
  async getJobStats(jobId?: string): Promise<{
    totalJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    totalLessons: number;
    processedLessons: number;
    failedLessons: number;
  }> {
    let whereClause = jobId ? eq(cronjobs.id, jobId) : undefined;

    const allJobs = await db.select().from(cronjobs).where(whereClause);

    const stats = {
      totalJobs: allJobs.length,
      runningJobs: allJobs.filter(job => job.status === 'running').length,
      completedJobs: allJobs.filter(job => job.status === 'completed').length,
      failedJobs: allJobs.filter(job => job.status === 'failed').length,
      pendingJobs: allJobs.filter(job => job.status === 'pending').length,
      totalLessons: allJobs.reduce((sum, job) => sum + job.totalLessons, 0),
      processedLessons: allJobs.reduce((sum, job) => sum + job.processedLessons, 0),
      failedLessons: allJobs.reduce((sum, job) => sum + job.failedLessons, 0),
    };

    return stats;
  }

  // Helper methods to map DB data to our data structures
  private mapDbJobToData(dbJob: any): CronJobData {
    return {
      id: dbJob.id,
      name: dbJob.name,
      status: dbJob.status,
      schedule: dbJob.schedule,
      lastRun: dbJob.lastRun,
      nextRun: dbJob.nextRun,
      totalLessons: dbJob.totalLessons,
      processedLessons: dbJob.processedLessons,
      failedLessons: dbJob.failedLessons,
      options: dbJob.options as CronJobOptions,
      createdBy: dbJob.createdBy,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt,
    };
  }

  private mapDbStatusToData(dbStatus: any): JobStatusData {
    return {
      id: dbStatus.id,
      jobId: dbStatus.jobId,
      status: dbStatus.status,
      unitNumber: dbStatus.unitNumber,
      lessonNumber: dbStatus.lessonNumber,
      lessonTitle: dbStatus.lessonTitle,
      progress: dbStatus.progress,
      error: dbStatus.error,
      startTime: dbStatus.startTime,
      endTime: dbStatus.endTime,
      retryCount: dbStatus.retryCount,
      createdAt: dbStatus.createdAt,
      updatedAt: dbStatus.updatedAt,
    };
  }
}

// Export singleton instance
export const cronjobService = new CronjobService();