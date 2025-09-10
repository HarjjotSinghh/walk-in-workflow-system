import api from './axios';

export interface AuditRecord {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userName: string;
  userEmail: string;
  userRole: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValues: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValues: any;
  ipAddress: string;
  createdAt: string;
}

export interface AuditResponse {
  audit_records: AuditRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Description: Get audit trail for compliance
// Endpoint: GET /api/analytics/audit
// Request: { page?: number, limit?: number, entity?: string, entity_id?: string, start_date?: string, end_date?: string }
// Response: { audit_records: AuditRecord[], pagination: object }
export const getAuditTrail = async (params: {
  page?: number;
  limit?: number;
  entity?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.entity) queryParams.append('entity', params.entity);
    if (params.entityId) queryParams.append('entity_id', params.entityId);
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    
    const response = await api.get(`/api/analytics/audit?${queryParams.toString()}`);
    
    return {

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auditRecords: response.data.audit_records.map((record: any) => ({
        id: record.id,
        entity: record.entity,
        entityId: record.entityId,
        action: record.action,
        userName: record.user?.name || 'System',
        userEmail: record.user?.email || '',
        userRole: record.user?.role || '',
        oldValues: record.oldValues,
        newValues: record.newValues,
        ipAddress: record.ipAddress,
        createdAt: record.createdAt,
      })),
      pagination: response.data.pagination,
    };
  } catch (error) {
    console.error('Get audit trail error:', error);
    throw new Error((error as Error)?.message || 'Failed to load audit trail');
  }
};

// Description: Export visitor data as CSV
// Endpoint: GET /api/analytics/export
// Request: { start_date?: string, end_date?: string }
// Response: CSV file download
export const exportVisitorData = async (params: {
  startDate?: string;
  endDate?: string;
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    
    const response = await api.get(`/api/analytics/export?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    const startDate = params.startDate || new Date().toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];
    
    link.setAttribute('download', `wiws-export-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    return { success: true };
  } catch (error) {
    console.error('Export data error:', error);
    throw new Error((error as Error)?.message || 'Failed to export data');
  }
};