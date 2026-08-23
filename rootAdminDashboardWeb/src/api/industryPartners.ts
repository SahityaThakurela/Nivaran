import { apiClient } from './client';
import type { IndustryPartner } from './types';

export interface IndustryPartnersResponse {
  partners: IndustryPartner[];
}

export function getIndustryPartners(): Promise<IndustryPartnersResponse> {
  return apiClient.get<IndustryPartnersResponse>('/industry-partners');
}
