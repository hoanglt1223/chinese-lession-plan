
import express from 'express';
// import cors from 'cors'; // cors not installed
import 'dotenv/config';

// Import handlers
// Note: We use relative paths from this script file
import courseStructureHandler from '../api/course-structure';
import courseGenerateHandler from '../api/course-generate';
import fileContentHandler from '../api/file-content';
import authHandler from '../api/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Simple CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper to wrap Vercel-style handlers for Express
const wrapHandler = (handler: any) => async (req: any, res: any) => {
  try {
    // Vercel handlers expect (req, res)
    // Express provides (req, res) which are compatible enough for basic usage
    await handler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', details: String(error) });
    }
  }
};

// Define Routes
console.log('Setting up API routes...');

app.get('/api/course-structure', wrapHandler(courseStructureHandler));
app.post('/api/course-generate', wrapHandler(courseGenerateHandler));
app.post('/api/file-content', wrapHandler(fileContentHandler));
app.get('/api/auth', wrapHandler(authHandler));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Catch-all for debugging
app.use('/api/*', (req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'API Route not found', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`
  🚀 Dev Server running on http://localhost:${PORT}
  
  Routes:
  - GET  /api/course-structure
  - POST /api/course-generate
  - POST /api/file-content
  - GET  /api/auth
  `);
});
