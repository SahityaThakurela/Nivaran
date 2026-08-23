import { useState } from 'react';
import {
  Bot, Bell, Sliders, ChevronDown, ChevronUp, Check, Info,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SLAConfig {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

interface NotifConfig {
  emailCritical: boolean;
  emailDigest: boolean;
  inAppAlerts: boolean;
  slaBreachAlert: boolean;
  duplicateFlagged: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-6 py-5 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="p-2 rounded-lg bg-blue-50 text-blue-700 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100 pt-5 space-y-5">{children}</div>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  id,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label htmlFor={id} className="text-sm font-medium text-gray-800 cursor-pointer">{label}</label>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  id,
  formatLabel,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  id: string;
  formatLabel?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = formatLabel ? formatLabel(value) : `${value}${unit ?? ''}`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-gray-800">{label}</label>
        <span className="text-sm font-bold text-blue-700 tabular-nums">{display}</span>
      </div>
      <p className="text-xs text-gray-400 mb-2.5">{description}</p>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-700 h-1.5 rounded-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #1A56DB ${pct}%, #e2e8f0 ${pct}%)` }}
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function SLAField({
  label,
  value,
  color,
  onChange,
  id,
}: {
  label: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
  id: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50">
      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} />
      <span className="text-sm font-semibold text-gray-700 flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          id={id}
          type="number"
          min={1}
          max={168}
          value={value}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value)))}
          className="w-16 text-sm font-bold text-gray-900 text-right border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
        />
        <span className="text-xs text-gray-400">hours</span>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ show }: { show: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 flex items-center gap-2.5 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <Check size={16} className="text-green-400" />
      Settings saved successfully
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const [aiConfidenceThreshold, setAiConfidenceThreshold] = useState(0.75);
  const [autoAssign, setAutoAssign] = useState(true);
  const [duplicateSensitivity, setDuplicateSensitivity] = useState(0.8);

  const [sla, setSla] = useState<SLAConfig>({
    CRITICAL: 6,
    HIGH: 24,
    MEDIUM: 48,
    LOW: 72,
  });

  const [notif, setNotif] = useState<NotifConfig>({
    emailCritical: true,
    emailDigest: true,
    inAppAlerts: true,
    slaBreachAlert: true,
    duplicateFlagged: false,
  });

  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 600);
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform configuration and automation preferences.</p>
        </div>
        <button
          id="save-settings-btn"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-700 px-4 py-2.5 rounded-lg hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-60"
        >
          {saving ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <Check size={15} />
          )}
          Save Changes
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
        <Info size={15} className="shrink-0 mt-0.5" />
        <span>Changes take effect immediately for all users in your city. No restart is needed.</span>
      </div>

      {/* ── Section 1: AI & Automation ─────────────────────────────────────── */}
      <Section
        icon={<Bot size={17} />}
        title="AI & Automation"
        description="Control how the AI categorises, assigns, and deduplicates incoming reports."
      >
        <SliderRow
          id="ai-confidence-threshold"
          label="Auto-Assignment Confidence Threshold"
          description="Only auto-assign issues to departments when the AI confidence exceeds this value. Lower = more automation, higher = more manual control."
          value={aiConfidenceThreshold}
          min={0.5}
          max={0.99}
          step={0.01}
          formatLabel={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={setAiConfidenceThreshold}
        />
        <div className="border-t border-gray-100" />
        <ToggleRow
          id="auto-assign-toggle"
          label="Enable Automatic Department Assignment"
          description="When enabled, reports meeting the confidence threshold are assigned to the appropriate department without manual intervention."
          checked={autoAssign}
          onChange={setAutoAssign}
        />
        <div className="border-t border-gray-100" />
        <SliderRow
          id="duplicate-sensitivity"
          label="Duplicate Detection Sensitivity"
          description="Higher sensitivity catches more duplicates but may produce false positives. Adjust based on report volume and geographic density."
          value={duplicateSensitivity}
          min={0.5}
          max={0.99}
          step={0.01}
          formatLabel={(v) => `${(v * 100).toFixed(0)}%`}
          onChange={setDuplicateSensitivity}
        />
      </Section>

      {/* ── Section 2: SLA Thresholds ──────────────────────────────────────── */}
      <Section
        icon={<Sliders size={17} />}
        title="SLA Thresholds"
        description="Define how many hours each severity level has before an issue is considered in breach of SLA."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SLAField
            id="sla-critical"
            label="Critical"
            color="bg-red-500"
            value={sla.CRITICAL}
            onChange={(v) => setSla((s) => ({ ...s, CRITICAL: v }))}
          />
          <SLAField
            id="sla-high"
            label="High"
            color="bg-orange-400"
            value={sla.HIGH}
            onChange={(v) => setSla((s) => ({ ...s, HIGH: v }))}
          />
          <SLAField
            id="sla-medium"
            label="Medium"
            color="bg-amber-400"
            value={sla.MEDIUM}
            onChange={(v) => setSla((s) => ({ ...s, MEDIUM: v }))}
          />
          <SLAField
            id="sla-low"
            label="Low"
            color="bg-green-400"
            value={sla.LOW}
            onChange={(v) => setSla((s) => ({ ...s, LOW: v }))}
          />
        </div>
        <p className="text-xs text-gray-400 flex items-start gap-1.5 mt-1">
          <Info size={12} className="shrink-0 mt-0.5" />
          SLA badges in the Issues queue are calculated in real-time based on these values.
        </p>
      </Section>

      {/* ── Section 3: Notification Preferences ───────────────────────────── */}
      <Section
        icon={<Bell size={17} />}
        title="Notification Preferences"
        description="Choose which system events trigger email and in-app alerts."
      >
        <ToggleRow
          id="notif-email-critical"
          label="Email on Critical Issues"
          description="Send an email to all Municipal Admins when a critical-severity report is filed."
          checked={notif.emailCritical}
          onChange={(v) => setNotif((n) => ({ ...n, emailCritical: v }))}
        />
        <div className="border-t border-gray-100" />
        <ToggleRow
          id="notif-email-digest"
          label="Daily Email Digest"
          description="Send a daily summary of open, breached, and newly resolved issues at 8:00 AM."
          checked={notif.emailDigest}
          onChange={(v) => setNotif((n) => ({ ...n, emailDigest: v }))}
        />
        <div className="border-t border-gray-100" />
        <ToggleRow
          id="notif-in-app"
          label="In-App Alerts"
          description="Show real-time badge and alert notifications within the dashboard."
          checked={notif.inAppAlerts}
          onChange={(v) => setNotif((n) => ({ ...n, inAppAlerts: v }))}
        />
        <div className="border-t border-gray-100" />
        <ToggleRow
          id="notif-sla-breach"
          label="SLA Breach Alerts"
          description="Notify operators immediately when an issue exceeds its SLA deadline."
          checked={notif.slaBreachAlert}
          onChange={(v) => setNotif((n) => ({ ...n, slaBreachAlert: v }))}
        />
        <div className="border-t border-gray-100" />
        <ToggleRow
          id="notif-duplicate"
          label="Duplicate Flagged Alerts"
          description="Notify when the AI system flags a new report as a duplicate of an existing one."
          checked={notif.duplicateFlagged}
          onChange={(v) => setNotif((n) => ({ ...n, duplicateFlagged: v }))}
        />
      </Section>

      <Toast show={showToast} />
    </div>
  );
}
