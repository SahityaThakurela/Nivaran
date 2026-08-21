import type { ReportCategory, ReportStatus } from "../api/types";

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
  return new Date(iso).toLocaleDateString();
}

export function formatStatusLabel(status: ReportStatus | string): string {
  return titleCaseWords(status);
}

export function formatCategoryLabel(category: ReportCategory | string): string {
  return titleCaseWords(category);
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
