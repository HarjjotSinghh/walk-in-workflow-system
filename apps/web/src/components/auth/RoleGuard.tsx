import { ReactNode } from 'react';
import { UserRole, Permission } from '../../types/auth';
import { useAuth } from '../../contexts/AuthContext';
import { 
  hasPermission, 
  canAccessDashboard 
} from '../../lib/permissions';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

interface PermissionGuardProps {
  requiredPermissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // true = AND, false = OR (default: true)
}

interface DashboardGuardProps {
  dashboardType: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component to conditionally render content based on user roles
 */
export const RoleGuard = ({ allowedRoles, children, fallback = null }: RoleGuardProps) => {
  const { user } = useAuth();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * Component to conditionally render content based on user permissions
 */
export const PermissionGuard = ({ 
  requiredPermissions, 
  children, 
  fallback = null, 
  requireAll = true 
}: PermissionGuardProps) => {
  const { user } = useAuth();
  
  if (!user) {
    return <>{fallback}</>;
  }
  
  const hasRequiredPermissions = requireAll
    ? requiredPermissions.every(permission => hasPermission({ user }, permission))
    : requiredPermissions.some(permission => hasPermission({ user }, permission));
  
  if (!hasRequiredPermissions) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * Component to conditionally render content based on dashboard access
 */
export const DashboardGuard = ({ dashboardType, children, fallback = null }: DashboardGuardProps) => {
  const { user } = useAuth();
  
  if (!user || !canAccessDashboard(user, dashboardType)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

/**
 * Component to show content only to admins
 */
export const AdminOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

/**
 * Component to show content only to PA and admins
 */
export const PAOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
  return (
    <RoleGuard allowedRoles={['pa', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

/**
 * Component to show content only to consultants and admins
 */
export const ConsultantOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
  return (
    <RoleGuard allowedRoles={['consultant', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

/**
 * Component to show content only to reception and admins
 */
export const ReceptionOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
  return (
    <RoleGuard allowedRoles={['reception', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
};

/**
 * Higher-order component for role-based rendering
 */
export const withRoleGuard = (allowedRoles: UserRole[], fallback?: ReactNode) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const GuardedComponent = (props: P) => (
      <RoleGuard allowedRoles={allowedRoles} fallback={fallback}>
        <Component {...props} />
      </RoleGuard>
    );
    
    GuardedComponent.displayName = `withRoleGuard(${Component.displayName || Component.name})`;
    return GuardedComponent;
  };
};

/**
 * Higher-order component for permission-based rendering
 */
export const withPermissionGuard = (
  requiredPermissions: Permission[], 
  fallback?: ReactNode,
  requireAll: boolean = true
) => {
  return <P extends object>(Component: React.ComponentType<P>) => {
    const GuardedComponent = (props: P) => (
      <PermissionGuard 
        requiredPermissions={requiredPermissions} 
        fallback={fallback}
        requireAll={requireAll}
      >
        <Component {...props} />
      </PermissionGuard>
    );
    
    GuardedComponent.displayName = `withPermissionGuard(${Component.displayName || Component.name})`;
    return GuardedComponent;
  };
};