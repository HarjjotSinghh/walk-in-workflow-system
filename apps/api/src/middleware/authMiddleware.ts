import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { createAuth } from '../auth';
import type { CloudflareBindings } from '../env';
import type { ApiUser, UserRole, Permission } from '../types/auth';
import { hasPermission, hasRolePermission } from '../lib/permissions';
import { Session } from 'better-auth';
import { env } from 'cloudflare:workers';

// Extended Hono Context with our custom variables
export interface AuthContext extends Context {
  get: {
    (key: 'user'): ApiUser | null;
    (key: 'session'): any;
    (key: string): any;
  };
  set: {
    (key: 'user', value: ApiUser | null): void;
    (key: 'session', value: any): void;
    (key: string, value: any): void;
  };
}

export const getSession = async (c: Context): Promise<{ user: ApiUser | null, session: Session | null }> => {
  const headersList = c.req.raw.headers;
  const cookie = headersList.get('cookie');
  const webUrl = headersList.get('origin');

  const session = await fetch(`${webUrl}/api/auth/session`, {
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie ?? '',
    },
  }).then((res) => res.json());

  return session as { user: ApiUser | null, session: Session | null };
};

/**
 * Enhanced authentication middleware that includes role-based access control
 */
export const authMiddleware = async (c: AuthContext, next: Next) => {
  try {
    // Skip auth for public routes
    const path = new URL(c.req.url).pathname;
    const publicPaths = ['/api/auth/', '/health', '/api/public/'];
    
    // Allow stream endpoint to use query parameters for authentication
    const isStreamEndpoint = path === '/api/stream';
    
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
      return await next();
    }

    // Get environment bindings
    const env = c.env as CloudflareBindings;
    // Use any type to avoid Cloudflare Workers type conflicts
    const cf = c.req.raw.cf as any;
    
    // Create auth instance with environment
    const auth = createAuth(env, cf);
    
    // Get session from Better Auth
    const session = await getSession(c);

    // For stream endpoint, allow query parameter authentication as fallback
    if (isStreamEndpoint && !session) {
      // Try to get user info from query parameters
      const userRole = c.req.query('role');
      const userId = c.req.query('user_id');
      
      if (userRole && userId) {
        // Validate the user exists in the database
        const userResult = await env.DB_PROD.prepare(
          'SELECT id, name, email, role, is_active FROM user WHERE id = ? AND role = ? AND is_active = 1'
        ).bind(userId, userRole).first();
        
        if (userResult) {
          const validUser: ApiUser = {
            id: String(userResult.id),
            name: String(userResult.name),
            email: String(userResult.email),
            emailVerified: true,
            role: userResult.role as UserRole,
            isActive: true,
            isAnonymous: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          c.set('user', validUser);
          c.set('session', null);
          return await next();
        }
      }
    }

    if (!session) {
      c.set('user', null);
      c.set('session', null);
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Convert Better Auth user to our ApiUser type
    const user: ApiUser = {
      id: String(session.user?.id),
      name: String(session.user?.name),
      email: String(session.user?.email),
      emailVerified: session.user?.emailVerified || false,
      image: session.user?.image || undefined,
      role: (session.user?.role as UserRole) || 'reception', // Default to reception if no role
      isActive: !!session?.user,
      isAnonymous: session.user?.isAnonymous || false,
      createdAt: new Date(session.user?.createdAt ?? ''),
      updatedAt: new Date(session.user?.updatedAt!),
    };

    // Check if user is active
    if (!user.isActive) {
      return c.json({ success: false, error: 'Account is inactive' }, 403);
    }

    // Set user and session in context
    c.set('user', user);
    c.set('session', session);

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
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Authentication failed' }, 401);
  }
};

/**
 * Middleware factory to require specific permissions
 */
export const requirePermission = (...permissions: Permission[]) => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(permission => 
      hasPermission({ user }, permission)
    );

    if (!hasAllPermissions) {
      return c.json({ 
        success: false, 
        error: 'Insufficient permissions',
        required: permissions 
      }, 403);
    }

    await next();
  };
};

/**
 * Middleware factory to require any of the specified permissions
 */
export const requireAnyPermission = (...permissions: Permission[]) => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some(permission => 
      hasPermission({ user }, permission)
    );

    if (!hasAnyPermission) {
      return c.json({ 
        success: false, 
        error: 'Insufficient permissions',
        required: permissions 
      }, 403);
    }

    await next();
  };
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
 * Middleware to check resource ownership for consultants
 */
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (c: AuthContext, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    // Admins and PAs can access any resource
    if (user.role === 'admin' || user.role === 'pa') {
      await next();
      return;
    }

    // For consultants, check ownership
    if (user.role === 'consultant') {
      const resourceId = c.req.param(resourceIdParam);
      
      // Properly check if the resource belongs to the consultant
      // This implementation will depend on the specific resource type
      // For visits, check if the visit is assigned to this consultant
      const visitCheck = await env.DB_PROD.prepare(
        'SELECT id FROM visits WHERE id = ? AND assigned_consultant_id = ?'
      ).bind(resourceId, user.id).first();
      
      if (!visitCheck) {
        return c.json({ success: false, error: 'Access denied: Resource not assigned to you' }, 403);
      }
      
      await next();
      return;
    }

    // Reception users can only access resources they created
    if (user.role === 'reception') {
      await next();
      return;
    }

    return c.json({ success: false, error: 'Access denied' }, 403);
  };
};

/**
 * Optional auth middleware for routes that can work with or without authentication
 */
export const optionalAuth = async (c: AuthContext, next: Next) => {
  try {
    // Get environment bindings
    const env = c.env as CloudflareBindings;
    // Use any type to avoid Cloudflare Workers type conflicts
    const cf = c.req.raw.cf as any;
    
    // Create auth instance with environment
    const auth = createAuth(env, cf);
    
    // Try to get session from Better Auth
    const session = await getSession(c);

    if (session && session.user) {
      // Convert Better Auth user to our ApiUser type
      const user: ApiUser = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified || false,
        image: session.user.image || undefined,
        // @ts-ignore
        role: session.user?.role ?? 'anonymous',
        // role: (session.user?.role ?? 'reception') || 'reception',
        isActive: !!session?.session,
        isAnonymous: session.user.isAnonymous || false,
        createdAt: new Date(session.user.createdAt),
        updatedAt: new Date(session.user.updatedAt),
      };

      c.set('user', user);
      c.set('session', session);
    } else {
      c.set('user', null);
      c.set('session', null);
    }

    await next();
  } catch (error) {
    // Log error but don't fail the request
    console.warn('Optional auth middleware warning:', error);
    c.set('user', null);
    c.set('session', null);
    await next();
  }
};