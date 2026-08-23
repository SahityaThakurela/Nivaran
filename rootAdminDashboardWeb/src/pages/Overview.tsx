import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, FileText, CheckCircle2, Clock, TrendingUp, TrendingDown,
  Minus, Download, Calendar, Lightbulb, ArrowRight, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { getAnalyticsOverview } from '../api/analytics';
import { getIssues } from '../api/issues';
import type { AnalyticsOverview, Report } from '../api/types';
import { CardSkeleton, SkeletonBlock } from '../components/SkeletonLoader';
import { StatusPill } from '../components/StatusPill';

// Build weekly chart data from reports
function buildWeeklyData(reports: Report[]) {
  const weeks: Record<number, { reported: number; resolved: number }> = {};
  const now = Date.now();
  const dayMs = 86400000;

  for (const r of reports) {
    const ageDay = Math.floor((now - new Date(r.createdAt).getTime()) / dayMs);
    const week = Math.min(3, Math.floor(ageDay / 7));
    if (!weeks[week]) weeks[week] = { reported: 0, resolved: 0 };
    weeks[week].reported += 1;
    if (r.status === 'RESOLVED') weeks[week].resolved += 1;
  }

  return [3, 2, 1, 0].map((w) => ({
    name: `Week ${4 - w}`,
    Reported: weeks[w]?.reported ?? 0,
    Resolved: weeks[w]?.resolved ?? 0,
  }));
}

const INSIGHTS = [
  {
    title: 'Healthcare Challenges Surge',
    desc: 'Healthcare-related challenges increased by 23% this week, primarily from rural districts.',
    color: 'bg-red-50 border-red-200',
    dot: 'bg-red-500',
  },
  {
    title: 'Ranchi District Hotspot',
    desc: 'Ranchi district currently has the highest volume of open challenges, requiring university capacity planning.',
    color: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
  },
  {
    title: 'Routing Efficiency Gains',
    desc: 'Time-to-routing improved by 18% due to the new AI-assisted university matching.',
    color: 'bg-green-50 border-green-200',
    dot: 'bg-green-500',
  },
];

export default function Overview() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyticsOverview()
      .then(setOverview)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingStats(false));

    getIssues()
      .then((res) => setReports(res.reports))
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }, []);

  const criticalCount = overview?.bySeverity?.CRITICAL ?? 0;
  const openCount = overview?.openReports ?? 0;
  const resolvedCount = overview?.byStatus?.RESOLVED ?? 0;
  const avgHours = overview?.averageResolutionHours;
  const avgDays = avgHours != null ? (avgHours / 24).toFixed(1) : null;

  const weeklyData = buildWeeklyData(reports);
  const criticalReports = reports
    .filter((r) => r.severity === 'CRITICAL' && r.status !== 'RESOLVED')
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Innovation Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time pulse of challenge routing and university/industry collaboration.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 bg-white px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-card">
            <Calendar size={15} />
            Last 30 Days
          </button>
          <button className="flex items-center gap-2 text-sm font-medium text-white bg-blue-700 px-3.5 py-2 rounded-lg hover:bg-blue-800 transition-colors shadow-sm">
            <Download size={15} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loadingStats ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Critical Challenges"
            value={criticalCount.toString()}
            delta="+4 from yesterday"
            deltaType="bad"
            icon={<AlertTriangle size={20} className="text-red-500" />}
            iconBg="bg-red-50"
          />
          <KpiCard
            label="Open Challenges"
            value={openCount.toString()}
            delta="Stable"
            deltaType="neutral"
            icon={<FileText size={20} className="text-blue-500" />}
            iconBg="bg-blue-50"
          />
          <KpiCard
            label="Resolved"
            value={resolvedCount.toString()}
            delta="+12% vs last month"
            deltaType="good"
            icon={<CheckCircle2 size={20} className="text-green-500" />}
            iconBg="bg-green-50"
          />
          <KpiCard
            label="Avg Time to Resolution"
            value={avgDays ? `${avgDays} days` : '—'}
            delta="Improved by 18%"
            deltaType="good"
            icon={<Clock size={20} className="text-amber-500" />}
            iconBg="bg-amber-50"
          />
        </div>
      )}

      {/* Chart + Insights row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Reported vs Resolved Challenges</h2>
          </div>
          {loadingReports ? (
            <SkeletonBlock className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  cursor={{ stroke: '#e2e8f0' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone" dataKey="Reported" stroke="#1A56DB"
                  strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone" dataKey="Resolved" stroke="#2E8B57"
                  strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">Key Insights</h2>
          </div>
          <div className="space-y-3">
            {INSIGHTS.map((insight) => (
              <div
                key={insight.title}
                className={`rounded-xl border p-3.5 ${insight.color}`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${insight.dot}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{insight.title}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{insight.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-sm font-medium text-blue-700 border border-blue-200 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
            View All Insights <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent Critical Reports */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Critical Challenges</h2>
          <Link
            to="/issues?status=SUBMITTED&severity=CRITICAL"
            className="text-xs font-medium text-blue-700 hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={13} />
          </Link>
        </div>
        {loadingReports ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <SkeletonBlock className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-3.5 w-48" />
                  <SkeletonBlock className="h-3 w-32" />
                </div>
                <SkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : criticalReports.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            No critical reports — everything looks good! 🎉
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {criticalReports.map((r) => (
              <Link
                key={r.id}
                to={`/issues/${r.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors group"
              >
                {/* Evidence thumbnail */}
                <div className="h-12 w-12 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  {r.photoUrls[0] ? (
                    <img src={r.photoUrls[0]} alt="evidence" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <AlertTriangle size={18} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide">
                      CRITICAL
                    </span>
                    <span className="text-xs text-gray-400">{r.domain?.replace(/_/g, ' ') ?? 'Uncategorised'}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.description.slice(0, 60)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.address ?? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`} ·{' '}
                    {formatRelativeTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={r.status} size="sm" />
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaType,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  delta: string;
  deltaType: 'good' | 'bad' | 'neutral';
  icon: React.ReactNode;
  iconBg: string;
}) {
  const deltaColor =
    deltaType === 'good' ? 'text-green-600' :
    deltaType === 'bad' ? 'text-red-600' :
    'text-gray-500';
  const DeltaIcon =
    deltaType === 'good' ? TrendingUp :
    deltaType === 'bad' ? TrendingDown :
    Minus;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1 mb-1.5">{value}</p>
        <div className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
          <DeltaIcon size={12} />
          {delta}
        </div>
      </div>
      <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>{icon}</div>
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}
