import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, UserPlus, ArrowLeftRight, CheckCircle2, Building2,
  Bot, Copy, Filter, Search, ChevronRight,
} from 'lucide-react';

// ── Types & Mock Data ─────────────────────────────────────────────────────────

type ActionType =
  | 'CHALLENGE_ROUTED'
  | 'STATUS_CHANGED'
  | 'TEAM_FORMED'
  | 'UNIVERSITY_UPDATED'
  | 'AI_OVERRIDE'
  | 'DUPLICATE_MERGED'
  | 'CHALLENGE_RESOLVED';

type ActorRole = 'SUPER_ADMIN' | 'GOVERNMENT_ADMIN' | 'UNIVERSITY_ADMIN';

interface AuditEntry {
  id: string;
  action: ActionType;
  actor: string;
  actorRole: ActorRole;
  target?: string;
  targetId?: string;
  detail: string;
  timestamp: string;
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

const MOCK_LOG: AuditEntry[] = [
  { id: 'a01', action: 'STATUS_CHANGED',      actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: '#F3A92C',  targetId: 'f3a92c', detail: 'Moved from SUBMITTED → IN_PROGRESS',                    timestamp: hoursAgo(0.3) },
  { id: 'a02', action: 'CHALLENGE_ROUTED',    actor: 'Rahul Verma',     actorRole: 'UNIVERSITY_ADMIN',    target: '#B77D1E',  targetId: 'b77d1e', detail: 'Routed to NIT Jamshedpur based on domain match',        timestamp: hoursAgo(1.1) },
  { id: 'a03', action: 'AI_OVERRIDE',         actor: 'Anjali Mehta',    actorRole: 'SUPER_ADMIN',         target: '#C4F19A',  targetId: 'c4f19a', detail: 'Overrode AI domain from EDUCATION → HEALTHCARE',        timestamp: hoursAgo(2) },
  { id: 'a04', action: 'DUPLICATE_MERGED',    actor: 'Rahul Verma',     actorRole: 'UNIVERSITY_ADMIN',    target: '#9E3D7B',  targetId: '9e3d7b', detail: 'Merged into parent challenge #A12F8D',                  timestamp: hoursAgo(3.5) },
  { id: 'a05', action: 'TEAM_FORMED',         actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: undefined,  targetId: undefined, detail: 'Assigned faculty mentor Dr. Suresh Kumar (Agriculture)', timestamp: hoursAgo(4) },
  { id: 'a06', action: 'CHALLENGE_RESOLVED',  actor: 'Manish Tomar',    actorRole: 'UNIVERSITY_ADMIN',    target: '#D83F12',  targetId: 'd83f12', detail: 'Marked resolved with solution documentation uploaded',  timestamp: hoursAgo(5) },
  { id: 'a07', action: 'STATUS_CHANGED',      actor: 'Anjali Mehta',    actorRole: 'SUPER_ADMIN',         target: '#7A2C9F',  targetId: '7a2c9f', detail: 'Moved from IN_PROGRESS → REJECTED (duplicate)',         timestamp: hoursAgo(6) },
  { id: 'a08', action: 'UNIVERSITY_UPDATED',  actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: undefined,  targetId: undefined, detail: 'Updated BIT Mesra — added Energy specialization',       timestamp: hoursAgo(8) },
  { id: 'a09', action: 'CHALLENGE_ROUTED',    actor: 'Anjali Mehta',    actorRole: 'SUPER_ADMIN',         target: '#E12AB5',  targetId: 'e12ab5', detail: 'Re-routed from RIMS Ranchi to Central University',       timestamp: hoursAgo(10) },
  { id: 'a10', action: 'AI_OVERRIDE',         actor: 'Rahul Verma',     actorRole: 'UNIVERSITY_ADMIN',    target: '#F9C44E',  targetId: 'f9c44e', detail: 'Changed AI severity from MEDIUM → HIGH',                 timestamp: hoursAgo(12) },
  { id: 'a11', action: 'STATUS_CHANGED',      actor: 'Suresh Kumar',    actorRole: 'UNIVERSITY_ADMIN',    target: '#3318DC',  targetId: '3318dc', detail: 'Moved from ASSIGNED → IN_PROGRESS',                      timestamp: hoursAgo(14) },
  { id: 'a12', action: 'CHALLENGE_RESOLVED',  actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: '#22F7AB',  targetId: '22f7ab', detail: 'Force-resolved — solution verified in field',            timestamp: hoursAgo(16) },
  { id: 'a13', action: 'DUPLICATE_MERGED',    actor: 'Anjali Mehta',    actorRole: 'SUPER_ADMIN',         target: '#1A99DE',  targetId: '1a99de', detail: 'Merged 2 duplicate challenges into this one',            timestamp: hoursAgo(20) },
  { id: 'a14', action: 'TEAM_FORMED',         actor: 'Anjali Mehta',    actorRole: 'SUPER_ADMIN',         target: undefined,  targetId: undefined, detail: 'Added new Government Admin: Deepa Nair',                timestamp: hoursAgo(24) },
  { id: 'a15', action: 'UNIVERSITY_UPDATED',  actor: 'Anjali Mehta',    actorRole: 'SUPER_ADMIN',         target: undefined,  targetId: undefined, detail: 'Onboarded new university: ICAR Research Complex',        timestamp: hoursAgo(28) },
  { id: 'a16', action: 'CHALLENGE_ROUTED',    actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: '#CC113F',  targetId: 'cc113f', detail: 'Routed CRITICAL healthcare challenge to RIMS Ranchi',    timestamp: hoursAgo(30) },
  { id: 'a17', action: 'STATUS_CHANGED',      actor: 'Rahul Verma',     actorRole: 'UNIVERSITY_ADMIN',    target: '#884CCB',  targetId: '884ccb', detail: 'Acknowledged challenge after initial faculty review',   timestamp: hoursAgo(36) },
  { id: 'a18', action: 'AI_OVERRIDE',         actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: '#FF8832',  targetId: 'ff8832', detail: 'Manually set domain to URBAN_DEVELOPMENT',               timestamp: hoursAgo(40) },
  { id: 'a19', action: 'CHALLENGE_RESOLVED',  actor: 'Suresh Kumar',    actorRole: 'UNIVERSITY_ADMIN',    target: '#13EEA1',  targetId: '13eea1', detail: 'Resolved after 2nd pilot deployment with evidence',      timestamp: hoursAgo(44) },
  { id: 'a20', action: 'TEAM_FORMED',         actor: 'Priya Sharma',    actorRole: 'GOVERNMENT_ADMIN',    target: undefined,  targetId: undefined, detail: 'Formed multidisciplinary team with Kiran Patel as mentor', timestamp: hoursAgo(48) },
];

const ACTION_LABELS: Record<ActionType, string> = {
  CHALLENGE_ROUTED:   'Challenge Routed',
  STATUS_CHANGED:     'Status Changed',
  TEAM_FORMED:        'Team Formed',
  UNIVERSITY_UPDATED: 'University Updated',
  AI_OVERRIDE:        'AI Override',
  DUPLICATE_MERGED:   'Duplicate Merged',
  CHALLENGE_RESOLVED: 'Challenge Resolved',
};

const ACTION_ICON: Record<ActionType, React.ReactNode> = {
  CHALLENGE_ROUTED:   <ArrowLeftRight size={14} />,
  STATUS_CHANGED:     <ArrowLeftRight size={14} />,
  TEAM_FORMED:        <UserPlus size={14} />,
  UNIVERSITY_UPDATED: <Building2 size={14} />,
  AI_OVERRIDE:        <Bot size={14} />,
  DUPLICATE_MERGED:   <Copy size={14} />,
  CHALLENGE_RESOLVED: <CheckCircle2 size={14} />,
};

const ACTION_COLOR: Record<ActionType, string> = {
  CHALLENGE_ROUTED:   'bg-blue-50 text-blue-700',
  STATUS_CHANGED:     'bg-slate-100 text-slate-600',
  TEAM_FORMED:        'bg-purple-50 text-purple-700',
  UNIVERSITY_UPDATED: 'bg-indigo-50 text-indigo-700',
  AI_OVERRIDE:        'bg-amber-50 text-amber-700',
  DUPLICATE_MERGED:   'bg-orange-50 text-orange-700',
  CHALLENGE_RESOLVED: 'bg-green-50 text-green-700',
};

const ROLE_COLOR: Record<ActorRole, string> = {
  SUPER_ADMIN:       'bg-red-100 text-red-700',
  GOVERNMENT_ADMIN:  'bg-blue-100 text-blue-700',
  UNIVERSITY_ADMIN:  'bg-slate-100 text-slate-600',
};

const ACTION_TYPES = Object.keys(ACTION_LABELS) as ActionType[];
const ACTORS = [...new Set(MOCK_LOG.map((e) => e.actor))];

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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType | ''>('');
  const [actorFilter, setActorFilter] = useState('');

  const filtered = MOCK_LOG.filter((e) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      e.actor.toLowerCase().includes(q) ||
      e.detail.toLowerCase().includes(q) ||
      e.target?.toLowerCase().includes(q);
    const matchesAction = !actionFilter || e.action === actionFilter;
    const matchesActor = !actorFilter || e.actor === actorFilter;
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
            A complete trail of admin actions across the Nivaran platform.
          </p>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
          {filtered.length} of {MOCK_LOG.length} events
        </span>
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
          {ACTION_TYPES.map((a) => (
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
          {ACTORS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Shield size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No audit events match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group">
                {/* Actor Avatar */}
                <div className={`h-8 w-8 rounded-full ${avatarColor(entry.actor)} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                  {getInitials(entry.actor)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{entry.actor}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLOR[entry.actorRole]}`}>
                      {entry.actorRole.replace(/_/g, ' ')}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${ACTION_COLOR[entry.action]}`}>
                      {ACTION_ICON[entry.action]}
                      {ACTION_LABELS[entry.action]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{entry.detail}</p>
                  {entry.targetId && (
                    <Link
                      to={`/issues/${entry.targetId}`}
                      className="inline-flex items-center gap-1 mt-1 text-xs font-mono text-blue-600 hover:underline"
                    >
                      {entry.target} <ChevronRight size={11} />
                    </Link>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-gray-400 shrink-0 mt-1 tabular-nums whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
