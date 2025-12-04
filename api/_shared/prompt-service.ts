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
    try {
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

      if (template) return template;
    } catch (error) {
      console.warn(`Database access failed for prompt template '${type}'. Using fallback.`, error);
    }

    return this.getFallbackTemplate(type);
  }

  static getFallbackTemplate(type: string) {
    if (type === 'single_lesson_plan') {
      return {
        id: 'fallback-single-lesson-plan',
        name: 'Fallback Single Lesson Plan',
        components: [
          {
            type: 'system',
            content: 'You are an expert Chinese language teacher creating a detailed lesson plan for a specific lesson.'
          },
          {
            type: 'user',
            content: `Create a detailed lesson plan following the EXACT structure below. 
            
**Language Requirements (STRICT):**
1. **Target Language:** Chinese (Simplified). This is the primary language for the lesson content.
2. **Support Language:** English. Use sparingly for headers or explaining difficult concepts to the teacher.
3. **FORBIDDEN LANGUAGE:** Vietnamese. DO NOT use Vietnamese anywhere in the output.
4. **Audience:** The lesson plan is for a professional Chinese teacher.

**Structure Requirements:**

1.  **Header Table** (Must use this exact format):
    | Level 1 | N1 | Unit {{unit}} | {{topic}} | Lesson {{lesson}} | 第{{lesson}}节课 |
    | :--- | :--- | :--- | :--- | :--- | :--- |
    | **References:** | 参考资料 | | | | |
    | **Lesson aim:** | 教学目标 | **Cognitive domain:** | (Fill based on {{objectives}}) | **Skill domain:** | (Fill based on {{objectives}}) |
    | **Sub aim:** | 次要教学目标 | | | | |
    | **Type of lesson** | 课型 | {{type}} | **Materials required:** | 教具 | {{materials}} |
    | **Lesson content** | 教学内容 | **Vocabulary:** | {{vocabulary}} | **Grammar/Other:** | (Extract from objectives) |
    | **Duration:** | 课时 | {{duration}} | | | |

2.  **Procedure Table** (Must use this exact format):
    | Stage & aim 教学环节与目标 | Activities ideas & Procedures 活动设计与教学步骤 | Materials / 教具 |
    | :--- | :--- | :--- |
    | **Warm up 热身**<br>(Aim: ...) | ... | ... |
    | **Rules 规则**<br>(Aim: Remind class rules) | ... | ... |
    | **Review / Presentation**<br>(Adjust based on lesson type) | ... | ... |
    | **Practice** | ... | ... |
    | **Production** | ... | ... |
    | **Wrap up 总结** | ... | ... |

**Content Guidelines:**
- **Bilingual Headers:** Use English and Chinese for table headers as shown above.
- **Content Language:** The content within the tables (activities, procedures, instructions) should be primarily in **Chinese** to simulate a real Chinese lesson environment. You may use English for teacher instructions if necessary for clarity.
- **Activities:**
  - Make them highly interactive and suitable for {{ageGroup}}.
  - **MANDATORY REQUIREMENT:** Check the **Existing Generic Activities** list provided below. If ANY of them are suitable (especially games or warm-ups), you **MUST** use them in the lesson plan instead of inventing new generic ones.
  - **HOW TO REUSE:** When using an existing activity, use its exact name in the "Activities ideas & Procedures" column and adapt its instructions to the current lesson's vocabulary/topic.
  - **Existing Generic Activities (PRIORITIZE THESE):**
    {{existingActivities}}

- **Lesson Type:**
  - If {{type}} is "Review", focus on games and practice (Stages: Pinyin Review, Vocabulary Review, Grammar Review, etc.).
  - If {{type}} is "New Content", focus on Presentation, Practice, Production.

Output ONLY the Markdown content. Do not include conversational text.`
          }
        ]
      };
    }

    if (type === 'flashcard') {
      return {
        id: 'fallback-flashcard',
        name: 'Fallback Flashcard',
        components: [
          {
            type: 'system',
            content: 'You are an expert Chinese language teacher creating flashcard data.'
          },
          {
            type: 'user',
            content: `Generate a list of flashcards for the following vocabulary items: {{vocabulary}}.
Theme: {{theme}}
Level: {{level}}
Age Group: {{ageGroup}}

For each item, provide:
1. Word (Chinese characters)
2. Pinyin
3. Vietnamese meaning
4. Part of Speech
5. An image query string (English) to find a relevant image.

Return the result as a JSON array of objects.`
          }
        ]
      };
    }

    return null;
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

export async function buildSingleLessonPlanPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('single_lesson_plan', variables);
}

export async function buildFlashcardPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('flashcard', variables);
}

export async function buildSummaryPrompt(variables: PromptVariables): Promise<BuiltPrompt | null> {
  return PromptService.buildDefaultPrompt('summary', variables);
}