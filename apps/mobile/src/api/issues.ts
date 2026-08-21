import { apiClient } from "./client";
import type { Report } from "./types";

export type CreateIssueInput = {
  description: string;
  cityId: string;
  latitude: number;
  longitude: number;
  address?: string;
  photoUrls?: string[];
};

type ReportsResponse = {
  reports: Report[];
};

type ReportResponse = {
  report: Report;
};

export async function listIssues(token: string): Promise<Report[]> {
  const data = await apiClient<ReportsResponse>("/api/issues", {
    method: "GET",
    token,
  });
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
    },
  });
  return data.report;
}
