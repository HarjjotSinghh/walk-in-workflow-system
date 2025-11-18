import { createContext, useContext, ReactNode } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { wiwsUser, UserRole } from "../types/auth";

type AuthContextType = {
  user: wiwsUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  openSignIn: () => void;
  openSignUp: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, openSignIn, openSignUp } = useClerk();

  const isLoading = !isLoaded;
  const isAuthenticated = !!clerkUser;

  // Convert Clerk user to our wiwsUser type
  const user = clerkUser ? {
    id: clerkUser.id,
    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'User',
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    emailVerified: clerkUser.emailAddresses[0]?.verification?.status === 'verified',
    image: clerkUser.imageUrl,
    role: (clerkUser.publicMetadata?.role as UserRole) || 'reception',
    // isActive: !clerkUser.banned && !clerkUser.locked,
    isAnonymous: false,
    // createdAt: new Date(clerkUser.createdAt),
    // updatedAt: new Date(clerkUser.updatedAt),
  } : null;

  const login = () => {
    openSignIn();
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
      user: user as wiwsUser, 
      isLoading, 
      isAuthenticated,
      login, 
      logout,
      openSignIn,
      openSignUp,
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
