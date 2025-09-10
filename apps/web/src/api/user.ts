import { UserRole } from "~/types/auth";

export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
  lastLogin: string;
}

// Description: Get current user profile and role
// Endpoint: GET /api/user/profile
// Request: {}
// Response: { user: UserProfile }
export const getUserProfile = () => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        user: {
          _id: '1',
          email: 'admin@wiws.com',
          name: 'System Administrator',
          role: 'admin',
          permissions: ['manage_users', 'view_analytics', 'export_data', 'manage_services'],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.get('/user/profile');
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};

// Description: Update user role
// Endpoint: PUT /api/user/:id/role
// Request: { role: string }
// Response: { user: UserProfile, success: boolean, message: string }
export const updateUserRole = (userId: string, role: string) => {
  // Mocking the response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        user: {
          _id: userId,
          role: role,
          updatedAt: new Date().toISOString()
        },
        success: true,
        message: 'User role updated successfully'
      });
    }, 500);
  });
  // Uncomment the below lines to make an actual API call
  // try {
  //   return await api.put(`/api/user/${userId}/role`, { role });
  // } catch (error) {
  //   throw new Error(error?.response?.data?.message || error.message);
  // }
};