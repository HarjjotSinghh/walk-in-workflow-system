import { relations } from "drizzle-orm/relations";
import { user, account, audit, session, visits, services } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	audits: many(audit),
	sessions: many(session),
	visits_receptionId: many(visits, {
		relationName: "visits_receptionId_user_id"
	}),
	visits_paId: many(visits, {
		relationName: "visits_paId_user_id"
	}),
	visits_assignedConsultantId: many(visits, {
		relationName: "visits_assignedConsultantId_user_id"
	}),
}));

export const auditRelations = relations(audit, ({one}) => ({
	user: one(user, {
		fields: [audit.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const visitsRelations = relations(visits, ({one}) => ({
	user_receptionId: one(user, {
		fields: [visits.receptionId],
		references: [user.id],
		relationName: "visits_receptionId_user_id"
	}),
	user_paId: one(user, {
		fields: [visits.paId],
		references: [user.id],
		relationName: "visits_paId_user_id"
	}),
	user_assignedConsultantId: one(user, {
		fields: [visits.assignedConsultantId],
		references: [user.id],
		relationName: "visits_assignedConsultantId_user_id"
	}),
	service: one(services, {
		fields: [visits.serviceId],
		references: [services.id]
	}),
}));

export const servicesRelations = relations(services, ({many}) => ({
	visits: many(visits),
}));