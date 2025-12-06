import { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory rate limiter for development
// In production, you'd want to use Redis or another distributed store
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

export function createRateLimiter(config: RateLimitConfig) {
  return function rateLimit(req: VercelRequest, res: VercelResponse, next: () => void) {
    // Skip rate limiting in development if VITE_SKIP_RATE_LIMIT is set
    if (process.env.VITE_SKIP_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development') {
      return next();
    }

    const clientId = getClientIdentifier(req);
    const now = Date.now();

    // Get or initialize client data
    let clientData = requestCounts.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      // Reset window
      clientData = {
        count: 1,
        resetTime: now + config.windowMs
      };
      requestCounts.set(clientId, clientData);
      return next();
    }

    // Check if limit exceeded
    if (clientData.count >= config.maxRequests) {
      const resetIn = Math.ceil((clientData.resetTime - now) / 1000);
      return res.status(429).json({
        error: config.message || "Too many requests",
        retryAfter: resetIn
      });
    }

    // Increment count
    clientData.count++;
    requestCounts.set(clientId, clientData);
    next();
  };
}

function getClientIdentifier(req: VercelRequest): string {
  // Try to get client ID from various sources
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || 'unknown';

  // Add user ID if available for more specific rate limiting
  const userId = (req as any).session?.userId;
  return userId ? `user:${userId}` : `ip:${ip}`;
}

// Rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again later"
});

export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: "Rate limit exceeded, please slow down"
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 uploads per minute
  message: "Too many upload requests, please wait before uploading again"
});