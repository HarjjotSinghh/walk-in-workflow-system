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
        // CLERK_SECRET_KEY: '',
        // CLERK_PUBLISHABLE_KEY: '',
        // CLERK_WEBHOOK_SECRET: '',
        // ENVIRONMENT: 'production',
        // FRONTEND_URL: 'https://wiws.verbflo.com',
        // TURSO_DB_URL: '',
        // TURSO_DB_AUTH_TOKEN: '',
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
      // Note: Environment variables should be loaded before starting PM2
      // See docs/VPS_DEPLOYMENT.md for options on loading .env.production
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
      env_production: {
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
      // Note: Environment variables should be loaded before starting PM2
      // See docs/VPS_DEPLOYMENT.md for options on loading .env.production
    },
  ],
};

