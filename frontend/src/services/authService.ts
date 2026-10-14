import { apiRequest } from './apiClient';
import { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth';

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async getMe(): Promise<User> {
    return apiRequest<User>('/auth/me/', {
      method: 'GET',
    });
  },

  async updateProfile(
    partialData: Partial<User>
  ): Promise<{ message: string; user: User }> {
    return apiRequest<{ message: string; user: User }>('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(partialData),
    });
  },
};
