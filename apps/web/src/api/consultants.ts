import api from './axios';

export interface Consultant {
  _id: string;
  name: string;
  specialization: string[];
  available: boolean;
  currentQueue: number;
  totalSessions: number;
}

// Description: Get all consultants
// Endpoint: GET /api/users/consultants
// Request: {}
// Response: { consultants: Consultant[] }
export const getConsultants = async () => {
  try {
    const response = await api.get('/users/consultants');
    // Map backend response to frontend expected format
    const backendConsultants = response.data.consultants || [];
    return {
      // eslint-disable-next-line
      consultants: backendConsultants.map((consultant: any) => ({
        _id: consultant.id,
        name: consultant.name,
        // Use backend specialization if present, else fallback
        specialization: consultant.specialization || ['General Consultation'],
        // Available: true if consultant is active and not currently busy (currentQueue === 0)
        available: consultant.isActive && (consultant.currentQueue === 0),
        // Current queue: number of active visits assigned to this consultant
        currentQueue: consultant.currentQueue ?? 0,
        // Total sessions: number of completed visits assigned to this consultant
        totalSessions: consultant.totalSessions ?? 0
      }))
    };
  } catch (error) {
    console.error('Get consultants error:', error);
    throw new Error((error as Error)?.message || 'Failed to load consultants');
  }
};