import { Context, Next } from 'hono';
import { createClerkClient } from '@clerk/backend';
import type { CloudflareBindings } from '../env';
import type { ApiUser, UserRole } from '../types/auth';

// Extended Hono Context with our custom variables
export interface AuthContext extends Context {
  get: {
    (key: 'user'): ApiUser | null;
    (key: 'clerkUser'): any;
    (key: string): any;
  };
  set: {
    (key: 'user', value: ApiUser | null): void;
    (key: 'clerkUser', value: any): void;
    (key: string, value: any): void;
  };
}

/**
 * Get Clerk session token from request
 */
const getSessionToken = (c: Context): string | null => {
  // Try Authorization header first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookie = c.req.header('cookie');
  if (cookie) {
    const match = cookie.match(/__session=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
};

/**
 * Enhanced authentication middleware using Clerk
 */
export const authMiddleware = async (c: AuthContext, next: Next) => {
  try {
    // Skip auth for public routes
    const path = new URL(c.req.url).pathname;
    const publicPaths = ['/health', '/api/public/'];
    
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
      return await next();
    }

    // Get environment bindings
    const env = c.env as CloudflareBindings;
    
    // Create Clerk client
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    // Get session token
    const sessionToken = getSessionToken(c);
    
    if (!sessionToken) {
      c.set('user', null);
      c.set('clerkUser', null);
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Authenticate the request
    try {
      const requestState = await clerkClient.authenticateRequest({
        request: c.req.raw,
        publishableKey: env.CLERK_PUBLISHABLE_KEY,
        secretKey: env.CLERK_SECRET_KEY,
      } as any);

      if (!requestState.isSignedIn) {
        return c.json({ success: false, error: 'Authentication required' }, 401);
      }

      const userId = requestState.toAuth().userId;
      if (!userId) {
        return c.json({ success: false, error: 'Invalid session' }, 401);
      }

      // Get user details from Clerk
      const clerkUser = await clerkClient.users.getUser(userId);
      
      if (!clerkUser) {
        return c.json({ success: false, error: 'User not found' }, 401);
      }

      // Extract role from Clerk metadata or use default
      const role = (clerkUser.publicMetadata?.role as UserRole) || 'reception';
      
      // Check if user is active (you can use Clerk's banned/locked status)
      const isActive = !clerkUser.banned && !clerkUser.locked;
      
      if (!isActive) {
        return c.json({ success: false, error: 'Account is inactive' }, 403);
      }

      // Convert Clerk user to our ApiUser type
      const user: ApiUser = {
        id: clerkUser.id,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
        image: clerkUser.imageUrl,
        role: role,
        isActive: isActive,
        isAnonymous: false,
        createdAt: new Date(clerkUser.createdAt),
        updatedAt: new Date(clerkUser.updatedAt),
      };

      // Set user in context
      c.set('user', user);
      c.set('clerkUser', clerkUser);

      // Log user activity for audit
      const auditData = {
        userId: user.id,
        action: 'api_access',
        resource: path,
        ipAddress: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown',
        userAgent: c.req.header('User-Agent') || 'unknown',
      };

      // Store audit data in context for later use
      c.set('auditData', auditData);

      await next();
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Authentication failed' }, 500);
  }
};

/**
 * Middleware factory to require specific roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ 
        success: false, 
        error: 'Insufficient role permissions',
        required: roles,
        current: user.role 
      }, 403);
    }

    await next();
  };
};

/**
 * Middleware for admin-only access
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware for PA or Admin access
 */
export const requirePA = requireRole('pa', 'admin');

/**
 * Middleware for Consultant or Admin access
 */
export const requireConsultant = requireRole('consultant', 'admin');

/**
 * Middleware for Reception or Admin access
 */
export const requireReception = requireRole('reception', 'admin');

/**
 * Middleware for authenticated users only (any role)
 */
export const requireAuth = async (c: AuthContext, next: Next) => {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ success: false, error: 'Authentication required' }, 401);
  }

  await next();
};

/**
 * Optional auth middleware for routes that can work with or without authentication
 */
export const optionalAuth = async (c: AuthContext, next: Next) => {
  try {
    const env = c.env as CloudflareBindings;
    
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    const sessionToken = getSessionToken(c);
    
    if (sessionToken) {
      try {
        const requestState = await clerkClient.authenticateRequest({
          request: c.req.raw,
          publishableKey: env.CLERK_PUBLISHABLE_KEY,
          secretKey: env.CLERK_SECRET_KEY,
        } as any);

        if (!requestState.isSignedIn) {
          c.set('user', null);
          c.set('clerkUser', null);
          await next();
          return;
        }

        const userId = requestState.toAuth().userId;
        if (!userId) {
          c.set('user', null);
          c.set('clerkUser', null);
          await next();
          return;
        }

        const clerkUser = await clerkClient.users.getUser(userId);
        
        if (clerkUser) {
          const role = (clerkUser.publicMetadata?.role as UserRole) || 'reception';
          const isActive = !clerkUser.banned && !clerkUser.locked;
          
          const user: ApiUser = {
            id: clerkUser.id,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
            image: clerkUser.imageUrl,
            role: role,
            isActive: isActive,
            isAnonymous: false,
            createdAt: new Date(clerkUser.createdAt),
            updatedAt: new Date(clerkUser.updatedAt),
          };

          c.set('user', user);
          c.set('clerkUser', clerkUser);
        }
      } catch (error) {
        // Silently fail for optional auth
        console.warn('Optional auth failed:', error);
      }
    }

    c.set('user', c.get('user') || null);
    c.set('clerkUser', c.get('clerkUser') || null);

    await next();
  } catch (error) {
    console.warn('Optional auth middleware warning:', error);
    c.set('user', null);
    c.set('clerkUser', null);
    await next();
  }
};
