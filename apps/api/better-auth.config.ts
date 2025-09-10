/**
 * Better Auth CLI configuration file
 *
 * Docs: https://www.better-auth.com/docs/concepts/cli
 */
import { drizzle } from 'drizzle-orm/d1';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { betterAuth, createLogger } from 'better-auth';
import {schema} from './src/db/schema';
import { BetterAuthOptions } from 'better-auth';
import { db } from './src/db/index';

const { BETTER_AUTH_URL, BETTER_AUTH_SECRET, ENVIRONMENT } = process.env;
const isProduction = ENVIRONMENT === 'production';
const baseURL = BETTER_AUTH_URL || 'http://localhost:8787';

/**
 * Custom options for Better Auth
 *
 * Docs: https://www.better-auth.com/docs/reference/options
 */
export const betterAuthOptions: BetterAuthOptions = {
  /**
   * The name of the application.
   */
  appName: 'wiws',
  /**
   * Base path for Better Auth.
   * @default "/api/auth"
   */
  basePath: '/api/auth',

  advanced: {
    crossSubDomainCookies: {
      enabled: false, // Disable this as it can cause issues in production
    },
    defaultCookieAttributes: {
      secure: isProduction, // Only use secure cookies in production
      httpOnly: true,
      // domain: isProduction ? 'domain: "wiws.pages.dev";' : 'localhost',
      sameSite: isProduction ? 'None' : 'Lax', // Use "lax" for better compatibility across domains
      path: "/",
      partitioned: true
    },
  },

  trustedOrigins: [
    // Development origins
    'http://localhost:5173', // Vite dev server default
    'http://localhost:5174', // Vite dev server alternative
    'http://localhost:3000',  // Alternative dev server
    'http://localhost:4173',  // Vite preview server
    'http://localhost:4174',  // Vite preview server
    'http://127.0.0.1:4173',  // Vite preview server
    'http://127.0.0.1:4174',  // Vite preview server
    'http://127.0.0.1:5173',  // Alternative localhost
    'http://127.0.0.1:5174',  // Alternative localhost
    // Production origins
    'https://wiws.pages.dev',
    'https://wiws-frontend.pages.dev',
    'https://wiws.harjjotsinghh.workers.dev',
    'https://wiws-api.harjjotsinghh.workers.dev',
    'https://wiws-prod.harjjotsinghh.workers.dev',
    'https://wiws-db.harjjotsinghh.workers.dev',
    'https://wiws-frontend.harjjotsinghh.workers.dev',
  ],

  // logger: createLogger({}),
  // database: drizzle(drizzleAdapter(), {schema: schema, })

  // .... More options
};

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  ...betterAuthOptions,
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  baseURL: baseURL, // Use the environment-specific baseURL
  secret: BETTER_AUTH_SECRET,
  fetchOptions: {
    credentials: "include",
  },
  init: {
    credentials: "include",
  }
});
