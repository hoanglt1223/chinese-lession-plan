# Deployment Guide

This application has been configured for serverless deployment on Vercel with filesystem storage.

## Environment Variables

Set the following environment variables in your Vercel dashboard:

### Required
- `OPENAI_API_KEY` - Your OpenAI API key for GPT and image generation
- `SESSION_SECRET` - A secure random string for session encryption

### Optional
- `DEEPL_API_KEY` - DeepL API key for translation (falls back to OpenAI if not provided)
- `DATA_DIR` - Custom data directory path (defaults to `./data`)
- `SKIP_LOGIN` - Set to 'true' to bypass authentication in development
- `FRONTEND_URL` - Frontend URL for CORS (defaults to '*')

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**: Connect your GitHub repository to Vercel

2. **Configure Build Settings**:
   - Build Command: `pnpm run build:vercel`
   - Output Directory: `client/dist`
   - Install Command: `pnpm install`

3. **Set Environment Variables**: Add the required environment variables in Vercel dashboard

4. **Deploy**: Push to your main branch or deploy manually

### Manual Build

```bash
# Install dependencies
pnpm install

# Build for production
pnpm run build:vercel

# Start locally (for testing)
pnpm run start:serverless
```

## Features

### Serverless Compatible
- ✅ No database dependencies (uses filesystem storage)
- ✅ Memory-based sessions
- ✅ Stateless architecture
- ✅ Vercel function optimization

### DeepL Integration
- ✅ Robust fallback system (DeepL → OpenAI → Placeholder)
- ✅ Environment variable configuration
- ✅ Error handling and retry logic

### File Storage
- ✅ Filesystem-based data persistence
- ✅ JSON file storage for users, lessons, and workflows
- ✅ Automatic directory creation

## File Structure

```
├── api/
│   └── index.ts           # Serverless API endpoint
├── client/
│   ├── dist/              # Built frontend (auto-generated)
│   └── src/               # React application source
├── data/                  # Runtime data storage
│   ├── users.json         # User data
│   ├── lessons.json       # Lesson data
│   └── workflows.json     # Workflow data
├── server/
│   ├── routes.ts          # API route definitions
│   ├── services/          # Business logic
│   ├── storage-fs.ts      # Filesystem storage implementation
│   └── ...
├── shared/
│   └── schema.ts          # TypeScript interfaces and validation
└── vercel.json            # Vercel deployment configuration
```

## Default Users

The application comes with two default users:
- Username: `thuthao`, Password: `310799`
- Username: `thanhhoang`, Password: `090800`

## Storage Behavior

- Data is stored in JSON files in the `data/` directory
- Files are created automatically on first use
- Data persists across function invocations
- No external database required

## Translation Service

The application uses a robust translation system:

1. **Primary**: DeepL API (if `DEEPL_API_KEY` is provided)
2. **Fallback**: OpenAI translation 
3. **Final Fallback**: Placeholder translations

This ensures the application works even without DeepL configuration.

## Troubleshooting

### Build Issues
- Ensure all environment variables are set
- Check that TypeScript compilation passes: `pnpm run type-check`

### Runtime Issues
- Check Vercel function logs for errors
- Verify API endpoints respond correctly
- Ensure data directory permissions are correct

### Translation Issues
- Verify `DEEPL_API_KEY` is valid (if using DeepL)
- Check `OPENAI_API_KEY` is working
- Monitor API quotas and rate limits
