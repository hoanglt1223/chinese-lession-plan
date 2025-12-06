# Deployment Guide

This project supports dual deployment: **Web (Vercel)** and **Desktop (Tauri)**

## 🚀 Web Deployment (Vercel)

### Automatic Deployment
- Push to `main`/`master` branch → Auto-deploy to Vercel
- GitHub Actions handles build and deployment automatically

### Manual Deployment
```bash
# Build for Vercel
pnpm build:vercel

# Deploy to Vercel
vercel --prod
```

### Required Environment Variables (Vercel)
Set these in your Vercel dashboard:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `DEEPL_AUTH_KEY` - DeepL API key (optional)

## 🖥️ Desktop Deployment (Tauri)

### Local Development
```bash
# Install Rust (one-time setup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install dependencies
pnpm install

# Run desktop app
pnpm tauri:dev

# Build desktop app
pnpm tauri:build
```

### GitHub Actions Auto-Build
- Push to `main`/`master` branch → Auto-build for all platforms
- Builds for: **Windows (.exe/.msi)**, **macOS (.dmg)**, **Linux (.deb/.AppImage)**
- Artifacts available in GitHub Actions tab (30 days retention)

### Release Build with GitHub Releases
```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# This triggers GitHub Actions release build
# Creates GitHub Release with all platform binaries
```

## 🔧 GitHub Actions Setup

### Required Secrets
Set these in GitHub repository settings > Secrets:

For Tauri builds:
- `GITHUB_TOKEN` (automatically available)

For Vercel deployment:
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID
- `VERCEL_TOKEN` - Vercel personal access token

### Get Vercel Credentials
```bash
# Install Vercel CLI
npm i -g vercel

# Link project (one-time)
vercel link

# Get IDs
vercel org ls
vercel projects ls

# Create token
vercel token create
```

## 📁 Build Outputs

### Web Build
- Location: `dist/public/`
- Deploy to: Vercel

### Desktop Build
- Location: `src-tauri/target/release/bundle/`
- Platforms:
  - **Windows**: `msi/*.msi`, `nsis/*.exe`
  - **macOS**: `dmg/*.dmg`, `macos/*.app.tar.gz`
  - **Linux**: `deb/*.deb`, `appimage/*.AppImage`

## 🔄 Development Workflow

### For Web Development
```bash
pnpm dev          # Start web dev server
pnpm build        # Build for production
```

### For Desktop Development
```bash
pnpm tauri:dev    # Start desktop app in development
pnpm tauri:build  # Build desktop app
```

### Testing Both
```bash
# Test web build
pnpm build
pnpm start        # Preview web build

# Test desktop build
pnpm tauri:build  # Build desktop
# Find binaries in src-tauri/target/release/bundle/
```

## 🌐 Environment Detection

The app automatically detects the environment:

```typescript
// In client/src/lib/api.ts
const API_BASE = import.meta.env.TAURI
  ? 'http://localhost:5000/api'  // Desktop app
  : '/api';                       // Web app
```

- **Web**: API calls go to `/api` (same origin)
- **Desktop**: API calls go to your deployed API endpoint

## ⚠️ Important Notes

### Desktop App API Connection
1. Deploy your API first to get a public URL
2. Update `API_BASE` in `client/src/lib/api.ts`:
   ```typescript
   const API_BASE = import.meta.env.TAURI
     ? 'https://your-app.vercel.app/api'  // Your deployed API
     : '/api';
   ```

### Database Connection
- Both web and desktop use the same PostgreSQL database
- No additional configuration needed

### File Handling
- **Web**: Uses browser file upload
- **Desktop**: Can optionally use native file dialogs (adapter ready)

## 🚨 Troubleshooting

### Rust Installation Issues
```bash
# Windows: Install from rustup.rs
# macOS: brew install rust
# Linux: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Build Fails on GitHub Actions
- Check if dependencies are installed correctly
- Verify platform-specific requirements are met
- Check action logs for specific error messages

### Vercel Deployment Issues
- Verify environment variables are set
- Check build logs in Vercel dashboard
- Ensure `vercel.json` is configured correctly

### Desktop App Can't Connect to API
1. Verify API_BASE URL is correct
2. Check if API is deployed and accessible
3. Test API endpoint in browser first

## 📞 Support

For deployment issues:
1. Check GitHub Actions logs
2. Verify environment variables
3. Test locally first
4. Review Tauri and Vercel documentation