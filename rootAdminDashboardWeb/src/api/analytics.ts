import { apiClient } from './client';
import type { AnalyticsOverview } from './types';

export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiClient.get<AnalyticsOverview>('/analytics/overview');
}
