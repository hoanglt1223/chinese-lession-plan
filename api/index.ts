import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import 'dotenv/config';

// Import handlers
import courseOpsHandler from './course-ops.js';
import aiOpsHandler from './ai-ops.js';
import contentOpsHandler from './content-ops.js';
import authHandler from './auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for dev, or specify client URL
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Wrapper to adapt Express req/res to Vercel handler signature if needed
// Since Express req/res are compatible with VercelRequest/VercelResponse for the most part,
// we can pass them directly.
const adaptHandler = (handler: (req: any, res: any) => Promise<void | any>) => async (req: any, res: any) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    if (!(res as any).headersSent) {
      (res as any).status(500).json({ error: 'Internal Server Error' });
    }
  }
};

// Routes
app.all('/api/course-ops', adaptHandler(courseOpsHandler));
app.all('/api/ai-ops', adaptHandler(aiOpsHandler));
app.all('/api/content-ops', adaptHandler(contentOpsHandler));
app.all('/api/auth', adaptHandler(authHandler));
app.all('/api/consolidated', adaptHandler(require('./consolidated.js').default));
app.all('/api/system', adaptHandler(require('./system.js').default));
// Add other routes if needed, e.g. tools
// app.all('/api/tools/text-to-image', adaptHandler(textToImageHandler));

// Health check
app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
