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
    const courseLessonsRows = await db.select().from(lessons).where(eq(lessons.status, 'outline'));

    if (courseLessonsRows.length === 0) {
      throw new Error('No course outline found. Please upload a course outline first.');
    }

    // Extract CourseLesson data from aiAnalysis
    const courseLessons: CourseLesson[] = courseLessonsRows.map((row: any) => row.aiAnalysis as CourseLesson);

    // Calculate next run time based on cron schedule
    const nextRun = this.calculateNextRun(schedule);

    const [newJob] = await db.insert(cronjobs).values({
      name,
      status: 'pending',
      schedule,
      nextRun,
      totalLessons: courseLessons.length,
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
    return dbJobs.map((job: any) => this.mapDbJobToData(job));
  }

  // Get a specific cronjob
  async getJob(jobId: string): Promise<CronJobData | null> {
    const [dbJob] = await db.select().from(cronjobs).where(eq(cronjobs.id, jobId));
    return dbJob ? this.mapDbJobToData(dbJob) : null;
  }

  // Update job status
  async updateJobStatus(jobId: string, status: CronJobData['status']): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    const updateData: any = {
      status,
      updatedAt: new Date(),
      ...(status === 'completed' || status === 'failed' ? { lastRun: new Date() } : {})
    };

    // Calculate next run time for completed jobs
    if (status === 'completed' && job.schedule) {
      updateData.nextRun = this.calculateNextRun(job.schedule);
    }

    await db.update(cronjobs)
      .set(updateData)
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

    return dbStatuses.map((status: any) => this.mapDbStatusToData(status));
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
      runningJobs: allJobs.filter((job: any) => job.status === 'running').length,
      completedJobs: allJobs.filter((job: any) => job.status === 'completed').length,
      failedJobs: allJobs.filter((job: any) => job.status === 'failed').length,
      pendingJobs: allJobs.filter((job: any) => job.status === 'pending').length,
      totalLessons: allJobs.reduce((sum: any, job: any) => sum + job.totalLessons, 0),
      processedLessons: allJobs.reduce((sum: any, job: any) => sum + job.processedLessons, 0),
      failedLessons: allJobs.reduce((sum: any, job: any) => sum + job.failedLessons, 0),
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

  // Calculate next run time based on cron expression
  private calculateNextRun(cronExpression: string): Date {
    // Simple cron parser implementation
    // In production, consider using a proper cron library like 'node-cron'
    const now = new Date();
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ').map(part => {
      if (part === '*') return '*';
      return parseInt(part, 10);
    });

    const nextRun = new Date(now);

    // Handle minute
    if (minute !== '*') {
      nextRun.setMinutes(minute);
      if (nextRun <= now) {
        nextRun.setHours(nextRun.getHours() + 1);
      }
    }

    // Handle hour
    if (hour !== '*') {
      nextRun.setHours(hour);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }

    // Handle day of month
    if (dayOfMonth !== '*') {
      nextRun.setDate(dayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }

    // Handle month
    if (month !== '*') {
      nextRun.setMonth(month - 1); // Months are 0-indexed
      if (nextRun <= now) {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      }
    }

    // Handle day of week (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== '*') {
      const currentDay = nextRun.getDay();
      const targetDay = dayOfWeek;
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0 && nextRun <= now) {
        daysToAdd = 7;
      }
      nextRun.setDate(nextRun.getDate() + daysToAdd);
    }

    return nextRun;
  }
}

// Export singleton instance
export const cronjobService = new CronjobService();