import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
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
          { label: 'Total Reports', value: data.totalReports.toString(), color: 'text-gray-900' },
          { label: 'Open Reports', value: data.openReports.toString(), color: 'text-amber-700' },
          { label: 'Resolved', value: (data.byStatus.RESOLVED ?? 0).toString(), color: 'text-green-700' },
          { label: 'Avg Resolution (days)', value: avgDays, color: 'text-blue-700' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Status + Category charts */}
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
    </div>
  );
}
