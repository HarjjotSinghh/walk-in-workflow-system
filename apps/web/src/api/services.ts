import api from './axios';

export interface Service {
  _id: string;
  name: string;
  description: string;
  estimatedTime: number;
  icon: string;
  active: boolean;
}

// Description: Get all available services
// Endpoint: GET /api/services
// Request: {}
// Response: { success: boolean, data: { services: Service[] } }
export const getServices = async () => {
  try {
    const response = await api.get('/services');
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      services: response.data.services.map((service: any) => ({
        _id: service.id.toString(),
        name: service.name,
        description: service.description || '',
        estimatedTime: service.est_minutes,
        icon: getServiceIcon(service.name),
        active: service.is_active === 1
      }))
    };
  } catch (error) {
    console.error('Get services error:', error);
    throw error;
  }
};

// Helper function to get service icon based on name
function getServiceIcon(serviceName: string): string {
  const iconMap: Record<string, string> = {
    'ITR Filing': 'FileText',
    'GST Registration': 'Receipt',
    'GST Return Filing': 'Receipt',
    'Business Registration': 'Briefcase',
    'Business Advisory': 'Briefcase',
    'Trademark Services': 'Shield',
    'Audit Services': 'Scale',
    'Tax Planning': 'Calculator',
    'Compliance Services': 'Scale',
    'Bookkeeping': 'BookOpen',
    'General Consultation': 'MessageCircle'
  };
  
  return iconMap[serviceName] || 'FileText';
}