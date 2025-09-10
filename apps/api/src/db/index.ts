// Environment interface for Cloudflare Workers
export interface Env {
  DB: D1Database;
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  DB_PROD: D1Database;
  KV: KVNamespace;
  ENVIRONMENT?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  FRONTEND_URL?: string;
}

import { env } from "cloudflare:workers";

import { schema } from "./schema";

// Re-export the drizzle-orm types and utilities from here for convenience
export * from "drizzle-orm";

// Re-export the feature schemas for use in other files
export * from "./auth.schema"; // Export individual tables for drizzle-kit

import { drizzle } from "drizzle-orm/libsql";

// You can specify any property from the libsql connection options
export const db = drizzle({
	connection: {
		url: env.TURSO_DB_URL || "file:dev.db",
		authToken: env.TURSO_DB_AUTH_TOKEN || undefined,
	},
});
