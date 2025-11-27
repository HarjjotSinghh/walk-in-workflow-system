// Environment interface for Cloudflare Workers
export interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
  KV: KVNamespace;
  ENVIRONMENT?: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  FRONTEND_URL?: string;
}

import { env } from "cloudflare:workers";
import { createClient } from "@libsql/client";

import { schema } from "./schema";

// Re-export the drizzle-orm types and utilities from here for convenience
export * from "drizzle-orm";

// Re-export the feature schemas for use in other files
export * from "./auth.schema"; // Export individual tables for drizzle-kit

import { drizzle } from "drizzle-orm/libsql";

// Create libsql client
export async function createLibsqlClient(env: Env) {
  const dbUrl = env.TURSO_DB_URL;
  const authToken = env.TURSO_DB_AUTH_TOKEN;

  if (!dbUrl) {
    throw new Error(
      "TURSO_DB_URL environment variable is required. " +
        "Cloudflare Workers does not support file: URLs. " +
        "Please set TURSO_DB_URL to a valid libsql://, wss://, ws://, https://, or http:// URL."
    );
  }

  if (dbUrl.startsWith("file:")) {
    throw new Error(
      `Invalid database URL: "${dbUrl}". ` +
        "Cloudflare Workers does not support file: URLs. " +
        "Please use a remote database URL (libsql://, wss://, ws://, https://, or http://)."
    );
  }

  const client = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  // Enable foreign keys for SQLite/libsql
  try {
    await client.execute("PRAGMA foreign_keys = ON");
  } catch (error) {
    // Log but don't fail - some databases might not support this or it might already be enabled
    console.warn("Failed to enable foreign keys:", error);
  }

  return client;
}

// You can specify any property from the libsql connection options
export const db = drizzle({
	connection: {
		url: env.TURSO_DB_URL || "file:dev.db",
		authToken: env.TURSO_DB_AUTH_TOKEN || undefined,
	},
});
