// User Role Types
export type UserRole = 'reception' | 'pa' | 'consultant' | 'admin' | 'anonymous';

// User Interface extending Better Auth User type
export interface wiwsUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  role: UserRole;
  isActive: boolean;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Permission Types
export type Permission = 
  // Visit Management
  | 'visits:create'
  | 'visits:read'
  | 'visits:update'
  | 'visits:delete'
  | 'visits:approve'
  | 'visits:assign'
  | 'visits:start_session'
  | 'visits:complete_session'
  | 'visits:export'
  
  // User Management
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:manage_roles'
  
  // Service Management
  | 'services:create'
  | 'services:read'
  | 'services:update'
  | 'services:delete'
  
  // Analytics & Reports
  | 'analytics:read'
  | 'analytics:export'
  | 'audit:read'
  
  // System Administration
  | 'system:admin'
  | 'system:configure';

// Role-based Permissions Map
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  reception: [
    'visits:create',
    'visits:read',
    'visits:update',
    'services:read',
  ],
  pa: [
    'visits:read',
    'visits:approve',
    'visits:assign',
    'visits:update',
    'services:read',
    'user:read',
    'analytics:read',
  ],
  consultant: [
    'visits:read',
    'visits:start_session',
    'visits:complete_session',
    'visits:update',
    'services:read',
    'analytics:read',
  ],
  admin: [
    'visits:create',
    'visits:read',
    'visits:update',
    'visits:delete',
    'visits:approve',
    'visits:assign',
    'visits:start_session',
    'visits:complete_session',
    'visits:export',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:manage_roles',
    'services:create',
    'services:read',
    'services:update',
    'services:delete',
    'analytics:read',
    'analytics:export',
    'audit:read',
    'system:admin',
    'system:configure',
  ],
  anonymous: [
    'visits:create',
    'services:read',
  ],
};

// Dashboard Route Mapping
export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  reception: '/dashboard/receptionist',
  pa: '/dashboard/pa',
  consultant: '/dashboard/consultant',
  admin: '/dashboard/admin',
  anonymous: '/dashboard',
};

// Permission Check Utility Types
export interface PermissionCheckContext {
  user: wiwsUser;
  resource?: string;
  resourceId?: string;
}

// Visit Status Types
export type VisitStatus = 'new' | 'approved' | 'denied' | 'in_session' | 'completed' | 'cancelled';

// Visit Interface
export interface Visit {
  id: number;
  token: string;
  name: string;
  phone: string;
  serviceId: number;
  status: VisitStatus;
  assignedConsultantId?: string;
  paId?: string;
  receptionId: string;
  notes?: string;
  sessionNotes?: string;
  waitTimeMinutes?: number;
  sessionStartTime?: string;
  sessionEndTime?: string;
  createdAt: string;
  updatedAt: string;
}

// Service Interface
export interface Service {
  id: number;
  name: string;
  description?: string;
  estMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Audit Log Interface
export interface AuditLog {
  id: number;
  entity: string;
  entityId: string;
  action: string;
  userId: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard Stats Interface
export interface DashboardStats {
  totalVisits: number;
  activeVisits: number;
  completedVisits: number;
  averageWaitTime: number;
  averageSessionTime: number;
}

// Export utility function types
export type RoleChecker = (userRole: UserRole, permission: Permission) => boolean;
export type PermissionChecker = (context: PermissionCheckContext, permission: Permission) => boolean;