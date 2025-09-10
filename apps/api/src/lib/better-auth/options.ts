import { BetterAuthOptions } from 'better-auth';
import { admin, anonymous, multiSession } from 'better-auth/plugins';
import { UserRole } from '../../types/auth';

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

  plugins: [
    admin({defaultRole: 'reception' satisfies UserRole}),
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

  // .... More options
};
