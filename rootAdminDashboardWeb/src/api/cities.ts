import { apiClient } from './client';
import type { City } from './types';

export interface CitiesResponse {
  cities: City[];
}

export function getCities(): Promise<CitiesResponse> {
  return apiClient.get<CitiesResponse>('/cities');
}
