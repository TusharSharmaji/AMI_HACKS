import React from 'react';
import {
  Car,
  Gauge,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Navigation,
} from 'lucide-react';
import type { TrafficSegmentData } from '../../types/traffic';
import { classifyCongestion, formatTravelTime } from '../../services/trafficService';

interface TrafficPanelProps {
  traffic: TrafficSegmentData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrafficPanel: React.FC<TrafficPanelProps> = ({
  traffic,
  loading,
  error,
  onRetry,
}) => {
  // Loading state
  if (loading && !traffic) {
    return (
      <div className="bg-command-950/70 border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Road Segment Traffic
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Fetching TomTom segment flow…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !traffic) {
    return (
      <div className="bg-command-950/70 border border-red-900/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Road Segment Traffic
          </h3>
        </div>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400/80" />
          <p className="text-xs text-slate-300 max-w-[240px]">
            {error}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            Traffic flow is measured for the nearest mapped road segment.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-command-800 hover:bg-command-700 border border-white/10 text-xs font-mono text-cyan-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry Traffic
          </button>
        </div>
      </div>
    );
  }

  if (!traffic) return null;

  const classification = classifyCongestion(
    traffic.currentSpeed,
    traffic.freeFlowSpeed,
    traffic.roadClosure
  );

  return (
    <div className="bg-command-950/70 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Road Segment Traffic
          </h3>
        </div>
        {loading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        )}
      </div>

      {/* Main Condition + Speed */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <span className="text-[10px] uppercase font-mono text-slate-400 mb-0.5 block">
            Condition
          </span>
          <div className="text-2xl font-bold text-white tracking-tight leading-none">
            {traffic.currentSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide border ${classification.bgColor} ${classification.textColor} ${classification.borderColor}`}
            >
              {classification.label}
            </span>
            {classification.percentage > 0 && (
              <span className="text-[10px] font-mono text-slate-400">
                +{classification.percentage}% delay
              </span>
            )}
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border ${classification.borderColor} ${classification.bgColor}`}>
          <Navigation
            className="w-9 h-9"
            style={{ color: classification.color }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
          <Gauge className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">Free-Flow</p>
            <p className="text-xs font-semibold text-slate-200">{traffic.freeFlowSpeed} km/h</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">Travel Time</p>
            <p className="text-xs font-semibold text-slate-200">
              {formatTravelTime(traffic.currentTravelTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">Confidence</p>
            <p className="text-xs font-semibold text-slate-200">{Math.round(traffic.confidence * 100)}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
          {traffic.roadClosure ? (
            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          )}
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">Road Status</p>
            <p className={`text-xs font-semibold ${traffic.roadClosure ? 'text-rose-400' : 'text-emerald-400'}`}>
              {traffic.roadClosure ? 'Closed' : 'Open'}
            </p>
          </div>
        </div>
      </div>

      {/* Scope Disclaimer */}
      <p className="mt-3 text-[10px] text-slate-400 font-mono">
        * Flow represents the nearest road segment returned by TomTom, not city-wide average.
      </p>

      {/* Footer */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Auto-refreshes (3m)</span>
        </div>
        <div
          className="flex items-center gap-1 text-slate-500 hover:text-slate-400 transition-colors"
          title="Data provided by TomTom Traffic Flow API"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Source: TomTom</span>
        </div>
      </div>
    </div>
  );
};
