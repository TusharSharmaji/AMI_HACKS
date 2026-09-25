import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  History,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  Clock,
  Thermometer,
  Wind,
  Car,
  AlertTriangle,
  Info,
  Layers,
  Calendar,
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useCivicDataContext } from '../hooks/useCivicDataContext';
import { useTrafficData } from '../hooks/useTrafficData';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { getReports } from '../services/reportService';
import { getWeatherCodeInfo } from '../utils/civicDataUtils';
import {
  getCityObservations,
  recordObservation,
  OBSERVATION_RECORDED_EVENT,
} from '../services/observationService';
import type { CityObservation } from '../types/observation';
import { ReplayMap } from '../components/map/ReplayMap';

export const CityReplay: React.FC = () => {
  const { selectedLocation } = useLocation();
  const cityIdStr = String(selectedLocation.id || 'default');

  // ── Live Context Data ──
  const { weather, airQuality } = useCivicDataContext();
  const { traffic } = useTrafficData();
  const { trafficPoints } = useCityTraffic();

  // ── Record live observation automatically when data is fetched ──
  useEffect(() => {
    if (selectedLocation && weather) {
      const reports = getReports();
      const codeInfo = getWeatherCodeInfo(weather.weatherCode, weather.isDay);
      recordObservation({
        cityId: cityIdStr,
        cityName: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        weather: {
          temperature: weather.temperature,
          precipitation: weather.precipitation || 0,
          windSpeed: weather.windSpeed,
          humidity: weather.humidity,
          weatherCode: weather.weatherCode,
          description: codeInfo.description,
        },
        airQuality: airQuality
          ? {
              aqi: airQuality.usAqi ?? airQuality.europeanAqi ?? 50,
              pm2_5: airQuality.pm2_5,
              pm10: airQuality.pm10,
              category: 'Baseline',
            }
          : undefined,
        traffic: {
          averageSpeed: traffic?.currentSpeed ?? 35,
          congestionPercentage: traffic?.congestionPercentage ?? 20,
          sampleCount: trafficPoints.length,
          severeCount: trafficPoints.filter((p) => p.condition === 'Severe').length,
          closureCount: trafficPoints.filter((p) => p.roadClosure).length,
        },
        civic: {
          totalReports: reports.length,
          activeReports: reports.filter((r) => r.status !== 'RESOLVED').length,
          criticalReports: reports.filter((r) => r.severity === 'Critical' && r.status !== 'RESOLVED').length,
          highReports: reports.filter((r) => r.severity === 'High' && r.status !== 'RESOLVED').length,
        },
      });
    }
  }, [selectedLocation, cityIdStr, weather, airQuality, traffic, trafficPoints]);

  // ── Snapshots History State ──
  const [snapshots, setSnapshots] = useState<CityObservation[]>(() =>
    getCityObservations(cityIdStr)
  );

  const refreshSnapshots = () => {
    setSnapshots(getCityObservations(cityIdStr));
  };

  useEffect(() => {
    refreshSnapshots();
    const handleRecorded = () => refreshSnapshots();
    window.addEventListener(OBSERVATION_RECORDED_EVENT, handleRecorded);
    window.addEventListener('storage', handleRecorded);
    return () => {
      window.removeEventListener(OBSERVATION_RECORDED_EVENT, handleRecorded);
      window.removeEventListener('storage', handleRecorded);
    };
  }, [cityIdStr]);

  // ── Replay Player State ──
  const [isLiveMode, setIsLiveMode] = useState<boolean>(true);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playbackTimerRef = useRef<any>(null);

  // Sync index when city or snapshots change
  useEffect(() => {
    if (snapshots.length > 0) {
      setSelectedIndex(snapshots.length - 1);
    }
    setIsPlaying(false);
  }, [cityIdStr, snapshots.length]);

  // Active observation: either selected snapshot or live mode fallback
  const activeObservation: CityObservation | null = useMemo(() => {
    if (isLiveMode || snapshots.length === 0) {
      const codeInfo = weather ? getWeatherCodeInfo(weather.weatherCode, weather.isDay) : null;
      return {
        id: 'live-current',
        timestamp: new Date().toISOString(),
        cityId: cityIdStr,
        cityName: selectedLocation.name,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        weather: weather
          ? {
              temperature: weather.temperature,
              precipitation: weather.precipitation || 0,
              windSpeed: weather.windSpeed,
              humidity: weather.humidity,
              weatherCode: weather.weatherCode,
              description: codeInfo?.description || 'Live Stream',
            }
          : undefined,
        airQuality: airQuality
          ? {
              aqi: airQuality.usAqi ?? airQuality.europeanAqi ?? 50,
              pm2_5: airQuality.pm2_5,
              pm10: airQuality.pm10,
              category: 'Live Stream',
            }
          : undefined,
        traffic: {
          averageSpeed: traffic?.currentSpeed ?? 35,
          congestionPercentage: traffic?.congestionPercentage ?? 20,
          sampleCount: trafficPoints.length,
          severeCount: trafficPoints.filter((p) => p.condition === 'Severe').length,
          closureCount: trafficPoints.filter((p) => p.roadClosure).length,
        },
        civic: {
          totalReports: getReports().length,
          activeReports: getReports().filter((r) => r.status !== 'RESOLVED').length,
          criticalReports: getReports().filter((r) => r.severity === 'Critical' && r.status !== 'RESOLVED').length,
          highReports: getReports().filter((r) => r.severity === 'High' && r.status !== 'RESOLVED').length,
        },
      };
    }

    const safeIdx = Math.max(0, Math.min(snapshots.length - 1, selectedIndex));
    return snapshots[safeIdx];
  }, [isLiveMode, snapshots, selectedIndex, selectedLocation, weather, airQuality, traffic, trafficPoints]);

  // Playback timer handling
  useEffect(() => {
    if (isPlaying && snapshots.length > 1) {
      const intervalMs = Math.max(250, 1500 / playbackSpeed);
      playbackTimerRef.current = setInterval(() => {
        setSelectedIndex((prev) => {
          if (prev >= snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, snapshots.length]);

  const handleTogglePlay = () => {
    if (snapshots.length <= 1) return;
    setIsLiveMode(false);
    if (selectedIndex >= snapshots.length - 1) {
      setSelectedIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepBack = () => {
    setIsLiveMode(false);
    setIsPlaying(false);
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsLiveMode(false);
    setIsPlaying(false);
    setSelectedIndex((prev) => Math.min(snapshots.length - 1, prev + 1));
  };

  const handleGoLive = () => {
    setIsPlaying(false);
    setIsLiveMode(true);
    if (snapshots.length > 0) {
      setSelectedIndex(snapshots.length - 1);
    }
  };

  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#07090e] select-none text-slate-100 p-4 md:p-6 font-sans space-y-6">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              CITY REPLAY
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isLiveMode
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
              }`}
            >
              <Radio className={`w-3 h-3 ${isLiveMode ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              {isLiveMode ? 'LIVE STREAM' : 'RECORDED OBSERVATION REPLAY'}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold font-mono text-white tracking-tight leading-tight">
            {selectedLocation.name} Temporal Replay Timeline
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {locationSubtitle} · Explore recorded CityPulse observations over time
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleGoLive}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
              isLiveMode
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md'
                : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>LIVE</span>
          </button>
        </div>
      </div>

      {/* ── REPLAY CONTROL BAR ── */}
      <div className="bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleStepBack}
            disabled={snapshots.length <= 1 || selectedIndex <= 0}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-40"
            title="Step Back"
          >
            <SkipBack className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={handleTogglePlay}
            disabled={snapshots.length <= 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold transition-all disabled:opacity-40"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 text-cyan-400" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-cyan-400" /> Play Timeline
              </>
            )}
          </button>

          <button
            onClick={handleStepForward}
            disabled={snapshots.length <= 1 || selectedIndex >= snapshots.length - 1}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-40"
            title="Step Forward"
          >
            <SkipForward className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 px-2 uppercase font-bold">Speed:</span>
          {[0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                playbackSpeed === spd
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Counter Info */}
        <div className="text-[11px] text-slate-300 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {snapshots.length === 0
              ? 'No historical snapshots recorded yet'
              : `${snapshots.length} recorded observation(s) available`}
          </span>
        </div>
      </div>

      {/* ── MAIN GRID: REPLAY MAP (LEFT 8) + OBSERVATION DASHBOARD (RIGHT 4) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: MAP (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col h-[480px] lg:h-[540px] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="flex items-center gap-2 font-semibold text-white uppercase tracking-wider">
              <Layers className="w-4 h-4 text-cyan-400" />
              Archival Replay Map
            </span>
            <span>
              {activeObservation ? new Date(activeObservation.timestamp).toLocaleString() : 'Live'}
            </span>
          </div>

          <ReplayMap observation={activeObservation} />
        </div>

        {/* RIGHT: RECORDED OBSERVATION DASHBOARD (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4 font-mono text-xs">
          {/* Observation Details Card */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Selected Observation
                </span>
                <div className="text-white font-bold text-sm mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  {activeObservation
                    ? new Date(activeObservation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Current Live'}
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${
                  activeObservation?.risk?.score && activeObservation.risk.score >= 60
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                }`}
              >
                Risk Score: {activeObservation?.risk?.score ?? 'Nominal'}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" /> Temp
                </span>
                <div className="text-lg font-bold text-white">
                  {activeObservation?.weather?.temperature != null
                    ? `${Math.round(activeObservation.weather.temperature)}°C`
                    : '—'}
                </div>
              </div>

              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                  <Wind className="w-3 h-3 text-emerald-400" /> AQI
                </span>
                <div className="text-lg font-bold text-white">
                  {activeObservation?.airQuality?.aqi ?? '—'}
                </div>
              </div>

              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                  <Car className="w-3 h-3 text-cyan-400" /> Traffic Flow
                </span>
                <div className="text-lg font-bold text-white">
                  {activeObservation?.traffic?.averageSpeed != null
                    ? `${activeObservation.traffic.averageSpeed} km/h`
                    : '—'}
                </div>
              </div>

              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 space-y-1">
                <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-400" /> Active Reports
                </span>
                <div className="text-lg font-bold text-white">
                  {activeObservation?.civic?.activeReports ?? 0}
                </div>
              </div>
            </div>

            {/* Description / Summary */}
            <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl text-[11px] text-slate-300 leading-relaxed">
              <span className="text-[9px] text-slate-400 uppercase block font-bold mb-1">
                Telemetry Summary
              </span>
              Weather: {activeObservation?.weather?.description || 'Nominal'} ·
              AQI: {activeObservation?.airQuality?.category || 'Standard'} ·
              Traffic Points: {activeObservation?.traffic?.sampleCount || 0} monitored
            </div>
          </div>

          {/* Empty State Banner if 0 or 1 snapshot */}
          {snapshots.length <= 1 && (
            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-2 backdrop-blur-md">
              <div className="flex items-center gap-2 font-bold text-cyan-300">
                <Info className="w-4 h-4 shrink-0" />
                <span>City Replay Timeline Building</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                City Replay is building your city's timeline. Historical observations will appear as CityPulse records live conditions over time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM TIMELINE SCRUBBER ── */}
      {snapshots.length > 0 && (
        <div className="bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Recorded Timeline Scrubber
            </span>
            <span className="text-cyan-300 font-bold">
              Observation {selectedIndex + 1} of {snapshots.length}
            </span>
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min={0}
            max={snapshots.length - 1}
            value={selectedIndex}
            onChange={(e) => {
              setIsLiveMode(false);
              setIsPlaying(false);
              setSelectedIndex(parseInt(e.target.value, 10));
            }}
            className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
          />

          {/* Timestamps Labels */}
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>First: {new Date(snapshots[0].timestamp).toLocaleTimeString()}</span>
            <span>
              Selected: {new Date(snapshots[selectedIndex]?.timestamp || Date.now()).toLocaleTimeString()}
            </span>
            <span>Latest: {new Date(snapshots[snapshots.length - 1].timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
