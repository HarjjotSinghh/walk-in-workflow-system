import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig, AxiosStatic, AxiosInstance, AxiosResponse } from 'axios';
import {parse} from 'json-bigint';

// Token getter function - will be set by AuthContext
let getToken: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (tokenGetter: () => Promise<string | null>) => {
  getToken = tokenGetter;
};

// Use relative URLs to go through the Vite proxy
// This ensures CORS is handled by the proxy instead of direct cross-origin requests
export const apiClient = axios.create({
  baseURL: import.meta.env.PROD ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: Send cookies with requests for Clerk session
  validateStatus: (status) => {
    return status >= 200 && status < 300;
  },
  transformResponse: [(data) => {
    try {
      return parse(data);
    } catch {
      return data;
    }
  }]
});

const getApiInstance = (url: string) => {
  return apiClient;
};

const setupInterceptors = (apiInstance: AxiosInstance) => {
  apiInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
      // Get Clerk session token if token getter is available
      if (getToken) {
        try {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.warn('Failed to get auth token:', error);
        }
      }
      return config;
    },
    (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
  );

  apiInstance.interceptors.response.use(
    // eslint-disable-next-line
    (response: any) => {
      // Return just the data from the response
      return response.data;
    },
    // eslint-disable-next-line
    async (error: any): Promise<Error> => {
      if (error.response?.status === 401) {
        // Only redirect to login if not already on login/register page
        // This prevents infinite redirect loops
        const currentPath = window.location.pathname;
        
        // Don't redirect if:
        // 1. Already on login/register page
        // 2. The request was to /auth/me (this is expected to fail if not authenticated, but we handle it in AuthContext)
        const isAuthMeRequest = error.config?.url?.includes('/auth/me');
        
        if (!currentPath.includes('/login') && !currentPath.includes('/register') && !isAuthMeRequest) {
          // Handle unauthorized access - redirect to login
          // Clerk will handle session management, so we just redirect
          window.location.href = '/login';
        }
        
        // For /auth/me requests, don't throw - let AuthContext handle it
        if (isAuthMeRequest) {
          return Promise.reject(new Error('Unauthorized - will use Clerk user data'));
        }
        
        return Promise.reject(new Error('Unauthorized access'));
      }
      
      // Extract error message from response
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      return Promise.reject(new Error(errorMessage));
    }
  );
};

setupInterceptors(apiClient);

const api = {
  request: (config: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(config.url || '');
    return apiInstance(config);
  },
  get: (url: string, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.get(url, config);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: (url: string, data?: Record<string, any>, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.post(url, data, config);
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: (url: string, data?: Record<string, any>, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.put(url, data, config);
  },
  delete: (url: string, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance(url);
    return apiInstance.delete(url, config);
  },
};

export default api;
