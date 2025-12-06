import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/cors.js';
import { handleError } from './_shared/error-handler.js';
import { listFiles, deleteFile, blobStorage } from './_shared/blob-storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const action = (req.query.action as string) || (req.body && req.body.action) || 'unknown';

  try {
    // --- List Files ---
    if (req.method === 'GET' && action === 'list') {
      const { prefix } = req.query;

      if (!blobStorage.isConfigured()) {
        return res.status(503).json({
          message: 'Blob storage not configured',
          configured: false
        });
      }

      const files = await listFiles(prefix as string);
      return res.json({
        files,
        configured: true,
        count: files.length
      });
    }

    // --- List Lesson Files ---
    if (req.method === 'GET' && action === 'lesson-files') {
      const { lessonId } = req.query;

      if (!lessonId) {
        return res.status(400).json({ message: 'lessonId is required' });
      }

      if (!blobStorage.isConfigured()) {
        return res.status(503).json({
          message: 'Blob storage not configured',
          configured: false
        });
      }

      const contentFiles = await blobStorage.getLessonFiles(lessonId as string);
      const exportFiles = await blobStorage.getLessonExports(lessonId as string);

      return res.json({
        contentFiles,
        exportFiles,
        configured: true,
        totalCount: contentFiles.length + exportFiles.length
      });
    }

    // --- Delete File ---
    if (req.method === 'POST' && action === 'delete') {
      const { pathname } = req.body;

      if (!pathname) {
        return res.status(400).json({ message: 'pathname is required' });
      }

      if (!blobStorage.isConfigured()) {
        return res.status(503).json({
          message: 'Blob storage not configured',
          configured: false
        });
      }

      await deleteFile(pathname);
      return res.json({
        success: true,
        message: 'File deleted successfully',
        configured: true
      });
    }

    // --- Cleanup Old Files ---
    if (req.method === 'POST' && action === 'cleanup') {
      const { daysOld = 7 } = req.body;

      if (!blobStorage.isConfigured()) {
        return res.status(503).json({
          message: 'Blob storage not configured',
          configured: false
        });
      }

      await blobStorage.cleanupOldFiles(daysOld);
      return res.json({
        success: true,
        message: `Cleaned up files older than ${daysOld} days`,
        configured: true
      });
    }

    // --- Storage Status ---
    if (req.method === 'GET' && action === 'status') {
      return res.json({
        configured: blobStorage.isConfigured(),
        message: blobStorage.isConfigured()
          ? 'Blob storage is properly configured and ready to use'
          : 'Blob storage is not configured. Set BLOB_READ_WRITE_TOKEN environment variable.'
      });
    }

    return res.status(400).json({ message: `Unknown action: ${action}` });

  } catch (error: any) {
    return handleError(res, error, `File Manager API (${action})`);
  }
}