import { apiClient } from './client';
import type { Authority, ChallengeDomain } from './types';

export interface AuthoritiesResponse {
  authorities: Authority[];
}

export interface AuthorityResponse {
  authority: Authority;
}

export function getAuthorities(params?: {
  domain?: ChallengeDomain;
  includeInactive?: boolean;
}): Promise<AuthoritiesResponse> {
  const qs = new URLSearchParams();
  if (params?.domain) qs.set('domain', params.domain);
  if (params?.includeInactive) qs.set('includeInactive', 'true');
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiClient.get<AuthoritiesResponse>(`/authorities${query}`);
}

export function createAuthority(data: {
  name: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  domains?: ChallengeDomain[];
  cityId?: string;
  universityId?: string;
}): Promise<AuthorityResponse> {
  return apiClient.post<AuthorityResponse>('/authorities', data);
}

export function updateAuthority(
  id: string,
  data: Partial<{
    name: string;
    designation: string | null;
    department: string | null;
    phone: string | null;
    email: string | null;
    domains: ChallengeDomain[];
    isActive: boolean;
  }>,
): Promise<AuthorityResponse> {
  return apiClient.patch<AuthorityResponse>(`/authorities/${id}`, data);
}
