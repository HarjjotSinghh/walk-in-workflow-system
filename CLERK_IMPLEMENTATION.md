# Clerk Implementation Guide

## Quick Start

### 1. Install Dependencies

```bash
# API
cd apps/api
pnpm add @clerk/backend
pnpm remove better-auth better-auth-cloudflare

# Web
cd apps/web
pnpm add @clerk/clerk-react
pnpm remove better-auth
```

### 2. Set Up Clerk Account

1. Go to https://clerk.com and create an account
2. Create a new application
3. In the Clerk Dashboard:
   - Go to **Configure** → **Roles**
   - Create these roles:
     - `admin`
     - `pa`
     - `consultant`
     - `reception`

4. Get your API keys from **API Keys** section:
   - `CLERK_PUBLISHABLE_KEY` (starts with `pk_`)
   - `CLERK_SECRET_KEY` (starts with `sk_`)

### 3. Update Environment Variables

#### apps/api/wrangler.json

```json
{
  "vars": {
    "CLERK_PUBLISHABLE_KEY": "pk_test_...",
    "CLERK_SECRET_KEY": "sk_test_...",
    "ENVIRONMENT": "development",
    "FRONTEND_URL": "http://localhost:5174"
  }
}
```

#### apps/web/.env

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8787
```

### 4. Update API Code

Replace the auth middleware import in `apps/api/src/index.ts`:

```typescript
// OLD
import { authMiddleware } from './middleware/authMiddleware';

// NEW
import { authMiddleware } from './middleware/clerkAuthMiddleware';
```

Remove Better Auth route handler:

```typescript
// REMOVE THIS
app.on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw));
```

### 5. Update Web App Code

Replace `apps/web/src/main.tsx`:

```typescript
import { ClerkApp } from './ClerkApp';
// ... rest of your imports

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkApp>
      {/* Your routes */}
    </ClerkApp>
  </React.StrictMode>
);
```

Update auth context imports throughout your app:

```typescript
// OLD
import { useAuth } from './contexts/AuthContext';

// NEW
import { useAuth } from './contexts/ClerkAuthContext';
```

### 6. Update API Calls

Replace your API client with the Clerk-aware version:

```typescript
// OLD
import api from '~/api/api';

// NEW
import { useApiClient } from '~/lib/clerk-api';

function MyComponent() {
  const api = useApiClient();
  
  const fetchData = async () => {
    const data = await api.get('/api/visits');
    // ...
  };
}
```

### 7. Update Login/Register Pages

Replace your login page:

```typescript
// apps/web/src/pages/Login.tsx
import { ClerkLogin } from './ClerkLogin';
export { ClerkLogin as Login };
```

Replace your register page:

```typescript
// apps/web/src/pages/Register.tsx
import { ClerkRegister } from './ClerkRegister';
export { ClerkRegister as Register };
```

### 8. Update Protected Routes

```typescript
import { ProtectedRoute } from './components/ClerkProtectedRoute';

// Usage
<Route 
  path="/admin" 
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminPage />
    </ProtectedRoute>
  } 
/>
```

### 9. Update User Button/Profile

Replace your user profile component:

```typescript
import { ClerkUserButton } from './components/ClerkUserButton';

// Usage in your navbar
<ClerkUserButton />
```

## Setting User Roles

### Option 1: Via Clerk Dashboard (Recommended for initial setup)

1. Go to Clerk Dashboard → **Users**
2. Click on a user
3. Go to **Metadata** tab
4. Add to **Public Metadata**:
```json
{
  "role": "admin"
}
```

### Option 2: Via API (Programmatic)

```typescript
import { clerkClient } from '@clerk/clerk-sdk-node';

await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    role: 'consultant'
  }
});
```

### Option 3: During Sign-Up (Custom Flow)

In your sign-up form, collect the role and set it after user creation:

```typescript
import { useSignUp } from '@clerk/clerk-react';

const { signUp } = useSignUp();

// After sign-up
await signUp.update({
  unsafeMetadata: {
    role: selectedRole
  }
});
```

## SSE (Server-Sent Events) with Clerk

Update your SSE connection to include the Clerk token:

```typescript
import { useAuth } from '@clerk/clerk-react';

function useSSE() {
  const { getToken } = useAuth();
  
  useEffect(() => {
    const connectSSE = async () => {
      const token = await getToken();
      const eventSource = new EventSource(
        `/api/stream?token=${token}`
      );
      
      // ... rest of your SSE logic
    };
    
    connectSSE();
  }, [getToken]);
}
```

Update API SSE handler to accept token from query:

```typescript
// apps/api/src/routes/stream.ts
import { createClerkClient } from '@clerk/backend';

export const streamRoutes = new Hono();

streamRoutes.get('/', async (c) => {
  const token = c.req.query('token');
  
  if (!token) {
    return c.json({ error: 'Token required' }, 401);
  }
  
  const env = c.env as CloudflareBindings;
  const clerkClient = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
  });
  
  try {
    const { userId } = await clerkClient.verifyToken(token);
    const user = await clerkClient.users.getUser(userId);
    
    // ... rest of your SSE logic
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
```

## Testing

### 1. Test Sign-Up

```bash
# Start API
cd apps/api && pnpm dev

# Start Web (in another terminal)
cd apps/web && pnpm dev
```

1. Go to http://localhost:5173/register
2. Create a new account
3. Verify email (if required)
4. Set role in Clerk Dashboard
5. Sign in

### 2. Test Role-Based Access

1. Create users with different roles
2. Try accessing role-specific pages
3. Verify access is properly restricted

### 3. Test API Authentication

```bash
# Get your session token from browser DevTools
# Application → Cookies → __session

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8787/api/visits
```

## Migration Checklist

- [ ] Clerk account created
- [ ] Application created in Clerk
- [ ] Roles configured (admin, pa, consultant, reception)
- [ ] API keys obtained
- [ ] Dependencies installed (API)
- [ ] Dependencies installed (Web)
- [ ] Environment variables updated (API)
- [ ] Environment variables updated (Web)
- [ ] API middleware updated
- [ ] Web app provider updated
- [ ] Auth context updated throughout app
- [ ] Login page updated
- [ ] Register page updated
- [ ] Protected routes updated
- [ ] User button/profile updated
- [ ] API client updated
- [ ] SSE authentication updated
- [ ] Test users created with roles
- [ ] Local testing completed
- [ ] Production keys obtained
- [ ] Production deployment completed

## Troubleshooting

### "Missing VITE_CLERK_PUBLISHABLE_KEY"

Make sure you have a `.env` file in `apps/web` with:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### "Invalid token" errors

1. Check that your Clerk keys are correct
2. Verify the token is being sent in the Authorization header
3. Check that the frontend URL is in the authorized parties list

### Users can't access role-specific pages

1. Verify the role is set in Clerk Dashboard under user's Public Metadata
2. Check that the role name matches exactly (case-sensitive)
3. Verify the ProtectedRoute component is checking the correct role

### CORS errors

Update your API CORS configuration to include your frontend URL:

```typescript
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://your-production-url.com'],
  credentials: true,
}));
```

## Cost Comparison

### Better Auth (Current)
- ✅ Free (self-hosted)
- ❌ Requires database storage for users
- ❌ Manual user management
- ❌ Need to implement email verification
- ❌ Need to implement password reset
- ❌ Need to implement 2FA

### Clerk (New)
- ✅ Free up to 10,000 MAU
- ✅ No database needed for auth
- ✅ Built-in user management UI
- ✅ Email verification included
- ✅ Password reset included
- ✅ 2FA included
- ✅ Social login ready
- ⚠️ After 10,000 MAU: $25/month + $0.02 per additional user

## Support

- Clerk Documentation: https://clerk.com/docs
- Clerk Discord: https://clerk.com/discord
- Cloudflare Workers Guide: https://clerk.com/docs/deployments/cloudflare-workers
- React Guide: https://clerk.com/docs/quickstarts/react
