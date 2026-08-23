import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import {
  Filter, TrendingUp, Clock, AlertTriangle,
} from 'lucide-react';
import { getIssues } from '../api/issues';
import type { Report, ReportStatus, ReportCategory } from '../api/types';
import { StatusPill } from '../components/StatusPill';

// Fix default Leaflet icon path (Vite/webpack issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function getSeverityIcon(report: Report): L.Icon {
  const color =
    report.severity === 'CRITICAL' ? '#C0392B' :
    report.severity === 'HIGH' ? '#E8A33D' :
    report.severity === 'MEDIUM' ? '#3B82F6' :
    '#22C55E';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z" fill="${color}" opacity="0.9"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;

  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Auto-fit map bounds to markers
function FitBounds({ reports }: { reports: Report[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (reports.length === 0 || fitted.current) return;
    const bounds = L.latLngBounds(reports.map((r) => [r.latitude, r.longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      fitted.current = true;
    }
  }, [reports, map]);
  return null;
}

const STATUS_OPTIONS: ReportStatus[] = [
  'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DUPLICATE',
];
const CATEGORY_OPTIONS: ReportCategory[] = [
  'ROADS', 'SANITATION', 'WATER_SUPPLY', 'ELECTRICITY', 'DRAINAGE',
  'STREETLIGHT', 'PUBLIC_SAFETY', 'PARKS_AND_TREES', 'STRAY_ANIMALS', 'OTHER',
];

export default function MapView() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | ''>('');

  useEffect(() => {
    setLoading(true);
    getIssues({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    })
      .then((res) => setReports(res.reports))
      .finally(() => setLoading(false));
  }, [statusFilter, categoryFilter]);

  // Live hotspot sidebar: take top 6 by priorityScore
  const hotspots = [...reports]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Map fills left area */}
      <div className="flex-1 relative">
        {/* Filter bar overlay */}
        <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2 shadow-card-md">
          <Filter size={14} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
            className="text-xs border-none outline-none bg-transparent text-gray-700 cursor-pointer pr-1"
          >
            <option value="">Priority ▾</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="w-px h-4 bg-gray-200" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ReportCategory | '')}
            className="text-xs border-none outline-none bg-transparent text-gray-700 cursor-pointer pr-1"
          >
            <option value="">Category ▾</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-[500] bg-white/60 flex items-center justify-center">
            <div className="flex items-center gap-2 text-gray-600 text-sm bg-white px-4 py-2.5 rounded-xl shadow-card-md">
              <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Loading map data…
            </div>
          </div>
        )}

        <MapContainer
          center={[28.6139, 77.2090]}
          zoom={11}
          className="h-full w-full z-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds reports={reports} />
          {reports.map((r) => (
            <Marker key={r.id} position={[r.latitude, r.longitude]} icon={getSeverityIcon(r)}>
              <Popup maxWidth={280}>
                <div className="p-1">
                  <div className="flex items-center gap-2 mb-2">
                    {r.severity && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                        ${r.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          r.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        Priority {Math.round(r.priorityScore)}
                      </span>
                    )}
                    <StatusPill status={r.status} size="sm" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">
                    {r.category?.replace(/_/g, ' ') ?? 'Uncategorised'}
                  </p>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{r.description}</p>
                  <button
                    onClick={() => navigate(`/issues/${r.id}`)}
                    className="w-full text-xs font-semibold text-white bg-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    View Issue Details
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 px-3 py-2.5 shadow-card text-xs">
          <p className="font-semibold text-gray-700 mb-2">Heatmap Legend</p>
          <div className="flex items-center gap-1">
            <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-green-400 via-amber-400 to-red-600" />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Low Activity</span>
            <span>Critical Hotspots</span>
          </div>
        </div>
      </div>

      {/* Right sidebar: Live Hotspots */}
      <aside className="w-72 bg-white border-l border-gray-100 flex flex-col overflow-hidden shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Live Hotspots</h2>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4 animate-pulse space-y-2">
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                </div>
              ))
            : hotspots.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/issues/${r.id}`)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase
                      ${r.category === 'DRAINAGE' ? 'text-red-600' :
                        r.category === 'ROADS' ? 'text-amber-600' : 'text-blue-600'}`}>
                      🔥 {r.category?.replace(/_/g, ' ') ?? 'Other'}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatRelativeTime(r.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-0.5 truncate group-hover:text-blue-700 transition-colors">
                    {r.description.slice(0, 40)}
                  </p>
                  <p className="text-xs text-gray-400 truncate mb-2">{r.address ?? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={12} className="text-gray-400" />
                    <span className="text-xs text-gray-500">{r.isDuplicate ? 'Duplicate cluster' : '1 report'}</span>
                  </div>
                </button>
              ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => navigate('/analytics')}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-blue-700 py-2.5 rounded-xl hover:bg-blue-800 transition-colors"
          >
            <AlertTriangle size={14} />
            View Full Report
          </button>
        </div>
      </aside>
    </div>
  );
}
