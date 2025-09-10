import { 
  UserRole, 
  Permission, 
  ROLE_PERMISSIONS, 
  ROLE_DASHBOARD_ROUTES,
  wiwsUser,
  PermissionCheckContext,
  RoleChecker,
  PermissionChecker
} from '../types/auth';

/**
 * Check if a user role has a specific permission
 */
export const hasRolePermission: RoleChecker = (userRole: UserRole, permission: Permission): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission: PermissionChecker = (
  context: PermissionCheckContext, 
  permission: Permission
): boolean => {
  const { user } = context;
  
  // Inactive users have no permissions
  if (!user.isActive) {
    return false;
  }
  
  // Anonymous users have limited permissions (only reception-level for walk-ins)
  if (user.isAnonymous && !['visits:create', 'services:read'].includes(permission)) {
    return false;
  }
  
  return hasRolePermission(user.role, permission);
};

/**
 * Get all permissions for a user role
 */
export const getRolePermissions = (userRole: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[userRole] || [];
};

/**
 * Get all permissions for a user
 */
export const getUserPermissions = (user: wiwsUser): Permission[] => {
  if (!user.isActive) {
    return [];
  }
  
  return getRolePermissions(user.role);
};

/**
 * Check if user can access a specific dashboard
 */
export const canAccessDashboard = (user: wiwsUser, dashboardType: UserRole): boolean => {
  // Admin can access all dashboards
  if (user.role === 'admin') {
    return true;
  }
  
  // Users can only access their own role dashboard
  return user.role === dashboardType;
};

/**
 * Get the default dashboard route for a user
 */
export const getDefaultDashboardRoute = (user: wiwsUser): string => {
  return ROLE_DASHBOARD_ROUTES[user.role] || ROLE_DASHBOARD_ROUTES.reception;
};

/**
 * Check if user can manage visits
 */
export const canManageVisits = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'visits:update') || hasPermission({ user }, 'visits:approve');
};

/**
 * Check if user can create visits
 */
export const canCreateVisits = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'visits:create');
};

/**
 * Check if user can approve visits
 */
export const canApproveVisits = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'visits:approve');
};

/**
 * Check if user can start/manage sessions
 */
export const canManageSessions = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'visits:start_session') || hasPermission({ user }, 'visits:complete_session');
};

/**
 * Check if user can manage other users
 */
export const canManageUsers = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'user:manage_roles');
};

/**
 * Check if user can manage services
 */
export const canManageServices = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'services:update') || hasPermission({ user }, 'services:create');
};

/**
 * Check if user can view analytics
 */
export const canViewAnalytics = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'analytics:read');
};

/**
 * Check if user can export data
 */
export const canExportData = (user: wiwsUser): boolean => {
  return hasPermission({ user }, 'analytics:export') || hasPermission({ user }, 'visits:export');
};

/**
 * Check if user has admin privileges
 */
export const isAdmin = (user: wiwsUser): boolean => {
  return user.role === 'admin';
};

/**
 * Check if user has PA privileges
 */
export const isPA = (user: wiwsUser): boolean => {
  return user.role === 'pa' || user.role === 'admin';
};

/**
 * Check if user has consultant privileges
 */
export const isConsultant = (user: wiwsUser): boolean => {
  return user.role === 'consultant' || user.role === 'admin';
};

/**
 * Check if user has reception privileges
 */
export const isReception = (user: wiwsUser): boolean => {
  return user.role === 'reception' || user.role === 'admin';
};

/**
 * Get available roles that a user can assign to others
 */
export const getAssignableRoles = (user: wiwsUser): UserRole[] => {
  if (user.role === 'admin') {
    return ['reception', 'pa', 'consultant', 'admin'];
  }
  
  // PA can assign reception and consultant roles
  if (user.role === 'pa') {
    return ['reception', 'consultant'];
  }
  
  // Other roles cannot assign roles
  return [];
};

/**
 * Permission guard for React components
 */
export const requirePermission = (
  user: wiwsUser | null, 
  permission: Permission,
  fallback?: React.ReactNode
) => {
  return (component: React.ReactNode) => {
    if (!user || !hasPermission({ user }, permission)) {
      return fallback || null;
    }
    return component;
  };
};

/**
 * Role guard for React components
 */
export const requireRole = (
  user: wiwsUser | null, 
  allowedRoles: UserRole[],
  fallback?: React.ReactNode
) => {
  return (component: React.ReactNode) => {
    if (!user || !allowedRoles.includes(user.role)) {
      return fallback || null;
    }
    return component;
  };
};