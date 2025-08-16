import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_shared/storage.js';
import { setCorsHeaders, handleOptions } from '../_shared/cors.js';
import { getSession } from '../_shared/session.js';
import { handleError } from '../_shared/error-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if login is bypassed via environment variable
    if (process.env.VITE_SKIP_LOGIN === 'true' || process.env.NODE_ENV === 'development' && process.env.VITE_SKIP_AUTH === 'true') {
      // Return a default user for development
      const defaultUser = {
        id: "dev-user",
        username: "developer",
        creditBalance: "9999.00"
      };
      return res.json({ user: defaultUser });
    }

    const session = getSession(req);
    const userId = session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    return res.json({ 
      user: {
        id: user.id,
        username: user.username,
        creditBalance: user.creditBalance
      }
    });
  } catch (error: any) {
    return handleError(res, error, 'Auth check API');
  }
}
