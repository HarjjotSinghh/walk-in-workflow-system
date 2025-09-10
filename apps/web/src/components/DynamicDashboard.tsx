import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "~/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAuth } from "~/contexts/AuthContext"
import { wiwsUser, UserRole } from "~/types/auth"
import { getDefaultDashboardRoute, canAccessDashboard } from "~/lib/permissions"

export function DynamicDashboard() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const determineUserRole = async () => {
      try {
        // Wait for auth to complete loading
        if (authLoading) {
          return;
        }
        
        // If no user after auth loading is complete, redirect to login
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/login', { replace: true });
          return;
        }

        // User is authenticated, proceed with role-based routing
        const wiwsUser = user as wiwsUser;
        // console.log('Authenticated user:', wiwsUser);
        
        // Validate user has required properties
        if (!wiwsUser.role) {
          console.warn('User missing role, defaulting to reception');
          navigate('/dashboard/receptionist', { replace: true });
          return;
        }
        
        const userRole: UserRole = wiwsUser.role;
        
        // Get the default dashboard route for the user
        const dashboardRoute = getDefaultDashboardRoute(wiwsUser);
        // console.log('Redirecting to dashboard:', dashboardRoute);
        
        // Verify the user can access their assigned dashboard
        if (!canAccessDashboard(wiwsUser, userRole)) {
          console.warn(`User with role ${userRole} cannot access dashboard`);
          navigate('/dashboard/receptionist', { replace: true });
          return;
        }
        
        // Simulate a brief loading period for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to appropriate dashboard
        navigate(dashboardRoute, { replace: true });
      } catch (error) {
        console.error('Error determining user role:', error);
        // Default to receptionist dashboard on error
        navigate('/dashboard/receptionist', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    determineUserRole();
  }, [navigate, user, authLoading]);

  // Show loading while auth is loading OR internal loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
  <Card className="w-96 border-0">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Dashboard</h2>
            <p className="text-gray-600">Determining your role and preparing your workspace...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}