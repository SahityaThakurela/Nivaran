import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, ArrowLeftRight, CheckCircle2, Copy, UserCog,
  Filter, Search, ChevronRight, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { getAuditEvents } from '../api/audit';
import type { AuditEvent, UserRole } from '../api/types';

type ActionType = 'ASSIGNED' | 'UNASSIGNED' | 'RESOLVED' | 'DUPLICATE' | 'STATUS_CHANGED';

function classify(event: AuditEvent): ActionType {
  const note = event.note?.toLowerCase() ?? '';
  if (note.startsWith('assigned to')) return 'ASSIGNED';
  if (note.startsWith('unassigned')) return 'UNASSIGNED';
  if (event.status === 'RESOLVED') return 'RESOLVED';
  if (event.status === 'DUPLICATE') return 'DUPLICATE';
  return 'STATUS_CHANGED';
}

const ACTION_LABELS: Record<ActionType, string> = {
  ASSIGNED: 'Authority Assigned',
  UNASSIGNED: 'Authority Unassigned',
  RESOLVED: 'Challenge Resolved',
  DUPLICATE: 'Marked Duplicate',
  STATUS_CHANGED: 'Status Changed',
};

const ACTION_ICON: Record<ActionType, React.ReactNode> = {
  ASSIGNED: <UserCog size={14} />,
  UNASSIGNED: <UserCog size={14} />,
  RESOLVED: <CheckCircle2 size={14} />,
  DUPLICATE: <Copy size={14} />,
  STATUS_CHANGED: <ArrowLeftRight size={14} />,
};

const ACTION_COLOR: Record<ActionType, string> = {
  ASSIGNED: 'bg-teal-50 text-teal-700',
  UNASSIGNED: 'bg-gray-100 text-gray-600',
  RESOLVED: 'bg-green-50 text-green-700',
  DUPLICATE: 'bg-orange-50 text-orange-700',
  STATUS_CHANGED: 'bg-blue-50 text-blue-700',
};

const ROLE_COLOR: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  GOVERNMENT_ADMIN: 'bg-blue-100 text-blue-700',
  UNIVERSITY_ADMIN: 'bg-teal-100 text-teal-700',
  CITIZEN: 'bg-gray-100 text-gray-600',
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS: string[] = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-rose-600', 'bg-amber-600',
];
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function detailFor(event: AuditEvent, action: ActionType): string {
  if (event.note) return event.note;
  if (action === 'STATUS_CHANGED') return `Moved to ${event.status.replace(/_/g, ' ')}`;
  return event.status.replace(/_/g, ' ');
}

export default function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType | ''>('');
  const [actorFilter, setActorFilter] = useState('');

  function load() {
    setLoading(true);
    setError(null);
    getAuditEvents(200)
      .then((res) => setEvents(res.events))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const actors = useMemo(
    () => [...new Set(events.map((e) => e.changedBy?.name).filter((n): n is string => !!n))],
    [events],
  );

  const filtered = events.filter((event) => {
    const actorName = event.changedBy?.name ?? 'Unknown';
    const action = classify(event);
    const detail = detailFor(event, action);
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      actorName.toLowerCase().includes(q) ||
      detail.toLowerCase().includes(q) ||
      event.report?.id.toLowerCase().includes(q);
    const matchesAction = !actionFilter || action === actionFilter;
    const matchesActor = !actorFilter || actorName === actorFilter;
    return matchesQuery && matchesAction && matchesActor;
  });

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-blue-700" />
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          </div>
          <p className="text-sm text-gray-500">
            Every status change and authority assignment across challenges in your scope.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            {filtered.length} of {events.length} events
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-card">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="audit-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor, action details, challenge ID…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
          />
        </div>
        <Filter size={14} className="text-gray-400 shrink-0" />
        <select
          id="action-filter"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as ActionType | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="">All Actions</option>
          {(Object.keys(ACTION_LABELS) as ActionType[]).map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
        <select
          id="actor-filter"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="">All Actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <Loader2 size={28} className="animate-spin mx-auto mb-3" />
            Loading audit events…
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Shield size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No audit events match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((event) => {
              const action = classify(event);
              const actorName = event.changedBy?.name ?? 'Unknown';
              const actorRole = event.changedBy?.role;
              const detail = detailFor(event, action);
              return (
                <div key={event.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group">
                  <div className={`h-8 w-8 rounded-full ${avatarColor(actorName)} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                    {getInitials(actorName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{actorName}</span>
                      {actorRole && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLOR[actorRole]}`}>
                          {actorRole.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${ACTION_COLOR[action]}`}>
                        {ACTION_ICON[action]}
                        {ACTION_LABELS[action]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{detail}</p>
                    {event.report && (
                      <Link
                        to={`/issues/${event.report.id}`}
                        className="inline-flex items-center gap-1 mt-1 text-xs font-mono text-blue-600 hover:underline"
                      >
                        #{event.report.id.slice(-8).toUpperCase()} <ChevronRight size={11} />
                      </Link>
                    )}
                  </div>

                  <span className="text-xs text-gray-400 shrink-0 mt-1 tabular-nums whitespace-nowrap">
                    {formatTimestamp(event.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

