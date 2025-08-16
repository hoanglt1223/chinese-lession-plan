import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../_shared/cors.js';
import { destroySession } from '../_shared/session.js';
import { handleError } from '../_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    destroySession(req);
    return res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    return handleError(res, error, 'Logout API');
  }
}
