import type { Report } from "../api/types";
import type { IconName } from "../components/iconAssets";
import { formatCategoryLabel } from "./format";

export type NotificationKind =
  | "received"
  | "ai"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "verify";

export type NotificationItem = {
  id: string;
  issueId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  icon: IconName;
  ctaVerify?: boolean;
};

function asSet(ids: Iterable<string>): Set<string> {
  return ids instanceof Set ? ids : new Set(ids);
}

function categoryPhrase(report: Report): string {
  return report.category
    ? formatCategoryLabel(report.category)
    : "your report";
}

/**
 * Derive notification feed items from issue list (no notifications API).
 * Read state comes from AsyncStorage ids; verification CTA when RESOLVED
 * and not in verifiedIds.
 */
export function buildNotificationItems(
  reports: Report[],
  verifiedIds: Iterable<string>,
  readIds: Iterable<string>,
): NotificationItem[] {
  const verified = asSet(verifiedIds);
  const read = asSet(readIds);
  const items: NotificationItem[] = [];

  for (const report of reports) {
    const label = categoryPhrase(report);

    items.push({
      id: `${report.id}:received`,
      issueId: report.id,
      kind: "received",
      title: "Report Received",
      body: `We received your report about ${label}.`,
      at: report.createdAt,
      unread: !read.has(`${report.id}:received`),
      icon: "check",
    });

    if (report.category) {
      items.push({
        id: `${report.id}:ai`,
        issueId: report.id,
        kind: "ai",
        title: "AI Analysis Complete",
        body: `Categorized as ${formatCategoryLabel(report.category)}${
          report.severity ? ` · ${report.severity}` : ""
        }.`,
        at: report.updatedAt,
        unread: !read.has(`${report.id}:ai`),
        icon: "robot",
      });
    }

    if (
      report.status === "ASSIGNED" ||
      report.status === "IN_PROGRESS" ||
      report.status === "RESOLVED"
    ) {
      items.push({
        id: `${report.id}:assigned`,
        issueId: report.id,
        kind: "assigned",
        title: "Assigned to Crew",
        body: `A field team has been assigned to ${label}.`,
        at: report.updatedAt,
        unread: !read.has(`${report.id}:assigned`),
        icon: "hardhat",
      });
    }

    if (report.status === "IN_PROGRESS" || report.status === "RESOLVED") {
      items.push({
        id: `${report.id}:in_progress`,
        issueId: report.id,
        kind: "in_progress",
        title: "Work In Progress",
        body: `Crews are actively working on ${label}.`,
        at: report.updatedAt,
        unread: !read.has(`${report.id}:in_progress`),
        icon: "hardhat",
      });
    }

    if (report.status === "RESOLVED") {
      items.push({
        id: `${report.id}:resolved`,
        issueId: report.id,
        kind: "resolved",
        title: "Issue Resolved",
        body: `${label} has been marked resolved.`,
        at: report.updatedAt,
        unread: !read.has(`${report.id}:resolved`),
        icon: "confirm_check",
      });

      if (!verified.has(report.id)) {
        items.push({
          id: `${report.id}:verify`,
          issueId: report.id,
          kind: "verify",
          title: "Verification Required",
          body: `Please confirm whether ${label} looks fixed.`,
          at: report.updatedAt,
          unread: !read.has(`${report.id}:verify`),
          icon: "sparkle",
          ctaVerify: true,
        });
      }
    }
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export const NOTIF_READ_KEY = "@nivaran/notif-read";

export function verifiedStorageKey(issueId: string): string {
  return `@nivaran/verified/${issueId}`;
}
