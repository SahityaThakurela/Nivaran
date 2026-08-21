import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2, CheckCircle2, AlertTriangle, Clock,
  MapPin, ThumbsUp, RefreshCw, Filter, CheckCheck,
} from 'lucide-react';
import { getIssues } from '../api/issues';
import { acceptTask, completeTask } from '../api/tasks';
import type { Report } from '../api/types';
import { PriorityBadge } from '../components/PriorityBadge';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

interface CompleteModalProps {
  report: Report;
  onClose: () => void;
  onComplete: (urls: string[], note: string) => Promise<void>;
}

function CompleteModal({ report, onClose, onComplete }: CompleteModalProps) {
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!evidenceUrl.trim()) { setError('At least one evidence URL is required.'); return; }
    setLoading(true);
    try {
      await onComplete([evidenceUrl.trim()], note);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-slide-in">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Complete Task</h3>
        <p className="text-sm text-gray-500 mb-5">#{report.id.slice(-8).toUpperCase()} · {report.description.slice(0, 50)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Evidence Photo URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => { setEvidenceUrl(e.target.value); setError(''); }}
              placeholder="https://…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Completion Note</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what was done to resolve the issue…"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-green-600 py-2.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
              {loading ? 'Submitting…' : 'Mark Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskView() {
  const [tasks, setTasks] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<'all' | 'assigned' | 'in_progress'>('all');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIssues();
      // Field worker sees their assigned + in_progress tasks
      const myTasks = res.reports.filter(
        (r) => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS'
      );
      setTasks(myTasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function handleAccept(id: string) {
    setActionId(id);
    try {
      const res = await acceptTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? res.report : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept task');
    } finally {
      setActionId(null);
    }
  }

  async function handleComplete(id: string, urls: string[], note: string) {
    const res = await completeTask(id, { resolutionEvidenceUrls: urls, note });
    setTasks((prev) => prev.filter((t) => t.id !== res.report.id));
    setCompleteTarget(null);
  }

  const filtered = tasks.filter((t) => {
    if (showFilter === 'assigned') return t.status === 'ASSIGNED';
    if (showFilter === 'in_progress') return t.status === 'IN_PROGRESS';
    return true;
  });

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-sm mt-0.5">
            Today:{' '}
            <span className="font-semibold text-blue-700">{tasks.length} assigned</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter((f) => f === 'all' ? 'assigned' : f === 'assigned' ? 'in_progress' : 'all')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Cycle filter"
          >
            <Filter size={16} />
          </button>
          <button
            onClick={fetchTasks}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-6 w-64 bg-gray-200 rounded" />
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-10 w-full bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-400">No tasks assigned right now. Check back later.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-2xl border-2 p-5 shadow-card transition-all
                ${task.severity === 'CRITICAL' ? 'border-red-200' :
                  task.severity === 'HIGH' ? 'border-amber-200' : 'border-gray-100'}`}
            >
              {/* Task header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded
                    ${task.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      task.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'}`}>
                    {task.severity ?? 'UNCLASSIFIED'}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">#{task.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  Due: {formatRelativeTime(task.createdAt)}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">
                {task.description.slice(0, 80)}
              </h3>

              {/* Location */}
              {task.address && (
                <p className="flex items-center gap-1 text-xs text-blue-600 mb-3">
                  <MapPin size={12} />
                  {task.address}
                </p>
              )}

              {/* Category + AI score */}
              {task.category && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1.5">Category: <span className="font-medium text-gray-700">{task.category.replace(/_/g, ' ')}</span></p>
                </div>
              )}

              {/* Priority score bar */}
              {task.priorityScore > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>AI Priority Score</span>
                    <span className="font-bold text-gray-900">{Math.round(task.priorityScore)}/100</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all
                        ${task.priorityScore >= 75 ? 'bg-red-500' :
                          task.priorityScore >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, task.priorityScore)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {task.status === 'ASSIGNED' ? (
                <button
                  id={`accept-task-${task.id}`}
                  onClick={() => handleAccept(task.id)}
                  disabled={actionId === task.id}
                  className="w-full flex items-center justify-center gap-2 bg-blue-700 text-white font-semibold py-3 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-60"
                >
                  {actionId === task.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ThumbsUp size={16} />
                  )}
                  {actionId === task.id ? 'Accepting…' : 'Accept Task'}
                </button>
              ) : (
                <div className="flex gap-3">
                  <Link
                    to={`/issues/${task.id}`}
                    className="flex-1 text-center text-sm font-medium text-gray-600 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </Link>
                  <button
                    id={`complete-task-${task.id}`}
                    onClick={() => setCompleteTarget(task)}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-green-600 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 size={15} />
                    Complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Complete Task Modal */}
      {completeTarget && (
        <CompleteModal
          report={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onComplete={(urls, note) => handleComplete(completeTarget.id, urls, note)}
        />
      )}
    </div>
  );
}
