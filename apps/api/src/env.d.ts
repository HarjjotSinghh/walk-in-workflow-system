export interface CloudflareBindings {
    DB: D1Database;
    DB_PROD: D1Database;
    KV: KVNamespace;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    FRONTEND_URL?: string;
    ENVIRONMENT?: string;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends CloudflareBindings {
            // Additional environment variables can be added here
        }
    }
}