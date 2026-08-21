import type { ReportStatus } from '../api/types';

const CONFIG: Record<ReportStatus, { label: string; classes: string }> = {
  SUBMITTED:    { label: 'Submitted',    classes: 'bg-gray-100 text-gray-600' },
  ACKNOWLEDGED: { label: 'Acknowledged', classes: 'bg-blue-50 text-blue-600' },
  ASSIGNED:     { label: 'Assigned',     classes: 'bg-indigo-50 text-indigo-700' },
  IN_PROGRESS:  { label: 'In Progress',  classes: 'bg-amber-50 text-amber-700' },
  RESOLVED:     { label: 'Resolved',     classes: 'bg-green-50 text-green-700' },
  REJECTED:     { label: 'Rejected',     classes: 'bg-red-50 text-red-700' },
  DUPLICATE:    { label: 'Duplicate',    classes: 'bg-purple-50 text-purple-700' },
};

interface Props {
  status: ReportStatus;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'md' }: Props) {
  const { label, classes } = CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${classes}`}>
      {label}
    </span>
  );
}
