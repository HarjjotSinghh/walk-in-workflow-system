// Type definitions for Cloudflare Workers types when building for Node.js
// These are only used for type checking and won't be available at runtime in Node.js

declare namespace Cloudflare {
  interface KVNamespace {
    get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
    put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: { expirationTtl?: number; expiration?: number; metadata?: any }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; expiration?: number; metadata?: any }>; list_complete: boolean; cursor?: string }>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1ExecResult>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: {
      duration: number;
      rows_read: number;
      rows_written: number;
      last_row_id: number;
      changed_db: boolean;
      changes: number;
    };
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }
}

// Global type declarations for Cloudflare Workers runtime
type KVNamespace = Cloudflare.KVNamespace;
type D1Database = Cloudflare.D1Database;

// Mock module declaration for cloudflare:workers
declare module 'cloudflare:workers' {
  export const env: any;
}

