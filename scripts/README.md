
This directory contains PowerShell scripts for managing and deploying the Nimble Agenda booking system to Vercel.

## Quick Start

### 1. Setup Vercel Token
```powershell
.\set-vercel-token-env.ps1
```

### 2. Test Setup
```powershell
.\test-deployment-setup.ps1
```

### 3. Deploy to Production
```powershell
.\deploy-vercel.ps1
```

## Available Scripts

### Core Deployment Scripts

#### `set-vercel-token-env.ps1`
Configures the Vercel deployment token as an environment variable in your Vercel project.

**Usage:**
```powershell
.\set-vercel-token-env.ps1
```

**What it does:**
- Reads token from `vercel-deploy-token.txt`
- Sets `VERCEL_TOKEN` in both production and preview environments
- Validates token format and provides feedback

#### `deploy-vercel.ps1`
Executes automated deployments using the configured token.

**Usage:**
```powershell
# Deploy to production (default)
.\deploy-vercel.ps1

# Deploy to preview
.\deploy-vercel.ps1 -Environment preview

# Force deployment (skip prompts)
.\deploy-vercel.ps1 -Force
```

**Parameters:**
- `-Environment`: Target environment (`production` or `preview`)
- `-Force`: Skip confirmation prompts

**What it does:**
- Validates project linkage to Vercel
- Checks for available `VERCEL_TOKEN`
- Builds the application (`npm run build`)
- Deploys to specified environment
- Provides deployment URL

#### `test-deployment-setup.ps1`
Verifies that all components for automated deployment are correctly configured.

**Usage:**
```powershell
.\test-deployment-setup.ps1
```

**What it tests:**
- Vercel CLI availability
- Project linkage to Vercel
- Token file existence and content
- Script file existence
- VERCEL_TOKEN environment variable
- Build script functionality
- Package.json configuration
- Vercel.json configuration

### Existing Environment Scripts

#### `set-vercel-supabase-env.ps1`
Sets Supabase environment variables in Vercel.

**Usage:**
```powershell
.\set-vercel-supabase-env.ps1
```

#### `set-vercel-firebase-env.ps1`
Sets Firebase environment variables in Vercel.

**Usage:**
```powershell
.\set-vercel-firebase-env.ps1
```

#### `set-vercel-supabase-key.ps1`
Sets the Supabase publishable key in Vercel.

**Usage:**
```powershell
.\set-vercel-supabase-key.ps1 -AnonKey "your-anon-key"
```

## Deployment Workflow

### Initial Setup
1. Ensure Vercel CLI is installed: `npm install -g vercel`
2. Link project to Vercel: `vercel link`
3. Configure Vercel token: `.\set-vercel-token-env.ps1`
4. Test setup: `.\test-deployment-setup.ps1`

**Package manager:** Deploy skripty volajú build cez `npm run build`. Ak v projekte používaš **pnpm**, pred deployom spusti `pnpm run build` manuálne na overenie; v skriptoch môžeš prípadne zmeniť na `pnpm run build`. V jednom clone používaj konzistentne jeden manager – viď [DEVELOPMENT-SETUP.md](../docs/DEVELOPMENT-SETUP.md).

### Regular Deployment
1. Make your code changes
2. Run deployment: `.\deploy-vercel.ps1`
3. Verify deployment URL

### Environment-Specific Deployment
```powershell
# Production deployment
.\deploy-vercel.ps1 -Environment production

# Preview deployment
.\deploy-vercel.ps1 -Environment preview
```

## Troubleshooting

### Common Issues

**"Project nie je pripojený k Vercel"**
```powershell
vercel link
```

**"VERCEL_TOKEN nie je nastavený"**
```powershell
.\set-vercel-token-env.ps1
```

**Build failures**
```powershell
npm run build
```

**Deployment failures**
Check Vercel dashboard for detailed error logs.

### Verification Commands
```powershell
# Check project linkage
vercel list

# Check environment variables
vercel env ls production
vercel env ls preview

# Manual deployment test
vercel --prod
```

## Security Notes

- **Token Storage**: Deployment token is stored in `vercel-deploy-token.txt`
- **Environment Variables**: Token is set as `VERCEL_TOKEN` in Vercel
- **Access Control**: Only users with Vercel project access can use these scripts
- **Git Safety**: Token files are in `.gitignore` and won't be committed

## Related Documentation

- [Development Setup (npm/pnpm, príprava na vývoj)](../docs/DEVELOPMENT-SETUP.md)
- [Vercel Automated Deployment](../docs/VERCEL-AUTOMATED-DEPLOYMENT.md)
- [Vercel Diagnostics](../docs/VERCEL-DIAGNOSTICS.md)
- [Firebase Auth Setup](../docs/FIREBASE-AUTH-SETUP.md)
- [Supabase Setup](../docs/AUTH-BOOKING-DOMAIN.md)