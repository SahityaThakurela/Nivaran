import { apiClient, ApiError } from "./client";
import type { ChallengeDomain, Report, ReportStatus } from "./types";

export type ReportRejection = {
  reason: string;
  imageFindings?: string;
  mismatchType?: string;
  confidence?: number;
};

export function getReportRejection(error: unknown): ReportRejection | null {
  if (error instanceof ApiError) {
    const payload = error.payload;
    if (payload && typeof payload === "object" && "rejection" in payload) {
      const rejection = (payload as { rejection?: unknown }).rejection;
      if (rejection && typeof rejection === "object") {
        const rec = rejection as Record<string, unknown>;
        const reason =
          typeof rec.reason === "string" && rec.reason.trim()
            ? rec.reason.trim()
            : error.message.replace(/^Report rejected:\s*/i, "").trim();
        if (reason) {
          return {
            reason,
            imageFindings:
              typeof rec.imageFindings === "string"
                ? rec.imageFindings
                : undefined,
            mismatchType:
              typeof rec.mismatchType === "string"
                ? rec.mismatchType
                : undefined,
            confidence:
              typeof rec.confidence === "number" ? rec.confidence : undefined,
          };
        }
      }
    }
    if (/^Report rejected:/i.test(error.message)) {
      return {
        reason: error.message.replace(/^Report rejected:\s*/i, "").trim(),
      };
    }
  }
  if (error instanceof Error && /^Report rejected:/i.test(error.message)) {
    return {
      reason: error.message.replace(/^Report rejected:\s*/i, "").trim(),
    };
  }
  return null;
}

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
