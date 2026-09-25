import React from 'react';
import {
  Activity,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Loader2,
  Car,
} from 'lucide-react';
import type { WeatherData } from '../../types/weather';
import type { AirQualityData } from '../../types/airQuality';
import type { TrafficSegmentData } from '../../types/traffic';
import { getAqiCategory, getWeatherCodeInfo } from '../../utils/civicDataUtils';
import { classifyCongestion } from '../../services/trafficService';

interface LiveConditionsSummaryProps {
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  traffic?: TrafficSegmentData | null;
  weatherLoading: boolean;
  airQualityLoading: boolean;
  trafficLoading?: boolean;
}

export const LiveConditionsSummary: React.FC<LiveConditionsSummaryProps> = ({
  weather,
  airQuality,
  traffic = null,
  weatherLoading,
  airQualityLoading,
  trafficLoading = false,
}) => {
  const isLoading =
    (weatherLoading && !weather) ||
    (airQualityLoading && !airQuality) ||
    (trafficLoading && !traffic);
  const hasData = weather || airQuality || traffic;

  if (isLoading && !hasData) {
    return (
      <div className="bg-command-950/70 border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Live Conditions
          </h3>
        </div>
        <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Fetching live data…</span>
        </div>
      </div>
    );
  }

  if (!hasData) return null;

  const aqiValue = airQuality?.usAqi ?? airQuality?.europeanAqi;
  const aqiCategory = getAqiCategory(airQuality?.usAqi);
  const weatherDesc = weather
    ? getWeatherCodeInfo(weather.weatherCode, weather.isDay).description
    : null;

  const trafficClassification = traffic
    ? classifyCongestion(traffic.currentSpeed, traffic.freeFlowSpeed, traffic.roadClosure)
    : null;

  return (
    <div className="bg-command-950/70 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
          Live Conditions
        </h3>
        <span className="flex h-1.5 w-1.5 relative ml-auto">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {weather && (
          <>
            <div className="flex items-center gap-2">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Temp</p>
                <p className="text-sm font-bold text-white">{Math.round(weather.temperature)}°C</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Humidity</p>
                <p className="text-sm font-bold text-white">{weather.humidity}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Wind className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Wind</p>
                <p className="text-sm font-bold text-white">{weather.windSpeed} km/h</p>
              </div>
            </div>
          </>
        )}

        {aqiValue !== undefined && (
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 shrink-0" style={{ color: aqiCategory.color }} />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">AQI</p>
              <p className="text-sm font-bold text-white">{aqiValue}</p>
            </div>
          </div>
        )}

        {traffic && trafficClassification && (
          <div className="flex items-center gap-2">
            <Car className="w-3.5 h-3.5 shrink-0" style={{ color: trafficClassification.color }} />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono">Road Flow</p>
              <p className="text-sm font-bold text-white">
                {traffic.currentSpeed} <span className="text-[10px] text-slate-400 font-normal">km/h</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Summary Line */}
      {(weatherDesc || aqiValue !== undefined || trafficClassification) && (
        <p className="mt-2.5 text-[11px] text-slate-400 font-mono">
          {weatherDesc && `Weather: ${weatherDesc}`}
          {aqiValue !== undefined && ` · AQI: ${aqiCategory.label}`}
          {trafficClassification && ` · Traffic: ${trafficClassification.label}`}
        </p>
      )}
    </div>
  );
};
