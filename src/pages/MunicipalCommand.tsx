import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, AlertTriangle, CheckCircle2, Clock, RefreshCw,
  ChevronDown, MapPin, Zap,
  Loader2, FileText, ArrowRight, Filter, X
} from 'lucide-react';
import {
  getReports, updateReportStatus, REPORT_SAVED_EVENT,
} from '../services/reportService';
import type { CivicReportMeta, ReportStatus, IssueSeverity } from '../types/report';
import {
  ISSUE_TYPE_LABELS, SEVERITY_COLORS, WORKFLOW_STAGES,
} from '../types/report';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  Critical: 0, High: 1, Medium: 2, Low: 3,
};

const SEVERITY_BADGE: Record<IssueSeverity, string> = {
  Low:      'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  Medium:   'bg-amber-500/15  border-amber-500/30  text-amber-300',
  High:     'bg-orange-500/15 border-orange-500/30 text-orange-300',
  Critical: 'bg-rose-500/15   border-rose-500/30   text-rose-300',
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  NEW:         'bg-sky-500/15     border-sky-500/30     text-sky-300',
  ASSIGNED:    'bg-violet-500/15  border-violet-500/30  text-violet-300',
  IN_PROGRESS: 'bg-amber-500/15   border-amber-500/30   text-amber-300',
  RESOLVED:    'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
};

const STATUS_DISPLAY: Record<ReportStatus, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function nextStatus(current: ReportStatus): ReportStatus | null {
  const idx = WORKFLOW_STAGES.indexOf(current);
  if (idx === -1 || idx === WORKFLOW_STAGES.length - 1) return null;
  return WORKFLOW_STAGES[idx + 1];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  label: string; value: number; icon: React.ReactNode; accent: string;
}> = ({ label, value, icon, accent }) => (
  <div className={`bg-command-950/60 border rounded-xl p-4 flex items-center gap-3 ${accent}`}>
    <div className="shrink-0 opacity-80">{icon}</div>
    <div className="min-w-0">
      <div className="text-2xl font-bold font-mono text-white leading-none">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
    </div>
  </div>
);

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const DetailDrawer: React.FC<{
  report: CivicReportMeta;
  onClose: () => void;
  onStatusChange: (id: string, s: ReportStatus) => void;
}> = ({ report, onClose, onStatusChange }) => {
  const next = nextStatus(report.status);
  const sevColor = SEVERITY_COLORS[report.severity];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[#0d1117] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/10">
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${SEVERITY_BADGE[report.severity]}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sevColor }} />
                {report.severity}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_BADGE[report.status]}`}>
                {STATUS_DISPLAY[report.status]}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white font-mono">
              {ISSUE_TYPE_LABELS[report.issueType]}
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">{report.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Description */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Description</p>
            <p className="text-sm text-slate-300 leading-relaxed">{report.description}</p>
          </div>

          {/* AI Analysis grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Department</p>
              <p className="text-xs text-white font-medium">{report.department}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Infrastructure</p>
              <p className="text-xs text-white font-medium">{report.infrastructure}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">AI Confidence</p>
              <p className="text-xs text-white font-medium">{Math.round((report.aiConfidence ?? 0) * 100)}%</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">Submitted</p>
              <p className="text-xs text-white font-medium">{formatDate(report.submittedAt)}</p>
            </div>
          </div>

          {/* Recommended Action */}
          {report.recommendedAction && (
            <div className="bg-cyan-950/30 border border-cyan-800/30 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-500 mb-1">Recommended Action</p>
              <p className="text-xs text-cyan-200 leading-relaxed">{report.recommendedAction}</p>
            </div>
          )}

          {/* Location */}
          {report.location && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                {report.location.address && (
                  <p className="text-xs text-slate-300 truncate">{report.location.address}</p>
                )}
                <p className="text-[10px] font-mono text-slate-500">
                  {report.location.latitude.toFixed(5)}, {report.location.longitude.toFixed(5)}
                </p>
              </div>
            </div>
          )}

          {/* Workflow status */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Workflow</p>
            <div className="flex items-center gap-1">
              {WORKFLOW_STAGES.map((stage, i) => {
                const stageIdx = WORKFLOW_STAGES.indexOf(report.status);
                const done = i <= stageIdx;
                return (
                  <React.Fragment key={stage}>
                    <div className={`flex-1 text-center px-1 py-1 rounded text-[9px] font-mono font-bold border transition-colors ${
                      done
                        ? 'bg-cyan-950/50 border-cyan-800/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-slate-600'
                    }`}>
                      {STATUS_DISPLAY[stage]}
                    </div>
                    {i < WORKFLOW_STAGES.length - 1 && (
                      <ArrowRight className={`w-3 h-3 shrink-0 ${done ? 'text-cyan-600' : 'text-slate-700'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* All status buttons */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Set Status</p>
            <div className="grid grid-cols-2 gap-2">
              {WORKFLOW_STAGES.map((stage) => (
                <button
                  key={stage}
                  disabled={report.status === stage}
                  onClick={() => { onStatusChange(report.id, stage); onClose(); }}
                  className={`text-xs font-mono py-1.5 px-2 rounded-lg border transition-colors ${
                    report.status === stage
                      ? 'border-cyan-700/50 bg-cyan-950/50 text-cyan-300 cursor-default'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {STATUS_DISPLAY[stage]}
                </button>
              ))}
            </div>
          </div>

          {/* Advance button */}
          {next && (
            <button
              onClick={() => { onStatusChange(report.id, next); onClose(); }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Advance to {STATUS_DISPLAY[next]}
            </button>
          )}

          <p className="text-[9px] font-mono text-slate-600 text-center pt-2">
            Reports are stored locally. No data has been transmitted to any external authority.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Report Row ───────────────────────────────────────────────────────────────
const ReportRow: React.FC<{
  report: CivicReportMeta;
  onSelect: () => void;
  onStatusChange: (id: string, s: ReportStatus) => void;
}> = ({ report, onSelect, onStatusChange }) => {
  const next = nextStatus(report.status);
  const sevColor = SEVERITY_COLORS[report.severity];

  return (
    <tr
      className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: sevColor }}
          />
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${SEVERITY_BADGE[report.severity]}`}>
            {report.severity}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-xs text-white font-medium">{ISSUE_TYPE_LABELS[report.issueType]}</p>
          <p className="text-[10px] font-mono text-slate-500">{report.id}</p>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-[10px] text-slate-400">{report.department}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {report.location ? (
          <span className="text-[10px] font-mono text-slate-500">
            {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-[10px] text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-[10px] font-mono text-slate-500">{formatDate(report.submittedAt)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_BADGE[report.status]}`}>
          {STATUS_DISPLAY[report.status]}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {next ? (
          <button
            onClick={() => onStatusChange(report.id, next)}
            className="text-[10px] font-mono px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors whitespace-nowrap"
          >
            → {STATUS_DISPLAY[next]}
          </button>
        ) : (
          <span className="text-[10px] text-slate-600">✓ Done</span>
        )}
      </td>
    </tr>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const MunicipalCommand: React.FC = () => {
  const [reports, setReports] = useState<CivicReportMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CivicReportMeta | null>(null);
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'ALL'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<IssueSeverity | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<'severity' | 'date'>('severity');

  const load = useCallback(() => {
    setReports(getReports());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(REPORT_SAVED_EVENT, handler);
    return () => window.removeEventListener(REPORT_SAVED_EVENT, handler);
  }, [load]);

  const handleStatusChange = useCallback((id: string, status: ReportStatus) => {
    const updated = updateReportStatus(id, status);
    if (updated) {
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setSelectedReport((prev) => (prev?.id === id ? updated : prev));
    }
  }, []);

  // Filter + sort
  const filtered = reports
    .filter((r) => filterStatus === 'ALL' || r.status === filterStatus)
    .filter((r) => filterSeverity === 'ALL' || r.severity === filterSeverity)
    .sort((a, b) =>
      sortField === 'severity'
        ? SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
        : new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

  // Stats
  const total = reports.length;
  const byStatus = {
    NEW: reports.filter((r) => r.status === 'NEW').length,
    ASSIGNED: reports.filter((r) => r.status === 'ASSIGNED').length,
    IN_PROGRESS: reports.filter((r) => r.status === 'IN_PROGRESS').length,
    RESOLVED: reports.filter((r) => r.status === 'RESOLVED').length,
  };

  return (
    <div className="h-full overflow-y-auto bg-[#090d14]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-cyan-400" />
              <h1 className="text-lg font-bold font-mono text-white tracking-tight">
                Municipal Command
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Internal civic report management — workflow only. No data has been sent to any external authority.
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total"
            value={total}
            icon={<FileText className="w-5 h-5 text-slate-400" />}
            accent="border-white/10"
          />
          <StatCard
            label="New"
            value={byStatus.NEW}
            icon={<AlertTriangle className="w-5 h-5 text-sky-400" />}
            accent="border-sky-800/30"
          />
          <StatCard
            label="In Progress"
            value={byStatus.ASSIGNED + byStatus.IN_PROGRESS}
            icon={<Clock className="w-5 h-5 text-amber-400" />}
            accent="border-amber-800/30"
          />
          <StatCard
            label="Resolved"
            value={byStatus.RESOLVED}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            accent="border-emerald-800/30"
          />
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />

          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', ...WORKFLOW_STAGES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
                  filterStatus === s
                    ? 'border-cyan-700/60 bg-cyan-950/60 text-cyan-300'
                    : 'border-white/10 bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                }`}
              >
                {s === 'ALL' ? 'All Status' : STATUS_DISPLAY[s]}
              </button>
            ))}
          </div>

          <span className="text-white/10 hidden sm:block">|</span>

          {/* Severity filter */}
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'Critical', 'High', 'Medium', 'Low'] as const).map((sv) => (
              <button
                key={sv}
                onClick={() => setFilterSeverity(sv)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
                  filterSeverity === sv
                    ? 'border-cyan-700/60 bg-cyan-950/60 text-cyan-300'
                    : 'border-white/10 bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                }`}
              >
                {sv === 'ALL' ? 'All Severity' : sv}
              </button>
            ))}
          </div>

          <span className="text-white/10 hidden sm:block">|</span>

          {/* Sort */}
          <button
            onClick={() => setSortField((f) => (f === 'severity' ? 'date' : 'severity'))}
            className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/10 transition-colors flex items-center gap-1"
          >
            <ChevronDown className="w-3 h-3" />
            Sort: {sortField === 'severity' ? 'Severity' : 'Date'}
          </button>
        </div>

        {/* ── Table / Empty ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {reports.length === 0 ? (
              <>
                <Building2 className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-sm font-mono text-slate-500">No reports yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  Submit a civic report via the Report Issue page to see it here.
                </p>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-sm font-mono text-slate-500">No reports match the current filters</p>
                <button
                  onClick={() => { setFilterStatus('ALL'); setFilterSeverity('ALL'); }}
                  className="mt-3 text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-command-950/40 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500">Severity</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500">Issue / ID</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500 hidden md:table-cell">Department</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500 hidden lg:table-cell">Location</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500 hidden sm:table-cell">Submitted</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      onSelect={() => setSelectedReport(report)}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-white/5 text-[10px] font-mono text-slate-600 flex items-center justify-between">
              <span>{filtered.length} of {reports.length} reports</span>
              <span>Click any row for full details</span>
            </div>
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4 flex gap-3">
          <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-mono font-bold text-amber-400 mb-0.5">Internal Workflow Only</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This dashboard manages reports stored locally in your browser. No data has been
              transmitted to any government or municipal authority. The workflow is prepared for
              future API / email / webhook integration when an official municipal endpoint is available.
            </p>
          </div>
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      {selectedReport && (
        <DetailDrawer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};
