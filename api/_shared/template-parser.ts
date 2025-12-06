import crypto from 'crypto';
import type { TemplateStructure } from '../../shared/schema.js';

export interface ParsedTemplate {
  content: string;
  structure: TemplateStructure;
  metadata: Record<string, any>;
}

export class TemplateParser {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = {
    'md': ['text/markdown', 'text/plain'],
    'docx': [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]
  };

  /**
   * Validate file before processing
   */
  validateFile(buffer: Buffer, filename: string, mimetype: string): { valid: boolean; error?: string } {
    // Check file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size ${Math.round(buffer.length / 1024 / 1024)}MB exceeds limit of 10MB`
      };
    }

    // Check file extension
    const extension = this.getFileExtension(filename);
    if (!extension || !['md', 'docx'].includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension .${extension}. Only .md and .docx files are allowed`
      };
    }

    // Check MIME type
    const allowedTypes = this.ALLOWED_MIME_TYPES[extension as keyof typeof this.ALLOWED_MIME_TYPES];
    if (!allowedTypes.includes(mimetype)) {
      return {
        valid: false,
        error: `Invalid MIME type ${mimetype} for .${extension} file`
      };
    }

    return { valid: true };
  }

  /**
   * Generate content hash for duplicate detection
   */
  generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Parse template file based on its type
   */
  async parseTemplate(buffer: Buffer, filename: string, mimetype: string): Promise<ParsedTemplate> {
    const validation = this.validateFile(buffer, filename, mimetype);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const extension = this.getFileExtension(filename);

    switch (extension) {
      case 'md':
        return await this.parseMarkdown(buffer);
      case 'docx':
        return await this.parseDocx(buffer);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  /**
   * Parse markdown file
   */
  private async parseMarkdown(buffer: Buffer): Promise<ParsedTemplate> {
    const content = buffer.toString('utf-8');

    // Extract headings
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string; position: number }> = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        position: match.index
      });
    }

    // Extract sections based on headings
    const sections: Array<{ title: string; content: string; position: number }> = [];
    if (headings.length > 0) {
      for (let i = 0; i < headings.length; i++) {
        const start = headings[i].position;
        const end = i + 1 < headings.length ? headings[i + 1].position : content.length;
        const sectionContent = content.substring(start, end).replace(/^#{1,6}\s+.+$/m, '').trim();

        sections.push({
          title: headings[i].text,
          content: sectionContent,
          position: headings[i].position
        });
      }
    }

    // Extract metadata from front matter if present
    const metadata = this.extractMarkdownMetadata(content);

    return {
      content,
      structure: {
        headings,
        sections,
        metadata
      },
      metadata
    };
  }

  /**
   * Parse DOCX file
   */
  private async parseDocx(buffer: Buffer): Promise<ParsedTemplate> {
    try {
      // For serverless environments, we'll use a simple text extraction approach
      // In production, you might want to use libraries like 'mammoth'

      // Basic DOCX structure detection and text extraction
      const content = this.extractTextFromDocx(buffer);

      // Extract structure from content (headings, paragraphs)
      const headings = this.extractHeadingsFromText(content);
      const sections = this.extractSectionsFromText(content, headings);

      // Basic metadata extraction
      const metadata = {
        extractedAt: new Date().toISOString(),
        wordCount: content.split(/\s+/).length,
        characterCount: content.length
      };

      return {
        content,
        structure: {
          headings,
          sections,
          metadata
        },
        metadata
      };
    } catch (error) {
      console.error('DOCX parsing failed:', error);

      // Fallback: treat as plain text
      const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 100000)); // Limit to 100k chars

      return {
        content,
        structure: {
          headings: [],
          sections: [{
            title: 'Document Content',
            content: content.substring(0, 1000), // First 1000 chars as preview
            position: 0
          }],
          metadata: {
            extractedAt: new Date().toISOString(),
            parsingError: true,
            originalSize: buffer.length
          }
        },
        metadata: {
          extractedAt: new Date().toISOString(),
          parsingError: true
        }
      };
    }
  }

  /**
   * Extract metadata from markdown front matter
   */
  private extractMarkdownMetadata(content: string): Record<string, any> {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = frontMatterRegex.exec(content);

    if (!match) {
      return {
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        lineCount: content.split('\n').length
      };
    }

    try {
      // Parse YAML-like front matter
      const metadata: Record<string, any> = {};
      const lines = match[1].split('\n');

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          let value = line.substring(colonIndex + 1).trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          metadata[key] = value;
        }
      }

      return {
        ...metadata,
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        lineCount: content.split('\n').length
      };
    } catch (error) {
      console.error('Failed to parse front matter:', error);
      return {
        wordCount: content.split(/\s+/).length,
        characterCount: content.length,
        lineCount: content.split('\n').length
      };
    }
  }

  /**
   * Extract text from DOCX buffer (simplified implementation)
   */
  private extractTextFromDocx(buffer: Buffer): string {
    try {
      // This is a simplified implementation for serverless environments
      // In production, use libraries like 'mammoth' for proper DOCX parsing

      // Look for text patterns in DOCX XML structure
      const text = buffer.toString('utf-8');

      // Extract text between common DOCX XML tags
      const textMatches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        return textMatches
          .map(match => match.replace(/<[^>]*>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Fallback: clean up the XML and extract readable text
      return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 50000); // Limit to prevent memory issues
    } catch (error) {
      console.error('Failed to extract text from DOCX:', error);
      // Return a basic text representation
      return `DOCX document content (${buffer.length} bytes). Full text extraction requires specialized DOCX parsing library.`;
    }
  }

  /**
   * Extract headings from plain text
   */
  private extractHeadingsFromText(content: string): Array<{ level: number; text: string; position: number }> {
    const headings: Array<{ level: number; text: string; position: number }> = [];

    // Look for lines that might be headings (all caps, short, followed by newline)
    const lines = content.split('\n');
    let currentPosition = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and very long lines
      if (!trimmedLine || trimmedLine.length > 100) {
        currentPosition += line.length + 1;
        continue;
      }

      // Look for potential heading patterns
      if (
        trimmedLine.length < 50 && // Short lines
        (trimmedLine === trimmedLine.toUpperCase() || // All caps
         trimmedLine.match(/^[A-Z][^.]*$/)) || // Single sentence
        trimmedLine.match(/^\d+\.\s/) // Numbered
      ) {
        headings.push({
          level: 1,
          text: trimmedLine,
          position: currentPosition
        });
      }

      currentPosition += line.length + 1;
    }

    return headings;
  }

  /**
   * Extract sections from text based on headings
   */
  private extractSectionsFromText(
    content: string,
    headings: Array<{ level: number; text: string; position: number }>
  ): Array<{ title: string; content: string; position: number }> {
    const sections: Array<{ title: string; content: string; position: number }> = [];

    if (headings.length === 0) {
      // No headings found, create one section with the whole content
      return [{
        title: 'Document Content',
        content: content.substring(0, 2000), // First 2000 chars
        position: 0
      }];
    }

    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].position;
      const end = i + 1 < headings.length ? headings[i + 1].position : content.length;
      let sectionContent = content.substring(start, end);

      // Remove the heading line from the content
      const headingLineEnd = sectionContent.indexOf('\n');
      if (headingLineEnd > 0) {
        sectionContent = sectionContent.substring(headingLineEnd + 1).trim();
      }

      // Limit section content to prevent large responses
      if (sectionContent.length > 1000) {
        sectionContent = sectionContent.substring(0, 1000) + '...';
      }

      sections.push({
        title: headings[i].text,
        content: sectionContent,
        position: headings[i].position
      });
    }

    return sections;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string | null {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : null;
  }
}

export const templateParser = new TemplateParser();