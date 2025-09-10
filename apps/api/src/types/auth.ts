import { schema } from "../db/schema";

// User Role Types - Must match database enum
export type UserRole = 'reception' | 'pa' | 'consultant' | 'admin' | 'anonymous';

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
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'users:manage_roles'
  
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
    'users:read',
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
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'users:manage_roles',
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
    'services:read'
  ]
};

export type UserDB = typeof schema.user.$inferSelect;

// Extended User Interface for API
export interface ApiUser extends Partial<UserDB> {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  isActive: boolean;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null | undefined;
  password?: string | null | undefined; // Only for certain operations
}

// Visit Status Types
export type VisitStatus = 'new' | 'approved' | 'denied' | 'in_session' | 'completed' | 'cancelled';

// API Context for permission checking
export interface PermissionContext {
  user: ApiUser;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// Audit Action Types
export type AuditAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'approve' 
  | 'deny' 
  | 'assign' 
  | 'start_session' 
  | 'complete_session' 
  | 'cancel'
  | 'login'
  | 'logout'
  | 'register';

// Visit Request/Response DTOs
export interface CreateVisitRequest {
  name: string;
  phone: string;
  serviceId: number;
  notes?: string;
}

export interface UpdateVisitRequest {
  status?: VisitStatus;
  assignedConsultantId?: string;
  notes?: string;
  sessionNotes?: string;
}

export interface ApproveVisitRequest {
  assignedConsultantId: string;
  notes?: string;
}

// User Management DTOs
export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Service Management DTOs
export interface CreateServiceRequest {
  name: string;
  description?: string;
  estMinutes: number;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  estMinutes?: number;
  isActive?: boolean;
}

// Analytics DTOs
export interface DashboardStats {
  totalVisits: number;
  activeVisits: number;
  completedVisits: number;
  averageWaitTime: number;
  averageSessionTime: number;
  visitsByStatus: Record<VisitStatus, number>;
  visitsByService: Array<{ serviceName: string; count: number }>;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  status?: VisitStatus;
  serviceId?: number;
  consultantId?: string;
}