import * as authSchema from "./auth.schema";

// Combine all schemas here for migrations
export const schema = {
    ...authSchema,
    // Export individual tables for easier access
    user: authSchema.user,
    users: authSchema.user,
    session: authSchema.session,
    sessions: authSchema.session,
    account: authSchema.account,
    verification: authSchema.verification,
    services: authSchema.services,
    visits: authSchema.visits,
    audit: authSchema.audit,
    tokenCounter: authSchema.tokenCounter,
} as const;

// Re-export all tables individually for convenience
export const {
    user,
    session,
    account,
    verification,
    services,
    visits,
    audit,
    tokenCounter,
} = schema;
