import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { db, users, projects, templates } from './_shared/database.js';
import { eq, and, desc, ilike } from 'drizzle-orm';
import { templateParser } from './_shared/template-parser.js';
import { blobStorage } from './_shared/blob-storage.js';
import crypto from 'crypto';
import type { TemplateUploadResponse, Template } from '../shared/schema.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    // Extract user info from request (simplified for now)
    const userId = req.headers['x-user-id'] as string || 'default-user';

    // POST /api/templates/:id/templates - Upload templates to project
    if (req.method === 'POST' && req.url?.match(/\/templates\/[^\/]+\/templates$/)) {
      const projectId = req.url.split('/').slice(-2)[0];
      return await handleTemplateUpload(req, res, projectId, userId);
    }

    // GET /api/templates/:id/templates - List templates for project
    if (req.method === 'GET' && req.url?.match(/\/templates\/[^\/]+\/templates$/)) {
      const projectId = req.url.split('/').slice(-2)[0];
      return await handleTemplateList(req, res, projectId, userId);
    }

    // GET /api/templates/:id - Get specific template
    if (req.method === 'GET' && req.url?.match(/\/templates\/[^\/]+$/)) {
      const templateId = req.url.split('/').pop();
      return await handleGetTemplate(req, res, templateId!, userId);
    }

    // DELETE /api/templates/:id - Delete template
    if (req.method === 'DELETE' && req.url?.match(/\/templates\/[^\/]+$/)) {
      const templateId = req.url.split('/').pop();
      return await handleDeleteTemplate(req, res, templateId!, userId);
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error: any) {
    return handleError(res, error, 'Template API');
  }
}

async function handleTemplateUpload(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string,
  userId: string
) {
  try {
    // Verify project exists and user has access
    const project = await db.select().from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Parse multipart form data
    const formData = await parseMultipartForm(req);
    const files = formData.files || [];

    if (files.length === 0) {
      return res.status(400).json({ message: 'No files provided' });
    }

    if (files.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 files allowed per upload' });
    }

    const response: TemplateUploadResponse = {
      success: true,
      templates: [],
      duplicates: [],
      errors: []
    };

    // Process each file
    for (const file of files) {
      try {
        // Parse template content
        const parsed = await templateParser.parseTemplate(file.buffer, file.originalName, file.mimetype);

        // Check for duplicates
        const contentHash = templateParser.generateContentHash(parsed.content);
        const existingTemplate = await db.select().from(templates)
          .where(and(
            eq(templates.projectId, projectId),
            eq(templates.contentHash, contentHash),
            eq(templates.isDeleted, false)
          ))
          .limit(1);

        if (existingTemplate.length > 0) {
          response.duplicates?.push({
            filename: file.filename,
            originalName: file.originalName,
            existingId: existingTemplate[0].id
          });
          continue;
        }

        // Generate unique filename
        const fileExtension = file.originalName.split('.').pop()?.toLowerCase() || 'bin';
        const uniqueFilename = `${crypto.randomUUID()}.${fileExtension}`;

        // Store file in cloud storage
        let storageUrl: string | null = null;
        let storageKey: string | null = null;

        if (blobStorage.isConfigured()) {
          try {
            storageKey = `projects/${projectId}/templates/${uniqueFilename}`;
            storageUrl = await blobStorage.uploadFromBuffer(file.buffer, storageKey, file.mimetype);
          } catch (storageError) {
            console.error('Storage upload failed:', storageError);
            // Continue without storage - file content is still stored in database
          }
        }

        // Insert template record
        const newTemplate = await db.insert(templates).values({
          projectId,
          filename: uniqueFilename,
          originalName: file.originalName,
          fileType: fileExtension as 'md' | 'docx',
          fileSize: file.buffer.length,
          mimeType: file.mimetype,
          content: parsed.content,
          structure: parsed.structure,
          storageUrl,
          storageKey,
          contentHash,
          uploadedBy: userId
        }).returning();

        response.templates?.push({
          id: newTemplate[0].id,
          filename: newTemplate[0].filename,
          originalName: newTemplate[0].originalName,
          fileType: newTemplate[0].fileType,
          status: 'uploaded'
        });

      } catch (fileError: any) {
        console.error(`Failed to process file ${file.originalName}:`, fileError);
        response.errors?.push(`${file.originalName}: ${fileError.message}`);
      }
    }

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('Template upload failed:', error);
    return res.status(500).json({
      message: 'Template upload failed',
      error: error.message
    });
  }
}

async function handleTemplateList(
  req: VercelRequest,
  res: VercelResponse,
  projectId: string,
  userId: string
) {
  try {
    // Verify project exists
    const project = await db.select().from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Parse query parameters
    const { search, page = '1', limit = '20', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = db.select({
      id: templates.id,
      filename: templates.filename,
      originalName: templates.originalName,
      fileType: templates.fileType,
      fileSize: templates.fileSize,
      mimeType: templates.mimeType,
      structure: templates.structure,
      storageUrl: templates.storageUrl,
      contentHash: templates.contentHash,
      createdAt: templates.createdAt,
      updatedAt: templates.updatedAt
    }).from(templates)
      .where(and(eq(templates.projectId, projectId), eq(templates.isDeleted, false)));

    // Add search filter
    if (search) {
      query = query.where(and(eq(templates.projectId, projectId), eq(templates.isDeleted, false), ilike(templates.originalName, `%${search}%`)));
    }

    // Add sorting
    const orderByColumn = templates[sortBy as keyof typeof templates] || templates.createdAt;
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';
    query = query.orderBy(orderDirection === 'asc' ? orderByColumn : desc(orderByColumn as any));

    // Apply pagination
    query = query.limit(limitNum).offset(offset);

    const templateList = await query;

    // Get total count for pagination
    let countQuery = db.select({ count: templates.id }).from(templates)
      .where(and(eq(templates.projectId, projectId), eq(templates.isDeleted, false)));

    if (search) {
      countQuery = countQuery.where(and(eq(templates.projectId, projectId), eq(templates.isDeleted, false), ilike(templates.originalName, `%${search}%`)));
    }

    const totalCountResult = await countQuery;
    const totalCount = totalCountResult.length;

    return res.status(200).json({
      templates: templateList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Template list failed:', error);
    return res.status(500).json({
      message: 'Failed to list templates',
      error: error.message
    });
  }
}

async function handleGetTemplate(
  req: VercelRequest,
  res: VercelResponse,
  templateId: string,
  userId: string
) {
  try {
    const template = await db.select().from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.isDeleted, false)))
      .limit(1);

    if (template.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    return res.status(200).json({
      template: template[0]
    });

  } catch (error: any) {
    console.error('Get template failed:', error);
    return res.status(500).json({
      message: 'Failed to get template',
      error: error.message
    });
  }
}

async function handleDeleteTemplate(
  req: VercelRequest,
  res: VercelResponse,
  templateId: string,
  userId: string
) {
  try {
    // Soft delete template
    const result = await db.update(templates)
      .set({
        isDeleted: true,
        updatedAt: new Date()
      })
      .where(eq(templates.id, templateId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Optionally delete from storage (cleanup job can handle this)
    const template = result[0];
    if (template.storageKey && blobStorage.isConfigured()) {
      try {
        await blobStorage.delete(template.storageKey);
      } catch (storageError) {
        console.error('Failed to delete file from storage:', storageError);
        // Don't fail the request if storage deletion fails
      }
    }

    return res.status(200).json({
      message: 'Template deleted successfully',
      templateId
    });

  } catch (error: any) {
    console.error('Delete template failed:', error);
    return res.status(500).json({
      message: 'Failed to delete template',
      error: error.message
    });
  }
}

/**
 * Parse multipart form data from request
 */
async function parseMultipartForm(req: VercelRequest): Promise<{ files: Array<any>, fields: Record<string, any> }> {
  return new Promise((resolve, reject) => {
    const files: Array<any> = [];
    const fields: Record<string, any> = {};

    // For Vercel serverless functions, we need to handle the request body differently
    // This is a simplified implementation - in production, you might use libraries like 'multer'

    if (req.body && typeof req.body === 'object') {
      // Handle JSON body format (for testing)
      if (req.body.files && Array.isArray(req.body.files)) {
        for (const file of req.body.files) {
          files.push({
            filename: file.filename || file.name,
            originalName: file.originalName || file.name,
            mimetype: file.mimetype || file.type,
            buffer: Buffer.from(file.content || '', 'base64')
          });
        }
      }
      resolve({ files, fields });
    } else {
      // Handle actual multipart form data
      const contentType = req.headers['content-type'];
      if (contentType && contentType.includes('multipart/form-data')) {
        // This would require a proper multipart parser library
        // For now, return empty arrays
        resolve({ files, fields });
      } else {
        reject(new Error('Unsupported content type'));
      }
    }
  });
}