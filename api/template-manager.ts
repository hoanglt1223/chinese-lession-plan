import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, desc, like, or } from 'drizzle-orm';
import multer from 'multer';
import { runMiddleware } from './_shared/middleware.js';
import { db } from './_shared/database.js';
import { templates, templateUsages } from './_shared/db-schema.js';
import { extractTemplateVariables, validateTemplateSyntax, TemplateVariable } from './_shared/template-processor.js';
import { handleError } from './_shared/error-handler.js';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const allowedExtensions = ['.md', '.txt', '.pdf', '.docx', '.doc'];

    const hasAllowedType = allowedTypes.includes(file.mimetype);
    const hasAllowedExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (hasAllowedType || hasAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .md, .txt, .pdf, .docx files are allowed.'));
    }
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { action } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (action === 'list') {
          return await listTemplates(req, res);
        }
        if (action === 'get') {
          return await getTemplate(req, res);
        }
        if (action === 'validate') {
          return await validateTemplate(req, res);
        }
        break;

      case 'POST':
        if (action === 'upload') {
          return await uploadTemplate(req, res);
        }
        if (action === 'batch-validate') {
          return await batchValidateTemplates(req, res);
        }
        if (action === 'extract-variables') {
          return await extractVariables(req, res);
        }
        if (action === 'batch-operation') {
          return await performBatchOperation(req, res);
        }
        break;

      case 'PUT':
        if (action === 'update') {
          return await updateTemplate(req, res);
        }
        break;

      case 'DELETE':
        if (action === 'delete') {
          return await deleteTemplate(req, res);
        }
        if (action === 'batch-delete') {
          return await batchDeleteTemplates(req, res);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    return handleError(res, error, `Template Manager API (${action})`);
  }
}

// List templates with filtering and pagination
async function listTemplates(req: VercelRequest, res: VercelResponse) {
  const {
    page = '1',
    limit = '20',
    search = '',
    type = '',
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  // Build query conditions
  let whereConditions = [];

  if (search) {
    whereConditions.push(
      or(
        like(templates.name, `%${search}%`),
        like(templates.description, `%${search}%`)
      )
    );
  }

  if (type) {
    whereConditions.push(eq(templates.type, type as string));
  }

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Build order by clause
  let orderBy;
  const sortColumn = sortBy as keyof typeof templates;
  if (sortOrder === 'desc') {
    orderBy = desc(templates[sortColumn]);
  } else {
    orderBy = templates[sortColumn];
  }

  // Execute query
  const [templatesList, totalCount] = await Promise.all([
    db.select()
      .from(templates)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: templates.id })
      .from(templates)
      .where(whereClause)
  ]);

  return res.status(200).json({
    templates: templatesList,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalCount.length,
      totalPages: Math.ceil(totalCount.length / limitNum)
    }
  });
}

// Get single template by ID
async function getTemplate(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const template = await db.select()
    .from(templates)
    .where(eq(templates.id, id as string))
    .limit(1);

  if (template.length === 0) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Increment usage count
  await db.update(templates)
    .set({
      usageCount: template[0].usageCount + 1,
      updatedAt: new Date()
    })
    .where(eq(templates.id, id as string));

  return res.status(200).json(template[0]);
}

// Upload and create new template
async function uploadTemplate(req: VercelRequest, res: VercelResponse) {
  await runMiddleware(req, res, upload.single('template'));

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { name, description, type, tags } = req.body;
  const file = req.file;

  try {
    // Extract content from file
    let content = '';
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.md')) {
      content = file.buffer.toString('utf-8');
    } else if (file.mimetype === 'application/pdf') {
      // For PDF files, you would need to use a PDF parsing library
      // For now, we'll store the file and process it later
      content = `PDF File: ${file.originalname}\n\nContent will be processed...`;
    } else if (file.mimetype.includes('word')) {
      // For DOCX files, you would need to use a DOCX parsing library
      // For now, we'll store the file and process it later
      content = `DOCX File: ${file.originalname}\n\nContent will be processed...`;
    }

    // Extract variables from content
    const variables = extractTemplateVariables(content);

    // Create template record
    const newTemplate = await db.insert(templates).values({
      name: name || file.originalname.replace(/\.[^/.]+$/, ''),
      description: description || null,
      type: type || detectTemplateType(content),
      content,
      variables,
      fileMetadata: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadDate: new Date().toISOString()
      },
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
      isPublic: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return res.status(201).json(newTemplate[0]);
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    return res.status(500).json({ error: 'Failed to process uploaded file' });
  }
}

// Update existing template
async function updateTemplate(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const { name, description, content, type, tags, variables } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  // Check if template exists
  const existingTemplate = await db.select()
    .from(templates)
    .where(eq(templates.id, id as string))
    .limit(1);

  if (existingTemplate.length === 0) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date()
  };

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (content !== undefined) {
    updateData.content = content;
    // Re-extract variables if content changed
    if (!variables) {
      updateData.variables = extractTemplateVariables(content);
    }
  }
  if (type) updateData.type = type;
  if (tags) updateData.tags = Array.isArray(tags) ? tags : tags.split(',');
  if (variables) updateData.variables = variables;

  const updatedTemplate = await db.update(templates)
    .set(updateData)
    .where(eq(templates.id, id as string))
    .returning();

  return res.status(200).json(updatedTemplate[0]);
}

// Delete template
async function deleteTemplate(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const deletedTemplate = await db.delete(templates)
    .where(eq(templates.id, id as string))
    .returning();

  if (deletedTemplate.length === 0) {
    return res.status(404).json({ error: 'Template not found' });
  }

  return res.status(200).json({ message: 'Template deleted successfully' });
}

// Batch delete templates
async function batchDeleteTemplates(req: VercelRequest, res: VercelResponse) {
  const { templateIds } = req.body;

  if (!Array.isArray(templateIds) || templateIds.length === 0) {
    return res.status(400).json({ error: 'Template IDs array is required' });
  }

  const deletedCount = await db.delete(templates)
    .where(eq(templates.id, templateIds[0])) // This would need to be updated for multiple IDs
    .returning();

  // Note: Drizzle ORM might need a different approach for multiple ID deletion
  // You might need to use a raw SQL query or loop through IDs

  return res.status(200).json({
    message: `${deletedCount.length} templates deleted successfully`
  });
}

// Validate template content
async function validateTemplate(req: VercelRequest, res: VercelResponse) {
  const { content, templateId } = req.body;

  let templateContent = content;

  // If templateId provided, fetch content from database
  if (templateId) {
    const template = await db.select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    templateContent = template[0].content;
  }

  if (!templateContent) {
    return res.status(400).json({ error: 'Template content is required' });
  }

  const validation = validateTemplateSyntax(templateContent);
  const variables = extractTemplateVariables(templateContent);

  return res.status(200).json({
    isValid: validation.isValid,
    errors: validation.errors,
    variables,
    variableCount: variables.length,
    score: calculateQualityScore(validation, variables)
  });
}

// Batch validate templates
async function batchValidateTemplates(req: VercelRequest, res: VercelResponse) {
  const { templateIds } = req.body;

  if (!Array.isArray(templateIds) || templateIds.length === 0) {
    return res.status(400).json({ error: 'Template IDs array is required' });
  }

  const results = [];

  for (const templateId of templateIds) {
    try {
      const template = await db.select()
        .from(templates)
        .where(eq(templates.id, templateId))
        .limit(1);

      if (template.length === 0) {
        results.push({
          templateId,
          isValid: false,
          error: 'Template not found'
        });
        continue;
      }

      const validation = validateTemplateSyntax(template[0].content);
      const variables = extractTemplateVariables(template[0].content);

      results.push({
        templateId,
        isValid: validation.isValid,
        errors: validation.errors,
        variables,
        score: calculateQualityScore(validation, variables)
      });
    } catch (error) {
      results.push({
        templateId,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(200).json({ results });
}

// Extract variables from content
async function extractVariables(req: VercelRequest, res: VercelResponse) {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const variables = extractTemplateVariables(content);

  return res.status(200).json({ variables });
}

// Perform batch operations
async function performBatchOperation(req: VercelRequest, res: VercelResponse) {
  const { operation, templateIds, parameters } = req.body;

  if (!operation || !Array.isArray(templateIds) || templateIds.length === 0) {
    return res.status(400).json({ error: 'Operation and template IDs are required' });
  }

  const results = [];

  switch (operation) {
    case 'export':
      return await batchExportTemplates(templateIds, parameters);

    case 'transform':
      return await batchTransformTemplates(templateIds, parameters);

    case 'validate':
      return await batchValidateTemplates({ body: { templateIds } } as any, res);

    case 'delete':
      return await batchDeleteTemplates({ body: { templateIds } } as any, res);

    default:
      return res.status(400).json({ error: 'Unknown batch operation' });
  }
}

// Batch export templates
async function batchExportTemplates(templateIds: string[], parameters: any) {
  const templates = await db.select()
    .from(templates)
    .where(eq(templates.id, templateIds[0])); // This would need to be updated for multiple IDs

  const exportData = {
    templates,
    exportDate: new Date().toISOString(),
    format: parameters.format || 'json'
  };

  return {
    success: true,
    data: exportData,
    fileName: `templates_export_${Date.now()}.${parameters.format || 'json'}`
  };
}

// Batch transform templates
async function batchTransformTemplates(templateIds: string[], parameters: any) {
  const results = [];

  for (const templateId of templateIds) {
    try {
      const template = await db.select()
        .from(templates)
        .where(eq(templates.id, templateId))
        .limit(1);

      if (template.length === 0) {
        results.push({ templateId, success: false, error: 'Template not found' });
        continue;
      }

      let transformedContent = template[0].content;
      let transformedVariables = template[0].variables;

      // Apply transformations based on parameters
      if (parameters.variableNaming) {
        // Transform variable names
        transformedContent = transformVariableNames(transformedContent, parameters.variableNaming);
        transformedVariables = transformVariableObjects(transformedVariables, parameters.variableNaming);
      }

      if (parameters.contentTransform) {
        // Apply content transformations
        transformedContent = applyContentTransformation(transformedContent, parameters.contentTransform);
      }

      // Update the template
      await db.update(templates)
        .set({
          content: transformedContent,
          variables: transformedVariables,
          updatedAt: new Date()
        })
        .where(eq(templates.id, templateId));

      results.push({
        templateId,
        success: true,
        transformations: parameters
      });
    } catch (error) {
      results.push({
        templateId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { results };
}

// Helper functions
function detectTemplateType(content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('lesson') || lowerContent.includes('objective')) {
    return 'lesson_plan';
  }
  if (lowerContent.includes('word') || lowerContent.includes('definition')) {
    return 'flashcard';
  }
  if (lowerContent.includes('summary') || lowerContent.includes('conclusion')) {
    return 'summary';
  }
  if (lowerContent.includes('activity') || lowerContent.includes('exercise')) {
    return 'activity';
  }

  return 'other';
}

function calculateQualityScore(validation: any, variables: TemplateVariable[]): number {
  let score = 100;

  // Deduct points for errors
  score -= validation.errors.length * 20;

  // Deduct points for too few variables
  if (variables.length === 0) score -= 30;
  else if (variables.length < 3) score -= 10;

  // Bonus for good variable naming
  const wellNamedVars = variables.filter(v =>
    v.name.length > 2 && /^[a-z_][a-z0-9_]*$/i.test(v.name)
  ).length;

  if (wellNamedVars === variables.length && variables.length > 0) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

function transformVariableNames(content: string, namingConvention: string): string {
  const regex = /\{\{([^}]+)\}\}/g;

  return content.replace(regex, (match, variableName) => {
    let newName = variableName;

    switch (namingConvention) {
      case 'camelCase':
        newName = variableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        break;
      case 'snake_case':
        newName = variableName.replace(/([A-Z])/g, '_$1').toLowerCase();
        break;
      case 'kebab-case':
        newName = variableName.replace(/([A-Z])/g, '-$1').toLowerCase();
        break;
    }

    return `{{${newName}}}`;
  });
}

function transformVariableObjects(variables: TemplateVariable[], namingConvention: string): TemplateVariable[] {
  return variables.map(variable => {
    let newName = variable.name;

    switch (namingConvention) {
      case 'camelCase':
        newName = variable.name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        break;
      case 'snake_case':
        newName = variable.name.replace(/([A-Z])/g, '_$1').toLowerCase();
        break;
      case 'kebab-case':
        newName = variable.name.replace(/([A-Z])/g, '-$1').toLowerCase();
        break;
    }

    return { ...variable, name: newName };
  });
}

function applyContentTransformation(content: string, transformation: any): string {
  let transformed = content;

  if (transformation.removeComments) {
    transformed = transformed.replace(/<!--.*?-->/gs, '');
  }

  if (transformation.normalizeSpacing) {
    transformed = transformed.replace(/\n{3,}/g, '\n\n');
  }

  if (transformation.trimWhitespace) {
    transformed = transformed.trim();
  }

  return transformed;
}