# wiws Deployment Guide

This guide covers deploying the wiws Walk-in Workflow System to Cloudflare Pages (frontend) and Cloudflare Workers (backend API).

## Overview

The wiws system consists of:
- **Frontend**: Vite.js React application deployed to Cloudflare Pages
- **Backend**: Hono API deployed to Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Real-time**: Server-Sent Events (SSE)

## Prerequisites

1. Cloudflare account with Pages and Workers enabled
2. GitHub repository for the codebase
3. Local development environment set up

## Deployment Steps

### 1. Cloudflare D1 Database Setup

```bash
# Create production database
pnpm wrangler d1 create wiws

# Note the database ID and update wrangler.toml
# Update the database_id in wrangler.toml [env.production] section

# Apply migrations to production
pnpm wrangler d1 migrations apply wiws --env production
```

### 2. Environment Variables

Set these environment variables in Cloudflare:

#### For Workers (API):
```
BETTER_AUTH_SECRET=your-long-secure-secret-key-here
BETTER_AUTH_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
ENVIRONMENT=production
```

#### For Pages (Frontend):
```
VITE_API_URL=https://api.yourdomain.com
VITE_APP_URL=https://yourdomain.com
```

### 3. Deploy Backend (Workers)

```bash
cd apps/api

# Deploy to production
pnpm wrangler deploy --env production

# Verify deployment
curl https://api.yourdomain.com/health
```

### 4. Deploy Frontend (Pages)

1. **Connect GitHub Repository**:
   - Go to Cloudflare Pages dashboard
   - Click "Create a project"
   - Connect your GitHub repository
   - Select the main branch

2. **Build Configuration**:
   ```
   Framework preset: Vite
   Build command: cd apps/web && pnpm build
   Build output directory: apps/web/dist
   Root directory: /
   ```

3. **Environment Variables**:
   Add the frontend environment variables in Pages settings

4. **Custom Domain**:
   - Add your custom domain (e.g., wiws.com)
   - Configure DNS records as instructed

### 5. Database Seeding

After deployment, seed the production database:

```bash
# Seed production database
curl -X POST https://api.yourdomain.com/seed
```

## Configuration Files

### wrangler.toml (Already configured)
- Database bindings
- Environment variables
- Routes configuration
- Cron triggers for daily token reset

### Frontend Build Configuration
The frontend is already configured for production builds with:
- TypeScript compilation
- Vite optimization
- Asset bundling
- Route configuration

## Post-Deployment Verification

1. **Frontend Health Check**:
   - Visit https://yourdomain.com
   - Verify landing page loads
   - Test navigation to dashboard

2. **Backend Health Check**:
   - Visit https://api.yourdomain.com/health
   - Should return healthy status

3. **Database Connectivity**:
   - Test service loading: https://api.yourdomain.com/api/services
   - Verify seed data is present

4. **Authentication Flow**:
   - Test anonymous login
   - Verify session management
   - Test role-based access

5. **Core Workflow**:
   - Test visit creation (Reception)
   - Test visit approval (PA)
   - Test session management (Consultant)
   - Test analytics and export (Admin)

## Security Considerations

1. **Authentication**:
   - Change default BETTER_AUTH_SECRET
   - Configure proper CORS origins
   - Enable HTTPS-only cookies

2. **Database**:
   - Backup strategy for D1
   - Monitor query performance
   - Set up audit log retention

3. **API Security**:
   - Rate limiting enabled
   - Input validation on all endpoints
   - CSRF protection where needed

## Monitoring & Maintenance

1. **Cloudflare Analytics**:
   - Monitor page views and performance
   - Track API request patterns
   - Set up alerts for errors

2. **Database Monitoring**:
   - Monitor D1 usage and limits
   - Set up automated backups
   - Track audit log growth

3. **Performance Optimization**:
   - Enable Cloudflare caching
   - Optimize asset delivery
   - Monitor Core Web Vitals

## Scaling Considerations

The current free-tier configuration supports:
- **D1 Database**: 100,000 rows, 1GB storage
- **Workers**: 100,000 requests/day
- **Pages**: Unlimited static requests

For higher traffic:
1. Upgrade to paid Cloudflare plans
2. Consider D1 to Neon Postgres migration
3. Implement advanced caching strategies
4. Set up CDN optimization

## Backup & Recovery

1. **Database Backups**:
   - Daily automated exports via cron
   - Store backups in Cloudflare R2
   - Test restore procedures

2. **Code Backups**:
   - GitHub repository serves as source backup
   - Tag releases for rollback capability
   - Document configuration changes

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**:
   - Verify D1 database ID in wrangler.toml
   - Check migration status
   - Ensure bindings are correct

2. **Authentication Issues**:
   - Verify BETTER_AUTH_SECRET is set
   - Check CORS configuration
   - Validate callback URLs

3. **Frontend Build Errors**:
   - Verify Node.js version compatibility
   - Check TypeScript compilation
   - Validate environment variables

### Debug Commands:

```bash
# Check D1 database
pnpm wrangler d1 execute wiws --command "SELECT COUNT(*) FROM user"

# View Workers logs
pnpm wrangler tail

# Test local development
pnpm dev
```

## Success Metrics

Post-deployment, the system should achieve:
- ✅ Landing page loads < 2.5s (LCP)
- ✅ Visit creation < 10s
- ✅ Real-time updates < 1s
- ✅ 99.9% uptime
- ✅ Zero-cost operation on free tiers

## Support & Documentation

- **Code Repository**: GitHub (link to your repo)
- **API Documentation**: Available at `/api/docs` (if implemented)
- **User Guides**: Document role-specific workflows
- **Admin Training**: Cover audit logs and export features

---

## Quick Deployment Checklist

- [ ] Database created and migrated
- [ ] Environment variables configured
- [ ] Workers deployed and healthy
- [ ] Pages deployed and accessible
- [ ] Database seeded with initial data
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates active
- [ ] Authentication tested
- [ ] Core workflow tested
- [ ] Analytics and exports verified
- [ ] Backup strategy implemented
- [ ] Monitoring alerts configured

**Deployment Status: Ready for Production** ✅