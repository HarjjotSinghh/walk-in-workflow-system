import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '~/contexts/AuthContext';
import { wiwsUser, UserRole } from '~/types/auth';
import { canAccessDashboard, getDefaultDashboardRoute } from '~/lib/permissions';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireAuth = true,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while authentication status is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
  <Card className="w-96 border-0">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Access</h2>
            <p className="text-gray-600">Checking your authentication status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !user && !isLoading) {
    // console.log('ProtectedRoute: Redirecting to login - no user and not loading');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If user is authenticated, check role-based permissions
  if (user && allowedRoles) {
    const wiwsUser = user as wiwsUser;
    
    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(wiwsUser.role)) {
      // Redirect to user's default dashboard instead of showing error
      const defaultRoute = getDefaultDashboardRoute(wiwsUser);
      console.warn(`User with role ${wiwsUser.role} attempted to access restricted route. Redirecting to ${defaultRoute}`);
      toast.error('You do not have permission to access this page.')
      return <Navigate to={defaultRoute} replace />;
    }
    
    // Check if user account is active
    if (!wiwsUser.isActive) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
          <Card className="w-96 border-0">
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Inactive</h2>
              <p className="text-gray-600 mb-4">Your account has been deactivated. Please contact your administrator.</p>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Return to Login
              </button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
}
