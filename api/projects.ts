import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_shared/storage.js';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { getSession } from './_shared/session.js';
import { handleError } from './_shared/error-handler.js';
import { initializeDatabase } from './_shared/init-db.js';
import {
  insertProjectSchema,
  updateProjectSchema,
  type CreateProjectRequest,
  type ProjectResponse,
  type ProjectListQuery
} from '../../shared/schema.js';
import { z } from 'zod';

const querySchema = z.object({
  language: z.string().optional(),
  inputFormat: z.enum(['excel', 'pdf', 'text', 'markdown']).optional(),
  isActive: z.string().transform(val => val === 'true').optional(),
  isArchived: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Rate limiting (in production, use Redis for distributed rate limiting)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms

function checkRateLimit(req: VercelRequest): boolean {
  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const now = Date.now();
  const key = Array.isArray(clientIp) ? clientIp[0] : clientIp;

  const current = rateLimitMap.get(key);
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (current.count >= RATE_LIMIT) {
    return false;
  }

  current.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Initialize database on first request
  await initializeDatabase();

  // Rate limiting
  if (!checkRateLimit(req)) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }

  // Authentication
  const session = getSession(req);
  const userId = session.userId;

  // Check if login is bypassed for development
  if (userId && (process.env.VITE_SKIP_LOGIN === 'true' || process.env.NODE_ENV === 'development')) {
    // Continue with authenticated session
  } else if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  try {
    const { method } = req;
    const { id } = req.query;

    // Route based on HTTP method and presence of ID
    if (id && typeof id === 'string') {
      // Single project operations
      if (method === 'GET') {
        return handleGetProject(req, res, id);
      } else if (method === 'PUT') {
        return handleUpdateProject(req, res, id);
      } else if (method === 'DELETE') {
        return handleDeleteProject(req, res, id);
      }
    } else if (!id) {
      // Collection operations
      if (method === 'POST') {
        return handleCreateProject(req, res);
      } else if (method === 'GET') {
        return handleListProjects(req, res);
      }
    }

    // Method not allowed
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: `Method ${method} not supported for this endpoint`
    });

  } catch (error: any) {
    return handleError(res, error, 'Projects API');
  }
}

async function handleCreateProject(req: VercelRequest, res: VercelResponse) {
  try {
    // Validate request body
    const body = req.body as CreateProjectRequest;
    const validationResult = insertProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request body',
        details: validationResult.error.errors
      });
    }

    const projectData = validationResult.data;

    // Add created by user if available
    const session = getSession(req);
    if (session.userId) {
      projectData.createdBy = session.userId;
    }

    // Create project
    const project = await storage.createProject(projectData);

    // Get project stats for response
    const stats = await storage.getProjectStats(project.id);

    const response: ProjectResponse = {
      id: project.id,
      name: project.name,
      description: project.description,
      language: project.language,
      inputFormat: project.inputFormat,
      templateCount: stats.templateCount,
      lessonCount: stats.lessonCount,
      isActive: project.isActive,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      settings: project.settings,
      createdBy: project.createdBy,
    };

    return res.status(201).json(response);
  } catch (error: any) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        error: 'Conflict',
        message: 'A project with this name already exists'
      });
    }
    throw error;
  }
}

async function handleListProjects(req: VercelRequest, res: VercelResponse) {
  try {
    // Parse and validate query parameters
    const queryParams = querySchema.safeParse(req.query);

    if (!queryParams.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: queryParams.error.errors
      });
    }

    const query: ProjectListQuery = queryParams.data;

    // Get projects with counts
    const projects = await storage.getProjectsWithCounts(query);

    // Transform to response format
    const response: ProjectResponse[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      language: project.language,
      inputFormat: project.inputFormat,
      templateCount: project.templateCount || 0,
      lessonCount: project.lessonCount || 0,
      isActive: project.isActive,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      settings: project.settings,
      createdBy: project.createdBy,
    }));

    return res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}

async function handleGetProject(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid project ID format'
      });
    }

    // Get project
    const project = await storage.getProject(id);

    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    // Get project stats
    const stats = await storage.getProjectStats(id);

    const response: ProjectResponse = {
      id: project.id,
      name: project.name,
      description: project.description,
      language: project.language,
      inputFormat: project.inputFormat,
      templateCount: stats.templateCount,
      lessonCount: stats.lessonCount,
      isActive: project.isActive,
      isArchived: project.isArchived,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      settings: project.settings,
      createdBy: project.createdBy,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    throw error;
  }
}

async function handleUpdateProject(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid project ID format'
      });
    }

    // Validate request body
    const validationResult = updateProjectSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request body',
        details: validationResult.error.errors
      });
    }

    // Check if project exists
    const existingProject = await storage.getProject(id);
    if (!existingProject) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    // Update project
    const updatedProject = await storage.updateProject(id, validationResult.data);

    if (!updatedProject) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update project'
      });
    }

    // Get project stats
    const stats = await storage.getProjectStats(id);

    const response: ProjectResponse = {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      language: updatedProject.language,
      inputFormat: updatedProject.inputFormat,
      templateCount: stats.templateCount,
      lessonCount: stats.lessonCount,
      isActive: updatedProject.isActive,
      isArchived: updatedProject.isArchived,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
      settings: updatedProject.settings,
      createdBy: updatedProject.createdBy,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({
        error: 'Conflict',
        message: 'A project with this name already exists'
      });
    }
    throw error;
  }
}

async function handleDeleteProject(req: VercelRequest, res: VercelResponse, id: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid project ID format'
      });
    }

    // Check if project exists
    const existingProject = await storage.getProject(id);
    if (!existingProject) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    // Delete project
    const deleted = await storage.deleteProject(id);

    if (!deleted) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete project'
      });
    }

    return res.status(204).send({}); // No content
  } catch (error: any) {
    if (error.code === '23503') { // PostgreSQL foreign key violation
      return res.status(409).json({
        error: 'Conflict',
        message: 'Cannot delete project with existing templates or lessons'
      });
    }
    throw error;
  }
}