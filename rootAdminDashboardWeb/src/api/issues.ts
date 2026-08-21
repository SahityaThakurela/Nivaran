import { apiClient } from './client';
import type { Report, ReportStatus, ReportCategory, DuplicateCandidate } from './types';

export interface ReportsResponse {
  reports: Report[];
}

export interface ReportResponse {
  report: Report;
}

export interface DuplicatesResponse {
  candidates: DuplicateCandidate[];
}

export function getIssues(params?: {
  status?: ReportStatus;
  category?: ReportCategory;
}): Promise<ReportsResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiClient.get<ReportsResponse>(`/issues${query}`);
}

export function getIssue(id: string): Promise<ReportResponse> {
  return apiClient.get<ReportResponse>(`/issues/${id}`);
}

export function getDuplicates(id: string, radiusMeters?: number): Promise<DuplicatesResponse> {
  const qs = radiusMeters ? `?radiusMeters=${radiusMeters}` : '';
  return apiClient.get<DuplicatesResponse>(`/issues/${id}/duplicates${qs}`);
}

export function updateIssue(
  id: string,
  data: {
    status?: ReportStatus;
    assignedToId?: string | null;
    departmentId?: string | null;
    note?: string;
    duplicateOfId?: string | null;
  }
): Promise<ReportResponse> {
  return apiClient.patch<ReportResponse>(`/issues/${id}`, data);
}

export function triggerAiAnalysis(reportId: string): Promise<ReportResponse> {
  return apiClient.post<ReportResponse>('/ai/analyze-report', { reportId });
}
