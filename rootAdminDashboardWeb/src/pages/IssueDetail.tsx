import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, Users, Share2, Loader2,
  AlertTriangle, CheckCircle2, RefreshCw, ChevronRight,
  FileImage, Zap, Building2, GraduationCap, Handshake,
  UserCog, Phone, Mail, ShieldCheck,
} from 'lucide-react';
import { getIssue, getDuplicates, updateIssue, triggerAiAnalysis } from '../api/issues';
import { getUniversities } from '../api/universities';
import { getIndustryPartners } from '../api/industryPartners';
import { getAuthorities } from '../api/authorities';
import type { Report, DuplicateCandidate, ReportStatus, University, IndustryPartner, Authority } from '../api/types';
import { StatusPill } from '../components/StatusPill';
import { PriorityBadge } from '../components/PriorityBadge';
import { SkeletonBlock } from '../components/SkeletonLoader';

const STATUS_OPTIONS: ReportStatus[] = [
  'SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'DUPLICATE',
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
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

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [partners, setPartners] = useState<IndustryPartner[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  // Action center state (local, applied on save)
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
  const [assignNote, setAssignNote] = useState('');
  const [facultyMentor, setFacultyMentor] = useState('');
  const [teamNote, setTeamNote] = useState('');
  const [industryPartnerId, setIndustryPartnerId] = useState('');
  const [selectedAuthorityId, setSelectedAuthorityId] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getIssue(id),
      getDuplicates(id).catch(() => ({ candidates: [] })),
      getUniversities().catch(() => ({ universities: [] as University[] })),
      getIndustryPartners().catch(() => ({ partners: [] as IndustryPartner[] })),
      getAuthorities().catch(() => ({ authorities: [] as Authority[] })),
    ])
      .then(([r, d, uni, p, auth]) => {
        setReport(r.report);
        setSelectedStatus(r.report.status);
        setFacultyMentor(r.report.facultyMentor ?? '');
        setTeamNote(r.report.teamNote ?? '');
        setIndustryPartnerId(r.report.industryPartnerId ?? '');
        setSelectedAuthorityId(r.report.assignedAuthorityId ?? '');
        setDuplicates(d.candidates);
        setUniversities(uni.universities);
        setPartners(p.partners);
        setAuthorities(auth.authorities);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpdateStatus() {
    if (!id || !report || !selectedStatus) return;
    setSaving(true);
    try {
      const res = await updateIssue(id, {
        status: selectedStatus as ReportStatus,
        note: assignNote || undefined,
      });
      setReport(res.report);
      setAssignNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTeam() {
    if (!id) return;
    setSaving(true);
    try {
      const res = await updateIssue(id, {
        facultyMentor: facultyMentor.trim() || null,
        teamNote: teamNote.trim() || null,
        industryPartnerId: industryPartnerId || null,
      });
      setReport(res.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Team update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignAuthority() {
    if (!id) return;
    setAssigning(true);
    try {
      const res = await updateIssue(id, {
        assignedAuthorityId: selectedAuthorityId || null,
      });
      setReport(res.report);
      setSelectedStatus(res.report.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  }

  async function handleSaveNote() {
    if (!id || !note.trim()) return;
    setNoteSaving(true);
    try {
      const res = await updateIssue(id, { note: note.trim() });
      setReport(res.report);
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Note save failed');
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleLinkDuplicate(duplicateOfId: string) {
    if (!id) return;
    try {
      const res = await updateIssue(id, { duplicateOfId });
      setReport(res.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Link failed');
    }
  }

  async function handleAiReanalysis() {
    if (!id) return;
    setAiLoading(true);
    try {
      const res = await triggerAiAnalysis(id);
      setReport(res.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-fade-in">
        <SkeletonBlock className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <SkeletonBlock className="h-64 rounded-xl" />
            <SkeletonBlock className="h-40 rounded-xl" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-60 rounded-xl" />
            <SkeletonBlock className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 text-center py-20">
        <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{error ?? 'Issue not found.'}</p>
        <button onClick={() => navigate('/issues')} className="mt-4 text-sm text-blue-700 underline">
          Back to Issues
        </button>
      </div>
    );
  }

  const PRIORITY_FACTORS = [
    { label: 'Severity (AI Assessed)', value: Math.round(report.priorityScore * 0.35), max: 35, color: 'bg-red-500' },
    { label: 'Citizen Reports', value: Math.round(report.priorityScore * 0.22), max: 22, color: 'bg-amber-500' },
    { label: 'Population Impact Radius', value: Math.round(report.priorityScore * 0.20), max: 20, color: 'bg-blue-500' },
    { label: 'Location Sensitivity', value: Math.round(report.priorityScore * 0.12), max: 12, color: 'bg-purple-500' },
    { label: 'Report Age Factor', value: Math.round(report.priorityScore * 0.08), max: 8, color: 'bg-teal-500' },
    { label: 'Recurrence History', value: Math.round(report.priorityScore * 0.03), max: 3, color: 'bg-green-500' },
  ];

  return (
    <div className="p-6 animate-fade-in">
      {/* Back + Header */}
      <div className="mb-5">
        <button
          onClick={() => navigate('/issues')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft size={15} />
          Back to Issues
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Challenge #{report.id.slice(-8).toUpperCase()}
              </h1>
              <PriorityBadge score={report.priorityScore} severity={report.severity} />
              {report.domain && (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {report.domain.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><MapPin size={12} /> {report.address ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <Clock size={12} /> {formatRelativeTime(report.createdAt)} unresolved
              </span>
              <span className="flex items-center gap-1"><Users size={12} /> {report.isDuplicate ? 'Duplicate' : 'Unique'} Challenge</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <Share2 size={14} /> Share
            </button>
            <button
              onClick={handleAiReanalysis}
              disabled={aiLoading}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-700 px-3.5 py-2 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {aiLoading ? 'Analyzing…' : 'Re-Run AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* LEFT column */}
        <div className="xl:col-span-2 space-y-5">

          {/* Primary Evidence Gallery */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FileImage size={15} className="text-blue-600" />
                Primary Evidence
              </div>
              {report.photoUrls.length > 0 && (
                <span className="text-xs text-blue-600 hover:underline cursor-pointer">
                  View Full Gallery ({report.photoUrls.length})
                </span>
              )}
            </div>
            {report.photoUrls.length === 0 ? (
              <div className="h-48 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <FileImage size={40} className="mx-auto mb-2" />
                  <p className="text-sm">No evidence photos submitted</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={report.photoUrls[selectedImg]}
                    alt="evidence"
                    className="h-full w-full object-cover"
                  />
                </div>
                {report.photoUrls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {report.photoUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImg(i)}
                        className={`shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all
                          ${selectedImg === i ? 'border-blue-500' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Analysis + Priority Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nivaran AI Analysis */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={15} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-900">Nivaran AI Analysis</h3>
              </div>
              {report.domain ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Domain</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{report.domain.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Severity</p>
                      <p className={`text-sm font-bold mt-0.5 ${
                        report.severity === 'CRITICAL' ? 'text-red-700' :
                        report.severity === 'HIGH' ? 'text-orange-700' :
                        report.severity === 'MEDIUM' ? 'text-amber-700' : 'text-green-700'
                      }`}>{report.severity ?? '—'}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Confidence</p>
                      <p className="text-sm font-bold text-blue-700 mt-0.5">
                        {report.aiConfidence != null ? `${Math.round(report.aiConfidence * 100)}%` : '—'}
                      </p>
                    </div>
                  </div>
                  {report.aiSummary && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3 italic">
                      "{report.aiSummary}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-400 mb-3">Classification pending</p>
                  <button
                    onClick={handleAiReanalysis}
                    disabled={aiLoading}
                    className="text-xs font-medium text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {aiLoading ? 'Running…' : 'Run AI Analysis'}
                  </button>
                </div>
              )}
            </div>

            {/* Priority Score Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Priority Score</h3>
                <span className="text-2xl font-black text-red-600">{Math.round(report.priorityScore)}</span>
              </div>
              <div className="space-y-2.5">
                {PRIORITY_FACTORS.map((f) => (
                  <div key={f.label}>
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                      <span>{f.label}</span>
                      <span className="font-semibold">+{f.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${f.color} transition-all`}
                        style={{ width: `${Math.min(100, (f.value / f.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Potential Duplicates */}
          {duplicates.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Potential Duplicates ({duplicates.length})
              </h3>
              <div className="space-y-3">
                {duplicates.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <AlertTriangle size={14} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gray-400">#{d.id.slice(-8).toUpperCase()}</p>
                      <p className="text-sm text-gray-700 truncate">{d.description.slice(0, 60)}</p>
                      <p className="text-xs text-gray-400">{formatRelativeTime(d.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill status={d.status} size="sm" />
                      <button
                        onClick={() => handleLinkDuplicate(d.id)}
                        className="text-xs font-medium text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">
          {/* Action Center */}
          <div className="bg-blue-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-blue-200" />
              <h3 className="text-sm font-semibold">Action Center</h3>
            </div>

            {/* Status selector */}
            <div className="mb-4">
              <label className="text-xs text-blue-200 uppercase tracking-wide block mb-2">Current Status</label>
              <select
                id="status-selector"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                className="w-full bg-blue-600/60 text-white border border-blue-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {/* University routing */}
            <div className="mb-4 bg-blue-600/40 rounded-lg p-3 space-y-2">
              {report.universityId ? (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-blue-400/30 flex items-center justify-center text-blue-100 text-xs font-bold">
                    <Building2 size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {universities.find((u) => u.id === report.universityId)?.name ?? report.universityId}
                    </p>
                    <p className="text-[10px] text-blue-200">Routed institution</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-blue-200">Not yet routed to a university</p>
              )}
            </div>

            {/* Note */}
            <div className="mb-4">
              <label className="text-xs text-blue-200 uppercase tracking-wide block mb-2">Note (optional)</label>
              <textarea
                rows={2}
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Add a status change note…"
                className="w-full bg-blue-600/40 text-white placeholder:text-blue-300 border border-blue-500 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>

            <button
              onClick={handleUpdateStatus}
              disabled={saving || selectedStatus === report.status}
              className="w-full flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Updating…' : 'Apply Changes'}
            </button>
          </div>

          {/* Assign Authority — the specific official responsible for action,
              surfaced back to the citizen on the mobile app's tracking screen. */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCog size={15} className="text-gray-400" />
              Assign Authority
            </h3>

            {report.assignedAuthority ? (
              <div className="mb-4 bg-teal-50 border border-teal-100 rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-teal-600 flex items-center justify-center text-white shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{report.assignedAuthority.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[report.assignedAuthority.designation, report.assignedAuthority.department].filter(Boolean).join(', ') || 'Authority'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      {report.assignedAuthority.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Phone size={10} /> {report.assignedAuthority.phone}
                        </span>
                      )}
                      {report.assignedAuthority.email && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500 truncate">
                          <Mail size={10} /> {report.assignedAuthority.email}
                        </span>
                      )}
                    </div>
                    {report.assignedAt && (
                      <p className="text-[10px] text-teal-700 mt-1.5">
                        Assigned {new Date(report.assignedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                Not yet assigned to an authority — this challenge won't show a responsible official on the citizen's app.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">
                  {authorities.length === 0 ? 'No authorities available in your scope' : 'Select Authority'}
                </label>
                <select
                  id="authority-select"
                  value={selectedAuthorityId}
                  onChange={(e) => setSelectedAuthorityId(e.target.value)}
                  disabled={authorities.length === 0}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Unassigned</option>
                  {authorities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}{a.designation ? ` — ${a.designation}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAssignAuthority}
                disabled={assigning || selectedAuthorityId === (report.assignedAuthorityId ?? '')}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-teal-700 py-2.5 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
                {selectedAuthorityId ? 'Assign to Authority' : 'Unassign'}
              </button>
            </div>
          </div>

          {/* Team Formation & Industry Partner */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap size={15} className="text-gray-400" />
              Team Formation
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Faculty Mentor</label>
                <input
                  id="faculty-mentor-input"
                  type="text"
                  value={facultyMentor}
                  onChange={(e) => setFacultyMentor(e.target.value)}
                  placeholder="e.g. Dr. Anita Kumar, CSE Dept."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Team Note</label>
                <textarea
                  id="team-note-input"
                  rows={2}
                  value={teamNote}
                  onChange={(e) => setTeamNote(e.target.value)}
                  placeholder="Multidisciplinary student team, project scope, etc."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5 flex items-center gap-1.5">
                  <Handshake size={12} /> Industry Partner
                </label>
                <select
                  id="industry-partner-select"
                  value={industryPartnerId}
                  onChange={(e) => setIndustryPartnerId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                >
                  <option value="">None</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveTeam}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-teal-600 py-2.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save Team Details
              </button>
            </div>
          </div>

          {/* Issue Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              Challenge Timeline
            </h3>
            {report.statusEvents && report.statusEvents.length > 0 ? (
              <ol className="space-y-4">
                {report.statusEvents.map((ev, i) => (
                  <li key={ev.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-2.5 w-2.5 rounded-full mt-0.5 shrink-0
                        ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                      {i < (report.statusEvents?.length ?? 0) - 1 && (
                        <div className="w-px flex-1 bg-gray-100 mt-1" />
                      )}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {ev.status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatTime(ev.createdAt)}</p>
                      {ev.note && (
                        <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2.5 py-1.5">
                          {ev.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="py-4 text-center text-gray-400 text-sm">
                <p>No timeline events yet.</p>
                <p className="text-xs text-gray-300 mt-1">Events appear as the status changes.</p>
              </div>
            )}
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ChevronRight size={15} className="text-gray-400" />
              Internal Notes
            </h3>
            <textarea
              id="internal-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for the internal audit trail…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-gray-400"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveNote}
                disabled={noteSaving || !note.trim()}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {noteSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
