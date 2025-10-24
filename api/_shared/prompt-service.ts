import { eq, and } from 'drizzle-orm';
import { db } from './database';
import { promptTemplates, promptComponents } from './db-schema';

export interface PromptVariables {
  [key: string]: any;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  templateId: string;
  templateName: string;
}

export class PromptService {
  /**
   * Get the default prompt template for a specific type
   */
  static async getDefaultTemplate(type: string) {
    const template = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [promptComponents.order]
        }
      },
      where: and(
        eq(promptTemplates.type, type),
        eq(promptTemplates.isDefault, true),
        eq(promptTemplates.isActive, true)
      )
    });

    return template;
  }

  /**
   * Get a specific prompt template by ID
   */
  static async getTemplate(templateId: string) {
    const template = await db.query.promptTemplates.findFirst({
      with: {
        components: {
          orderBy: [promptComponents.order]
        }
      },
      where: eq(promptTemplates.id, templateId)
    });

    return template;
  }

  /**
   * Build a complete prompt from template and variables
   */
  static async buildPrompt(templateId: string, variables: PromptVariables = {}): Promise<BuiltPrompt | null> {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      return null;
    }

    return this.buildPromptFromTemplate(template, variables);
  }

  /**
   * Build a prompt using the default template for a type
   */
  static async buildDefaultPrompt(type: string, variables: PromptVariables = {}): Promise<BuiltPrompt | null> {
    const template = await this.getDefaultTemplate(type);
    
    if (!template) {
      return null;
    }

    return this.buildPromptFromTemplate(template, variables);
  }

  /**
   * Build prompt from template object
   */
  private static buildPromptFromTemplate(template: any, variables: PromptVariables): BuiltPrompt {
    // Separate components by type
    const systemComponents = template.components.filter((c: any) => c.type === 'system');
    const userComponents = template.components.filter((c: any) => c.type === 'user');

    // Build system prompt
    const systemPrompt = systemComponents
      .map((component: any) => this.replaceVariables(component.content, variables))
      .join('\n\n');

    // Build user prompt
    const userPrompt = userComponents
      .map((component: any) => this.replaceVariables(component.content, variables))
      .join('\n\n');

    return {
      systemPrompt,
      userPrompt,
      templateId: template.id,
      templateName: template.name
    };
  }

  /**
   * Replace variables in content using {{variable}} syntax
   */
  private static replaceVariables(content: string, variables: PromptVariables): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }

  /**
   * Extract variable names from content
   */
  static extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    
    return matches.map(match => match.replace(/\{\{|\}\}/g, ''));
  }

  /**
   * Validate that all required variables are provided
   */
  static validateVariables(template: any, variables: PromptVariables): { isValid: boolean; missingVariables: string[] } {
    const allVariables = new Set<string>();
    
    // Extract variables from all components
    template.components.forEach((component: any) => {
      const componentVars = this.extractVariables(component.content);
      componentVars.forEach(v => allVariables.add(v));
    });

    // Check for missing variables
    const missingVariables = Array.from(allVariables).filter(varName => 
      variables[varName] === undefined || variables[varName] === null
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }
}

// Legacy support functions for backward compatibility
export async function buildAnalysisPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('analysis', variables);
}

export async function buildLessonPlanPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('lesson_plan', variables);
}

export async function buildFlashcardPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('flashcard', variables);
}

export async function buildSummaryPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('summary', variables);
}