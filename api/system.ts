import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    const { action } = req.query;

    // Route based on action parameter
    switch (action) {
      case 'file-manager':
      case 'upload':
      case 'download':
      case 'list-files':
        return handleFileManager(req, res);

      case 'cronjob':
        return handleCronjob(req, res);

      case 'cron-schedule':
        return handleCronSchedule(req, res);

      case 'text-to-image':
        return handleTextToImage(req, res);

      default:
        return res.status(400).json({
          error: 'Bad Request',
          message: `Unknown action: ${action}`
        });
    }

  } catch (error: any) {
    return handleError(res, error, 'System API');
  }
}

// Placeholder implementations for each action type
async function handleFileManager(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'File manager functionality moved to main API' });
}

async function handleCronjob(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Cronjob functionality moved to main API' });
}

async function handleCronSchedule(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Cron schedule functionality moved to main API' });
}

async function handleTextToImage(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Text to image functionality moved to main API' });
}