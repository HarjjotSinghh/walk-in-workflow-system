import type { Env } from './index';
import { db, createLibsqlClient } from "./index";
import type { Client } from "@libsql/client";

// Helper function to create drizzle instance
export function createDb() {
  return db;
}

// D1-like interface wrapper for libsql
export async function createDbClient(env: Env) {
  const client = await createLibsqlClient(env);

  // Ensure foreign keys are enabled for local SQLite only
  // Turso (libsql://) has foreign keys enabled by default and doesn't support PRAGMA statements
  const dbUrl = env.TURSO_DB_URL;
  if (dbUrl && !dbUrl.startsWith("libsql://")) {
    try {
      await client.execute("PRAGMA foreign_keys = ON");
    } catch (error) {
      console.warn("Failed to enable foreign keys:", error);
    }
  }

  // Test connection with a simple query (using correct libsql format)
  try {
    await client.execute({ sql: "SELECT 1", args: [] });
  } catch (error) {
    console.error("Database connection test failed:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Database connection failed: ${errorMsg}`);
  }

  return {
    prepare: (sql: string) => {
      return {
        bind: (...args: any[]) => {
          return {
            first: async <T = any>(): Promise<T | null> => {
              const result = await client.execute({ sql, args });
              return (result.rows[0] as T) || null;
            },
            all: async <T = any>(): Promise<{ results: T[] }> => {
              const result = await client.execute({ sql, args });
              return { results: result.rows as T[] };
            },
            run: async () => {
              const result = await client.execute({ sql, args });
              return {
                meta: {
                  last_row_id: result.lastInsertRowid
                    ? BigInt(result.lastInsertRowid.toString())
                    : undefined,
                  changes: result.rowsAffected,
                },
              };
            },
          };
        },
        first: async <T = any>(): Promise<T | null> => {
          const result = await client.execute({ sql, args: [] });
          return (result.rows[0] as T) || null;
        },
        all: async <T = any>(): Promise<{ results: T[] }> => {
          const result = await client.execute({ sql, args: [] });
          return { results: result.rows as T[] };
        },
        run: async () => {
          const result = await client.execute({ sql, args: [] });
          return {
            meta: {
              last_row_id: result.lastInsertRowid
                ? BigInt(result.lastInsertRowid.toString())
                : undefined,
              changes: result.rowsAffected,
            },
          };
        },
      };
    },
  };
}

// Database utility functions
export class DatabaseUtils {
  private client: Client | null = null;

  constructor(private env: Env) {}

  private async getClient(): Promise<Client> {
    if (!this.client) {
      this.client = await createLibsqlClient(this.env);
    }
    return this.client;
  }

  get db() {
    return db;
  }

  get libsql() {
    return this.client;
  }

  // Get current timestamp in ISO format
  getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // Generate unique token for daily visits
  async generateDailyToken(): Promise<string> {
    const today = new Date().toISOString().split("T")[0];

    try {
      const client = await this.getClient();
      // Get today's counter
      const result = await client.execute({
        sql: "SELECT counter FROM token_counter WHERE date = ?",
        args: [today],
      });

      let counter = 1;
      if (result.rows.length > 0 && result.rows[0].counter) {
        counter = Number(result.rows[0].counter) + 1;
        await client.execute({
          sql: "UPDATE token_counter SET counter = ?, updated_at = ? WHERE date = ?",
          args: [counter, this.getCurrentTimestamp(), today],
        });
      } else {
        await client.execute({
          sql: "INSERT OR REPLACE INTO token_counter (id, date, counter, updated_at) VALUES (1, ?, ?, ?)",
          args: [today, counter, this.getCurrentTimestamp()],
        });
      }

      return `B-${String(counter).padStart(3, "0")}`;
    } catch (error) {
      console.error("Error generating daily token:", error);
      throw new Error("Failed to generate daily token");
    }
  }

  // Log audit trail
  async logAudit(
    entity: string,
    entityId: string,
    action: string,
    userId: string,
    oldValues?: object | null,
    newValues?: object | null,
    ipAddress?: string
  ): Promise<void> {
    try {
      const client = await this.getClient();
      await client.execute({
        sql: `INSERT INTO audit (entity, entity_id, action, user_id, old_values, new_values, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          entity,
          entityId,
          action,
          userId,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress || null,
          this.getCurrentTimestamp(),
        ],
      });
    } catch (error) {
      console.error("Error logging audit:", error);
      throw new Error("Failed to log audit trail");
    }
  }
}

// Helper function to create database utils instance
export function createDatabaseUtils(env: Env): DatabaseUtils {
  return new DatabaseUtils(env);
}

// Response helper functions
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Operation successful',
  };
}

export function errorResponse(message: string, statusCode: number = 400) {
  return {
    success: false,
    error: message,
    statusCode,
  };
}
