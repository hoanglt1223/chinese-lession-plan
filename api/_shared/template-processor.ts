export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'lesson' | 'vocabulary' | 'boolean';
  position: number;
  context?: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Extract template variables from content
 */
export function extractTemplateVariables(content: string): TemplateVariable[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: TemplateVariable[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const position = match.index || 0;

    // Skip if variable already exists
    if (variables.find(v => v.name === name)) {
      continue;
    }

    const context = getVariableContext(content, position);
    const type = inferVariableType(name, context);
    const required = isVariableRequired(name, context);

    variables.push({
      name,
      type,
      position,
      context,
      required
    });
  }

  return variables;
}

/**
 * Validate template syntax and structure
 */
export function validateTemplateSyntax(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for unmatched braces
  const openBraces = (content.match(/\{\{/g) || []).length;
  const closeBraces = (content.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push(`Unmatched template braces: ${openBraces} opening, ${closeBraces} closing`);
  }

  // Check for empty variables
  const emptyVariables = content.match(/\{\{\s*\}\}/g);
  if (emptyVariables) {
    emptyVariables.forEach(match => {
      const position = content.indexOf(match);
      const line = content.substring(0, position).split('\n').length;
      errors.push(`Empty template variable at line ${line}`);
    });
  }

  // Check for invalid variable names
  const invalidVariableMatches = content.match(/\{\{[^a-zA-Z_][^}]*\}\}/g);
  if (invalidVariableMatches) {
    invalidVariableMatches.forEach(match => {
      const position = content.indexOf(match);
      const line = content.substring(0, position).split('\n').length;
      errors.push(`Invalid variable name "${match}" at line ${line}. Variable names must start with a letter or underscore.`);
    });
  }

  // Check for malformed variables
  const malformedMatches = content.match(/\{[^{]|[^}]\}/g);
  if (malformedMatches) {
    malformedMatches.forEach(match => {
      const position = content.indexOf(match);
      const line = content.substring(0, position).split('\n').length;
      errors.push(`Malformed variable syntax "${match}" at line ${line}. Use {{variable}} format.`);
    });
  }

  // Content quality checks
  if (content.length < 10) {
    warnings.push('Template content is very short. Consider adding more meaningful content.');
  }

  if (content.length > 100000) {
    warnings.push('Template content is very large (>100KB). Consider splitting into smaller templates.');
  }

  // Check for placeholder text
  const placeholders = ['lorem ipsum', 'placeholder', 'TODO', 'FIXME', 'XXX'];
  placeholders.forEach(placeholder => {
    const regex = new RegExp(placeholder, 'gi');
    if (regex.test(content)) {
      warnings.push(`Placeholder text found: "${placeholder}". Replace with actual content.`);
    }
  });

  // Suggestions for improvement
  const variables = extractTemplateVariables(content);
  if (variables.length === 0) {
    suggestions.push('Consider adding template variables ({{variable}}) to make the template more reusable.');
  } else if (variables.length > 20) {
    suggestions.push('Template has many variables. Consider if some can be combined or simplified.');
  }

  // Check for duplicate variables (should be handled by extractTemplateVariables)
  const variableNames = variables.map(v => v.name);
  const duplicates = variableNames.filter((name, index) => variableNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate variables found: ${[...new Set(duplicates)].join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Process template with given variables
 */
export function processTemplate(content: string, variables: Record<string, any>): string {
  let processedContent = content;

  // Replace all template variables
  processedContent = processedContent.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
    const name = variableName.trim();
    return variables[name] !== undefined ? String(variables[name]) : match;
  });

  return processedContent;
}

/**
 * Get required variables for a template
 */
export function getRequiredVariables(content: string): string[] {
  const variables = extractTemplateVariables(content);
  return variables.filter(v => v.required).map(v => v.name);
}

/**
 * Get all variable names used in a template
 */
export function getVariableNames(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const names: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const name = match[1].trim();
    if (!names.includes(name)) {
      names.push(name);
    }
  }

  return names;
}

/**
 * Validate variable values against template requirements
 */
export function validateVariableValues(
  content: string,
  variables: Record<string, any>
): ValidationResult {
  const templateVariables = extractTemplateVariables(content);
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  templateVariables.forEach(templateVar => {
    const value = variables[templateVar.name];

    // Check if required variable is missing
    if (templateVar.required && (value === undefined || value === null || value === '')) {
      errors.push(`Required variable "${templateVar.name}" is missing or empty.`);
    }

    // Check variable type
    if (value !== undefined && value !== null) {
      const actualType = typeof value;
      let expectedType: string;

      switch (templateVar.type) {
        case 'number':
          expectedType = 'number';
          break;
        case 'boolean':
          expectedType = 'boolean';
          break;
        case 'date':
          expectedType = 'object'; // Date objects
          break;
        default:
          expectedType = 'string';
      }

      if (actualType !== expectedType) {
        warnings.push(`Variable "${templateVar.name}" should be ${expectedType}, but got ${actualType}.`);
      }
    }

    // Check validation rules
    if (templateVar.validation && value !== undefined && value !== null) {
      const { pattern, minLength, maxLength, min, max } = templateVar.validation;

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          errors.push(`Variable "${templateVar.name}" does not match required pattern.`);
        }
      }

      if (minLength && typeof value === 'string' && value.length < minLength) {
        errors.push(`Variable "${templateVar.name}" must be at least ${minLength} characters.`);
      }

      if (maxLength && typeof value === 'string' && value.length > maxLength) {
        errors.push(`Variable "${templateVar.name}" must be no more than ${maxLength} characters.`);
      }

      if (min && typeof value === 'number' && value < min) {
        errors.push(`Variable "${templateVar.name}" must be at least ${min}.`);
      }

      if (max && typeof value === 'number' && value > max) {
        errors.push(`Variable "${templateVar.name}" must be no more than ${max}.`);
      }
    }
  });

  // Check for extra variables not in template
  const templateVariableNames = new Set(templateVariables.map(v => v.name));
  Object.keys(variables).forEach(varName => {
    if (!templateVariableNames.has(varName)) {
      warnings.push(`Variable "${varName}" is provided but not used in template.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Get template statistics
 */
export function getTemplateStats(content: string) {
  const variables = extractTemplateVariables(content);
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  const lines = content.split('\n').length;
  const characters = content.length;

  return {
    variableCount: variables.length,
    requiredVariableCount: variables.filter(v => v.required).length,
    wordCount: words,
    lineCount: lines,
    characterCount: characters,
    variableTypes: variables.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

/**
 * Suggest improvements for template
 */
export function suggestImprovements(content: string): string[] {
  const suggestions: string[] = [];
  const variables = extractTemplateVariables(content);

  // Variable suggestions
  if (variables.length === 0) {
    suggestions.push('Add template variables to make the content reusable.');
  } else {
    const unnamedVars = variables.filter(v => !v.description);
    if (unnamedVars.length > 0) {
      suggestions.push(`Add descriptions for ${unnamedVars.length} variable(s) to improve clarity.`);
    }

    const varsWithoutDefaults = variables.filter(v => !v.required && !v.defaultValue);
    if (varsWithoutDefaults.length > 0) {
      suggestions.push(`Consider adding default values for ${varsWithoutDefaults.length} optional variable(s).`);
    }
  }

  // Content structure suggestions
  if (!content.includes('#') && !content.includes('##')) {
    suggestions.push('Add headers to improve content structure.');
  }

  if (!content.includes('\n\n')) {
    suggestions.push('Use paragraph breaks to improve readability.');
  }

  // Length suggestions
  if (content.length < 50) {
    suggestions.push('Consider adding more content to make the template more useful.');
  } else if (content.length > 10000) {
    suggestions.push('Consider splitting large templates into smaller, focused templates.');
  }

  return suggestions;
}

// Helper functions

function getVariableContext(content: string, position: number): string {
  const start = Math.max(0, position - 50);
  const end = Math.min(content.length, position + 50);
  return content.substring(start, end).trim();
}

function inferVariableType(name: string, context: string): TemplateVariable['type'] {
  const lowerName = name.toLowerCase();
  const lowerContext = context.toLowerCase();

  // Infer from variable name
  if (lowerName.includes('age') || lowerName.includes('level') || lowerName.includes('grade')) {
    return 'string';
  }
  if (lowerName.includes('count') || lowerName.includes('number') || lowerName.includes('total')) {
    return 'number';
  }
  if (lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('when')) {
    return 'date';
  }
  if (lowerName.includes('lesson') || lowerName.includes('course')) {
    return 'lesson';
  }
  if (lowerName.includes('vocab') || lowerName.includes('word') || lowerName.includes('term')) {
    return 'vocabulary';
  }
  if (lowerName.startsWith('is') || lowerName.startsWith('has') || lowerName.startsWith('should') ||
      lowerName.includes('enabled') || lowerName.includes('active')) {
    return 'boolean';
  }

  // Infer from context
  if (lowerContext.includes('lesson') || lowerContext.includes('chapter')) {
    return 'lesson';
  }
  if (lowerContext.includes('vocabulary') || lowerContext.includes('dictionary')) {
    return 'vocabulary';
  }
  if (lowerContext.includes('date') || lowerContext.includes('schedule')) {
    return 'date';
  }

  // Default to string
  return 'string';
}

function isVariableRequired(name: string, context: string): boolean {
  const lowerName = name.toLowerCase();
  const lowerContext = context.toLowerCase();

  // Required indicators in name
  if (lowerName.includes('required') || lowerName.includes('mandatory')) {
    return true;
  }

  // Common required variables
  if (lowerName.includes('title') || lowerName.includes('name') || lowerName.includes('subject')) {
    return true;
  }

  // Required indicators in context
  if (lowerContext.includes('required') || lowerContext.includes('must provide') || lowerContext.includes('necessary')) {
    return true;
  }

  // Optional indicators
  if (lowerName.includes('optional') || lowerName.includes('extra') || lowerName.includes('additional')) {
    return false;
  }

  // Default to not required
  return false;
}