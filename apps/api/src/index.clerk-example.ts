import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { CloudflareBindings } from './env';
import type { ApiUser } from './types/auth';

// Import Clerk middleware instead of Better Auth
import { 
  authMiddleware, 
  requireAdmin, 
  requirePA, 
  requireConsultant,
  requireReception,
  optionalAuth,
  type AuthContext
} from './middleware/clerkAuthMiddleware';

// Import your existing routes
import { servicesRoutes } from './routes/services';
import { visitsRoutes } from './routes/visits';
import { usersRoutes } from './routes/users';
import { analyticsRoutes } from './routes/analytics';
import { streamRoutes } from './routes/stream';

type Variables = {
  user: ApiUser | null;
  clerkUser: any;
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'https://wiws.pages.dev',
      'https://wiws-frontend.pages.dev',
    ];
    return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check (public)
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    auth: 'clerk',
  });
});

// Public routes (no auth required)
app.get('/api/public/info', (c) => {
  return c.json({ 
    message: 'Walk-In Workflow System API',
    version: '2.0.0',
    auth: 'Clerk',
  });
});

// Protected routes - Apply auth middleware
app.use('/api/*', authMiddleware);

// Routes with role-based access
app.route('/api/services', servicesRoutes);
app.route('/api/visits', visitsRoutes);
app.route('/api/analytics', analyticsRoutes);

// Admin-only routes
app.use('/api/users/*', requireAdmin);
app.route('/api/users', usersRoutes);

// SSE stream (requires auth)
app.route('/api/stream', streamRoutes);

// Example: Role-specific endpoints
app.get('/api/admin/dashboard', requireAdmin, async (c: AuthContext) => {
  const user = c.get('user');
  return c.json({ 
    message: 'Admin dashboard',
    user: user,
  });
});

app.get('/api/pa/dashboard', requirePA, async (c: AuthContext) => {
  const user = c.get('user');
  return c.json({ 
    message: 'PA dashboard',
    user: user,
  });
});

app.get('/api/consultant/dashboard', requireConsultant, async (c: AuthContext) => {
  const user = c.get('user');
  return c.json({ 
    message: 'Consultant dashboard',
    user: user,
  });
});

app.get('/api/reception/dashboard', requireReception, async (c: AuthContext) => {
  const user = c.get('user');
  return c.json({ 
    message: 'Reception dashboard',
    user: user,
  });
});

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ 
    success: false, 
    error: 'Not found' 
  }, 404);
});

export default app;
