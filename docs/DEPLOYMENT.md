# Production Deployment Guide

This guide covers deploying the **wiws** (Walk-in Workflow System) to production. The system consists of two applications:

- **@api**: Hono API deployed to Cloudflare Workers
- **@web**: React/Vite frontend deployed to Cloudflare Pages

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Database Setup (Turso)](#database-setup-turso)
4. [Authentication Setup (Clerk)](#authentication-setup-clerk)
5. [Deploying the API (@api)](#deploying-the-api-api)
6. [Deploying the Web App (@web)](#deploying-the-web-app-web)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Troubleshooting](#troubleshooting)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying, ensure you have:

1. ✅ **Cloudflare Account** with Workers and Pages enabled
2. ✅ **Turso Account** for database hosting (https://turso.tech)
3. ✅ **Clerk Account** for authentication (https://clerk.com)
4. ✅ **GitHub Repository** with your codebase
5. ✅ **Node.js 22+** and **pnpm 9+** installed locally
6. ✅ **Wrangler CLI** installed globally: `pnpm add -g wrangler`
7. ✅ **Turso CLI** installed: `curl -sSfL https://get.tur.so/install.sh | bash`

---

## Pre-Deployment Checklist

- [ ] All code is committed and pushed to your repository
- [ ] All tests pass locally
- [ ] Database migrations are tested
- [ ] Environment variables are documented
- [ ] Clerk production application is created
- [ ] Turso production database is created
- [ ] Custom domains are registered (if applicable)

---

## Database Setup (Turso)

### 1. Create Production Database

```bash
# Login to Turso
turso auth login

# Create a new database for production
turso db create wiws-prod

# Create a database token (save this securely!)
turso db tokens create wiws-prod --expiration 1y

# Get the database URL
turso db show wiws-prod
```

**Save these values:**
- Database URL: `libsql://wiws-prod-<your-org>.turso.io`
- Auth Token: `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...`

### 2. Apply Migrations

```bash
cd apps/api

# Generate migration files (if you have schema changes)
pnpm db:generate

# Apply migrations to production database
# Note: You'll need to use Turso CLI or a migration script
turso db shell wiws-prod < migrations/0001_initial_schema.sql
turso db shell wiws-prod < migrations/0002_better_auth_tables.sql
# ... apply all migrations in order
```

### 3. Verify Database Connection

```bash
# Test connection
turso db shell wiws-prod

# Run a test query
SELECT COUNT(*) FROM users;
```

---

## Authentication Setup (Clerk)

### 1. Create Production Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or use existing
3. Switch to **Production** environment
4. Navigate to **API Keys** and copy:
   - `Publishable Key` (starts with `pk_live_...`)
   - `Secret Key` (starts with `sk_live_...`)

### 2. Configure Clerk Roles

In Clerk Dashboard → **User & Authentication** → **Roles**, ensure these roles exist:

- `admin` - Full system access
- `pa` - Personal Assistant role
- `consultant` - Consultant role
- `reception` - Reception role

### 3. Configure Allowed Origins

In Clerk Dashboard → **Settings** → **Domains**:

1. Add your production frontend URL (e.g., `https://wiws.pages.dev`)
2. Add your production API URL (e.g., `https://wiws-api.harjjotsinghh.workers.dev`)
3. Configure CORS settings if needed

### 4. Set Up Webhooks (Optional)

If you need webhook support:

1. Go to **Webhooks** in Clerk Dashboard
2. Create a new endpoint: `https://your-api-url.com/api/auth/webhook`
3. Select events to listen to
4. Copy the **Signing Secret** (starts with `whsec_...`)

---

## Deploying the API (@api)

### Step 1: Update Production Configuration

Edit `apps/api/wrangler.json` and update the `env.production` section:

```json
{
  "env": {
    "production": {
      "vars": {
        "CLERK_SECRET_KEY": "sk_live_YOUR_ACTUAL_SECRET_KEY",
        "CLERK_PUBLISHABLE_KEY": "pk_live_YOUR_ACTUAL_PUBLISHABLE_KEY",
        "CLERK_WEBHOOK_SECRET": "whsec_YOUR_WEBHOOK_SECRET",
        "ENVIRONMENT": "production",
        "FRONTEND_URL": "https://your-frontend-domain.com",
        "TURSO_DB_AUTH_TOKEN": "YOUR_TURSO_AUTH_TOKEN",
        "TURSO_DB_URL": "libsql://wiws-prod-<your-org>.turso.io"
      }
    }
  }
}
```

**⚠️ Security Note:** Never commit production secrets to Git. Consider using Cloudflare Workers secrets instead (see below).

### Step 2: Set Environment Variables as Secrets (Recommended)

Instead of hardcoding in `wrangler.json`, use Cloudflare Workers secrets:

```bash
cd apps/api

# Set secrets for production environment
wrangler secret put CLERK_SECRET_KEY --env production
wrangler secret put CLERK_PUBLISHABLE_KEY --env production
wrangler secret put TURSO_DB_AUTH_TOKEN --env production
wrangler secret put TURSO_DB_URL --env production

# If using webhooks
wrangler secret put CLERK_WEBHOOK_SECRET --env production
```

When prompted, enter the actual values. These will be encrypted and stored securely.

### Step 3: Build and Deploy

```bash
cd apps/api

# Type check (optional but recommended)
pnpm type-check

# Deploy to production
pnpm deploy

# Or manually:
wrangler deploy --env production --minify
```

### Step 4: Verify Deployment

```bash
# Check health endpoint
curl https://your-api-url.workers.dev/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2024-..."
# }
```

### Step 5: Test Database Connection

```bash
# Test database endpoint
curl https://your-api-url.workers.dev/test-db

# Should return:
# {
#   "success": true,
#   "services": { "count": 0 },
#   "users": { "count": 0 }
# }
```

---

## Deploying the Web App (@web)

### Option 1: Deploy via Cloudflare Pages (Recommended)

#### Step 1: Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages**
2. Click **Create a project**
3. Connect your GitHub repository
4. Select the repository and branch (usually `main` or `master`)

#### Step 2: Configure Build Settings

**Build Configuration:**
- **Framework preset:** `Vite`
- **Build command:** `cd apps/web && pnpm install && pnpm build`
- **Build output directory:** `apps/web/dist`
- **Root directory:** `/` (leave empty or set to root)

**Environment Variables:**
Add these in the Pages dashboard → **Settings** → **Environment variables**:

```env
# Production environment
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
VITE_API_URL=https://your-api-url.workers.dev
VITE_APP_URL=https://your-frontend-domain.pages.dev
```

**Node.js Version:**
- Set to `22` or higher in build settings

#### Step 3: Deploy

1. Click **Save and Deploy**
2. Wait for the build to complete
3. Your site will be available at `https://your-project.pages.dev`

#### Step 4: Custom Domain (Optional)

1. Go to **Custom domains** in Pages settings
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `wiws.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate provisioning (usually < 5 minutes)

### Option 2: Deploy via Wrangler (Alternative)

If you prefer using Wrangler directly:

```bash
cd apps/web

# Build the application
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=wiws-frontend
```

---

## Post-Deployment Verification

### 1. Frontend Health Check

- [ ] Visit your frontend URL
- [ ] Landing page loads correctly
- [ ] No console errors in browser DevTools
- [ ] Clerk authentication UI appears

### 2. API Health Check

```bash
# Test health endpoint
curl https://your-api-url.workers.dev/health

# Test database connection
curl https://your-api-url.workers.dev/test-db
```

### 3. Authentication Flow

- [ ] User can register via Clerk
- [ ] User can sign in
- [ ] Session persists across page refreshes
- [ ] Protected routes require authentication
- [ ] Role-based access control works

### 4. Core Functionality

Test each role's workflow:

**Reception:**
- [ ] Can create new visits
- [ ] Can view visit queue
- [ ] Can assign tokens

**PA (Personal Assistant):**
- [ ] Can approve visits
- [ ] Can view pending visits
- [ ] Can manage consultant assignments

**Consultant:**
- [ ] Can start/end sessions
- [ ] Can view assigned visits
- [ ] Can update visit status

**Admin:**
- [ ] Can view analytics
- [ ] Can export data
- [ ] Can manage users
- [ ] Can view audit logs

### 5. Database Verification

```bash
# Connect to production database
turso db shell wiws-prod

# Check tables exist
.tables

# Verify data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM visits;
SELECT COUNT(*) FROM services;
```

### 6. Real-time Features

- [ ] Server-Sent Events (SSE) stream works
- [ ] Visit updates appear in real-time
- [ ] Queue updates automatically

---

## Environment Variables Reference

### API (@api) - Production Environment

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `CLERK_SECRET_KEY` | Clerk production secret key | `sk_live_...` | ✅ |
| `CLERK_PUBLISHABLE_KEY` | Clerk production publishable key | `pk_live_...` | ✅ |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | `whsec_...` | ❌ |
| `ENVIRONMENT` | Environment identifier | `production` | ✅ |
| `FRONTEND_URL` | Frontend production URL | `https://wiws.pages.dev` | ✅ |
| `TURSO_DB_URL` | Turso database URL | `libsql://...` | ✅ |
| `TURSO_DB_AUTH_TOKEN` | Turso authentication token | `eyJhbGci...` | ✅ |

### Web (@web) - Production Environment

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk production publishable key | `pk_live_...` | ✅ |
| `VITE_API_URL` | API production URL | `https://api.workers.dev` | ✅ |
| `VITE_APP_URL` | Frontend production URL | `https://wiws.pages.dev` | ❌ |

---

## Troubleshooting

### Common Issues

#### 1. API Deployment Fails

**Error:** `Error: Failed to publish`
- **Solution:** Check that all required environment variables are set
- Verify Wrangler is authenticated: `wrangler login`
- Check Cloudflare account limits

#### 2. Database Connection Errors

**Error:** `Database connection failed`
- **Solution:** 
  - Verify `TURSO_DB_URL` and `TURSO_DB_AUTH_TOKEN` are correct
  - Check Turso database is running: `turso db show wiws-prod`
  - Test connection locally first

#### 3. Frontend Build Fails

**Error:** `Build failed: Module not found`
- **Solution:**
  - Ensure `pnpm install` runs before build
  - Check Node.js version is 22+
  - Verify all dependencies are in `package.json`

#### 4. Authentication Not Working

**Error:** `Clerk authentication failed`
- **Solution:**
  - Verify Clerk keys are production keys (`pk_live_`, not `pk_test_`)
  - Check allowed origins in Clerk Dashboard
  - Verify CORS configuration in API
  - Check browser console for detailed errors

#### 5. CORS Errors

**Error:** `Access to fetch blocked by CORS policy`
- **Solution:**
  - Update `FRONTEND_URL` in API environment variables
  - Add frontend URL to CORS allowed origins in `apps/api/src/index.ts`
  - Redeploy API after changes

### Debug Commands

```bash
# View API logs
cd apps/api
wrangler tail --env production

# Test API locally with production config
wrangler dev --env production

# Check database status
turso db show wiws-prod

# View recent database queries
turso db shell wiws-prod
# Then run: .mode table
# SELECT * FROM visits ORDER BY created_at DESC LIMIT 10;
```

---

## Monitoring & Maintenance

### 1. Cloudflare Analytics

Monitor your deployments:

- **Workers Analytics:** View request counts, errors, CPU time
- **Pages Analytics:** View page views, bandwidth usage
- **Set up alerts** for error rates > 1%

### 2. Database Monitoring

- Monitor Turso database size and query performance
- Set up alerts for connection failures
- Regular backups (Turso provides automatic backups)

### 3. Performance Optimization

- Enable Cloudflare caching for static assets
- Monitor Core Web Vitals (LCP, FID, CLS)
- Optimize bundle sizes (check `vite build --analyze`)

### 4. Security Best Practices

- ✅ Use Cloudflare Workers secrets for sensitive data
- ✅ Rotate API keys regularly
- ✅ Enable Cloudflare DDoS protection
- ✅ Use HTTPS only (enforced by Cloudflare)
- ✅ Regular security audits

### 5. Backup Strategy

**Database Backups:**
- Turso provides automatic backups
- Manual backup: `turso db dump wiws-prod > backup.sql`

**Code Backups:**
- GitHub repository serves as source backup
- Tag releases: `git tag -a v1.0.0 -m "Production release"`
- Document configuration changes

### 6. Scaling Considerations

**Current Free Tier Limits:**
- **Cloudflare Workers:** 100,000 requests/day
- **Cloudflare Pages:** Unlimited requests
- **Turso:** Check current plan limits

**When to Upgrade:**
- Approaching request limits
- Database size > 1GB
- Need better performance SLAs

---

## Quick Reference Commands

```bash
# Deploy API
cd apps/api && pnpm deploy

# Deploy Web (via Pages dashboard or)
cd apps/web && pnpm build && wrangler pages deploy dist

# View API logs
cd apps/api && wrangler tail --env production

# Test database
turso db shell wiws-prod

# Check health
curl https://your-api-url.workers.dev/health

# Update secrets
cd apps/api && wrangler secret put VARIABLE_NAME --env production
```

---

## Support & Resources

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Clerk Docs:** https://clerk.com/docs
- **Turso Docs:** https://docs.turso.tech
- **Hono Framework:** https://hono.dev

---

## Deployment Checklist

Use this checklist for each deployment:

### Pre-Deployment
- [ ] Code reviewed and tested locally
- [ ] All migrations tested
- [ ] Environment variables documented
- [ ] Secrets stored securely (not in Git)

### Database
- [ ] Production database created
- [ ] Migrations applied successfully
- [ ] Database connection tested
- [ ] Backup strategy in place

### Authentication
- [ ] Clerk production app configured
- [ ] Roles created and assigned
- [ ] Allowed origins configured
- [ ] Webhooks configured (if needed)

### API Deployment
- [ ] `wrangler.json` production config updated
- [ ] Secrets set via `wrangler secret put`
- [ ] Deployment successful
- [ ] Health check passes
- [ ] Database connection verified

### Web Deployment
- [ ] Build succeeds locally
- [ ] Environment variables set in Pages
- [ ] Deployment successful
- [ ] Frontend loads without errors
- [ ] Authentication works

### Post-Deployment
- [ ] All health checks pass
- [ ] Authentication flow tested
- [ ] Core workflows tested
- [ ] Real-time features verified
- [ ] Monitoring alerts configured
- [ ] Documentation updated

---

**Last Updated:** 2024-01-XX  
**Version:** 2.0.0 (Clerk + Turso)
