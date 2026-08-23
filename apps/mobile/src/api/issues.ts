import { apiClient } from "./client";
import type { ChallengeDomain, Report, ReportStatus } from "./types";

export type CreateIssueInput = {
  description: string;
  cityId: string;
  latitude: number;
  longitude: number;
  address?: string;
  photoUrls?: string[];
  domain?: ChallengeDomain;
};

export type ListIssuesQuery = {
  status?: ReportStatus;
  domain?: ChallengeDomain;
  /** Citizen-only: narrow the city-wide feed down to reports they filed. */
  mine?: boolean;
};

type ReportsResponse = {
  reports: Report[];
};

type ReportResponse = {
  report: Report;
};

export async function listIssues(
  token: string,
  query?: ListIssuesQuery,
): Promise<Report[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.domain) params.set("domain", query.domain);
  if (query?.mine) params.set("mine", "true");
  const qs = params.toString();
  const data = await apiClient<ReportsResponse>(
    `/api/issues${qs ? `?${qs}` : ""}`,
    { method: "GET", token },
  );
  return data.reports;
}

export async function getIssue(token: string, id: string): Promise<Report> {
  const data = await apiClient<ReportResponse>(`/api/issues/${id}`, {
    method: "GET",
    token,
  });
  return data.report;
}

export async function createIssue(
  token: string,
  input: CreateIssueInput,
): Promise<Report> {
  const data = await apiClient<ReportResponse>("/api/issues", {
    method: "POST",
    token,
    body: {
      description: input.description,
      cityId: input.cityId,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      photoUrls: input.photoUrls,
      domain: input.domain,
    },
  });
  return data.report;
}
