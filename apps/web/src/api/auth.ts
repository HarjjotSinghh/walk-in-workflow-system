import { UserRole } from '~/types/auth';
import api from "./axios";
import type { wiwsUser } from "~/types/auth";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: wiwsUser;
    sessionToken: string;
  };
  message: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}

// Description: User login
// Endpoint: POST /api/auth/login
// Note: This is now handled by Clerk on the frontend, but kept for API compatibility
export const login = async (
  credentials: LoginRequest
): Promise<LoginResponse> => {
  try {
    const response = await api.post("/auth/login", credentials);
    return response as unknown as LoginResponse;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

// Description: User registration (Admin only)
// Endpoint: POST /api/auth/register
// Note: This creates users in Clerk and syncs to local DB
export const register = async (userData: RegisterRequest) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

// Description: User logout
// Endpoint: POST /api/auth/logout
// Note: Clerk handles logout on the frontend, this is for API cleanup
export const logout = async () => {
  try {
    const response = await api.post("/auth/logout");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Description: Get current user info
// Endpoint: GET /api/auth/me
// Request: {}
// Response: { success: boolean, data: { user: wiwsUser } }
export const getCurrentUser = async (): Promise<{ user: wiwsUser }> => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    console.error("Get current user error:", error);
    throw error;
  }
};

// Note: The following helper functions are no longer needed with Clerk
// as Clerk manages sessions automatically. They are kept for backward compatibility
// but should not be used in new code.

// Helper function to check if user is authenticated
// Note: Use Clerk's useAuth hook instead
export const isAuthenticated = (): boolean => {
  // This is a placeholder - actual auth state comes from Clerk
  return false;
};

// Helper function to get stored user data
// Note: Use Clerk's useUser hook instead
export const getStoredUser = (): wiwsUser | null => {
  // This is a placeholder - actual user data comes from Clerk
  return null;
};

// Helper function to get stored auth token
// Note: Use Clerk's getToken() from useAuth hook instead
export const getStoredToken = (): string | null => {
  // This is a placeholder - actual token comes from Clerk
  return null;
};

// Helper function to clear auth data
// Note: Clerk handles this automatically on signOut
export const clearAuthData = () => {
  // Clerk handles session cleanup automatically
};
