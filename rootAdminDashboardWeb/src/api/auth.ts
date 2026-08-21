import { apiClient } from './client';
import type { SafeUser } from './types';

export interface LoginResponse {
  token: string;
  user: SafeUser;
}

export async function login(credentials: {
  email?: string;
  phone?: string;
  password: string;
}): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', credentials);
}

export async function register(data: {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role?: string;
  cityId?: string;
  departmentId?: string;
}): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/register', data);
}
