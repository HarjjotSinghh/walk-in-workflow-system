import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from './contexts/ClerkAuthContext';
import { BrowserRouter } from 'react-router-dom';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

interface ClerkAppProps {
  children: React.ReactNode;
}

export function ClerkApp({ children }: ClerkAppProps) {
  return (
    <ClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </ClerkProvider>
  );
}
