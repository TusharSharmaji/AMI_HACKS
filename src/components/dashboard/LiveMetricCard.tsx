import React from 'react';
import { Sun, Wind, Car, AlertTriangle } from 'lucide-react';

interface LiveMetricCardProps {
  weather: {
    temperature: number | null;
    feelsLike?: number | null;
    condition: string;
  };
  airQuality: {
    aqi: number | null;
    category: string;
  };
  traffic: {
    speed: number | null;
    condition: string;
  };
  civicReports: {
    activeCount: number;
  };
}

export const LiveMetricCard: React.FC<LiveMetricCardProps> = ({
  weather,
  airQuality,
  traffic,
  civicReports,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full select-none">
      {/* 1. WEATHER CARD (Yellow / Amber Accent) */}
      <div className="relative bg-gradient-to-br from-command-950/90 via-command-900/90 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 shadow-hud backdrop-blur-md overflow-hidden group hover:border-amber-500/60 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-500" />
            WEATHER
          </span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold font-sans text-white tracking-tight">
              {weather.temperature !== null ? `${weather.temperature}°C` : '—'}
            </div>
            <div className="text-xs font-medium text-amber-200/90 mt-1 capitalize">
              {weather.condition}
            </div>
          </div>
          {weather.feelsLike !== undefined && weather.feelsLike !== null && (
            <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              Feels {Math.round(weather.feelsLike)}°C
            </span>
          )}
        </div>
      </div>

      {/* 2. AIR QUALITY CARD (Green / Emerald Accent) */}
      <div className="relative bg-gradient-to-br from-command-950/90 via-command-900/90 to-emerald-950/20 border border-emerald-500/30 rounded-2xl p-5 shadow-hud backdrop-blur-md overflow-hidden group hover:border-emerald-500/60 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            AIR QUALITY
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold font-sans text-white tracking-tight">
              {airQuality.aqi !== null ? airQuality.aqi : '—'}
              <span className="text-xs font-normal text-slate-400 ml-1">AQI</span>
            </div>
            <div className="text-xs font-medium text-emerald-200/90 mt-1">
              {airQuality.category}
            </div>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-bold">
            Live Stream
          </span>
        </div>
      </div>

      {/* 3. TRAFFIC FLOW CARD (Coral / Red Accent) */}
      <div className="relative bg-gradient-to-br from-command-950/90 via-command-900/90 to-red-950/20 border border-red-500/30 rounded-2xl p-5 shadow-hud backdrop-blur-md overflow-hidden group hover:border-red-500/60 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            TRAFFIC FLOW
          </span>
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold font-sans text-white tracking-tight">
              {traffic.speed !== null ? `${traffic.speed} km/h` : '—'}
            </div>
            <div className="text-xs font-medium text-red-200/90 mt-1">
              {traffic.condition}
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            TomTom Grid
          </span>
        </div>
      </div>

      {/* 4. CIVIC REPORTS CARD (Pink / Rose Accent) */}
      <div className="relative bg-gradient-to-br from-command-950/90 via-command-900/90 to-rose-950/20 border border-rose-500/30 rounded-2xl p-5 shadow-hud backdrop-blur-md overflow-hidden group hover:border-rose-500/60 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform" />
            CIVIC REPORTS
          </span>
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl lg:text-4xl font-extrabold font-sans text-white tracking-tight">
              {civicReports.activeCount}
            </div>
            <div className="text-xs font-medium text-rose-200/90 mt-1">
              Active civic incidents
            </div>
          </div>
          <span className="text-[11px] font-mono text-rose-300 bg-rose-500/15 px-2.5 py-1 rounded-lg border border-rose-500/30 font-bold">
            Portal Intake
          </span>
        </div>
      </div>
    </div>
  );
};
