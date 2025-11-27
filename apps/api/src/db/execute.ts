// Legacy/unused file - kept for reference but not actively used
// This file previously used the global db export which caused issues in Cloudflare Workers
// If needed in the future, use createDbClient(env) instead

export interface Env {
  TURSO_DB_URL: string;
  TURSO_DB_AUTH_TOKEN: string;
}

export default {
  async fetch(_request: Request, _env: Env) {
    return new Response(
      "This endpoint is not implemented. Use createDbClient(env) for database access.",
      {
        status: 501,
      }
    );
  },
};
