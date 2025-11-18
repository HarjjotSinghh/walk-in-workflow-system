// Cloudflare Workers environment bindings
export interface CloudflareBindings {
  // Clerk Authentication
  CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  
  // Database
  DB: D1Database;
  DB_PROD: D1Database;
  DATABASE?: D1Database; // Alias for compatibility
  
  // KV Storage
  KV: KVNamespace;
  
  // Environment
  ENVIRONMENT?: 'development' | 'production';
  FRONTEND_URL?: string;
  
  // Legacy (can be removed after migration)
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  TURSO_DB_URL?: string;
  TURSO_DB_AUTH_TOKEN?: string;
}

// Extend Hono's Env type
declare module 'hono' {
  interface Env {
    Bindings: CloudflareBindings;
  }
}
