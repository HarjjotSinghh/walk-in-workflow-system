import { 
  UserRole, 
  Permission, 
  ROLE_PERMISSIONS, 
  ApiUser, 
  PermissionContext 
} from '../types/auth';

/**
 * Check if a user role has a specific permission
 */
export const hasRolePermission = (userRole: UserRole, permission: Permission): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions.includes(permission);
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (context: PermissionContext, permission: Permission): boolean => {
  const { user } = context;
  
  // Inactive users have no permissions
  if (!user.isActive) {
    return false;
  }
  
  // Anonymous users have very limited permissions
  if (user.isAnonymous && !['visits:create', 'services:read'].includes(permission)) {
    return false;
  }
  
  return hasRolePermission(user.role, permission);
};

/**
 * Check if user can access a specific resource
 */
export const canAccessResource = (
  context: PermissionContext, 
  permission: Permission,
  resourceOwnerId?: string
): boolean => {
  const { user } = context;
  
  // Basic permission check
  if (!hasPermission(context, permission)) {
    return false;
  }
  
  // Resource ownership check (consultants can only access their own visits)
  if (user.role === 'consultant' && resourceOwnerId && resourceOwnerId !== user.id) {
    return false;
  }
  
  return true;
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
export const getUserPermissions = (user: ApiUser): Permission[] => {
  if (!user.isActive) {
    return [];
  }
  
  return getRolePermissions(user.role);
};

/**
 * Check if user is admin
 */
export const isAdmin = (user: ApiUser): boolean => {
  return user.role === 'admin' && user.isActive;
};

/**
 * Check if user is PA or admin
 */
export const isPA = (user: ApiUser): boolean => {
  return (user.role === 'pa' || user.role === 'admin') && user.isActive;
};

/**
 * Check if user is consultant or admin
 */
export const isConsultant = (user: ApiUser): boolean => {
  return (user.role === 'consultant' || user.role === 'admin') && user.isActive;
};

/**
 * Check if user is reception or admin
 */
export const isReception = (user: ApiUser): boolean => {
  return (user.role === 'reception' || user.role === 'admin') && user.isActive;
};

/**
 * Validate role assignment permissions
 */
export const canAssignRole = (assignerRole: UserRole, targetRole: UserRole): boolean => {
  // Only admins can assign admin role
  if (targetRole === 'admin' && assignerRole !== 'admin') {
    return false;
  }
  
  // Admins can assign any role
  if (assignerRole === 'admin') {
    return true;
  }
  
  // PAs can assign reception and consultant roles
  if (assignerRole === 'pa' && ['reception', 'consultant'].includes(targetRole)) {
    return true;
  }
  
  // Others cannot assign roles
  return false;
};

/**
 * Get assignable roles for a user
 */
export const getAssignableRoles = (userRole: UserRole): UserRole[] => {
  switch (userRole) {
    case 'admin':
      return ['reception', 'pa', 'consultant', 'admin'];
    case 'pa':
      return ['reception', 'consultant'];
    default:
      return [];
  }
};

/**
 * Check if user can manage another user
 */
export const canManageUser = (managerRole: UserRole, targetUserRole: UserRole): boolean => {
  // Admins can manage everyone
  if (managerRole === 'admin') {
    return true;
  }
  
  // PAs can manage reception and consultants
  if (managerRole === 'pa' && ['reception', 'consultant'].includes(targetUserRole)) {
    return true;
  }
  
  return false;
};

/**
 * Permission middleware factory for Hono
 */
export const requirePermission = (permission: Permission) => {
  return (context: any, next: any) => {
    const user = context.get('user') as ApiUser;
    
    if (!user) {
      return context.json({ success: false, error: 'Authentication required' }, 401);
    }
    
    if (!hasPermission({ user }, permission)) {
      return context.json({ success: false, error: 'Insufficient permissions' }, 403);
    }
    
    return next();
  };
};

/**
 * Role middleware factory for Hono
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (context: any, next: any) => {
    const user = context.get('user') as ApiUser;
    
    if (!user) {
      return context.json({ success: false, error: 'Authentication required' }, 401);
    }
    
    if (!user.isActive) {
      return context.json({ success: false, error: 'Account is inactive' }, 403);
    }
    
    if (!allowedRoles.includes(user.role)) {
      return context.json({ success: false, error: 'Insufficient role permissions' }, 403);
    }
    
    return next();
  };
};

/**
 * Admin only middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * PA or Admin middleware
 */
export const requirePA = requireRole(['pa', 'admin']);

/**
 * Consultant or Admin middleware
 */
export const requireConsultant = requireRole(['consultant', 'admin']);

/**
 * Reception or Admin middleware
 */
export const requireReception = requireRole(['reception', 'admin']);