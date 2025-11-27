# Clerk Authentication Migration Guide

## Overview
This guide walks through replacing Better Auth with Clerk for the Walk-In Workflow System.

## Why Clerk?

- ✅ **Free tier**: 10,000 MAU (Monthly Active Users)
- ✅ **Built-in UI**: Pre-built sign-in/sign-up components
- ✅ **RBAC**: Role-based access control out of the box
- ✅ **Cloudflare Workers**: Native support
- ✅ **Zero database changes**: Clerk manages users externally
- ✅ **Session management**: Automatic token refresh
- ✅ **Multi-session**: Built-in support

## Prerequisites

1. Create a Clerk account at https://clerk.com
2. Create a new application in Clerk Dashboard
3. Note down your API keys:
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

## Step 1: Configure Clerk Roles

In Clerk Dashboard:
1. Go to **User & Authentication** → **Roles**
2. Create these roles:
   - `admin` - Full system access
   - `pa` - Personal Assistant role
   - `consultant` - Consultant role
   - `reception` - Reception role

3. Set permissions for each role (optional, for fine-grained control)

## Step 2: Install Dependencies

### API (Cloudflare Worker)
```bash
cd apps/api
pnpm remove better-auth better-auth-cloudflare
pnpm add @clerk/backend
```

### Web (React/Vite)
```bash
cd apps/web
pnpm remove better-auth
pnpm add @clerk/clerk-react
```

## Step 3: Update Environment Variables

### apps/api/wrangler.json
Replace Better Auth vars with:
```json
{
  "vars": {
    "CLERK_PUBLISHABLE_KEY": "pk_test_...",
    "CLERK_SECRET_KEY": "sk_test_...",
    "ENVIRONMENT": "development",
    "FRONTEND_URL": "http://localhost:5174"
  },
  "env": {
    "production": {
      "vars": {
        "CLERK_PUBLISHABLE_KEY": "pk_live_...",
        "CLERK_SECRET_KEY": "sk_live_...",
        "ENVIRONMENT": "production",
        "FRONTEND_URL": "https://wiws.pages.dev"
      }
    }
  }
}
```

### apps/web/.env.template
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8787
VITE_SITE_URL=http://localhost:5173
```

## Step 4: Database Cleanup (Optional)

Since Clerk manages users externally, you can optionally remove Better Auth tables:
- `session`
- `account`
- `verification`

Keep the `users` table if you want to sync Clerk users locally, or remove it entirely.

## Step 5: Code Changes

See the implementation files created in this migration.

## Step 6: Testing

1. Start the API: `cd apps/api && pnpm dev`
2. Start the Web: `cd apps/web && pnpm dev`
3. Test sign-up flow
4. Test sign-in flow
5. Test role-based access
6. Test SSE connections with Clerk tokens

## Step 7: Deployment

1. Update Cloudflare Workers secrets:
```bash
wrangler secret put CLERK_SECRET_KEY
```

2. Update Cloudflare Pages environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`

3. Deploy:
```bash
cd apps/api && pnpm deploy
cd apps/web && pnpm build:prod
```

## Migration Checklist

- [ ] Clerk account created
- [ ] Roles configured in Clerk Dashboard
- [ ] Dependencies installed
- [ ] Environment variables updated
- [ ] API middleware updated
- [ ] Web app provider updated
- [ ] Auth context updated
- [ ] Login/Register pages updated
- [ ] Protected routes updated
- [ ] SSE authentication updated
- [ ] Local testing completed
- [ ] Production deployment completed

## Rollback Plan

If issues occur:
1. Revert to Better Auth dependencies
2. Restore original auth files from git
3. Restore environment variables
4. Redeploy

## Cost Comparison

### Better Auth (Current)
- Free (self-hosted)
- Requires database storage
- Manual user management

### Clerk (New)
- Free up to 10,000 MAU
- No database needed for auth
- Built-in user management UI
- After 10,000 MAU: $25/month for 1,000 additional users

## Support

- Clerk Docs: https://clerk.com/docs
- Clerk Discord: https://clerk.com/discord
- Cloudflare Workers Guide: https://clerk.com/docs/deployments/cloudflare-workers
