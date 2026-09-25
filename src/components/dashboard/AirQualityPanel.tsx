import React from 'react';
import {
  Wind,
  RefreshCw,
  AlertCircle,
  Loader2,
  Clock,
  ExternalLink,
  Gauge,
  Atom,
} from 'lucide-react';
import type { AirQualityData } from '../../types/airQuality';
import { getAqiCategory, formatDataFreshness } from '../../utils/civicDataUtils';

interface AirQualityPanelProps {
  airQuality: AirQualityData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const AirQualityPanel: React.FC<AirQualityPanelProps> = ({
  airQuality,
  loading,
  error,
  onRetry,
}) => {
  // Loading state
  if (loading && !airQuality) {
    return (
      <div className="bg-command-950/70 border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wind className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Air Quality
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span className="text-xs font-mono">Loading air quality data…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !airQuality) {
    return (
      <div className="bg-command-950/70 border border-red-900/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wind className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Air Quality
          </h3>
        </div>
        <div className="flex flex-col items-center gap-3 py-6">
          <AlertCircle className="w-8 h-8 text-red-400/80" />
          <p className="text-xs text-slate-400 text-center max-w-[220px]">
            Unable to load air quality data
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-command-800 hover:bg-command-700 border border-white/10 text-xs font-mono text-emerald-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!airQuality) return null;

  const aqiValue = airQuality.usAqi ?? airQuality.europeanAqi;
  const category = getAqiCategory(airQuality.usAqi);
  const freshness = formatDataFreshness(airQuality.timestamp);
  const aqiLabel = airQuality.usAqi !== undefined ? 'US AQI' : airQuality.europeanAqi !== undefined ? 'EU AQI' : 'AQI';

  return (
    <div className="bg-command-950/70 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Air Quality
          </h3>
        </div>
        {loading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        )}
      </div>

      {/* AQI Hero */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase font-mono text-slate-400 mb-0.5">
            {aqiLabel}
          </p>
          <div className="text-3xl font-bold text-white tracking-tight leading-none">
            {aqiValue !== undefined ? aqiValue : '—'}
          </div>
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide ${category.bgColor} ${category.textColor} border ${category.borderColor}`}
            >
              {category.label}
            </span>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl border ${category.borderColor} ${category.bgColor}`}>
          <Gauge
            className="w-9 h-9"
            style={{ color: category.color }}
          />
        </div>
      </div>

      {/* Pollutant detail grid */}
      <div className="grid grid-cols-2 gap-2">
        {airQuality.pm2_5 !== undefined && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
            <Atom className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">PM2.5</p>
              <p className="text-xs font-semibold text-slate-200">
                {airQuality.pm2_5.toFixed(1)} <span className="text-[10px] text-slate-400">µg/m³</span>
              </p>
            </div>
          </div>
        )}

        {airQuality.pm10 !== undefined && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
            <Atom className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">PM10</p>
              <p className="text-xs font-semibold text-slate-200">
                {airQuality.pm10.toFixed(1)} <span className="text-[10px] text-slate-400">µg/m³</span>
              </p>
            </div>
          </div>
        )}

        {airQuality.ozone !== undefined && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
            <Atom className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">Ozone</p>
              <p className="text-xs font-semibold text-slate-200">
                {airQuality.ozone.toFixed(1)} <span className="text-[10px] text-slate-400">µg/m³</span>
              </p>
            </div>
          </div>
        )}

        {airQuality.nitrogenDioxide !== undefined && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
            <Atom className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">NO₂</p>
              <p className="text-xs font-semibold text-slate-200">
                {airQuality.nitrogenDioxide.toFixed(1)} <span className="text-[10px] text-slate-400">µg/m³</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Freshness + Source */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{freshness}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-500 hover:text-slate-400 transition-colors cursor-default" title="Data provided by Open-Meteo Air Quality API">
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Source: Open-Meteo AQ</span>
        </div>
      </div>
    </div>
  );
};
