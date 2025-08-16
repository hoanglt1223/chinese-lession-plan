import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertWorkflowSchema } from '../_shared/schema.js';
import { storage } from '../_shared/storage.js';
import { setCorsHeaders, handleOptions } from '../_shared/cors.js';
import { handleError } from '../_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    switch (req.method) {
      case 'POST':
        // Create new workflow
        const validatedData = insertWorkflowSchema.parse(req.body);
        const workflow = await storage.createWorkflow(validatedData);
        return res.json(workflow);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    return handleError(res, error, 'Workflows API');
  }
}
