import type { Severity } from '../api/types';

interface Props {
  score: number;
  severity?: Severity | null;
}

function severityColor(score: number): string {
  if (score >= 75) return 'text-red-600';
  if (score >= 50) return 'text-amber-600';
  if (score >= 25) return 'text-yellow-600';
  return 'text-green-600';
}

function severityBg(score: number): string {
  if (score >= 75) return 'bg-red-50 border-red-200';
  if (score >= 50) return 'bg-amber-50 border-amber-200';
  if (score >= 25) return 'bg-yellow-50 border-yellow-200';
  return 'bg-green-50 border-green-200';
}

export function PriorityBadge({ score, severity }: Props) {
  const color = severityColor(score);
  const bg = severityBg(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${bg} ${color}`}
    >
      <span className="tabular-nums">{Math.round(score)}</span>
      {severity && <span className="opacity-70">· {severity}</span>}
    </span>
  );
}
