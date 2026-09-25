import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudLightning,
  Snowflake,
  HelpCircle,
  Droplets,
  Wind,
  Thermometer,
  RefreshCw,
  AlertCircle,
  Loader2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { WeatherData } from '../../types/weather';
import { getWeatherCodeInfo, formatDataFreshness } from '../../utils/civicDataUtils';

interface WeatherPanelProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Map Lucide icon names to actual components */
function WeatherIcon({ name, className }: { name: string; className?: string }) {
  const props = { className: className || 'w-8 h-8' };
  switch (name) {
    case 'Sun': return <Sun {...props} />;
    case 'Moon': return <Moon {...props} />;
    case 'Cloud': return <Cloud {...props} />;
    case 'CloudSun': return <CloudSun {...props} />;
    case 'CloudMoon': return <CloudMoon {...props} />;
    case 'CloudFog': return <CloudFog {...props} />;
    case 'CloudDrizzle': return <CloudDrizzle {...props} />;
    case 'CloudRain': return <CloudRain {...props} />;
    case 'CloudRainWind': return <CloudRainWind {...props} />;
    case 'CloudSnow': return <CloudSnow {...props} />;
    case 'CloudLightning': return <CloudLightning {...props} />;
    case 'Snowflake': return <Snowflake {...props} />;
    default: return <HelpCircle {...props} />;
  }
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({
  weather,
  loading,
  error,
  onRetry,
}) => {
  // Loading state
  if (loading && !weather) {
    return (
      <div className="bg-command-950/70 border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Weather
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Loading weather data…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !weather) {
    return (
      <div className="bg-command-950/70 border border-red-900/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Weather
          </h3>
        </div>
        <div className="flex flex-col items-center gap-3 py-6">
          <AlertCircle className="w-8 h-8 text-red-400/80" />
          <p className="text-xs text-slate-400 text-center max-w-[220px]">
            Unable to load current weather
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-command-800 hover:bg-command-700 border border-white/10 text-xs font-mono text-cyan-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const weatherInfo = getWeatherCodeInfo(weather.weatherCode, weather.isDay);
  const freshness = formatDataFreshness(weather.timestamp);

  return (
    <div className="bg-command-950/70 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Weather
          </h3>
        </div>
        {loading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        )}
      </div>

      {/* Main temperature + condition */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-3xl font-bold text-white tracking-tight leading-none">
            {Math.round(weather.temperature)}°
          </div>
          <p className="text-sm text-slate-300 mt-1">
            {weatherInfo.description}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Feels like {Math.round(weather.apparentTemperature)}°C
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-command-800/60 border border-white/5">
          <WeatherIcon
            name={weatherInfo.iconName}
            className="w-9 h-9 text-cyan-300"
          />
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
          <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">Humidity</p>
            <p className="text-xs font-semibold text-slate-200">{weather.humidity}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5">
          <Wind className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-mono">Wind</p>
            <p className="text-xs font-semibold text-slate-200">{weather.windSpeed} km/h</p>
          </div>
        </div>

        {weather.precipitation > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-command-900/60 border border-white/5 col-span-2">
            <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">Precipitation</p>
              <p className="text-xs font-semibold text-slate-200">{weather.precipitation} mm</p>
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
        <div className="flex items-center gap-1 text-slate-500 hover:text-slate-400 transition-colors cursor-default" title="Data provided by Open-Meteo Weather API">
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Source: Open-Meteo</span>
        </div>
      </div>
    </div>
  );
};
