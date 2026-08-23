import { apiClient } from './client';
import type { University } from './types';

export interface UniversitiesResponse {
  universities: University[];
}

export function getUniversities(): Promise<UniversitiesResponse> {
  return apiClient.get<UniversitiesResponse>('/universities');
}
