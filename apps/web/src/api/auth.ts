import { UserRole } from '~/types/auth';
import api from './api';
import type { User } from 'better-auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
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
// Request: { email: string, password: string }
// Response: { success: boolean, data: { user: User, sessionToken: string }, message: string }
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    
    // Store auth data in localStorage
    localStorage.setItem('wiws_auth_token', response.data.sessionToken);
    localStorage.setItem('wiws_user', JSON.stringify(response.data.user));
    
    return response as unknown as LoginResponse;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Description: User registration (Admin only)
// Endpoint: POST /api/auth/register
// Request: { email: string, name: string, role: string, password: string }
// Response: { success: boolean, data: { user: User }, message: string }
export const register = async (userData: RegisterRequest) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Description: User logout
// Endpoint: POST /api/auth/logout
// Request: {}
// Response: { success: boolean, message: string }
export const logout = async () => {
  try {
    const response = await api.post('/api/auth/logout');
    
    // Clear auth data from localStorage
    localStorage.removeItem('wiws_auth_token');
    localStorage.removeItem('wiws_user');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Clear auth data even if API call fails
    localStorage.removeItem('wiws_auth_token');
    localStorage.removeItem('wiws_user');
    throw error;
  }
};

// Description: Get current user info
// Endpoint: GET /api/auth/me
// Request: {}
// Response: { success: boolean, data: { user: User } }
export const getCurrentUser = async (): Promise<{ user: User }> => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('wiws_auth_token');
  const user = localStorage.getItem('wiws_user');
  return !!(token && user);
};

// Helper function to get stored user data
export const getStoredUser = (): User | null => {
  const userData = localStorage.getItem('wiws_user');
  return userData ? JSON.parse(userData) : null;
};

// Helper function to get stored auth token
export const getStoredToken = (): string | null => {
  return localStorage.getItem('wiws_auth_token');
};

// Helper function to clear auth data
export const clearAuthData = () => {
  localStorage.removeItem('wiws_auth_token');
  localStorage.removeItem('wiws_user');
};