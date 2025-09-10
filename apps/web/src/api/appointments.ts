import api from './axios';

export interface Appointment {
  _id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

// Description: Create a new appointment request
// Endpoint: POST /api/appointments
// Request: { name: string, phone: string, email: string, service: string, preferredDate: string, preferredTime: string, message?: string }
// Response: { appointment: Appointment, success: boolean, message: string }
export const createAppointment = (data: {
  name: string;
  phone: string;
  email: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
}) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        appointment: {
          _id: Date.now().toString(),
          ...data,
          status: 'pending',
          createdAt: new Date().toISOString()
        },
        success: true,
        message: 'Appointment request submitted successfully. We will contact you soon.'
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.post('/api/appointments', data);
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};