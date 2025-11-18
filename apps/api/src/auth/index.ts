import { betterAuth } from "better-auth";
import { admin, anonymous, multiSession } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { user, session, account, verification } from "../db/schema";
import { createDb } from "../db/utils";
import type { CloudflareBindings } from "../env";
import type { UserRole } from "../types/auth";

// Single auth configuration that handles both CLI and runtime scenarios
function createAuth(env?: CloudflareBindings, cf?: IncomingRequestCfProperties) {
    return betterAuth({
        database: env?.DATABASE 
            ? drizzleAdapter(createDb(), {
                provider: "sqlite",
                schema: {
                    user: user,
                    session: session,
                    account: account,
                    verification: verification,
                },
            })
            : drizzleAdapter(createDb(), {
                provider: "sqlite",
                schema: {
                    user: user,
                    session: session,
                    account: account,
                    verification: verification,
                },
            }),
            plugins: [
                admin({defaultRole: 'reception' as UserRole}),
                multiSession(),
                anonymous({
                    generateName: (ctx) => {
                        return `Anonymous User ${new Date().getTime().toString().slice(0, 8)}`;
                    },
                    emailDomainName: "wiws.com",
                    onLinkAccount: async ({ anonymousUser, newUser }) => {
                        // Handle account linking logic
                        console.log(`Linking anonymous user ${anonymousUser.user.id} to ${newUser.user.id}`);
                    },
                    disableDeleteAnonymousUser: false,
                })
            ],
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: env?.ENVIRONMENT === 'production',
            minPasswordLength: 8,
            maxPasswordLength: 128,
        },
        session: {
            expiresIn: 60 * 60 * 24 * 7, // 7 days
            updateAge: 60 * 60 * 24, // 1 day
            cookieCache: {
                enabled: true,
                maxAge: 5 * 60, // 5 minutes
            },
        },
        user: {
            additionalFields: {
                role: {
                    type: "string",
                    required: false,
                    defaultValue: "reception",
                    validate: (value: string) => {
                        const validRoles: UserRole[] = ['reception', 'pa', 'consultant', 'admin', 'anonymous'];
                        return validRoles.includes(value as UserRole);
                    },
                },
                isActive: {
                    type: "boolean",
                    required: false,
                    defaultValue: true,
                },
                isAnonymous: {
                    type: "boolean",
                    required: false,
                    defaultValue: false,
                },
            },
        },
        rateLimit: {
            enabled: true,
            window: 60, // 1 minute
            max: 100, // 100 requests per minute
        },
        trustedOrigins: [
            'http://localhost:5173', // Vite dev server default
            'http://localhost:5174', // Vite dev server alternative
            'http://localhost:3000',  // Alternative dev server
            'http://localhost:4173',  // Vite preview server
            'http://127.0.0.1:5173',  // Alternative localhost
            'http://127.0.0.1:5174',  // Alternative localhost
            'https://wiws.pages.dev',
            'https://wiws.vercel.app',
            'https://wiws-frontend.pages.dev',
            'https://wiws.harjjotsinghh.workers.dev',
            'https://wiws-prod.harjjotsinghh.workers.dev',
            'https://wiws-db.harjjotsinghh.workers.dev',
            'https://wiws-frontend.harjjotsinghh.workers.dev',
        ],
        secret: env?.BETTER_AUTH_SECRET || "your-secret-key-change-in-production-very-long-string",
        baseURL: env?.BETTER_AUTH_URL || "http://localhost:8787",
        logger: {
            enabled: env?.ENVIRONMENT !== 'production',
            level: "info",
        },
        advanced: {
            crossSubDomainCookies: {
                enabled: true,
                domain: env?.ENVIRONMENT === 'production' ? '.wiws.com' : undefined,
            },
        },
    });
}

// Export for CLI schema generation
export const auth = createAuth();

// Export for runtime usage
export { createAuth };