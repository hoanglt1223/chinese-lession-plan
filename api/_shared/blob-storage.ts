import { put, list, head, del } from '@vercel/blob';

export interface BlobFile {
  url: string;
  downloadUrl: string;
  size: number;
  uploadedAt: Date;
  pathname: string;
}

export interface UploadOptions {
  access: 'public' | 'private';
  cacheControlMaxAge?: number;
  contentType?: string;
  token?: string;
}

export class BlobStorage {
  private token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || '';
    if (!this.token) {
      console.warn('BLOB_READ_WRITE_TOKEN not found in environment variables');
    }
  }

  /**
   * Upload a file to Vercel Blob storage
   */
  async upload(
    buffer: ArrayBuffer | Buffer,
    pathname: string,
    options: UploadOptions = { access: 'public' }
  ): Promise<BlobFile> {
    try {
      if (!this.token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required for blob operations');
      }

      const blob = await put(pathname, buffer, {
        access: options.access,
        cacheControlMaxAge: options.cacheControlMaxAge,
        contentType: options.contentType,
        token: this.token
      });

      return {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        pathname: blob.pathname
      };
    } catch (error) {
      console.error('Error uploading to blob storage:', error);
      throw error;
    }
  }

  /**
   * List files in blob storage
   */
  async list(prefix?: string): Promise<BlobFile[]> {
    try {
      if (!this.token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required for blob operations');
      }

      const { blobs } = await list({
        prefix,
        token: this.token
      });

      return blobs.map(blob => ({
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        pathname: blob.pathname
      }));
    } catch (error) {
      console.error('Error listing blobs:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(pathname: string): Promise<BlobFile | null> {
    try {
      if (!this.token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required for blob operations');
      }

      const blob = await head({
        pathname,
        token: this.token
      });

      return {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        pathname: blob.pathname
      };
    } catch (error) {
      console.error('Error getting blob metadata:', error);
      return null;
    }
  }

  /**
   * Delete a file from blob storage
   */
  async delete(pathname: string): Promise<void> {
    try {
      if (!this.token) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required for blob operations');
      }

      await del({
        pathname,
        token: this.token
      });
    } catch (error) {
      console.error('Error deleting blob:', error);
      throw error;
    }
  }

  /**
   * Upload file for user content (lesson files, exports, etc.)
   */
  async uploadContent(
    buffer: Buffer,
    filename: string,
    lessonId?: string,
    userId?: string
  ): Promise<BlobFile> {
    // Create organized path structure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pathParts = ['content'];

    if (userId) pathParts.push(`user-${userId}`);
    if (lessonId) pathParts.push(`lesson-${lessonId}`);

    pathParts.push(`${timestamp}-${filename}`);

    const pathname = pathParts.join('/');

    // Determine content type
    const contentType = this.getContentType(filename);

    return this.upload(buffer, pathname, {
      access: 'public',
      contentType
    });
  }

  /**
   * Upload file for exports (PDFs, DOCX, etc.)
   */
  async uploadExport(
    buffer: Buffer,
    filename: string,
    lessonId: string,
    exportType: string
  ): Promise<BlobFile> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const pathname = `exports/${exportType}/lesson-${lessonId}/${timestamp}-${filename}`;

    const contentType = this.getContentType(filename);

    return this.upload(buffer, pathname, {
      access: 'public',
      contentType,
      cacheControlMaxAge: 31536000 // 1 year cache for exports
    });
  }

  /**
   * Upload generated flashcard images
   */
  async uploadFlashcardImage(
    buffer: Buffer,
    filename: string,
    lessonId: string,
    cardIndex: number
  ): Promise<BlobFile> {
    const pathname = `flashcards/lesson-${lessonId}/card-${cardIndex}-${filename}`;

    return this.upload(buffer, pathname, {
      access: 'public',
      contentType: 'image/png'
    });
  }

  /**
   * Get files for a specific lesson
   */
  async getLessonFiles(lessonId: string): Promise<BlobFile[]> {
    return this.list(`content/lesson-${lessonId}/`);
  }

  /**
   * Get exports for a specific lesson
   */
  async getLessonExports(lessonId: string): Promise<BlobFile[]> {
    return this.list(`exports//lesson-${lessonId}/`);
  }

  /**
   * Clean up old temporary files (optional maintenance)
   */
  async cleanupOldFiles(daysOld: number = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const allBlobs = await this.list('temp/');
      const oldBlobs = allBlobs.filter(blob => blob.uploadedAt < cutoffDate);

      for (const blob of oldBlobs) {
        await this.delete(blob.pathname);
        console.log(`Deleted old blob: ${blob.pathname}`);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();

    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv'
    };

    return contentTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Check if blob storage is properly configured
   */
  isConfigured(): boolean {
    return !!this.token;
  }
}

// Export singleton instance
export const blobStorage = new BlobStorage();

// Helper functions for common operations
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  options?: { lessonId?: string; userId?: string; type: 'content' | 'export' | 'flashcard' }
): Promise<BlobFile> {
  if (!options?.type || options.type === 'content') {
    return blobStorage.uploadContent(buffer, filename, options?.lessonId, options?.userId);
  } else if (options.type === 'export') {
    return blobStorage.uploadExport(buffer, filename, options.lessonId!, 'document');
  } else if (options.type === 'flashcard') {
    return blobStorage.uploadFlashcardImage(buffer, filename, options.lessonId!, 0);
  }

  throw new Error(`Unknown upload type: ${options?.type}`);
}

export async function deleteFile(pathname: string): Promise<void> {
  return blobStorage.delete(pathname);
}

export async function listFiles(prefix?: string): Promise<BlobFile[]> {
  return blobStorage.list(prefix);
}