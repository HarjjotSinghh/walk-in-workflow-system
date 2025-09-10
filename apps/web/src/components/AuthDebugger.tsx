import { useEffect, useState } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { authClient } from '~/lib/auth-client';

export function AuthDebugger() {
  const { user, isLoading, isAuthenticated, session } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debugInfo, setDebugInfo] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiHealth, setApiHealth] = useState<any>(null);

  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const health = await response.json();
        setApiHealth(health);
      } catch (error: unknown) {
        console.error('API health check failed:', error);
        setApiHealth({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    const checkSession = async () => {
      try {
        const sessionData = await authClient.getSession();
        setDebugInfo(sessionData);
      } catch (error: unknown) {
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    checkApiHealth();
    checkSession();
  }, [user, isLoading]);

  const testAnonymousLogin = async () => {
    try {
      // const response = await authClient.signIn.anonymous();
      // console.log('Anonymous login response:', response);
      // setDebugInfo(response);
    } catch (error) {
      console.error('Anonymous login error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const testEmailLogin = async () => {
    try {
      const response = await authClient.signIn.email({
        email: 'admin@wiws.com',
        password: 'admin123',
      });
      // console.log('Email login response:', response);
      setDebugInfo(response);
    } catch (error) {
      console.error('Email login error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debugger</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Health */}
  <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-3">API Health</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(apiHealth, null, 2)}
          </pre>
        </div>

        {/* Auth Context State */}
  <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-3">Auth Context State</h2>
          <div className="space-y-2 text-sm">
            <div><strong>isLoading:</strong> {String(isLoading)}</div>
            <div><strong>isAuthenticated:</strong> {String(isAuthenticated)}</div>
            <div><strong>user:</strong></div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
            <div><strong>session:</strong></div>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        </div>

        {/* Direct Session Check */}
  <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-3">Direct Session Check</h2>
          <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Test Actions */}
  <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-3">Test Actions</h2>
          <div className="space-y-2">
            <button 
              onClick={testAnonymousLogin}
              className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Anonymous Login
            </button>
            <button 
              onClick={testEmailLogin}
              className="block w-full px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
            >
              Test Email Login (admin@wiws.com)
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="block w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>

      {/* Environment Info */}
  <div className="mt-6 bg-card p-4 rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-3">Environment Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Current URL:</strong>
            <div className="font-mono text-xs">{window.location.href}</div>
          </div>
          <div>
            <strong>API Base URL:</strong>
            <div className="font-mono text-xs">{import.meta.env.NEXT_PUBLIC_SITE_URL || '/ (proxy)'}</div>
          </div>
          <div>
            <strong>Mode:</strong>
            <div className="font-mono text-xs">{import.meta.env.MODE}</div>
          </div>
        </div>
      </div>
    </div>
  );
}