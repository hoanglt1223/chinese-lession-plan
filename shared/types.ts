/**
 * Shared template types used across the application
 */

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

export interface FileMetadata {
  originalName: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  lastModified?: string;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  validatedAt: string;
}