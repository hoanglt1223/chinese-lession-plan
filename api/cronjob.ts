import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { cronjobService } from './_shared/cronjob-service.js';
import { runMigrations } from './_shared/migrate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    const { action, jobId } = req.query;

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, action as string);

      case 'POST':
        return handlePost(req, res);

      case 'DELETE':
        return handleDelete(req, res, jobId as string);

      default:
        return res.status(405).json({
          error: 'Method Not Allowed',
          message: 'Only GET, POST, and DELETE methods are supported'
        });
    }

  } catch (error: any) {
    return handleError(res, error, 'Cronjob API');
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse, action: string) {
  switch (action) {
    case 'jobs':
      const jobs = await cronjobService.getAllJobs();
      return res.status(200).json(jobs);

    case 'statuses':
      const { jobId } = req.query;
      const statuses = await cronjobService.getJobStatuses(jobId as string);
      return res.status(200).json(statuses);

    case 'stats':
      const stats = await cronjobService.getJobStats();
      return res.status(200).json(stats);

    case 'migrate':
      try {
        console.log('🔄 Running database migrations via API...');
        await runMigrations();
        return res.status(200).json({
          message: 'Database migrations completed successfully',
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        console.error('❌ Migration failed:', error);
        return res.status(500).json({
          error: 'Migration Failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

    default:
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unknown action: ${action}`
      });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { action, jobId, name, schedule, options } = req.body;

  switch (action) {
    case 'create':
      if (!name || !schedule || !options) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Name, schedule, and options are required'
        });
      }

      const newJob = await cronjobService.createJob(name, schedule, options);
      return res.status(201).json(newJob);

    case 'run':
      if (!jobId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Job ID is required'
        });
      }

      await cronjobService.updateJobStatus(jobId, 'running');
      // TODO: Start actual job processing in background
      return res.status(200).json({ message: 'Job started successfully' });

    case 'pause':
      if (!jobId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Job ID is required'
        });
      }

      await cronjobService.updateJobStatus(jobId, 'paused');
      return res.status(200).json({ message: 'Job paused successfully' });

    default:
      return res.status(400).json({
        error: 'Bad Request',
        message: `Unknown action: ${action}`
      });
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse, jobId: string) {
  if (!jobId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Job ID is required'
    });
  }

  await cronjobService.deleteJob(jobId);
  return res.status(200).json({ message: 'Job deleted successfully' });
}