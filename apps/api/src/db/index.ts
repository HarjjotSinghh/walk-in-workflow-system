// Environment interface for Cloudflare Workers and Node.js
export interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  KV?: KVNamespace | any; // Optional for Node.js compatibility
  ENVIRONMENT?: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL?: string;
  CLERK_WEBHOOK_SECRET?: string;
}

// Note: cloudflare:workers is a special module only available in Cloudflare Workers runtime
// In Node.js, we'll use process.env instead via the getEnv() function below
// We cannot import cloudflare:workers in Node.js, so we check for it at runtime

import { createClient } from "@libsql/client";

import { schema } from "./schema";

// Re-export the drizzle-orm types and utilities from here for convenience
export * from "drizzle-orm";

// Re-export the feature schemas for use in other files
export * from "./auth.schema"; // Export individual tables for drizzle-kit

import { drizzle } from "drizzle-orm/libsql";

// Helper to get environment variables (works in both Cloudflare Workers and Node.js)
function getEnv(): Partial<Env> {
  // In Cloudflare Workers, env is accessed via the Hono context (c.env)
  // In Node.js, we use process.env
  // This function is only used for the global db export, which is mainly for development
  // In production code, always use createDbClient(env) with explicit env parameter
  
  // Check if we're in a Node.js environment
  if (typeof process !== "undefined" && process.env) {
    // Node.js environment - use process.env
    return {
      TURSO_DB_URL: process.env.TURSO_DB_URL || "",
      TURSO_DB_AUTH_TOKEN: process.env.TURSO_DB_AUTH_TOKEN || "",
      ENVIRONMENT: process.env.ENVIRONMENT,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "",
      CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || "",
      FRONTEND_URL: process.env.FRONTEND_URL,
      CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    };
  }
  
  // Cloudflare Workers environment - env should be passed via context
  // Return empty object as fallback (should not be used)
  return {};
}

// Create libsql client
export async function createLibsqlClient(env: Env) {
  const dbUrl = env.TURSO_DB_URL;
  const authToken = env.TURSO_DB_AUTH_TOKEN;

  if (!dbUrl) {
    throw new Error(
      "TURSO_DB_URL environment variable is required. " +
        "Please set TURSO_DB_URL to a valid libsql://, wss://, ws://, https://, or http:// URL."
    );
  }

  if (dbUrl.startsWith("file:")) {
    // In Node.js, file: URLs are allowed for local development
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      // Allow file: URLs in Node.js development
    } else {
      throw new Error(
        `Invalid database URL: "${dbUrl}". ` +
          "Cloudflare Workers does not support file: URLs. " +
          "Please use a remote database URL (libsql://, wss://, ws://, https://, or http://)."
      );
    }
  }

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  // Enable foreign keys for local SQLite only
  // Turso (libsql://) has foreign keys enabled by default and doesn't support PRAGMA statements
  if (!dbUrl.startsWith("libsql://")) {
    try {
      await client.execute("PRAGMA foreign_keys = ON");
    } catch (error) {
      // Log but don't fail - some databases might not support this or it might already be enabled
      console.warn("Failed to enable foreign keys:", error);
    }
  }

  return client;
}

// Global db export - only available in Node.js, not in Cloudflare Workers
// In Cloudflare Workers, always use createDbClient(env) with explicit env parameter
// This is lazy-initialized to prevent module load errors in Cloudflare Workers
let _db: ReturnType<typeof drizzle> | null = null;

function getGlobalDb() {
  // Only initialize in Node.js environment
  if (typeof process === "undefined") {
    throw new Error(
      "The global 'db' export is not available in Cloudflare Workers. " +
      "Use createDbClient(env) instead with the env parameter from the request context."
    );
  }
  
  if (!_db) {
    const envVars = getEnv();
    const dbUrl = envVars.TURSO_DB_URL;
    
    if (!dbUrl) {
      throw new Error(
        "TURSO_DB_URL environment variable is required. " +
        "The global 'db' export should only be used in Node.js development. " +
        "In Cloudflare Workers, use createDbClient(env) instead."
      );
    }
    
    if (dbUrl.startsWith("file:")) {
      // Only allow file: URLs in Node.js development
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          `Invalid database URL: "${dbUrl}". ` +
          "File URLs should not be used in production. " +
          "Please use a remote database URL (libsql://, wss://, ws://, https://, or http://)."
        );
      }
    }
    
    // Create client synchronously for Node.js
    // This will only execute when db is actually accessed, not during module load
    const client = createClient({
      url: dbUrl,
      authToken: envVars.TURSO_DB_AUTH_TOKEN || undefined,
    });
    
    _db = drizzle({
      client,
    });
  }
  
  return _db;
}

// Export a Proxy that lazily initializes the db only when accessed
// This prevents initialization during module load in Cloudflare Workers
// The Proxy ensures createClient is never called during module load/bundling
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    // In Cloudflare Workers, this will throw immediately
    // In Node.js, this will lazily initialize the db
    const dbInstance = getGlobalDb();
    return (dbInstance as any)[prop];
  },
});
