import { sqliteTable, AnySQLiteColumn, foreignKey, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const account = sqliteTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at"),
	refreshTokenExpiresAt: integer("refresh_token_expires_at"),
	scope: text(),
	password: text(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const audit = sqliteTable("audit", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	entity: text().notNull(),
	entityId: text("entity_id").notNull(),
	action: text().notNull(),
	userId: text("user_id").notNull().references(() => user.id),
	oldValues: text("old_values"),
	newValues: text("new_values"),
	ipAddress: text("ip_address"),
	createdAt: text("created_at"),
});

export const services = sqliteTable("services", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	estMinutes: integer("est_minutes").default(15).notNull(),
	isActive: integer("is_active").default(1).notNull(),
	createdAt: text("created_at"),
	updatedAt: text("updated_at"),
});

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: integer("expires_at").notNull(),
	token: text().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	timezone: text(),
	city: text(),
	country: text(),
	region: text(),
	regionCode: text("region_code"),
	colo: text(),
	latitude: text(),
	longitude: text(),
},
(table) => [
	uniqueIndex("session_token_unique").on(table.token),
]);

export const tokenCounter = sqliteTable("token_counter", {
	id: integer().primaryKey().notNull(),
	date: text().notNull(),
	counter: integer().default(0).notNull(),
	updatedAt: text("updated_at"),
});

export const user = sqliteTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: integer("email_verified").default(1).notNull(),
	image: text(),
	role: text().default("consultant"),
	password: text(),
	isActive: integer("is_active").default(1).notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	isAnonymous: integer("is_anonymous").default(1),
},
(table) => [
	uniqueIndex("user_email_unique").on(table.email),
]);

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const visits = sqliteTable("visits", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	token: text().notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	serviceId: integer("service_id").notNull().references(() => services.id),
	status: text().default("new").notNull(),
	assignedConsultantId: text("assigned_consultant_id").references(() => user.id),
	paId: text("pa_id").references(() => user.id),
	receptionId: text("reception_id").notNull().references(() => user.id),
	notes: text(),
	sessionNotes: text("session_notes"),
	waitTimeMinutes: integer("wait_time_minutes"),
	sessionStartTime: text("session_start_time"),
	sessionEndTime: text("session_end_time"),
	createdAt: text("created_at"),
	updatedAt: text("updated_at"),
});

