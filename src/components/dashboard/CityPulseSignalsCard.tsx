import React, { useState } from 'react';
import {
  Radio,
  Zap,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import type { CityPulseSignal } from '../../services/signalEngine';

interface CityPulseSignalsCardProps {
  signals: CityPulseSignal[];
  onFocusSignal?: (signal: CityPulseSignal) => void;
  onNavigateRisk?: () => void;
}

export const CityPulseSignalsCard: React.FC<CityPulseSignalsCardProps> = ({
  signals,
  onFocusSignal,
  onNavigateRisk,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (signals.length === 0) {
    return (
      <div
        className="rounded-2xl border border-white/10 p-5 relative overflow-hidden"
        style={{ background: '#0d1424' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-[13px] font-bold text-white tracking-wide uppercase">
              CityPulse Signals
            </h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Telemetry Normal
          </span>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[13px] font-semibold text-white">
              No significant cross-feed patterns detected
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              All live feeds (Open-Meteo weather, TomTom traffic, air quality, and citizen reports)
              are operating within independent, nominal operating parameters.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeSignal = signals[Math.min(currentIndex, signals.length - 1)];

  return (
    <div
      className="rounded-2xl border border-amber-500/30 p-5 relative overflow-hidden transition-all duration-300 shadow-lg"
      style={{
        background: 'linear-gradient(145deg, #131b2e 0%, #0d1424 100%)',
      }}
    >
      {/* Decorative top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-cyan-400 to-blue-500 opacity-90" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute opacity-75" />
            <span className="w-2 h-2 rounded-full bg-amber-400 relative" />
          </div>
          <h3 className="text-[13px] font-black text-white tracking-wider uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            CityPulse Signals
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {signals.length} Cross-Feed Pattern{signals.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Carousel pagination if multiple signals */}
        {signals.length > 1 && (
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
            {signals.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${
                  currentIndex === idx
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                #{idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Signal Content */}
      <div className="space-y-3.5">
        {/* Title & Confidence Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[14px] font-extrabold text-white leading-snug">
                {activeSignal.title}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400" />
                  {activeSignal.locationName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {activeSignal.timeWindow}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                activeSignal.confidence === 'HIGH'
                  ? 'bg-red-500/15 text-red-300 border-red-500/30'
                  : activeSignal.confidence === 'MEDIUM'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              }`}
            >
              Confidence: {activeSignal.confidence}
            </span>
          </div>
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 py-1">
          {activeSignal.metrics.map((m, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-white/[0.03] border border-white/8 flex flex-col justify-between"
            >
              <span className="text-[10px] font-medium text-slate-400 truncate">
                {m.label}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[14px] font-bold text-white">
                  {m.value}
                </span>
                {m.trend === 'up' && (
                  <TrendingUp className="w-3 h-3 text-red-400" />
                )}
                {m.trend === 'down' && (
                  <TrendingDown className="w-3 h-3 text-emerald-400" />
                )}
                {m.trend === 'stable' && (
                  <Minus className="w-3 h-3 text-slate-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Human-friendly explanation */}
        <p className="text-[12px] text-slate-300 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
          {activeSignal.explanation}
        </p>

        {/* Historical Snapshot note if present */}
        {activeSignal.historicalNote && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
            <Radio className="w-3.5 h-3.5 shrink-0 text-blue-400 animate-pulse" />
            <span>{activeSignal.historicalNote}</span>
          </div>
        )}

        {/* Causation Disclaimer (Mandatory Scientific Guardrail) */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[10px] text-amber-200/80 leading-normal">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>{activeSignal.disclaimer}</span>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onFocusSignal?.(activeSignal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-300 text-[11px] font-bold transition-all"
          >
            <MapPin className="w-3.5 h-3.5" />
            View on Map →
          </button>

          {onNavigateRisk && (
            <button
              onClick={onNavigateRisk}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              Risk Intelligence Analysis <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
