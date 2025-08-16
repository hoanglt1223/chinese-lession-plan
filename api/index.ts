import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import session from 'express-session';
import { registerServerlessRoutes } from '../server/routes-serverless';

// Create Express app for serverless
const app = express();

// Middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session middleware with memory store for serverless compatibility
app.use(session({
  secret: process.env.SESSION_SECRET || 'edu-flow-session-secret',
  resave: false,
  saveUninitialized: false,
  store: undefined, // Use default memory store
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}) as any);

// CORS middleware for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Initialize routes using existing server logic
let routesInitialized = false;

async function initializeRoutes() {
  if (routesInitialized) return;
  
  try {
    // Register all your existing routes from server/routes-serverless.ts
    registerServerlessRoutes(app);
    routesInitialized = true;
    console.log('Routes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize routes:', error);
    throw error;
  }
}

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize routes on first request
    await initializeRoutes();
    
    // Convert Vercel request/response to Express format
    const expressReq = req as any;
    const expressRes = res as any;
    
    // Ensure the request URL is properly formatted for Express
    if (!expressReq.url.startsWith('/api')) {
      expressReq.url = `/api${expressReq.url}`;
    }
    
    // Use Express app to handle the request
    app(expressReq, expressRes);
    
  } catch (error: any) {
    console.error('Serverless handler error:', error);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
