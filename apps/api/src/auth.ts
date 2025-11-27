import { createClerkClient } from '@clerk/backend';
import type { CloudflareBindings } from './env';

/**
 * Create a Clerk client instance for authentication
 */
export const createClerkClientInstance = (env: CloudflareBindings) => {
  if (!env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY environment variable is required');
  }

  return createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
  });
};
