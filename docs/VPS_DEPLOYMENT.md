# VPS Deployment Guide

This guide covers deploying the **wiws** (Walk-in Workflow System) to a VPS (Virtual Private Server) using PM2 for process management and Nginx as a reverse proxy.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Server Setup](#server-setup)
4. [Application Setup](#application-setup)
5. [API Server Configuration](#api-server-configuration)
6. [PM2 Configuration](#pm2-configuration)
7. [Nginx Configuration](#nginx-configuration)
8. [SSL Certificate Setup](#ssl-certificate-setup)
9. [Environment Variables](#environment-variables)
10. [Deployment Process](#deployment-process)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

---

## Quick Start

For experienced users, here's a condensed deployment checklist:

1. **Server Setup** (5-10 minutes)
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs nginx
   npm install -g pnpm@9.0.0 pm2
   sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
   ```

2. **Application Setup** (5 minutes)
   ```bash
   mkdir -p /var/www/wiws && cd /var/www/wiws
   git clone <your-repo> .
   pnpm install
   ```

3. **Build & Configure** (10 minutes)
   ```bash
   # Build API
   cd apps/api && pnpm install && pnpm build:server && cd ../..
   # Build Web
   cd apps/web && pnpm install && pnpm build && cd ../..
   # Create environment files (see Environment Variables section)
   ```

4. **Start with PM2** (2 minutes)
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup  # Follow instructions
   ```

5. **Configure Nginx & SSL** (10 minutes)
   ```bash
   # Copy Nginx config (see Nginx Configuration section)
   sudo cp /var/www/wiws/nginx.conf /etc/nginx/sites-available/wiws.verbflo.com
   sudo ln -s /etc/nginx/sites-available/wiws.verbflo.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   # Generate SSL certificate
   sudo certbot --nginx -d wiws.verbflo.com -d www.wiws.verbflo.com
   ```

**Total time: ~30-40 minutes for first-time setup**

For detailed instructions, continue reading the sections below.

---

## Prerequisites

Before deploying, ensure you have:

1. ✅ **VPS Server** with:
   - Ubuntu 20.04+ or Debian 11+ (recommended)
   - At least 2GB RAM
   - Root or sudo access
   - SSH access configured
2. ✅ **Domain Name** pointing to your VPS IP (e.g., `wiws.verbflo.com`)
3. ✅ **Node.js 22+** installed
4. ✅ **pnpm 9+** installed
5. ✅ **PM2** installed globally
6. ✅ **Nginx** installed
7. ✅ **Database** (Turso or local SQLite)
8. ✅ **Clerk Account** for authentication

---

## Server Setup

### Step 1: Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential
```

### Step 2: Install Node.js 22+

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v22.x or higher
npm --version
```

### Step 3: Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm@9.0.0

# Verify installation
pnpm --version  # Should be 9.x or higher
```

### Step 4: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions provided by the command
```

### Step 5: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify firewall status
sudo ufw status
```

---

## Application Setup

### Step 1: Create Application Directory

```bash
# Create directory for the application
sudo mkdir -p /var/www/wiws
sudo chown -R $USER:$USER /var/www/wiws

# Or use home directory
mkdir -p ~/wiws
cd ~/wiws
```

### Step 2: Clone Repository

```bash
# Clone your repository
git clone <your-repository-url> .

# Or if using a different directory
git clone <your-repository-url> /var/www/wiws
cd /var/www/wiws
```

### Step 3: Install Dependencies

```bash
# Install root dependencies
pnpm install

# Install dependencies for both apps
cd apps/api && pnpm install && cd ../..
cd apps/web && pnpm install && cd ../..
```

---

## API Server Configuration

The API needs to be adapted to run as a Node.js server instead of Cloudflare Workers.

### Step 1: Install Node.js Adapter for Hono

```bash
cd apps/api
pnpm add @hono/node-server
```

### Step 2: Create Node.js Server Entry Point

Create a new file `apps/api/src/server.ts`:

```typescript
import { serve } from '@hono/node-server';
import app from './index';
import { Env } from './db/index';

// Load environment variables
const env: Env = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
  ENVIRONMENT: process.env.ENVIRONMENT || 'production',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://wiws.verbflo.com',
  TURSO_DB_URL: process.env.TURSO_DB_URL || '',
  TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN || '',
};

// Inject environment into app context
// Note: You may need to modify the app to accept env differently
const port = parseInt(process.env.PORT || '8787', 10);

console.log(`🚀 Server starting on port ${port}`);
console.log(`📡 Environment: ${env.ENVIRONMENT}`);
console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
console.log(`🔗 Database URL: ${env.TURSO_DB_URL ? env.TURSO_DB_URL.substring(0, 30) + '...' : 'Not set'}`);

// Serve the app with environment injected
serve(
  {
    fetch: (request: Request) => {
      // Inject env into the request context
      return app.fetch(request, env);
    },
    port,
  },
  (info: { address: string; port: number; family: string }) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
    console.log(`📝 Health check: http://localhost:${info.port}/health`);
  }
);
```

### Step 3: Update package.json Scripts

The following scripts should already be added to `apps/api/package.json`:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "start:dev": "tsx watch src/server.ts",
    "build:server": "tsc -p tsconfig.server.json",
    "server": "node dist/server.js"
  }
}
```

**Note:** Make sure `@hono/node-server` and `tsx` are installed:
```bash
cd apps/api
pnpm add @hono/node-server
pnpm add -D tsx
```

### Step 4: Update CORS Configuration

Update `apps/api/src/index.ts` to include your production domain. Find the CORS configuration sections (around lines 34-81) and add:

```typescript
// In the CORS configuration for auth routes
origin: [
  // ... existing origins ...
  "https://wiws.verbflo.com",
  "http://wiws.verbflo.com", // For testing (remove in production)
],

// In the CORS configuration for other API routes
const allowedOrigins = [
  // ... existing origins ...
  "https://wiws.verbflo.com",
  "http://wiws.verbflo.com", // For testing (remove in production)
];
```

### Step 5: Build the API

```bash
cd apps/api

# Install dependencies (if not already done)
pnpm install

# Build the server
pnpm build:server

# Verify the build
ls -la dist/server.js
```

---

## PM2 Configuration

### Step 1: Create PM2 Ecosystem File

The `ecosystem.config.js` file should already be created in the project root. If not, create it:

```javascript
module.exports = {
  apps: [
    {
      name: 'wiws-api',
      cwd: process.cwd() + '/apps/api',
      script: 'dist/server.js',
      instances: 2, // Use 2 instances for load balancing
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8787,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8787,
        // Environment variables should be set in .env.production or system environment
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      env_file: '.env.production',
    },
    {
      name: 'wiws-web',
      cwd: process.cwd() + '/apps/web',
      script: 'npx',
      args: 'vite preview --host 0.0.0.0 --port 4173',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4173,
      },
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '300M',
      watch: false,
      env_file: '.env.production',
    },
  ],
};
```

**Note:** The `cwd` uses `process.cwd()` which will resolve to the directory where you run PM2. Make sure to run PM2 from the project root directory.

### Step 2: Create Logs Directory

```bash
mkdir -p /var/www/wiws/logs
```

### Step 3: Start Applications with PM2

```bash
# Navigate to project root
cd /var/www/wiws

# Start all applications
pm2 start ecosystem.config.js --env production

# Or start individually
pm2 start ecosystem.config.js --only wiws-api --env production
pm2 start ecosystem.config.js --only wiws-web --env production

# Save PM2 configuration
pm2 save
```

### Step 4: Verify PM2 Status

```bash
# Check status
pm2 status

# View logs
pm2 logs wiws-api
pm2 logs wiws-web

# View specific app
pm2 info wiws-api
```

---

## Nginx Configuration

### Step 1: Create Nginx Configuration File

Create `/etc/nginx/sites-available/wiws.verbflo.com`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name wiws.verbflo.com www.wiws.verbflo.com;

    # For Let's Encrypt certificate validation
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name wiws.verbflo.com www.wiws.verbflo.com;

    # SSL Configuration (will be updated after certificate generation)
    ssl_certificate /etc/letsencrypt/live/wiws.verbflo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wiws.verbflo.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/wiws-access.log;
    error_log /var/log/nginx/wiws-error.log;

    # Client body size limit (adjust as needed)
    client_max_body_size 10M;

    # API Proxy Configuration
    location /api {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket/SSE Support for streaming
    location /api/stream {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE specific settings
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
    }

    # Frontend Application
    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://localhost:4173;
            proxy_cache_valid 200 30d;
            add_header Cache-Control "public, immutable";
            expires 30d;
        }
    }

    # Health check endpoint (optional, for monitoring)
    location /health {
        proxy_pass http://localhost:8787/health;
        access_log off;
    }
}
```

### Step 2: Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/wiws.verbflo.com /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Step 1: Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Generate SSL Certificate

```bash
# Generate certificate for your domain
sudo certbot --nginx -d wiws.verbflo.com -d www.wiws.verbflo.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### Step 3: Verify Certificate Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically sets up a cron job for renewal
# Verify it exists:
sudo systemctl status certbot.timer
```

### Step 4: Manual Certificate Renewal (if needed)

```bash
# Renew certificate manually
sudo certbot renew

# Reload Nginx after renewal
sudo systemctl reload nginx
```

### Step 5: Verify SSL Configuration

```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration online
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=wiws.verbflo.com
```

---

## Environment Variables

### Step 1: Create Environment Files

Create `.env` files for each application:

**`apps/api/.env.production`:**
```env
NODE_ENV=production
PORT=8787
CLERK_SECRET_KEY=sk_live_YOUR_SECRET_KEY
CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
ENVIRONMENT=production
FRONTEND_URL=https://wiws.verbflo.com
TURSO_DB_URL=libsql://your-db-url.turso.io
TURSO_DB_AUTH_TOKEN=your-auth-token
```

**`apps/web/.env.production`:**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
VITE_API_URL=https://wiws.verbflo.com/api
VITE_APP_URL=https://wiws.verbflo.com
```

### Step 2: Load Environment Variables

PM2 doesn't natively support `env_file`. You have several options:

#### Option A: Use dotenv-cli (Recommended)

```bash
# Install dotenv-cli globally
npm install -g dotenv-cli

# Update ecosystem.config.js to use dotenv-cli
# Change the script to: "dotenv -e .env.production -- node dist/server.js"
```

#### Option B: Source Environment Variables Before Starting PM2

Create a startup script `start-pm2.sh`:

```bash
#!/bin/bash
cd /var/www/wiws/apps/api
export $(cat .env.production | xargs)
cd ../..
pm2 start ecosystem.config.js --env production
```

#### Option C: Set Environment Variables in System

Add to `/etc/environment` or create `/etc/systemd/system/pm2.service`:

```bash
# Edit /etc/environment
sudo nano /etc/environment

# Add your variables:
CLERK_SECRET_KEY=sk_live_...
TURSO_DB_URL=libsql://...
# etc.

# Reload environment
source /etc/environment
```

#### Option D: Use PM2's env_production Directly

Update `ecosystem.config.js`:

```javascript
env_production: {
  NODE_ENV: 'production',
  PORT: 8787,
  CLERK_SECRET_KEY: 'sk_live_YOUR_KEY', // ⚠️ Not recommended for secrets
  // ... other vars ...
},
```

**⚠️ Security Note:** Never commit `.env.production` files to Git. Use a secrets management tool or system environment variables for sensitive data.

---

## Deployment Process

### Step 1: Build Applications

```bash
cd /var/www/wiws

# Build API
cd apps/api
pnpm build:server
cd ../..

# Build Web
cd apps/web
pnpm build
cd ../..
```

### Step 2: Restart PM2 Applications

```bash
# Restart all applications
pm2 restart all

# Or restart individually
pm2 restart wiws-api
pm2 restart wiws-web

# Save PM2 configuration
pm2 save
```

### Step 3: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs --lines 50

# Test API
curl http://localhost:8787/health

# Test frontend
curl http://localhost:4173
```

### Step 4: Test Production URLs

```bash
# Test API through Nginx
curl https://wiws.verbflo.com/api/health

# Test frontend
curl -I https://wiws.verbflo.com
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View real-time monitoring
pm2 monit

# View process information
pm2 show wiws-api
pm2 show wiws-web

# View logs
pm2 logs wiws-api --lines 100
pm2 logs wiws-web --lines 100

# Restart applications
pm2 restart all

# Stop applications
pm2 stop all

# Delete applications from PM2
pm2 delete all
```

### Nginx Logs

```bash
# View access logs
sudo tail -f /var/log/nginx/wiws-access.log

# View error logs
sudo tail -f /var/log/nginx/wiws-error.log

# View general Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### System Resources

```bash
# Check system resources
htop
# or
top

# Check disk space
df -h

# Check memory usage
free -h
```

### Automated Deployment Script

Create `deploy.sh` in the project root:

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /var/www/wiws

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin master

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build API
echo "🔨 Building API..."
cd apps/api
pnpm build:server
cd ../..

# Build Web
echo "🔨 Building Web..."
cd apps/web
pnpm build
cd ../..

# Restart PM2 applications
echo "🔄 Restarting applications..."
pm2 restart all

# Save PM2 configuration
pm2 save

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x deploy.sh
```

Run deployment:

```bash
./deploy.sh
```

---

## Troubleshooting

### Common Issues

#### 1. PM2 Application Not Starting

```bash
# Check logs
pm2 logs wiws-api --err

# Check if port is already in use
sudo lsof -i :8787

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:8787)
```

#### 2. Nginx 502 Bad Gateway

```bash
# Check if API is running
pm2 status

# Check API logs
pm2 logs wiws-api

# Test API directly
curl http://localhost:8787/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/wiws-error.log
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiration
sudo openssl x509 -in /etc/letsencrypt/live/wiws.verbflo.com/cert.pem -noout -dates
```

#### 4. Database Connection Errors

```bash
# Check environment variables
pm2 env wiws-api

# Test database connection
cd apps/api
node -e "console.log(process.env.TURSO_DB_URL)"
```

#### 5. CORS Errors

- Verify `FRONTEND_URL` in API environment variables matches your domain
- Check CORS configuration in `apps/api/src/index.ts`
- Ensure Nginx is forwarding the correct headers

#### 6. Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules
pnpm install

# Clear build artifacts
rm -rf apps/*/dist
pnpm build
```

### Debug Commands

```bash
# Check all services
pm2 status
sudo systemctl status nginx
sudo systemctl status certbot.timer

# Test API endpoint
curl -v http://localhost:8787/health

# Test Nginx configuration
sudo nginx -t

# Check open ports
sudo netstat -tulpn | grep -E '8787|4173|80|443'

# View system logs
sudo journalctl -u nginx -f
```

---

## Security Best Practices

1. **Firewall Configuration**
   - Only allow necessary ports (SSH, HTTP, HTTPS)
   - Use fail2ban for SSH protection

2. **Environment Variables**
   - Never commit `.env` files to Git
   - Use secure methods to store secrets
   - Rotate API keys regularly

3. **SSL/TLS**
   - Enable HSTS (already in Nginx config)
   - Use strong cipher suites
   - Keep certificates updated

4. **PM2 Security**
   - Run PM2 as non-root user when possible
   - Limit log file sizes
   - Monitor resource usage

5. **Nginx Security**
   - Hide Nginx version
   - Use security headers (already configured)
   - Limit request sizes
   - Enable rate limiting if needed

---

## Quick Reference

### Essential Commands

```bash
# PM2
pm2 start ecosystem.config.js --env production
pm2 restart all
pm2 stop all
pm2 logs
pm2 status
pm2 save

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# SSL
sudo certbot renew
sudo certbot certificates

# Deployment
cd /var/www/wiws && git pull && pnpm install && pnpm build && pm2 restart all
```

### File Locations

- Application: `/var/www/wiws`
- Nginx config: `/etc/nginx/sites-available/wiws.verbflo.com`
- SSL certificates: `/etc/letsencrypt/live/wiws.verbflo.com/`
- PM2 logs: `/var/www/wiws/logs/`
- Nginx logs: `/var/log/nginx/`

---

## Support & Resources

- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Certbot Documentation:** https://certbot.eff.org/docs/
- **Hono Documentation:** https://hono.dev/
- **Vite Documentation:** https://vitejs.dev/

---

---

## Complete Deployment Checklist

Use this checklist to ensure all steps are completed:

### Pre-Deployment
- [ ] VPS server provisioned and accessible via SSH
- [ ] Domain name DNS records pointing to VPS IP
- [ ] Node.js 22+ installed
- [ ] pnpm 9+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed and running
- [ ] Firewall configured (SSH, HTTP, HTTPS)
- [ ] Database (Turso) created and accessible
- [ ] Clerk production application configured
- [ ] Environment variables documented

### Application Setup
- [ ] Repository cloned to `/var/www/wiws`
- [ ] Dependencies installed (`pnpm install`)
- [ ] API server file created (`apps/api/src/server.ts`)
- [ ] API dependencies installed (`@hono/node-server`, `tsx`)
- [ ] API built successfully (`pnpm build:server`)
- [ ] Web app built successfully (`pnpm build`)
- [ ] CORS configuration updated with production domain
- [ ] Environment files created (`.env.production`)

### PM2 Configuration
- [ ] `ecosystem.config.js` created in project root
- [ ] Logs directory created (`/var/www/wiws/logs`)
- [ ] PM2 applications started
- [ ] PM2 configuration saved (`pm2 save`)
- [ ] PM2 startup script configured
- [ ] Applications running and healthy

### Nginx Configuration
- [ ] Nginx config file created (`/etc/nginx/sites-available/wiws.verbflo.com`)
- [ ] Site enabled (symbolic link created)
- [ ] Nginx configuration tested (`sudo nginx -t`)
- [ ] Nginx reloaded/restarted
- [ ] HTTP redirects to HTTPS working

### SSL Certificate
- [ ] Certbot installed
- [ ] SSL certificate generated
- [ ] Certificate auto-renewal configured
- [ ] SSL certificate verified
- [ ] HTTPS working correctly

### Verification
- [ ] API health check passes (`curl http://localhost:8787/health`)
- [ ] Frontend accessible locally (`curl http://localhost:4173`)
- [ ] API accessible via domain (`curl https://wiws.verbflo.com/api/health`)
- [ ] Frontend accessible via domain (`curl -I https://wiws.verbflo.com`)
- [ ] Authentication flow works
- [ ] Database connections working
- [ ] No errors in PM2 logs
- [ ] No errors in Nginx logs

### Post-Deployment
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## Additional Resources

### Useful Commands Reference

```bash
# PM2
pm2 status                    # Check status
pm2 logs wiws-api             # View API logs
pm2 restart all               # Restart all apps
pm2 monit                     # Monitor resources
pm2 delete all                # Remove all apps

# Nginx
sudo nginx -t                 # Test configuration
sudo systemctl reload nginx   # Reload configuration
sudo systemctl restart nginx  # Restart Nginx
sudo tail -f /var/log/nginx/wiws-error.log  # View errors

# SSL
sudo certbot certificates     # List certificates
sudo certbot renew            # Renew certificates
sudo certbot renew --dry-run  # Test renewal

# System
df -h                         # Check disk space
free -h                       # Check memory
htop                          # Monitor resources
sudo ufw status               # Check firewall
```

### File Locations Summary

| Item | Location |
|------|----------|
| Application | `/var/www/wiws` |
| API Source | `/var/www/wiws/apps/api` |
| Web Source | `/var/www/wiws/apps/web` |
| API Build | `/var/www/wiws/apps/api/dist/server.js` |
| Web Build | `/var/www/wiws/apps/web/dist` |
| PM2 Config | `/var/www/wiws/ecosystem.config.js` |
| PM2 Logs | `/var/www/wiws/logs/` |
| Nginx Config | `/etc/nginx/sites-available/wiws.verbflo.com` |
| SSL Certificates | `/etc/letsencrypt/live/wiws.verbflo.com/` |
| Nginx Logs | `/var/log/nginx/` |

---

**Last Updated:** 2024-01-XX  
**Version:** 1.0.0 (VPS Deployment)

