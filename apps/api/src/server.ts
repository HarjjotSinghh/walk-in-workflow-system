import { serve } from '@hono/node-server';
import app from './index';
import type { Env } from './db/index';

// Load environment variables from process.env
const env: Env = {
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || '',
  ENVIRONMENT: process.env.ENVIRONMENT || 'production',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://wiws.verbflo.com',
  TURSO_DB_URL: process.env.TURSO_DB_URL || '',
  TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN || '',
  // KV is not available in Node.js, create a mock
  KV: {
    get: async () => null,
    put: async () => {},
    delete: async () => {},
    list: async () => ({ keys: [] }),
  } as any, // Mock KV namespace for Node.js
};

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
      // Hono's Node.js adapter passes env as the second parameter
      return app.fetch(request, env);
    },
    port,
  },
  (info: { address: string; port: number; family: string }) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
    console.log(`📝 Health check: http://localhost:${info.port}/health`);
  }
);

