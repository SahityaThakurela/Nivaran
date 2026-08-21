import type { ReportStatus, Severity } from "../api/types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }

  const diff = Date.now() - then;
  if (diff < MINUTE_MS) {
    return "just now";
  }
  if (diff < HOUR_MS) {
    const minutes = Math.floor(diff / MINUTE_MS);
    return `${minutes}m ago`;
  }
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / DAY_MS);
  if (days < 7) {
    return `${days}d ago`;
  }
  if (days < 14) {
    return "1w ago";
  }
  return new Date(iso).toLocaleDateString();
}

export function formatStatusLabel(status: ReportStatus | string): string {
  if (status === "SUBMITTED" || status === "ACKNOWLEDGED") return "Open";
  if (status === "ASSIGNED" || status === "IN_PROGRESS") return "In Progress";
  return titleCaseWords(status);
}

export function formatCategoryLabel(category: string): string {
  return titleCaseWords(category);
}

export function formatSeverityLabel(severity: Severity | string | null): string {
  if (!severity) return "";
  return `${titleCaseWords(severity)} Priority`;
}

export function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

/** Progress step for My Reports cards (1–3). */
export function reportProgressStep(status: ReportStatus): {
  step: number;
  total: number;
} {
  switch (status) {
    case "RESOLVED":
      return { step: 3, total: 3 };
    case "ASSIGNED":
    case "IN_PROGRESS":
      return { step: 2, total: 3 };
    default:
      return { step: 1, total: 3 };
  }
}

/** Haversine distance in meters. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}
