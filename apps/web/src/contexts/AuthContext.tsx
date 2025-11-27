import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useUser, useClerk, useAuth as useClerkAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import { wiwsUser, UserRole } from "../types/auth";
import api, { setTokenGetter } from "~/api/axios";

interface ApiUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified?: boolean;
  image?: string;
  isActive?: boolean;
  is_active?: number | boolean; // Legacy field name
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    user: ApiUserResponse;
  };
}

type AuthContextType = {
  user: wiwsUser | null;
  session: { userId: string; role: UserRole } | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useClerkAuth();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [enrichedUser, setEnrichedUser] = useState<wiwsUser | null>(null);
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  const isLoading = !isLoaded || isFetchingUser;
  const isAuthenticated = !!clerkUser;

  // Fetch full user data with role when Clerk user is available
  useEffect(() => {
    const fetchUserData = async () => {
      if (!clerkUser?.id || !isLoaded || isFetchingUser) {
        return;
      }

      try {
        setIsFetchingUser(true);
        // Fetch user data from our API using /auth/me endpoint
        // This endpoint uses Clerk authentication and returns user data from middleware
        const response = (await api.get(`/auth/me`)) as unknown as ApiResponse;

        if (response?.success && response?.data?.user) {
          const apiUser = response.data.user;

          // Merge Clerk user data with API user data (which includes role)
          const mergedUser: wiwsUser = {
            id: clerkUser.id,
            name: apiUser.name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
            email: apiUser.email || clerkUser.emailAddresses[0]?.emailAddress || '',
            emailVerified: apiUser.emailVerified ?? (clerkUser.emailAddresses[0]?.verification?.status === 'verified'),
            image: clerkUser.imageUrl || apiUser.image,
            role: apiUser.role || (clerkUser.publicMetadata?.role as UserRole) || 'reception',
            isActive: apiUser.isActive !== undefined ? Boolean(apiUser.isActive) : true,
            isAnonymous: false,
            createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
            updatedAt: new Date(),
          };

          setEnrichedUser(mergedUser);
        } else {
          // Fallback: use Clerk user without role if API call fails
          const fallbackUser: wiwsUser = {
            id: clerkUser.id,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
            image: clerkUser.imageUrl,
            role: (clerkUser.publicMetadata?.role as UserRole) || 'reception',
            isActive: true, // Default to active, API will provide actual status
            isAnonymous: false,
            createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
            updatedAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt) : new Date(),
          };
          setEnrichedUser(fallbackUser);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback: use Clerk user without role if API call fails
        if (clerkUser) {
          const fallbackUser: wiwsUser = {
            id: clerkUser.id,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
            image: clerkUser.imageUrl,
            role: (clerkUser.publicMetadata?.role as UserRole) || 'reception',
            isActive: true, // Default to active, API will provide actual status
            isAnonymous: false,
            createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
            updatedAt: clerkUser.updatedAt ? new Date(clerkUser.updatedAt) : new Date(),
          };
          setEnrichedUser(fallbackUser);
        } else {
          setEnrichedUser(null);
        }
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUserData();
  }, [clerkUser?.id, isLoaded]);

  // Clear enriched user when Clerk user is cleared
  useEffect(() => {
    if (!clerkUser) {
      setEnrichedUser(null);
    }
  }, [clerkUser]);

  // Set up token getter for API client
  useEffect(() => {
    const tokenGetter = async () => {
      try {
        return await getToken();
      } catch (error) {
        console.warn('Failed to get token:', error);
        return null;
      }
    };
    setTokenGetter(tokenGetter);
  }, [getToken]);

  const user = enrichedUser;
  const session = clerkUser && user ? { userId: clerkUser.id, role: user.role } : null;

  const login = async (email: string, password: string) => {
    try {
      if (!signInLoaded || !signIn) {
        throw new Error('Sign-in not ready');
      }

      // Use Clerk's signIn method
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === 'complete' && setActive) {
        // Sign-in is complete, set the active session
        await setActive({ session: result.createdSessionId });
      } else {
        throw new Error('Sign-in incomplete');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0]?.longMessage
        || (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0]?.message
        : undefined;
      throw new Error(errorMessage || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole = 'reception') => {
    try {
      if (!signUpLoaded || !signUp) {
        throw new Error('Sign-up not ready');
      }

      // Parse name into first and last name
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Use Clerk's signUp method
      const result = await signUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        unsafeMetadata: {
          role: role,
        },
      });

      if (result.status === 'complete' && setActive) {
        // Sign-up is complete, set the active session
        await setActive({ session: result.createdSessionId });

        // Sync user to our API database with role
        try {
          await api.post('/auth/sync', { role });
        } catch (syncError) {
          console.warn('Failed to sync user to API:', syncError);
          // Don't fail registration if sync fails
        }
      } else if (result.status === 'missing_requirements') {

        // Check if we should allow sign-in without verification
        // Set this to true to allow users to sign in without email verification
        const ALLOW_SIGNIN_WITHOUT_VERIFICATION = import.meta.env.VITE_ALLOW_SIGNIN_WITHOUT_VERIFICATION === 'true' || import.meta.env.DEV;

        if (ALLOW_SIGNIN_WITHOUT_VERIFICATION && setActive) {
          // Try to prepare email verification (sends the email)
          if (signUp.emailAddress && signUp.prepareEmailAddressVerification) {
            try {
              await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            } catch (prepError) {
              console.warn('Failed to prepare email verification:', prepError);
            }
          }

          // Allow user to proceed without verification (development mode)
          // Sync user to our API database with role
          try {
            await api.post('/auth/sync', { role });
          } catch (syncError) {
            console.warn('Failed to sync user to API:', syncError);
          }

          // Return success - user can proceed to login
          // They'll need to verify email later, but can sign in now
          return;
        }

        // Require email verification (production behavior)
        // Try to prepare the email address (this sends verification email)
        if (signUp.emailAddress && signUp.prepareEmailAddressVerification) {
          try {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          } catch (prepError) {
            console.warn('Failed to prepare email verification:', prepError);
          }
        }

        // Return a special indicator that email verification is needed
        const verificationError = new Error('EMAIL_VERIFICATION_REQUIRED') as Error & {
          requiresVerification?: boolean;
          message: string;
        };
        verificationError.requiresVerification = true;
        verificationError.message = 'Please check your email to verify your account. If you didn\'t receive an email, check your spam folder or contact support.';
        throw verificationError;
      } else {
        // Other incomplete statuses
        throw new Error('Sign-up incomplete. Please try again.');
      }
    } catch (error: unknown) {
      // If it's already our special verification error, re-throw it
      if (error instanceof Error && (error as Error & { requiresVerification?: boolean }).requiresVerification) {
        throw error;
      }

      console.error('Registration error:', error);
      const errorMessage = error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0]?.longMessage
        || (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0]?.message
        : undefined;
      throw new Error(errorMessage || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isLoading, 
      isAuthenticated,
      login, 
      logout, 
      register 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
