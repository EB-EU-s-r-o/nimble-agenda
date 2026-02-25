# Vercel Automated Deployment Setup

This document explains how to set up automated deployments using your Vercel deployment token for the Nimble Agenda booking system.

## Overview

The automated deployment system consists of:

- **Vercel deployment token** - Used for CLI authentication
- **Environment variable setup script** - Configures the token in Vercel
- **Deployment script** - Executes automated deployments
- **Integration with existing workflow** - Works with your current Supabase setup

## Prerequisites

1. **Vercel CLI installed**:

   ```bash
   npm install -g vercel
   ```

2. **Project linked to Vercel**:

   ```bash
   vercel link
   ```

3. **Vercel deployment token** - Already provided in `scripts/vercel-deploy-token.txt`

## Setup Process

### Step 1: Configure Vercel Token Environment Variable

Run the setup script to configure the token in your Vercel project:

```powershell
.\scripts\set-vercel-token-env.ps1
```

This script will:
- Read the token from `scripts/vercel-deploy-token.txt`
- Set `VERCEL_TOKEN` as an environment variable in both production and preview environments
- Verify the setup was successful

### Step 2: Test the Deployment

Execute the automated deployment script:

```powershell
.\scripts\deploy-vercel.ps1
```

This will:
- Verify the project is linked to Vercel
- Check that `VERCEL_TOKEN` is available
- Build the application (`npm run build`)
- Deploy to production environment
- Provide the deployment URL

## Usage

### Basic Deployment

```powershell
# Deploy to production (default)
.\scripts\deploy-vercel.ps1

# Deploy to preview environment
.\scripts\deploy-vercel.ps1 -Environment preview
```

### Advanced Options

```powershell
# Force deployment (skip confirmation prompts)
.\scripts\deploy-vercel.ps1 -Force

# Deploy to preview with force
.\scripts\deploy-vercel.ps1 -Environment preview -Force
```

## Script Details

### `set-vercel-token-env.ps1`

**Purpose**: Configures the Vercel deployment token as an environment variable in your Vercel project.

**Key Features**:
- Reads token from `scripts/vercel-deploy-token.txt`
- Sets token for both production and preview environments
- Validates token format and content
- Provides clear error messages and success feedback

**Usage**:
```powershell
.\scripts\set-vercel-token-env.ps1
```

### `deploy-vercel.ps1`

**Purpose**: Executes automated deployments using the configured token.

**Key Features**:
- Validates project linkage to Vercel
- Checks for available `VERCEL_TOKEN`
- Builds the application before deployment
- Handles deployment errors gracefully
- Provides deployment URL and option to open in browser
- Supports both production and preview environments

**Parameters**:
- `-Environment`: Target environment (`production` or `preview`, default: `production`)
- `-Force`: Skip confirmation prompts (switch parameter)

**Usage**:
```powershell
# Basic deployment
.\scripts\deploy-vercel.ps1

# With parameters
.\scripts\deploy-vercel.ps1 -Environment preview -Force
```

## Integration with Existing Workflow

The automated deployment system integrates seamlessly with your existing setup:

1. **Supabase Environment Variables**: Continue using your existing scripts:
   ```powershell
   .\scripts\set-vercel-supabase-env.ps1
   .\scripts\set-vercel-firebase-env.ps1
   ```

2. **Build Process**: The deployment script automatically runs `npm run build`

3. **Vercel Configuration**: Uses your existing `vercel.json` configuration

## Troubleshooting

### Common Issues

1. **"Project nie je pripojený k Vercel"**
   - Solution: Run `vercel link` in your project directory

2. **"VERCEL_TOKEN nie je nastavený"**
   - Solution: Run `.\scripts\set-vercel-token-env.ps1` first

3. **Build failures**
   - Solution: Check your code for TypeScript/React errors
   - Run `npm run build` manually to see detailed errors

4. **Deployment failures**
   - Solution: Check Vercel dashboard for detailed error logs
   - Verify all required environment variables are set

### Verification Commands

```powershell
# Check if project is linked
vercel list

# Check environment variables
vercel env ls production
vercel env ls preview

# Manual deployment (for testing)
vercel --prod
```

## Security Notes

- **Token Storage**: The deployment token is stored in `scripts/vercel-deploy-token.txt` and should be kept secure
- **Environment Variables**: The token is set as `VERCEL_TOKEN` in Vercel's environment variables
- **Access Control**: Only users with access to your Vercel project can use these scripts
- **Git Safety**: The `.env` file and deployment token are in `.gitignore` and won't be committed

## Best Practices

1. **Regular Updates**: Keep your deployment scripts updated with the latest project changes
2. **Environment Separation**: Use different tokens for different environments if needed
3. **Monitoring**: Check Vercel dashboard regularly for deployment status
4. **Backup**: Keep a backup of your deployment token in a secure location
5. **Testing**: Always test deployments in preview environment before production

## Related Documentation

- [Vercel Diagnostics](VERCEL-DIAGNOSTICS.md) - Troubleshooting Vercel issues
- [Firebase Auth Setup](FIREBASE-AUTH-SETUP.md) - Firebase integration
- [Supabase Setup](AUTH-BOOKING-DOMAIN.md) - Supabase configuration