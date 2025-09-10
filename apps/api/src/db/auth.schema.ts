import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
        .notNull()
        .default(false),
    image: text("image"),
    role: text("role", { 
        enum: ['reception', 'pa', 'consultant', 'admin', 'anonymous'] 
    }).default("consultant"),
    password: text("password"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),
});

export const user = sqliteTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
        .notNull()
        .default(false),
    image: text("image"),
    role: text("role", { 
        enum: ['reception', 'pa', 'consultant', 'admin', 'anonymous'] 
    }).default("consultant"),
    password: text("password"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .$defaultFn(() => /* @__PURE__ */ new Date())
        .notNull(),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),
});

export const session = sqliteTable("session", {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    timezone: text("timezone"),
    city: text("city"),
    country: text("country"),
    region: text("region"),
    regionCode: text("region_code"),
    colo: text("colo"),
    latitude: text("latitude"),
    longitude: text("longitude"),
});

export const account = sqliteTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => /* @__PURE__ */ new Date()),
});

// Business Logic Tables

// Services catalog table
export const services = sqliteTable("services", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    estMinutes: integer("est_minutes").notNull().default(15),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

// Visit records with comprehensive status tracking
export const visits = sqliteTable("visits", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    token: text("token").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    serviceId: integer("service_id").notNull().references(() => services.id),
    status: text("status", { 
        enum: ['new', 'approved', 'denied', 'in_session', 'completed', 'cancelled'] 
    }).notNull().default('new'),
    assignedConsultantId: text("assigned_consultant_id").references(() => users.id),
    paId: text("pa_id").references(() => users.id),
    receptionId: text("reception_id").notNull().references(() => users.id),
    notes: text("notes"),
    sessionNotes: text("session_notes"),
    waitTimeMinutes: integer("wait_time_minutes"),
    sessionStartTime: text("session_start_time"),
    sessionEndTime: text("session_end_time"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

// Audit log table for tracking all changes
export const audit = sqliteTable("audit", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    userId: text("user_id").notNull().references(() => users.id),
    oldValues: text("old_values"),
    newValues: text("new_values"),
    ipAddress: text("ip_address"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

// Token counter table for daily token generation
export const tokenCounter = sqliteTable("token_counter", {
    id: integer("id").primaryKey(),
    date: text("date").notNull(),
    counter: integer("counter").notNull().default(0),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});