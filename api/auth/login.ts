import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_shared/storage.js';
import { setCorsHeaders, handleOptions } from '../_shared/cors.js';
import { setSession } from '../_shared/session.js';
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
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = await storage.authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    await storage.updateUserLogin(user.id);
    
    // Set session
    setSession(req, { userId: user.id });
    
    return res.json({ 
      user: {
        id: user.id,
        username: user.username,
        creditBalance: user.creditBalance
      }
    });
  } catch (error: any) {
    return handleError(res, error, 'Login API');
  }
}
