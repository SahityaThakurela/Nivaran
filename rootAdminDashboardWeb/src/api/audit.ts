import { apiClient } from './client';
import type { AuditEvent } from './types';

export interface AuditEventsResponse {
  events: AuditEvent[];
}

export function getAuditEvents(limit?: number): Promise<AuditEventsResponse> {
  const qs = limit ? `?limit=${limit}` : '';
  return apiClient.get<AuditEventsResponse>(`/audit${qs}`);
}
