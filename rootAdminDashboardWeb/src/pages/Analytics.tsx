import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { getAnalyticsOverview } from '../api/analytics';
import type { AnalyticsOverview } from '../api/types';
import { CardSkeleton, SkeletonBlock } from '../components/SkeletonLoader';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:    '#94a3b8',
  ACKNOWLEDGED: '#60a5fa',
  ASSIGNED:     '#818cf8',
  IN_PROGRESS:  '#fbbf24',
  RESOLVED:     '#34d399',
  REJECTED:     '#f87171',
  DUPLICATE:    '#c084fc',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      '#34d399',
  MEDIUM:   '#fbbf24',
  HIGH:     '#fb923c',
  CRITICAL: '#f87171',
};

const CATEGORY_COLORS = [
  '#1A56DB', '#0E7C7B', '#E8A33D', '#C0392B',
  '#7C3AED', '#059669', '#D97706', '#DC2626', '#7C3AED', '#475569',
];

// ── Mock Citizen Feedback Data ───────────────────────────────────────────────

const STAR_DISTRIBUTION = [
  { star: '★ 5', count: 142, fill: '#34d399' },
  { star: '★ 4', count: 98,  fill: '#6ee7b7' },
  { star: '★ 3', count: 45,  fill: '#fbbf24' },
  { star: '★ 2', count: 22,  fill: '#fb923c' },
  { star: '★ 1', count: 14,  fill: '#f87171' },
];
const TOTAL_RATINGS = STAR_DISTRIBUTION.reduce((s, d) => s + d.count, 0);
const AVG_RATING =
  STAR_DISTRIBUTION.reduce((s, d) => s + d.count * parseInt(d.star[1]), 0) / TOTAL_RATINGS;

const SATISFACTION_BY_CATEGORY = [
  { name: 'Roads',          avg: 4.3, fill: '#34d399' },
  { name: 'Sanitation',     avg: 3.8, fill: '#6ee7b7' },
  { name: 'Water Supply',   avg: 4.1, fill: '#34d399' },
  { name: 'Electricity',    avg: 3.5, fill: '#fbbf24' },
  { name: 'Drainage',       avg: 2.9, fill: '#fb923c' },
  { name: 'Streetlight',    avg: 4.5, fill: '#34d399' },
  { name: 'Public Safety',  avg: 3.2, fill: '#fbbf24' },
  { name: 'Parks & Trees',  avg: 4.7, fill: '#34d399' },
  { name: 'Stray Animals',  avg: 2.6, fill: '#f87171' },
  { name: 'Other',          avg: 3.9, fill: '#6ee7b7' },
].sort((a, b) => b.avg - a.avg);

const RECENT_FEEDBACK = [
  { rating: 5, category: 'Parks & Trees', comment: 'Issue resolved within hours. The park looks great again — very impressed!', time: '2h ago' },
  { rating: 2, category: 'Drainage',      comment: 'Still not fixed after 3 follow-ups. The flooding happens every time it rains.', time: '5h ago' },
  { rating: 4, category: 'Roads',         comment: 'Pothole patched quickly. Could use a proper resurfacing eventually.',           time: '1d ago' },
  { rating: 5, category: 'Streetlight',   comment: 'Extremely fast turnaround! Lights were back on the same day.',                  time: '1d ago' },
  { rating: 1, category: 'Stray Animals', comment: 'Nothing happened for two weeks. The dogs are still there every morning.',       time: '2d ago' },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </span>
  );
}

function categoryColor(avg: number): string {
  if (avg >= 4.5) return '#34d399';
  if (avg >= 3.5) return '#6ee7b7';
  if (avg >= 2.5) return '#fbbf24';
  return '#f87171';
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyticsOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <SkeletonBlock className="h-7 w-48" />
        <CardSkeleton count={4} />
        <div className="grid grid-cols-2 gap-5">
          <SkeletonBlock className="h-72 rounded-xl" />
          <SkeletonBlock className="h-72 rounded-xl" />
        </div>
        <SkeletonBlock className="h-64 rounded-xl" />
        <SkeletonBlock className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center py-20 text-red-600 text-sm">
        {error ?? 'Failed to load analytics data'}
      </div>
    );
  }

  const statusChartData = Object.entries(data.byStatus).map(([k, v]) => ({
    name: k.replace(/_/g, ' '),
    count: v,
    fill: STATUS_COLORS[k] ?? '#94a3b8',
  }));

  const categoryChartData = Object.entries(data.byCategory)
    .map(([k, v], i) => ({ name: k.replace(/_/g, ' '), count: v, fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
    .sort((a, b) => b.count - a.count);

  const severityChartData = Object.entries(data.bySeverity).map(([k, v]) => ({
    name: k,
    value: v,
    fill: SEVERITY_COLORS[k] ?? '#94a3b8',
  }));

  const avgDays = data.averageResolutionHours != null
    ? (data.averageResolutionHours / 24).toFixed(1) : '—';

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">City-wide report intelligence and resolution metrics.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Reports',       value: data.totalReports.toString(),            color: 'text-gray-900' },
          { label: 'Open Reports',        value: data.openReports.toString(),              color: 'text-amber-700' },
          { label: 'Resolved',            value: (data.byStatus.RESOLVED ?? 0).toString(), color: 'text-green-700' },
          { label: 'Avg Resolution (days)', value: avgDays,                                color: 'text-blue-700' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Status + Severity charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Reports by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusChartData} margin={{ left: -20, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Severity Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={severityChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {severityChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category bar chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Reports by Category</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categoryChartData} layout="vertical" margin={{ left: 60, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={90} />
            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {categoryChartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Citizen Feedback & Satisfaction ─────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <Star size={15} className="text-amber-500 fill-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Citizen Feedback & Satisfaction</h2>
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {TOTAL_RATINGS} responses
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Overall Rating Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Overall Score</p>
            <p className="text-6xl font-black text-gray-900 leading-none mb-2">
              {AVG_RATING.toFixed(1)}
            </p>
            <div className="flex items-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={18}
                  className={i <= Math.round(AVG_RATING) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">out of 5.0</p>
            <div className="mt-5 w-full space-y-1.5">
              {STAR_DISTRIBUTION.map((d) => (
                <div key={d.star} className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-gray-500 w-6 text-right">{d.star[1]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(d.count / TOTAL_RATINGS) * 100}%`,
                        backgroundColor: d.fill,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-6">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Satisfaction by Category */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Avg Rating by Category</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={SATISFACTION_BY_CATEGORY.map((d) => ({ ...d, fill: categoryColor(d.avg) }))}
                layout="vertical"
                margin={{ left: 70, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={70} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)} / 5`, 'Avg Rating']}
                />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {SATISFACTION_BY_CATEGORY.map((entry, i) => (
                    <Cell key={i} fill={categoryColor(entry.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Feedback Feed */}
        <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <MessageSquare size={14} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Citizen Comments</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {RECENT_FEEDBACK.map((fb, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-shrink-0 mt-0.5">
                  <StarDisplay rating={fb.rating} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: fb.rating >= 4 ? '#dcfce7' : fb.rating === 3 ? '#fef9c3' : '#fee2e2',
                        color: fb.rating >= 4 ? '#15803d' : fb.rating === 3 ? '#854d0e' : '#b91c1c',
                      }}
                    >
                      {fb.category}
                    </span>
                    <span className="text-[10px] text-gray-400">{fb.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">"{fb.comment}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
