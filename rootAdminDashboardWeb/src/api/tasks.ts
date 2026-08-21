import { apiClient } from './client';
import type { Report } from './types';

interface TaskResponse {
  report: Report;
}

export function acceptTask(id: string): Promise<TaskResponse> {
  return apiClient.post<TaskResponse>(`/tasks/${id}/accept`, {});
}

export function completeTask(
  id: string,
  data: { resolutionEvidenceUrls: string[]; note?: string }
): Promise<TaskResponse> {
  return apiClient.post<TaskResponse>(`/tasks/${id}/complete`, data);
}
