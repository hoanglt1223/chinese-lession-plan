import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from './_shared/database';
import { promptTemplates, promptComponents, PromptTemplate, PromptComponent, InsertPromptTemplate, InsertPromptComponent } from './_shared/db-schema';
import { handleError } from './_shared/error-handler';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { initializeDatabase } from './_shared/init-db.js';

// Get all prompt templates with their components
export async function getPromptTemplates(req: Request, res: Response) {
  try {
    const templates = await db.query.promptTemplates.findMany({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: eq(promptTemplates.isActive, true),
      orderBy: [desc(promptTemplates.createdAt)]
    });

    res.json({ templates });
  } catch (error) {
    handleError(error, res);
  }
}

// Get a specific prompt template by ID
export async function getPromptTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const template = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: eq(promptTemplates.id, id)
    });

    if (!template) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    res.json({ template });
  } catch (error) {
    handleError(error, res);
  }
}

// Get prompt templates by type
export async function getPromptTemplatesByType(req: Request, res: Response) {
  try {
    const { type } = req.params;
    
    const templates = await db.query.promptTemplates.findMany({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: and(
        eq(promptTemplates.type, type),
        eq(promptTemplates.isActive, true)
      ),
      orderBy: [desc(promptTemplates.createdAt)]
    });

    res.json({ templates });
  } catch (error) {
    handleError(error, res);
  }
}

// Create a new prompt template
export async function createPromptTemplate(req: Request, res: Response) {
  try {
    const { name, type, description, isDefault, components } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // If this is set as default, unset other defaults of the same type
    if (isDefault) {
      await db.update(promptTemplates)
        .set({ isDefault: false })
        .where(and(
          eq(promptTemplates.type, type),
          eq(promptTemplates.isDefault, true)
        ));
    }

    // Create the template
    const templateData: InsertPromptTemplate = {
      name,
      type,
      description,
      isDefault: isDefault || false,
      isActive: true
    };

    const [template] = await db.insert(promptTemplates)
      .values(templateData)
      .returning();

    // Create components if provided
    if (components && Array.isArray(components)) {
      const componentData: InsertPromptComponent[] = components.map((comp: any, index: number) => ({
        templateId: template.id,
        name: comp.name,
        type: comp.type,
        content: comp.content,
        order: comp.order || index,
        variables: comp.variables || [],
        isRequired: comp.isRequired !== false
      }));

      await db.insert(promptComponents).values(componentData);
    }

    // Fetch the complete template with components
    const completeTemplate = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: eq(promptTemplates.id, template.id)
    });

    res.status(201).json({ template: completeTemplate });
  } catch (error) {
    handleError(error, res);
  }
}

// Update a prompt template
export async function updatePromptTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, type, description, isDefault, isActive, components } = req.body;

    // Check if template exists
    const existingTemplate = await db.query.promptTemplates.findFirst({
      where: eq(promptTemplates.id, id)
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    // If this is set as default, unset other defaults of the same type
    if (isDefault && type) {
      await db.update(promptTemplates)
        .set({ isDefault: false })
        .where(and(
          eq(promptTemplates.type, type),
          eq(promptTemplates.isDefault, true)
        ));
    }

    // Update the template
    const updateData: Partial<InsertPromptTemplate> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.update(promptTemplates)
      .set(updateData)
      .where(eq(promptTemplates.id, id));

    // Update components if provided
    if (components && Array.isArray(components)) {
      // Delete existing components
      await db.delete(promptComponents)
        .where(eq(promptComponents.templateId, id));

      // Insert new components
      const componentData: InsertPromptComponent[] = components.map((comp: any, index: number) => ({
        templateId: id,
        name: comp.name,
        type: comp.type,
        content: comp.content,
        order: comp.order || index,
        variables: comp.variables || [],
        isRequired: comp.isRequired !== false
      }));

      await db.insert(promptComponents).values(componentData);
    }

    // Fetch the updated template with components
    const updatedTemplate = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: eq(promptTemplates.id, id)
    });

    res.json({ template: updatedTemplate });
  } catch (error) {
    handleError(error, res);
  }
}

// Delete a prompt template
export async function deletePromptTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if template exists
    const existingTemplate = await db.query.promptTemplates.findFirst({
      where: eq(promptTemplates.id, id)
    });

    if (!existingTemplate) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    // Delete the template (components will be deleted due to cascade)
    await db.delete(promptTemplates)
      .where(eq(promptTemplates.id, id));

    res.json({ message: 'Prompt template deleted successfully' });
  } catch (error) {
    handleError(error, res);
  }
}

// Get default prompt template for a specific type
export async function getDefaultPromptTemplate(req: Request, res: Response) {
  try {
    const { type } = req.params;
    
    const template = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: and(
        eq(promptTemplates.type, type),
        eq(promptTemplates.isDefault, true),
        eq(promptTemplates.isActive, true)
      )
    });

    if (!template) {
      return res.status(404).json({ error: `No default prompt template found for type: ${type}` });
    }

    res.json({ template });
  } catch (error) {
    handleError(error, res);
  }
}

// Build a complete prompt from template and variables
export async function buildPrompt(req: Request, res: Response) {
  try {
    const { templateId, variables = {} } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [desc(promptComponents.order)]
        }
      },
      where: eq(promptTemplates.id, templateId)
    });

    if (!template) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }

    // Build system and user prompts from components
    const systemComponents = template.components.filter(c => c.type === 'system');
    const userComponents = template.components.filter(c => c.type === 'user');

    const systemPrompt = systemComponents
      .map(component => replaceVariables(component.content, variables))
      .join('\n\n');

    const userPrompt = userComponents
      .map(component => replaceVariables(component.content, variables))
      .join('\n\n');

    res.json({
      systemPrompt,
      userPrompt,
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      }
    });
  } catch (error) {
    handleError(error, res);
  }
}

// Helper function to replace variables in content
function replaceVariables(content: string, variables: Record<string, any>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? String(variables[varName]) : match;
  });
}