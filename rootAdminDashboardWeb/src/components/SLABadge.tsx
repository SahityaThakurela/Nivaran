import { Flame, Clock } from 'lucide-react';
import type { Severity } from '../api/types';

// SLA hours per severity level
const SLA_HOURS: Record<string, number> = {
  CRITICAL: 6,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72,
};

interface SLABadgeProps {
  severity: Severity | null;
  createdAt: string;
  status?: string;
}

export function SLABadge({ severity, createdAt, status }: SLABadgeProps) {
  if (!severity) return null;
  if (status === 'RESOLVED' || status === 'REJECTED' || status === 'DUPLICATE') return null;

  const slaHours = SLA_HOURS[severity];
  if (!slaHours) return null;

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const remainingHours = slaHours - ageHours;
  const warningThreshold = slaHours * 0.2;

  if (remainingHours <= 0) {
    const overdueMins = Math.abs(remainingHours) * 60;
    const label =
      overdueMins < 60
        ? `${Math.floor(overdueMins)}m overdue`
        : `${Math.floor(Math.abs(remainingHours))}h overdue`;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
        <Flame size={9} className="shrink-0" />
        {label}
      </span>
    );
  }

  if (remainingHours <= warningThreshold) {
    const label =
      remainingHours < 1
        ? `${Math.floor(remainingHours * 60)}m left`
        : `${remainingHours.toFixed(1)}h left`;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
        <Clock size={9} className="shrink-0" />
        {label}
      </span>
    );
  }

  return null;
}

/** Utility: compute SLA breach state for sorting */
export function getSLAState(
  severity: Severity | null,
  createdAt: string,
  status?: string
): 'breached' | 'at-risk' | 'ok' {
  if (!severity) return 'ok';
  if (status === 'RESOLVED' || status === 'REJECTED' || status === 'DUPLICATE') return 'ok';
  const slaHours = SLA_HOURS[severity];
  if (!slaHours) return 'ok';
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const remaining = slaHours - ageHours;
  if (remaining <= 0) return 'breached';
  if (remaining <= slaHours * 0.2) return 'at-risk';
  return 'ok';
}
