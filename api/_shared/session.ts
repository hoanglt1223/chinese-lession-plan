import type { VercelRequest } from '@vercel/node';

// Simple session store for serverless (in-memory, resets per function)
const sessionStore = new Map<string, any>();

export function getSession(req: VercelRequest): any {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  return sessionStore.get(sessionId) || {};
}

export function setSession(req: VercelRequest, data: any): void {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  sessionStore.set(sessionId, { ...getSession(req), ...data });
}

export function destroySession(req: VercelRequest): void {
  const sessionId = req.headers['x-session-id'] as string || 'default';
  sessionStore.delete(sessionId);
}
