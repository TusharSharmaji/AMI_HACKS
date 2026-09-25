import React, { useState } from 'react';
import {
  Car,
  Clock,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { TrafficSegmentData } from '../../types/traffic';
import { classifyCongestion, formatTravelTime } from '../../services/trafficService';

interface TrafficCardProps {
  traffic: TrafficSegmentData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  onRefresh: () => void;
  className?: string;
}

export const TrafficCard: React.FC<TrafficCardProps> = ({
  traffic,
  loading,
  error,
  lastUpdated,
  onRefresh,
  className = '',
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Loading state with no existing data
  if (loading && !traffic) {
    return (
      <div
        className={`bg-command-950/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-panel font-mono text-xs w-80 sm:w-88 pointer-events-auto transition-all ${className}`}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Road Segment Traffic
            </span>
          </div>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        </div>
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-[11px]">Querying TomTom Traffic Flow…</span>
          <span className="text-[9px] text-slate-400">Selected road segment</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !traffic) {
    return (
      <div
        className={`bg-command-950/90 backdrop-blur-md border border-red-900/40 rounded-2xl p-4 shadow-panel font-mono text-xs w-80 sm:w-88 pointer-events-auto transition-all ${className}`}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-rose-400" />
            <span className="font-semibold text-white tracking-wider uppercase text-[11px]">
              Road Segment Traffic
            </span>
          </div>
          <span className="text-[9px] text-rose-400 uppercase">Unavailable</span>
        </div>

        <div className="py-4 flex flex-col items-center text-center gap-2.5">
          <AlertTriangle className="w-6 h-6 text-amber-400/80" />
          <p className="text-[11px] text-slate-300 max-w-[240px]">
            {error}
          </p>
          <p className="text-[9px] text-slate-400">
            TomTom Flow requires road segments within coverage range.
          </p>
          <button
            onClick={onRefresh}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-command-800 hover:bg-command-700 border border-white/10 text-cyan-300 text-[11px] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Traffic</span>
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

  // If minimized, display a sleek compact badge
  if (isMinimized) {
    return (
      <div
        className={`bg-command-950/95 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 shadow-panel font-mono pointer-events-auto flex items-center gap-3 transition-all cursor-pointer hover:border-cyan-500/40 ${className}`}
        onClick={() => setIsMinimized(false)}
        title="Click to expand road segment traffic details"
      >
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-cyan-400" />
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${classification.bgColor} ${classification.textColor} ${classification.borderColor}`}
          >
            {classification.label}
          </span>
          <span className="text-xs text-white font-semibold">
            {traffic.currentSpeed} km/h
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(false);
          }}
          className="text-slate-400 hover:text-white p-0.5"
          aria-label="Expand traffic card"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-command-950/95 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-panel font-mono text-xs w-80 sm:w-92 pointer-events-auto transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800/50 text-cyan-400 shrink-0">
            <Car className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white tracking-wider uppercase text-[11px] truncate">
              Road Segment Traffic
            </h3>
            <p className="text-[9px] text-slate-400 truncate">
              Selected segment · Not city-wide
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Refresh traffic data (auto-refreshes every 3 min)"
            aria-label="Refresh traffic flow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Minimize card"
            aria-label="Minimize traffic card"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Condition + Speed Banner */}
      <div className="my-3 flex items-start justify-between gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-1">
            Flow Condition
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide border ${classification.bgColor} ${classification.textColor} ${classification.borderColor}`}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: classification.color }}
              />
              {classification.label}
            </span>
            {classification.percentage > 0 && (
              <span className="text-[11px] text-slate-400">
                +{classification.percentage}% delay
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">
            Current Speed
          </span>
          <div className="text-2xl font-bold text-white tracking-tight leading-none">
            {traffic.currentSpeed}
            <span className="text-xs font-normal text-slate-400 ml-1">km/h</span>
          </div>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 gap-2 my-3">
        {/* Free-flow Speed */}
        <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span className="text-[9px] uppercase">Free-Flow Speed</span>
          </div>
          <p className="text-xs font-bold text-slate-200">
            {traffic.freeFlowSpeed} <span className="text-[10px] font-normal text-slate-400">km/h</span>
          </p>
        </div>

        {/* Travel Time */}
        <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] uppercase">Travel Time</span>
          </div>
          <p className="text-xs font-bold text-slate-200">
            {formatTravelTime(traffic.currentTravelTime)}
            <span className="text-[9px] font-normal text-slate-400 block">
              norm: {formatTravelTime(traffic.freeFlowTravelTime)}
            </span>
          </p>
        </div>

        {/* Confidence */}
        <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] uppercase">Confidence</span>
          </div>
          <p className="text-xs font-bold text-slate-200">
            {Math.round(traffic.confidence * 100)}%
          </p>
        </div>

        {/* Road Status */}
        <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            {traffic.roadClosure ? (
              <XCircle className="w-3 h-3 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            <span className="text-[9px] uppercase">Road Status</span>
          </div>
          <p className={`text-xs font-bold ${traffic.roadClosure ? 'text-rose-400' : 'text-emerald-400'}`}>
            {traffic.roadClosure ? 'Closed' : 'Open'}
          </p>
        </div>
      </div>

      {/* Segment Hint */}
      <div className="flex items-center gap-1.5 py-1 text-[10px] text-slate-400">
        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
        <span className="truncate">
          Segment rendered on map · Click line for details
        </span>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span>
            {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
          </span>
        </div>
        <div
          className="flex items-center gap-1 text-slate-400 hover:text-slate-300 transition-colors"
          title="Data provided by TomTom Traffic Flow API"
        >
          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
          <span>Source: TomTom Flow</span>
        </div>
      </div>
    </div>
  );
};
