import axios, { AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig, AxiosStatic, AxiosInstance, AxiosResponse } from 'axios';
import {parse} from 'json-bigint';

// Use relative URLs to go through the Vite proxy
// This ensures CORS is handled by the proxy instead of direct cross-origin requests
export const apiClient = axios.create({
  baseURL: import.meta.env.PROD ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 10000,
  // baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://localhost:8787',
  // baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'https://wiws-api.harjjotsinghh.workers.dev',
  headers: {
    'Content-Type': 'application/json',
  },
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



let accessToken: string | null = null;

const getApiInstance = (url: string) => {
  return apiClient;
};

const isAuthEndpoint = (url: string): boolean => {
  return url.includes("/api/auth");
};

// Check if the URL is for the refresh token endpoint to avoid infinite loops
const isRefreshTokenEndpoint = (url: string): boolean => {
  return url.includes("/api/auth/refresh");
};

const setupInterceptors = (apiInstance: AxiosInstance) => {
  apiInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      if (!accessToken) {
        accessToken = localStorage.getItem('wiws_auth_token');
      }
      
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
  );

  apiInstance.interceptors.response.use(
    (response: any) => {
      // Return just the data from the response
      return response.data;
    },
    async (error: any): Promise<Error> => {
      if (error.response?.status === 401) {
        // Handle unauthorized access - clear tokens and redirect to login
        localStorage.removeItem('wiws_auth_token');
        accessToken = null;
        
        // Redirect to login page
        window.location.href = '/login';
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
