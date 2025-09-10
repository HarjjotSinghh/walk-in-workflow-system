import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthEndpoint, openAPI } from "better-auth/plugins";
import * as authSchema from "./db/schema";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { db } from "./db/index";

const providers = [
	"apple",
	"discord",
	"dropbox",
	"facebook",
	"github",
	"gitlab",
	"google",
	"linkedin",
	"microsoft",
	"reddit",
	"roblox",
	"spotify",
	"tiktok",
	"twitch",
	"vk",
	"zoom",
	"x",
];

export const configuredProviders = providers.reduce<
	Record<
		string,
		{
			clientId: string;
			clientSecret: string;
			appBundleIdentifier?: string;
			tenantId?: string;
			requireSelectAccount?: boolean;
			clientKey?: string;
			issuer?: string;
		}
	>
>((acc, provider) => {
	const id = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
	const secret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
	if (id && id.length > 0 && secret && secret.length > 0) {
		acc[provider] = { clientId: id, clientSecret: secret };
	}
	if (provider === "apple" && acc[provider]) {
		const bundleId =
			process.env[`${provider.toUpperCase()}_APP_BUNDLE_IDENTIFIER`];
		if (bundleId && bundleId.length > 0) {
			acc[provider].appBundleIdentifier = bundleId;
		}
	}
	if (provider === "gitlab" && acc[provider]) {
		const issuer = process.env[`${provider.toUpperCase()}_ISSUER`];
		if (issuer && issuer.length > 0) {
			acc[provider].issuer = issuer;
		}
	}
	if (provider === "microsoft" && acc[provider]) {
		acc[provider].tenantId = "common";
		acc[provider].requireSelectAccount = true;
	}
	if (provider === "tiktok" && acc[provider]) {
		const key = process.env[`${provider.toUpperCase()}_CLIENT_KEY`];
		if (key && key.length > 0) {
			acc[provider].clientKey = key;
		}
	}
	return acc;
}, {});

/**
 * Better-Auth Plugin that returns the list of available social providers
 *
 * Usage on client:
 * ```ts
 * const socialProvidersClient = () => {
 *   id: "social-providers-client"
 *   $InferServerPlugin: {} as ReturnType<typeof socialProviders>
 *   getActions: ($fetch) => {
 *     return {
 *       getSocialProviders: async (fetchOptions?: BetterFetchOption) => {
 *         const res = $fetch("/social-providers", {
 *           method: "GET",
 *           ...fetchOptions,
 *         });
 *         return res.then((res) => res.data as string[]);
 *       },
 *     };
 *   },
 * } satisfies BetterAuthClientPlugin;
 *
 * export const authClient = createAuthClient({
 *   plugins: [socialProvidersClient()],
 * });
 * ```
 *
 * @returns BetterAuthServerPlugin
 */
export const socialProviders = () => ({
	id: "social-providers-plugin",
	endpoints: {
		getSocialProviders: createAuthEndpoint(
			"/social-providers",
			{
				method: "GET",
				metadata: {
					openapi: {
						description: "Returns the list of available social providers",
						responses: {
							200: {
								description: "Success",
								content: {
									"application/json": {
										schema: {
											type: "array",
											items: {
												type: "string",
											},
											description: "List of available social providers",
										},
									},
								},
							},
						},
					},
				},
			},
			async (ctx) =>
				ctx.json(ctx.context.socialProviders.map((p) => p.name.toLowerCase())),
		),
	},
});

const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:8787";
const baseURL = baseUrl + "/api/auth";

export const auth = betterAuth({
	baseURL: baseURL,
	secret: process.env.BETTER_AUTH_SECRET || undefined,
	socialProviders: configuredProviders,
	emailAndPassword: {
		enabled: true,
		autoSignIn: false,
		minPasswordLength: 8,
	},
	plugins: [openAPI(), socialProviders()],
	trustedOrigins: [
		baseURL,
		...[
            'http://localhost:5173', // Vite dev server default
            'http://localhost:5174', // Vite dev server alternative
            'http://localhost:3000',  // Alternative dev server
            'http://localhost:4173',  // Vite preview server
            'http://127.0.0.1:5173',  // Alternative localhost
            'http://127.0.0.1:5174',  // Alternative localhost,
            'http://localhost:4173',  // Vite preview server
            'http://localhost:4174',  // Vite preview server
            'http://127.0.0.1:4173',  // Vite preview server
            'http://127.0.0.1:4174',  // Vite preview server
            'https://wiws.pages.dev',
            'https://wiws-frontend.pages.dev',
            'https://wiws.harjjotsinghh.workers.dev',
            'https://wiws-api.harjjotsinghh.workers.dev',
            'https://wiws-prod.harjjotsinghh.workers.dev',
            'https://wiws-db.harjjotsinghh.workers.dev',
            'https://wiws-frontend.harjjotsinghh.workers.dev',
          ],
	],
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
});

// Function to create auth instance with environment variables
export const createAuth = (env: any, cf?: any) => {
	const client = createClient({
		url: env.TURSO_DB_URL || process.env.TURSO_DB_URL || "file:dev.db",
		authToken: env.TURSO_DB_AUTH_TOKEN || process.env.TURSO_DB_AUTH_TOKEN,
	});
	
	const dbInstance = drizzle(client, { schema: authSchema });
	
	return betterAuth({
		baseURL: baseURL,
		secret: env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET || undefined,
		socialProviders: configuredProviders,
		emailAndPassword: {
			enabled: true,
			autoSignIn: false,
			minPasswordLength: 8,
		},
		plugins: [openAPI(), socialProviders()],
		trustedOrigins: [
			env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "http://localhost:8787",
			...[
				'http://localhost:5173',
				'http://localhost:5174',
				'http://localhost:3000',
				'http://localhost:4173',
				'http://127.0.0.1:5173',
				'http://127.0.0.1:5174',
				'http://localhost:4173',
				'http://localhost:4174',
				'http://127.0.0.1:4173',
				'http://127.0.0.1:4174',
				'https://wiws.pages.dev',
				'https://wiws-frontend.pages.dev',
				'https://wiws.harjjotsinghh.workers.dev',
				'https://wiws-api.harjjotsinghh.workers.dev',
				'https://wiws-prod.harjjotsinghh.workers.dev',
				'https://wiws-db.harjjotsinghh.workers.dev',
				'https://wiws-frontend.harjjotsinghh.workers.dev',
			],
		],
		database: drizzleAdapter(dbInstance, {
			provider: "sqlite",
			schema: authSchema,
		}),
	});
};