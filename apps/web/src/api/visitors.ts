import { VisitStatus } from '~/types/auth';
import api from './api';

export interface Visitor {
  _id: string;
  tokenId: string;
  name: string;
  phone: string;
  service: string;
  status: 'new' | 'approved' | 'in-session' | 'completed' | 'denied';
  createdAt: string;
  updatedAt: string;
  assignedConsultant?: string;
  notes?: string;
  waitTime?: number;
  sessionDuration?: number;
}

interface CreateVisitRequest {
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

// Description: Get all visitors for today
// Endpoint: GET /api/visits/today
// Request: {}
// Response: { success: boolean, data: { visits: Visitor[] } }
export const getTodayVisitors = async () => {
  try {
    const response = await api.get('/api/visits/today');
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visitors: response.data.visits.map((visit: any) => ({
        _id: visit.id.toString(),
        tokenId: visit.token,
        name: visit.name,
        phone: visit.phone,
        service: visit.service.name || visit.service,
        status: visit.status,
        createdAt: visit.createdAt,
        updatedAt: visit.updatedAt,
        assignedConsultant: visit.assignedConsultant,
        notes: visit.notes,
        waitTime: visit.waitTime,
        sessionDuration: visit.sessionDuration
      }))
    };
  } catch (error) {
    console.error('Get today visitors error:', error);
    throw error;
  }
};

// Description: Create a new visitor
// Endpoint: POST /api/visits
// Request: { name: string, phone: string, service_id: number, notes?: string, reception_id: string }
// Response: { success: boolean, data: { visit: Visitor }, message: string }
export const createVisitor = async (data: CreateVisitRequest) => {
  try {
    // Get current user as reception_id (from localStorage)
    const currentUser = JSON.parse(localStorage.getItem('wiws_user') || '{}');
    const reception_id = currentUser.id || 'reception-001'; // Use the seeded reception user ID as fallback
    
    const response = await api.post('/api/visits', {
      name: data.name,
      phone: data.phone,
      service_id: data.serviceId,
      notes: data.notes,
      reception_id: reception_id,
      serviceId: data.serviceId
    } as CreateVisitRequest);
    
    return {
      visitor: {
        _id: response.data.visit.id.toString(),
        tokenId: response.data.visit.token,
        name: response.data.visit.name,
        phone: response.data.visit.phone,
        service: response.data.visit.service,
        status: response.data.visit.status,
        createdAt: response.data.visit.createdAt,
        updatedAt: response.data.visit.createdAt,
        notes: response.data.visit.notes,
        waitTime: 0
      },
      success: !!response.data,
      message: response.statusText
    };
  } catch (error) {
    console.error('Create visitor error:', error);
    throw error;
  }
};

// Description: Update visitor status
// Endpoint: PUT /api/visits/:id/status
// Request: { status: string, assigned_consultant_id?: string, pa_id?: string, notes?: string, session_notes?: string }
// Response: { success: boolean, data: { visit: Visitor }, message: string }
export const updateVisitorStatus = async (id: string, data: { status: string; assignedConsultantId?: string; notes?: string }) => {
  try {
    // Get current user for pa_id or consultant tracking
    const currentUser = JSON.parse(localStorage.getItem('wiws_user') || '{}');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status: data.status,
      notes: data.notes
    };
    
    // If assigning consultant, include consultant ID
    if (data.assignedConsultantId && data.status === 'approved') {
      updateData.assigned_consultant_id = data.assignedConsultantId;
      updateData.pa_id = currentUser.id;
    }
    
    const response = await api.put(`/api/visits/${id}/status`, updateData);
    
    return {
      visitor: {
        _id: response.data.visit.id.toString(),
        ...response.data.visit,
        updatedAt: new Date().toISOString()
      },
      success: !!response.data,
      message: response.statusText
    };
  } catch (error) {
    console.error('Update visitor status error:', error);
    throw error;
  }
};

// Description: Get pending approvals for PA
// Endpoint: GET /api/visits/pending-approval
// Request: {}
// Response: { success: boolean, data: { visits: Visitor[] } }
export const getPendingApprovals = async () => {
  try {
    const response = await api.get('/api/visits/pending-approval');
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visitors: response.data.visits.map((visit: any) => ({
        _id: visit.id.toString(),
        tokenId: visit.token,
        name: visit.name,
        phone: visit.phone,
        service: visit.service,
        status: 'new',
        createdAt: visit.createdAt,
        updatedAt: visit.createdAt,
        waitTime: Math.floor((new Date().getTime() - new Date(visit.createdAt).getTime()) / 60000)
      }))
    };
  } catch (error) {
    console.error('Get pending approvals error:', error);
    throw error;
  }
};