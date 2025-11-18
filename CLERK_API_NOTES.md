# Clerk API Implementation Notes

## Important: Clerk Backend API Changes

The Clerk backend API has evolved. The `verifyToken` method shown in the initial examples may not be available in all versions. Here's the correct approach:

## Correct Token Verification

### Option 1: Using Session Token (Recommended)

```typescript
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

// Verify session token from cookie or header
const sessionToken = getSessionToken(c);

// Use verifySession instead of verifyToken
const session = await clerkClient.sessions.verifySession(sessionToken);
const userId = session.userId;

// Get user details
const user = await clerkClient.users.getUser(userId);
```

### Option 2: Using JWT Token

```typescript
import { verifyToken } from '@clerk/backend';

// Verify JWT token
const payload = await verifyToken(sessionToken, {
  secretKey: env.CLERK_SECRET_KEY,
});

const userId = payload.sub;
```

### Option 3: Using Request Authentication (Best for Cloudflare Workers)

```typescript
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

// Authenticate the entire request
const requestState = await clerkClient.authenticateRequest({
  request: c.req.raw,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
});

if (!requestState.isSignedIn) {
  return c.json({ error: 'Unauthorized' }, 401);
}

const userId = requestState.toAuth().userId;
const user = await clerkClient.users.getUser(userId);
```

## Updated Middleware Implementation

Here's the production-ready middleware:

```typescript
import { Context, Next } from 'hono';
import { createClerkClient } from '@clerk/backend';
import type { CloudflareBindings } from '../env';
import type { ApiUser, UserRole } from '../types/auth';

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

const getSessionToken = (c: Context): string | null => {
  // Try Authorization header
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

export const authMiddleware = async (c: AuthContext, next: Next) => {
  try {
    const path = new URL(c.req.url).pathname;
    const publicPaths = ['/health', '/api/public/'];
    
    if (publicPaths.some(p => path.startsWith(p))) {
      return await next();
    }

    const env = c.env as CloudflareBindings;
    
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });

    // Authenticate the request
    const requestState = await clerkClient.authenticateRequest({
      request: c.req.raw,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY,
    });

    if (!requestState.isSignedIn) {
      c.set('user', null);
      c.set('clerkUser', null);
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }

    const userId = requestState.toAuth().userId;
    if (!userId) {
      return c.json({ success: false, error: 'Invalid session' }, 401);
    }

    // Get user details
    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    // Extract role from metadata
    const role = (clerkUser.publicMetadata?.role as UserRole) || 'reception';
    const isActive = !clerkUser.banned && !clerkUser.locked;
    
    if (!isActive) {
      return c.json({ success: false, error: 'Account is inactive' }, 403);
    }

    // Convert to ApiUser
    const user: ApiUser = {
      id: clerkUser.id,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 
            clerkUser.username || 'User',
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

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Authentication failed' }, 500);
  }
};
```

## Testing the Middleware

```bash
# Get session token from browser
# Open DevTools → Application → Cookies → __session

# Test API call
curl -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  http://localhost:8787/api/visits
```

## Common Issues

### Issue: "Cannot find module '@clerk/backend'"
**Solution**: Make sure you installed the correct package:
```bash
pnpm add @clerk/backend
```

### Issue: "verifyToken is not a function"
**Solution**: Use `authenticateRequest` instead (shown above)

### Issue: "Invalid session token"
**Solution**: 
1. Check that the token is being sent correctly
2. Verify your Clerk secret key is correct
3. Make sure the token hasn't expired

### Issue: TypeScript errors with c.get('user')
**Solution**: Define proper types for Hono context:
```typescript
type Variables = {
  user: ApiUser | null;
  clerkUser: any;
};

const app = new Hono<{ Bindings: CloudflareBindings; Variables: Variables }>();
```

## Production Checklist

- [ ] Use `authenticateRequest` instead of `verifyToken`
- [ ] Set proper CORS headers
- [ ] Use production Clerk keys
- [ ] Test with real session tokens
- [ ] Handle token expiration gracefully
- [ ] Log authentication failures
- [ ] Set up proper error responses

## Additional Resources

- Clerk Backend SDK: https://clerk.com/docs/references/backend/overview
- Cloudflare Workers: https://clerk.com/docs/deployments/cloudflare-workers
- Authentication Flow: https://clerk.com/docs/authentication/overview
