import api from './axios';

export interface DashboardStats {
  totalVisitors: number;
  pendingApprovals: number;
  inSession: number;
  completed: number;
  averageWaitTime: number;
}

// Description: Get dashboard statistics
// Endpoint: GET /api/analytics/dashboard
// Request: {}
// Response: { stats: DashboardStats }
export const getDashboardStats = async () => {
  try {
    const response = await api.get('/analytics/dashboard');
    // Map backend response to frontend expected format
    const backendData = response.data;
    return {
      stats: {
        totalVisitors: backendData.today?.total_visits || 0,
        pendingApprovals: backendData.today?.new_visits || 0,
        inSession: backendData.today?.in_session_visits || 0,
        completed: backendData.today?.completed_visits || 0,
        averageWaitTime: 22 // TODO: Calculate from backend data
      }
    };
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    throw new Error((error as Error)?.message || 'Failed to load dashboard statistics');
  }
};