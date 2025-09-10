import { createContext, useContext, ReactNode } from "react";
import { authClient, useSession } from "../lib/auth-client";
import { Session, User } from "better-auth";
import { wiwsUser, UserRole } from "../types/auth";
import api from "~/api/api";

type AuthContextType = {
  user: wiwsUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isLoading, error } = useSession();

  // Debug logging
  // console.log('AuthProvider - session:', session);
  // console.log('AuthProvider - isLoading:', isLoading);
  // console.log('AuthProvider - error:', error);

  if (error) {
    console.error('AuthProvider session error:', error);
  }
  
  const user = session?.user as wiwsUser | null;
  const isAuthenticated = !!user;

  const login = async (email: string, password: string) => {
    try {
      const response = await authClient.signIn.email({
        email,
        password,
      });
      
      if (response.error) {
        console.error('response.error: ', response.error)
        console.error('response.data: ', response.data)

        throw new Error(response.error.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole = 'reception') => {
    try {
      const response = await authClient.signUp.email({
        email,
        password,
        name,
        // role
        // Note: Better Auth doesn't allow setting role during registration by default
        // Role will be set to default value from auth config
      });
      
      if (response.error) {
        // console.log('* response.error **', response.error)
        // console.log('* response.data **', response.data)
        throw new Error(response.error.message || 'Registration failed');
      }

      const updateResult = await api.put(`/api/users/${response.data.user.id}`, {
        role: role
      });

      if (!updateResult || !updateResult?.data) {
        console.error("Error updating user role");
        throw new Error("Error updating user role");
      }

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session: session?.session ?? null,
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
