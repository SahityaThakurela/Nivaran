import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search, Filter, ChevronRight, AlertTriangle,
  ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import { getIssues } from '../api/issues';
import type { Report, ReportStatus, ReportCategory } from '../api/types';
import { StatusPill } from '../components/StatusPill';
import { PriorityBadge } from '../components/PriorityBadge';
import { TableSkeleton } from '../components/SkeletonLoader';

type SortKey = 'priorityScore' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS: ReportStatus[] = [
  'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DUPLICATE',
];
const CATEGORY_OPTIONS: ReportCategory[] = [
  'ROADS', 'SANITATION', 'WATER_SUPPLY', 'ELECTRICITY', 'DRAINAGE',
  'STREETLIGHT', 'PUBLIC_SAFETY', 'PARKS_AND_TREES', 'STRAY_ANIMALS', 'OTHER',
];

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function IssueQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>((searchParams.get('status') as ReportStatus) ?? '');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | ''>('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getIssues({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
      });
      setReports(res.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filteredReports = reports
    .filter((r) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === 'priorityScore') { va = a.priorityScore; vb = b.priorityScore; }
      else if (sortKey === 'createdAt') { va = a.createdAt; vb = b.createdAt; }
      else { va = a.status; vb = b.status; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-blue-600" />
      : <ChevronDown size={12} className="text-blue-600" />;
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading…' : `${filteredReports.length} reports found`}
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-card"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-card">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            id="issues-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchParams((p) => {
                if (e.target.value) p.set('q', e.target.value);
                else p.delete('q');
                return p;
              });
            }}
            placeholder="Search by ID, description, location…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
          />
        </div>

        <Filter size={14} className="text-gray-400 shrink-0" />

        {/* Status filter */}
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ReportCategory | '')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-gray-700"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_120px_100px_130px_80px_32px] gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Evidence</span>
          <span>Issue</span>
          <button
            onClick={() => handleSort('status')}
            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
          >
            Status <SortIcon k="status" />
          </button>
          <button
            onClick={() => handleSort('priorityScore')}
            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
          >
            Priority <SortIcon k="priorityScore" />
          </button>
          <span>Location</span>
          <button
            onClick={() => handleSort('createdAt')}
            className="flex items-center gap-1 hover:text-gray-900 transition-colors text-left"
          >
            Age <SortIcon k="createdAt" />
          </button>
          <span />
        </div>

        {error ? (
          <div className="px-4 py-8 text-center text-red-600 text-sm">{error}</div>
        ) : loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : filteredReports.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <AlertTriangle size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No issues match your filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredReports.map((r) => (
              <Link
                key={r.id}
                to={`/issues/${r.id}`}
                className="grid grid-cols-[auto_1fr_120px_100px_130px_80px_32px] gap-3 items-center px-4 py-3.5 hover:bg-blue-50/40 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {r.photoUrls[0] ? (
                    <img src={r.photoUrls[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <AlertTriangle size={14} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Title + meta */}
                <div className="min-w-0">
                  <p className="text-xs font-mono text-gray-400 mb-0.5">#{r.id.slice(-8).toUpperCase()}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                    {r.description.slice(0, 70)}
                  </p>
                  {r.category && (
                    <span className="text-[10px] font-medium text-gray-400">{r.category.replace(/_/g, ' ')}</span>
                  )}
                </div>

                {/* Status */}
                <StatusPill status={r.status} size="sm" />

                {/* Priority */}
                <PriorityBadge score={r.priorityScore} severity={r.severity} />

                {/* Location */}
                <p className="text-xs text-gray-500 truncate">
                  {r.address ?? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}
                </p>

                {/* Age */}
                <p className="text-xs text-gray-400 tabular-nums">{formatRelativeTime(r.createdAt)}</p>

                {/* Arrow */}
                <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
