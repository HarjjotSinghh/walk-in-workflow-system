# Clerk Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Install dependencies
cd apps/api && pnpm add @clerk/backend && pnpm remove better-auth better-auth-cloudflare
cd apps/web && pnpm add @clerk/clerk-react && pnpm remove better-auth

# Run migration script
chmod +x scripts/migrate-to-clerk.sh
./scripts/migrate-to-clerk.sh
```

## 🔑 Environment Variables

### API (wrangler.json)
```json
{
  "vars": {
    "CLERK_PUBLISHABLE_KEY": "pk_test_...",
    "CLERK_SECRET_KEY": "sk_test_..."
  }
}
```

### Web (.env)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## 📝 Code Snippets

### API: Verify Token
```typescript
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

const { userId } = await clerkClient.verifyToken(token);
const user = await clerkClient.users.getUser(userId);
```

### API: Protect Route
```typescript
import { authMiddleware, requireAdmin } from './middleware/clerkAuthMiddleware';

app.use('/api/*', authMiddleware);
app.use('/api/admin/*', requireAdmin);
```

### Web: Get Current User
```typescript
import { useUser } from '@clerk/clerk-react';

function MyComponent() {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) return <Loading />;
  if (!user) return <SignIn />;
  
  return <div>Hello {user.firstName}</div>;
}
```

### Web: Get Auth Token
```typescript
import { useAuth } from '@clerk/clerk-react';

function MyComponent() {
  const { getToken } = useAuth();
  
  const fetchData = async () => {
    const token = await getToken();
    const response = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${token}` }
    });
  };
}
```

### Web: Sign Out
```typescript
import { useClerk } from '@clerk/clerk-react';

function MyComponent() {
  const { signOut } = useClerk();
  
  return <button onClick={() => signOut()}>Sign Out</button>;
}
```

### Web: Protected Route
```typescript
import { ProtectedRoute } from './components/ClerkProtectedRoute';

<Route 
  path="/admin" 
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminPage />
    </ProtectedRoute>
  } 
/>
```

## 🎨 Pre-built Components

### Sign In
```typescript
import { SignIn } from '@clerk/clerk-react';

<SignIn 
  routing="path"
  path="/login"
  afterSignInUrl="/dashboard"
/>
```

### Sign Up
```typescript
import { SignUp } from '@clerk/clerk-react';

<SignUp 
  routing="path"
  path="/register"
  afterSignUpUrl="/dashboard"
/>
```

### User Button
```typescript
import { UserButton } from '@clerk/clerk-react';

<UserButton afterSignOutUrl="/login" showName />
```

### User Profile
```typescript
import { UserProfile } from '@clerk/clerk-react';

<UserProfile routing="path" path="/profile" />
```

## 👥 Role Management

### Set Role (Dashboard)
1. Go to https://dashboard.clerk.com
2. Click **Users**
3. Select a user
4. Go to **Metadata** tab
5. Add to **Public Metadata**:
```json
{
  "role": "admin"
}
```

### Set Role (API)
```typescript
import { clerkClient } from '@clerk/backend';

await clerkClient.users.updateUser(userId, {
  publicMetadata: { role: 'consultant' }
});
```

### Get Role (Web)
```typescript
const { user } = useUser();
const role = user?.publicMetadata?.role;
```

### Check Role (API)
```typescript
const user = c.get('user');
const role = user.publicMetadata?.role;

if (role !== 'admin') {
  return c.json({ error: 'Forbidden' }, 403);
}
```

## 🔒 Common Patterns

### Require Authentication
```typescript
// API
app.use('/api/*', authMiddleware);

// Web
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>
```

### Require Specific Role
```typescript
// API
import { requireAdmin } from './middleware/clerkAuthMiddleware';
app.use('/api/admin/*', requireAdmin);

// Web
<ProtectedRoute allowedRoles={['admin', 'pa']}>
  <AdminPanel />
</ProtectedRoute>
```

### Optional Authentication
```typescript
// API
import { optionalAuth } from './middleware/clerkAuthMiddleware';
app.use('/api/public/*', optionalAuth);

// Web
const { user } = useUser();
return user ? <AuthenticatedView /> : <PublicView />;
```

### Get User Info
```typescript
// API
const user = c.get('user');
console.log(user.id, user.email, user.publicMetadata.role);

// Web
const { user } = useUser();
console.log(user.id, user.emailAddresses[0].emailAddress);
```

## 🐛 Debugging

### Check if Clerk is loaded
```typescript
const { isLoaded } = useUser();
console.log('Clerk loaded:', isLoaded);
```

### Check current user
```typescript
const { user } = useUser();
console.log('Current user:', user);
```

### Check token
```typescript
const { getToken } = useAuth();
const token = await getToken();
console.log('Token:', token);
```

### Verify token on API
```typescript
try {
  const { userId } = await clerkClient.verifyToken(token);
  console.log('Valid token for user:', userId);
} catch (error) {
  console.error('Invalid token:', error);
}
```

## 📚 Useful Links

- **Dashboard**: https://dashboard.clerk.com
- **Docs**: https://clerk.com/docs
- **React Quickstart**: https://clerk.com/docs/quickstarts/react
- **Cloudflare Workers**: https://clerk.com/docs/deployments/cloudflare-workers
- **API Reference**: https://clerk.com/docs/reference/backend-api
- **Discord**: https://clerk.com/discord

## ⚠️ Common Issues

### "Missing publishable key"
- Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env`
- Restart dev server

### "Invalid token"
- Check token is being sent in Authorization header
- Verify Clerk keys are correct
- Check token hasn't expired

### "User has no role"
- Set role in Clerk Dashboard under Public Metadata
- Role must be in: admin, pa, consultant, reception

### CORS errors
- Add frontend URL to CORS origins in API
- Enable credentials: true

### SSE not working
- Pass token as query parameter: `/api/stream?token=${token}`
- Verify token on server before establishing connection

## 💰 Pricing

| Tier | MAU | Price |
|------|-----|-------|
| Free | 0 - 10,000 | $0 |
| Pro | 10,001+ | $25/mo + $0.02/user |

**MAU** = Monthly Active Users (users who sign in at least once per month)

## ✅ Migration Checklist

- [ ] Clerk account created
- [ ] App created in Clerk Dashboard
- [ ] Roles configured
- [ ] API keys obtained
- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] API middleware updated
- [ ] Web provider updated
- [ ] Login/Register pages updated
- [ ] Protected routes updated
- [ ] API calls updated
- [ ] Test users created
- [ ] Local testing passed
- [ ] Production deployed

## 🆘 Need Help?

1. Check the full guides:
   - `CLERK_MIGRATION_GUIDE.md`
   - `CLERK_IMPLEMENTATION.md`
   - `CLERK_VS_BETTER_AUTH.md`

2. Clerk Discord: https://clerk.com/discord

3. Clerk Support: support@clerk.com
