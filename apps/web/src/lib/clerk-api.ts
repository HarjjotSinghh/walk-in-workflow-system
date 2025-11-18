import { useAuth as useClerkAuth } from '@clerk/clerk-react';

/**
 * Custom hook to get authenticated API client
 */
export function useApiClient() {
  const { getToken } = useClerkAuth();

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  return {
    get: (url: string, options?: RequestInit) => 
      apiCall(url, { ...options, method: 'GET' }),
    
    post: (url: string, data?: any, options?: RequestInit) => 
      apiCall(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
    put: (url: string, data?: any, options?: RequestInit) => 
      apiCall(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
    patch: (url: string, data?: any, options?: RequestInit) => 
      apiCall(url, { ...options, method: 'PATCH', body: JSON.stringify(data) }),
    
    delete: (url: string, options?: RequestInit) => 
      apiCall(url, { ...options, method: 'DELETE' }),
  };
}

/**
 * Get Clerk session token for SSE connections
 */
export async function getClerkToken(): Promise<string | null> {
  try {
    // This needs to be called from within a Clerk context
    // For SSE, you'll need to pass the token as a query parameter
    const { getToken } = useClerkAuth();
    return await getToken();
  } catch (error) {
    console.error('Failed to get Clerk token:', error);
    return null;
  }
}
