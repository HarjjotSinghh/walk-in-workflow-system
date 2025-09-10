import { useState, useEffect, useMemo } from 'react';
import { wiwsUser, UserRole, Permission } from '../types/auth';
import { 
  hasPermission, 
  getUserPermissions, 
  canAccessDashboard,
  getDefaultDashboardRoute 
} from './permissions';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to check if current user has a specific permission
 */
export const usePermission = (permission: Permission): boolean => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return hasPermission({ user }, permission);
  }, [user, permission]);
};

/**
 * Hook to check if current user has any of the specified permissions
 */
export const usePermissions = (permissions: Permission[]): boolean => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return permissions.some(permission => hasPermission({ user }, permission));
  }, [user, permissions]);
};

/**
 * Hook to check if current user has a specific role
 */
export const useRole = (role: UserRole): boolean => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return user.role === role;
  }, [user, role]);
};

/**
 * Hook to check if current user has any of the specified roles
 */
export const useRoles = (roles: UserRole[]): boolean => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user, roles]);
};

/**
 * Hook to get all permissions for the current user
 */
export const useUserPermissions = (): Permission[] => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return [];
    return getUserPermissions(user);
  }, [user]);
};

/**
 * Hook to check if current user can access a specific dashboard
 */
export const useDashboardAccess = (dashboardType: UserRole): boolean => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    return canAccessDashboard(user, dashboardType);
  }, [user, dashboardType]);
};

/**
 * Hook to get the default dashboard route for current user
 */
export const useDefaultDashboard = (): string => {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return '/dashboard/receptionist';
    return getDefaultDashboardRoute(user);
  }, [user]);
};

/**
 * Role badge color utility
 */
export const getRoleBadgeColor = (role: UserRole): string => {
  const colorMap: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-800 border-red-200',
    pa: 'bg-blue-100 text-blue-800 border-blue-200',
    consultant: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    reception: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    anonymous: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  return colorMap[role] || 'bg-gray-100 text-gray-800 border-gray-200';
};

/**
 * Role display name utility
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    admin: 'Administrator',
    pa: 'Personal Assistant',
    consultant: 'Consultant',
    reception: 'Receptionist',
    anonymous: 'Anonymous'
  };
  
  return displayNames[role] || role;
};

/**
 * Role description utility
 */
export const getRoleDescription = (role: UserRole): string => {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full system access with user and service management capabilities',
    pa: 'Approves visits, assigns consultants, and manages workflow',
    consultant: 'Manages assigned client sessions and consultations',
    reception: 'Creates walk-in visits and manages client reception',
    anonymous: ''
  };
  
  return descriptions[role] || '';
};

/**
 * Permission display name utility
 */
export const getPermissionDisplayName = (permission: Permission): string => {
  const displayNames: Record<Permission, string> = {
    'visits:create': 'Create Visits',
    'visits:read': 'View Visits',
    'visits:update': 'Update Visits',
    'visits:delete': 'Delete Visits',
    'visits:approve': 'Approve Visits',
    'visits:assign': 'Assign Consultants',
    'visits:start_session': 'Start Sessions',
    'visits:complete_session': 'Complete Sessions',
    'visits:export': 'Export Visit Data',
    'user:create': 'Create Users',
    'user:read': 'View Users',
    'user:update': 'Update Users',
    'user:delete': 'Delete Users',
    'user:manage_roles': 'Manage User Roles',
    'services:create': 'Create Services',
    'services:read': 'View Services',
    'services:update': 'Update Services',
    'services:delete': 'Delete Services',
    'analytics:read': 'View Analytics',
    'analytics:export': 'Export Analytics',
    'audit:read': 'View Audit Logs',
    'system:admin': 'System Administration',
    'system:configure': 'System Configuration',
  };
  
  return displayNames[permission] || permission;
};

/**
 * Hook for role-based navigation guard
 */
export const useRoleGuard = (allowedRoles: UserRole[], redirectTo?: string) => {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  
  useEffect(() => {
    if (!user) {
      setIsAuthorized(false);
      return;
    }
    
    const authorized = allowedRoles.includes(user.role);
    setIsAuthorized(authorized);
    
    if (!authorized && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [user, allowedRoles, redirectTo]);
  
  return { isAuthorized, user };
};

/**
 * Hook for permission-based navigation guard
 */
export const usePermissionGuard = (requiredPermissions: Permission[], redirectTo?: string) => {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  
  useEffect(() => {
    if (!user) {
      setIsAuthorized(false);
      return;
    }
    
    const authorized = requiredPermissions.every(permission => 
      hasPermission({ user }, permission)
    );
    setIsAuthorized(authorized);
    
    if (!authorized && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [user, requiredPermissions, redirectTo]);
  
  return { isAuthorized, user };
};