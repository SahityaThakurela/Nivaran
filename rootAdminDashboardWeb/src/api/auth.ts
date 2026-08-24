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
  universityId?: string;
}): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/register', data);
}

export interface UsersResponse {
  users: SafeUser[];
}

export function getStaffUsers(): Promise<UsersResponse> {
  return apiClient.get<UsersResponse>('/auth/users');
}

export interface CreateStaffInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: 'UNIVERSITY_ADMIN' | 'GOVERNMENT_ADMIN' | 'SUPER_ADMIN';
  cityId?: string;
  universityId?: string;
}

export interface CreateStaffResponse {
  user: SafeUser;
}

export function createStaff(data: CreateStaffInput): Promise<CreateStaffResponse> {
  return apiClient.post<CreateStaffResponse>('/auth/staff', data);
}
