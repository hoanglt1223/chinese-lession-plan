# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with EduFlow.

## 🚨 Common Issues and Solutions

### OpenAI API Issues

#### Error: "Unsupported value: 'temperature' does not support 0.3 with this model"

**Cause**: gpt-5-nano model doesn't support temperature parameter.

**Solution**:
```javascript
// ❌ Incorrect
{
  model: "gpt-5-nano",
  temperature: 0.3  // Not supported
}

// ✅ Correct
{
  model: "gpt-5-nano"
  // No temperature parameter
}
```

#### Error: "OpenAI API key not found"

**Symptoms**:
- AI features not working
- Error messages about missing API key

**Solution**:
1. Check environment variables:
   ```bash
   echo $OPENAI_API_KEY
   ```

2. Add to `.env` file:
   ```bash
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. Restart the server:
   ```bash
   npm run dev
   ```

#### Error: "Rate limit exceeded"

**Symptoms**:
- AI operations fail intermittently
- "Too many requests" errors

**Solution**:
1. Check your OpenAI usage dashboard
2. Upgrade your OpenAI plan if needed
3. Implement request throttling:
   ```javascript
   // Add delays between AI requests
   await new Promise(resolve => setTimeout(resolve, 1000));
   ```

### File Upload Issues

#### Error: "File too large"

**Symptoms**:
- PDF upload fails
- "413 Payload Too Large" error

**Solution**:
1. Check file size (current limit: 10MB)
2. Compress PDF if needed
3. Increase limit in `server/index.ts`:
   ```javascript
   app.use(express.json({ limit: '20mb' }));
   app.use(express.urlencoded({ limit: '20mb', extended: true }));
   ```

#### Error: "No files uploaded"

**Symptoms**:
- Upload button doesn't work
- Files not detected

**Solution**:
1. Check file input element
2. Verify form data format:
   ```javascript
   const formData = new FormData();
   formData.append('files', file);
   ```

3. Check network tab for request details

### Database Connection Issues

#### Error: "Database connection failed"

**Symptoms**:
- App won't start
- "ECONNREFUSED" errors

**Solution for Development**:
1. Use in-memory storage (default):
   ```bash
   # Remove DATABASE_URL from .env
   # App will use memory storage
   ```

**Solution for Production**:
1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check connection string:
   ```bash
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

3. Test connection:
   ```bash
   docker-compose exec postgres psql -U eduflow_user eduflow
   ```

### Image Loading Issues

#### Images showing as "AI image loading..." indefinitely

**Symptoms**:
- Flashcard images don't load
- Stuck on loading state

**Causes & Solutions**:

1. **Unsplash URLs instead of DALL-E**:
   ```javascript
   // Check routes.ts - ensure DALL-E URLs are preserved
   imageUrl: card.imageUrl // Use DALL-E URL, not Unsplash
   ```

2. **CORS issues with DALL-E URLs**:
   - DALL-E URLs expire after 1 hour
   - Generate fresh images if needed

3. **Network connectivity**:
   ```bash
   # Test image URL directly
   curl -I "https://oaidalleapiprodscus.blob.core.windows.net/..."
   ```

#### Error: "Failed to generate image"

**Symptoms**:
- Placeholder images instead of AI-generated ones
- Console errors about image generation

**Solution**:
1. Check OpenAI API key has DALL-E access
2. Verify image prompt format:
   ```javascript
   const prompt = "A simple, clear, educational illustration for children learning Chinese: ${description}. Clean, bright, cartoon-style suitable for preschool flashcards. No text or characters in the image.";
   ```

3. Check DALL-E 3 configuration:
   ```javascript
   {
     model: "dall-e-3",
     size: "1024x1024",
     quality: "standard",
     n: 1
   }
   ```

### Frontend Issues

#### Error: "Module not found" or TypeScript errors

**Symptoms**:
- App won't compile
- Import errors

**Solution**:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check path aliases in `vite.config.ts`:
   ```typescript
   resolve: {
     alias: {
       "@": path.resolve(__dirname, "./client/src"),
     },
   }
   ```

3. Restart development server:
   ```bash
   npm run dev
   ```

#### UI Components not rendering correctly

**Symptoms**:
- Broken layout
- Missing styles

**Solution**:
1. Check Tailwind CSS is working:
   ```bash
   # Verify tailwind.config.ts is correct
   # Check if styles are being processed
   ```

2. Verify shadcn/ui components:
   ```bash
   npx shadcn-ui@latest add button
   ```

3. Check for CSS conflicts in browser dev tools

### Workflow Issues

#### Steps not progressing correctly

**Symptoms**:
- Can't move to next step
- Data not saving between steps

**Solution**:
1. Check workflow state management:
   ```javascript
   // Verify useWorkflow hook
   const { workflow, currentStep, updateStep } = useWorkflow(lessonId);
   ```

2. Check API endpoint parameters:
   ```javascript
   // Ensure correct parameter names
   await apiRequest('PATCH', `/api/workflows/${workflowId}`, {
     currentStep: 1,  // Not 'step'
     stepData: data,
     completedSteps: [0]
   });
   ```

3. Check localStorage for stuck state:
   ```javascript
   // Clear workflow cache
   localStorage.removeItem('workflow-cache');
   ```

#### Quick Test Flow button not working

**Symptoms**:
- Button click has no effect
- No error messages

**Solution**:
1. Check `input.pdf` exists in `attached_assets/`
2. Verify API endpoints are accessible:
   ```bash
   curl http://localhost:5000/api/upload
   curl http://localhost:5000/api/analyze
   ```

3. Check browser console for errors
4. Verify mutation function:
   ```javascript
   const quickStartMutation = useMutation({
     mutationFn: async () => {
       // Implementation
     },
     onSuccess: (data) => {
       setSelectedLesson(data.lessonId);
     }
   });
   ```

### Performance Issues

#### Slow AI responses

**Symptoms**:
- Long wait times for AI operations
- Timeouts

**Solution**:
1. Check OpenAI API status
2. Reduce content size:
   ```javascript
   // Limit vocabulary size
   const vocabulary = extractedVocab.slice(0, 5);
   ```

3. Implement timeout handling:
   ```javascript
   const controller = new AbortController();
   setTimeout(() => controller.abort(), 30000); // 30s timeout
   ```

#### High memory usage

**Symptoms**:
- App becomes slow
- Browser crashes

**Solution**:
1. Clear TanStack Query cache:
   ```javascript
   queryClient.clear();
   ```

2. Limit cached lessons:
   ```javascript
   // In storage.ts
   const MAX_CACHED_LESSONS = 50;
   ```

3. Check for memory leaks in components

### Development Issues

#### Hot reload not working

**Symptoms**:
- Changes don't reflect automatically
- Need to refresh manually

**Solution**:
1. Check Vite configuration:
   ```typescript
   // vite.config.ts
   server: {
     hmr: true,
     port: 5173
   }
   ```

2. Verify file watching:
   ```bash
   # Check file system limits
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   ```

#### Build errors

**Symptoms**:
- Production build fails
- Type errors in build

**Solution**:
1. Run type checking:
   ```bash
   npx tsc --noEmit
   ```

2. Check for unused imports:
   ```bash
   npm run lint
   ```

3. Build step by step:
   ```bash
   npm run build:client
   npm run build:server
   ```

## 🔍 Debugging Tools

### Browser DevTools

1. **Network Tab**: Check API requests and responses
2. **Console**: View JavaScript errors and logs
3. **Application Tab**: Inspect localStorage and sessionStorage
4. **Sources Tab**: Set breakpoints in code

### Server Debugging

```bash
# View server logs
npm run dev 2>&1 | tee debug.log

# Enable debug mode
DEBUG=express:* npm run dev

# Check specific endpoints
curl -v http://localhost:5000/api/health
```

### Database Debugging

```bash
# Connect to database
docker-compose exec postgres psql -U eduflow_user eduflow

# Check table contents
SELECT * FROM lessons LIMIT 5;
SELECT * FROM workflows LIMIT 5;

# Monitor queries
# Enable query logging in postgresql.conf
```

## 📊 Monitoring and Logs

### Application Monitoring

```javascript
// Add custom logging
console.log('Step completed:', { step, data, timestamp: new Date() });

// Monitor AI operations
console.time('AI Generation');
await generateFlashcards(vocabulary);
console.timeEnd('AI Generation');
```

### Error Tracking

```javascript
// Custom error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to monitoring service
});

// React error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('React error:', error, errorInfo);
  }
}
```

## 🆘 Getting Help

### Information to Collect

When reporting issues, include:

1. **Environment details**:
   ```bash
   node --version
   npm --version
   docker --version
   ```

2. **Error messages**: Full stack traces
3. **Steps to reproduce**: Exact sequence of actions
4. **Expected vs actual behavior**
5. **Browser/OS information**

### Useful Commands

```bash
# Check system resources
docker stats
df -h
free -m

# View all logs
docker-compose logs --tail=100

# Export configuration
docker-compose config

# Check port usage
netstat -tulpn | grep :5000
```

### Log Files

```bash
# Application logs
tail -f logs/app.log

# Database logs
tail -f logs/postgres.log

# System logs
journalctl -u docker -f
```

## 🔧 Quick Fixes

### Reset Application State

```bash
# Clear all data and restart
docker-compose down -v
docker-compose up -d
```

### Fix Common TypeScript Issues

```typescript
// Add type assertions
const data = response.data as LessonData;

// Fix undefined checks
if (selectedCard?.id) {
  updateCard(selectedCard.id, updates);
}
```

### Reset Development Environment

```bash
# Complete reset
rm -rf node_modules package-lock.json
npm install
rm -rf .next .vite
npm run dev
```

---

If you encounter issues not covered here, check the [API Reference](./api-reference.md) for endpoint details or the [Development Guide](./development.md) for setup instructions.