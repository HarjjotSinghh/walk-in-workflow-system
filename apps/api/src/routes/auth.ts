import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../db/index';
import { createDatabaseUtils, successResponse, errorResponse } from '../db/utils';
import { createAuth } from '../auth';

const authRoutes = new Hono<{ Bindings: Env }>();

// Validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['reception', 'pa', 'consultant', 'admin', 'anonymous']),
  password: z.string().min(6),
});

// Helper function to generate a simple user ID
function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to hash password (simple implementation for demo)
async function hashPassword(password: string): Promise<string> {
  // In production, use a proper hashing library like bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'wiws-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = LoginSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Find user by email
    const userResult = await c.env.DB_PROD.prepare(
      'SELECT id, email, name, role, password, is_active FROM user WHERE email = ? AND is_active = 1'
    ).bind(validatedData.email).first();

    if (!userResult) {
      return c.json(errorResponse('Invalid credentials'), 401);
    }

    const user = userResult as any;
    
    // Verify password against stored hash
    const isValidPassword = await verifyPassword(validatedData.password, user.password);
    if (!isValidPassword) {
      return c.json(errorResponse('Invalid credentials'), 401);
    }

    // Create session using Better Auth
    // Use any type to avoid Cloudflare Workers type conflicts
    const cf = c.req.raw.cf;
    
    // Create auth instance with environment
    const auth = createAuth({
      DB: c.env.DB,
      DB_PROD: c.env.DB_PROD,
      KV: c.env.KV
    }, cf as IncomingRequestCfProperties);

    const session = await auth.api.signInEmail({
      body: {
        email: validatedData.email,
        password: validatedData.password,
      },
    });
    
    // Log audit trail
    await utils.logAudit('user', user.id, 'login', user.id, null, { email: user.email });

    return c.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      sessionToken: session.token,
    }, 'Login successful'));

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Login failed'), 500);
  }
});

// POST /api/auth/register (Admin only)
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = RegisterSchema.parse(body);
    
    const utils = createDatabaseUtils(c.env);
    
    // Check if user already exists
    const existingUser = await c.env.DB_PROD.prepare(
      'SELECT id FROM user WHERE email = ?'
    ).bind(validatedData.email).first();

    if (existingUser) {
      return c.json(errorResponse('User already exists'), 409);
    }

    // Generate user ID and hash password
    const userId = generateUserId();
    const passwordHash = await hashPassword(validatedData.password);

    // Insert new user
    await c.env.DB_PROD.prepare(`
      INSERT INTO user (id, email, name, role, password, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      userId,
      validatedData.email,
      validatedData.name,
      validatedData.role,
      passwordHash,
      utils.getCurrentTimestamp(),
      utils.getCurrentTimestamp()
    ).run();

    // Log audit trail
    await utils.logAudit('user', userId, 'register', userId, null, {
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
    });

    return c.json(successResponse({
      user: {
        id: userId,
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
      },
    }, 'User registered successfully'));

  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof z.ZodError) {
      return c.json(errorResponse('Validation error: ' + error.errors.map(e => e.message).join(', ')), 400);
    }
    return c.json(errorResponse('Registration failed'), 500);
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  try {
    // Get session token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(errorResponse('No valid session'), 401);
    }

    const sessionToken = authHeader.substring(7);
    
    // Create session using Better Auth
    // Use any type to avoid Cloudflare Workers type conflicts
    const cf = c.req.raw.cf;
    
    // Create auth instance with environment
    const auth = createAuth({
      DB: c.env.DB,
      DB_PROD: c.env.DB_PROD,
      KV: c.env.KV
    }, cf as IncomingRequestCfProperties);

    await auth.api.signOut({
      headers: c.req.raw.headers,
    })
    
    // Find and delete the session
    const sessionResult = await c.env.DB_PROD.prepare(
      'SELECT id FROM session WHERE token = ?'
    ).bind(sessionToken).first();
    
    if (sessionResult) {
      await c.env.DB_PROD.prepare(
        'DELETE FROM session WHERE token = ?'
      ).bind(sessionToken).run();
    }

    return c.json(successResponse(null, 'Logout successful'));
  } catch (error) {
    console.error('Logout error:', error);
    return c.json(errorResponse('Logout failed'), 500);
  }
});

// GET /api/auth/me - Get current user info
authRoutes.get('/me', async (c) => {
  try {
    // Extract session token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(errorResponse('No valid session'), 401);
    }

    const sessionToken = authHeader.substring(7);
    
    // For demo purposes, extract user ID from session token
    const userId = sessionToken.split('-')[1];
    
    const utils = createDatabaseUtils(c.env);
    
    // Get user info
    const userResult = await c.env.DB_PROD.prepare(
      'SELECT id, email, name, role, is_active FROM user WHERE id = ? AND is_active = 1'
    ).bind(userId).first();

    if (!userResult) {
      return c.json(errorResponse('User not found'), 404);
    }

    const user = userResult as any;

    return c.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }));

  } catch (error) {
    console.error('Get user error:', error);
    return c.json(errorResponse('Failed to get user info'), 500);
  }
});

export { authRoutes };