import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { getSession } from './_shared/session.js';
import { runMigrations } from './_shared/migrate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    const { action } = req.query;

    // Route based on action parameter
    switch (action) {
      case 'projects':
      case 'project':
        return handleProjects(req, res);

      case 'analyze-template':
      case 'compare-templates':
      case 'validate-template':
        return handleTemplateAnalysis(req, res);

      case 'upload-template':
      case 'list-templates':
      case 'get-template':
      case 'update-template':
      case 'delete-template':
        return handleTemplateManagement(req, res);

      case 'seed-prompts':
      case 'get-prompts':
        return handleSeedPrompts(req, res);

      case 'template-crud':
        return handleTemplates(req, res);

      case 'migrate':
        return handleMigration(req, res);

      default:
        return res.status(400).json({
          error: 'Bad Request',
          message: `Unknown action: ${action}`
        });
    }

  } catch (error: any) {
    return handleError(res, error, 'Consolidated API');
  }
}

// Placeholder implementations for each action type
async function handleProjects(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Projects functionality moved to main API' });
}

async function handleTemplateAnalysis(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Template analysis functionality moved to main API' });
}

async function handleTemplateManagement(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Template management functionality moved to main API' });
}

async function handleSeedPrompts(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Seed prompts functionality moved to main API' });
}

async function handleTemplates(req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: 'Not Implemented', message: 'Templates CRUD functionality moved to main API' });
}

async function handleMigration(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('🔄 Running database migrations via consolidated API...');
    await runMigrations();
    return res.status(200).json({
      message: 'Database migrations completed successfully',
      timestamp: new Date().toISOString(),
      migratedTables: ['cronjobs', 'cronjob_lesson_statuses']
    });
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return res.status(500).json({
      error: 'Migration Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}