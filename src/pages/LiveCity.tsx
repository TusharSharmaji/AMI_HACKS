import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Thermometer,
  Wind,
  Gauge,
  Car,
  AlertTriangle,
  Newspaper,
  RefreshCw,
  Clock,
  ExternalLink,
  Layers,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
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
  Radio,
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useCivicDataContext } from '../hooks/useCivicDataContext';
import { useTrafficData } from '../hooks/useTrafficData';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { usePoiData } from '../hooks/usePoiData';
import { MapView } from '../components/map/MapView';
import { getReports, REPORT_SAVED_EVENT } from '../services/reportService';
import { fetchCityNews, type NewsArticle } from '../services/newsService';
import type { CivicReportMeta } from '../types/report';
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, STATUS_LABELS } from '../types/report';
import { getAqiCategory, getWeatherCodeInfo, formatDataFreshness } from '../utils/civicDataUtils';
import { classifyCongestion, formatTravelTime } from '../services/trafficService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNewsDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatReportRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

function WeatherIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'Sun': return <Sun className={className} />;
    case 'Moon': return <Moon className={className} />;
    case 'Cloud': return <Cloud className={className} />;
    case 'CloudSun': return <CloudSun className={className} />;
    case 'CloudMoon': return <CloudMoon className={className} />;
    case 'CloudFog': return <CloudFog className={className} />;
    case 'CloudDrizzle': return <CloudDrizzle className={className} />;
    case 'CloudRain': return <CloudRain className={className} />;
    case 'CloudRainWind': return <CloudRainWind className={className} />;
    case 'CloudSnow': return <CloudSnow className={className} />;
    case 'CloudLightning': return <CloudLightning className={className} />;
    case 'Snowflake': return <Snowflake className={className} />;
    default: return <HelpCircle className={className} />;
  }
}

export const LiveCity: React.FC = () => {
  const { selectedLocation } = useLocation();

  // Civic environmental data (Weather & AQI)
  const {
    weather,
    airQuality,
    weatherLoading,
    airQualityLoading,
    weatherError,
    airQualityError,
    retryWeather,
    retryAirQuality,
    lastUpdated: civicLastUpdated,
  } = useCivicDataContext();

  // Traffic data
  const {
    traffic,
    loading: trafficLoading,
    error: trafficError,
    refresh: refreshTraffic,
    lastUpdated: trafficLastUpdated,
  } = useTrafficData();

  // City-wide traffic flow points
  const {
    trafficPoints,
    refresh: refreshCityTraffic,
  } = useCityTraffic();

  // Civic Points of Interest
  const {
    pois,
    filteredPois,
    refresh: refreshPois,
  } = usePoiData();

  // Citizen Reports state
  const [citizenReports, setCitizenReports] = useState<CivicReportMeta[]>(() => getReports());

  useEffect(() => {
    const handleStorage = () => setCitizenReports(getReports());

    const handleReportSaved = (e: Event) => {
      const newReport = (e as CustomEvent<CivicReportMeta>).detail;
      if (newReport) {
        setCitizenReports((prev) => {
          if (prev.some((r) => r.id === newReport.id)) return prev;
          return [newReport, ...prev];
        });
      } else {
        setCitizenReports(getReports());
      }
    };

    const handleFocus = () => setCitizenReports(getReports());

    window.addEventListener('storage', handleStorage);
    window.addEventListener(REPORT_SAVED_EVENT, handleReportSaved);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(REPORT_SAVED_EVENT, handleReportSaved);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // News state
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState<boolean>(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  // Manual refresh animation tracker
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<Date>(new Date());

  // Debounced news loader
  const loadNews = useCallback(async (cityName: string) => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetchCityNews(cityName);
      setNewsArticles(res.articles);
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : 'Unavailable');
      setNewsArticles([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cityName = selectedLocation?.name ?? 'New York City';
    const timer = setTimeout(() => {
      loadNews(cityName);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedLocation?.name, loadNews]);

  // Master refresh button
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setLastRefreshedTime(new Date());

    retryWeather();
    retryAirQuality();
    refreshTraffic();
    refreshCityTraffic();
    refreshPois();
    if (selectedLocation?.name) {
      loadNews(selectedLocation.name);
    }

    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Weather info calculations
  const weatherInfo = weather
    ? getWeatherCodeInfo(weather.weatherCode, weather.isDay)
    : null;

  // AQI calculations
  const aqiValue = airQuality?.usAqi ?? airQuality?.europeanAqi;
  const aqiCategory = getAqiCategory(airQuality?.usAqi);

  // Traffic classification
  const trafficClassification = traffic
    ? classifyCongestion(traffic.currentSpeed, traffic.freeFlowSpeed, traffic.roadClosure)
    : null;

  const trafficDelay = traffic
    ? Math.max(0, traffic.currentTravelTime - traffic.freeFlowTravelTime)
    : 0;

  // Active reports calculations
  const activeReports = useMemo(() => {
    return citizenReports.filter((r) => r.status !== 'RESOLVED');
  }, [citizenReports]);

  const criticalReports = useMemo(() => {
    return citizenReports.filter((r) => r.severity === 'Critical');
  }, [citizenReports]);

  // Latest 5 reports
  const latestFiveReports = useMemo(() => {
    return [...citizenReports]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5);
  }, [citizenReports]);

  // Latest 3 news articles
  const latestThreeArticles = useMemo(() => {
    return newsArticles.slice(0, 3);
  }, [newsArticles]);

  // Clean location subtitle
  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');

  // Formatted last updated string
  const displayLastUpdated = useMemo(() => {
    const d = civicLastUpdated || trafficLastUpdated || lastRefreshedTime;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [civicLastUpdated, trafficLastUpdated, lastRefreshedTime]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#07090e] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── HEADER ── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE CITY
              </span>
              <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                REAL-TIME OPERATIONS
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight flex items-baseline gap-2.5">
              <span>{selectedLocation.name}</span>
              {locationSubtitle && (
                <span className="text-xs sm:text-sm font-sans font-normal text-slate-400">
                  {locationSubtitle}
                </span>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live conditions and civic activity
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Last updated</p>
              <p className="text-xs font-mono text-slate-300 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                {displayLastUpdated}
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 hover:border-cyan-500/40 text-slate-200 hover:text-white transition-all shadow-panel-subtle disabled:opacity-50 group"
              title="Refresh all live data streams"
              aria-label="Refresh all live data streams"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 group-hover:rotate-180 transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* ── SUMMARY CARDS ── */}
        <section aria-label="Live City Summary Metrics">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">

            {/* 1. Temperature */}
            <div className="bg-command-950/80 border border-white/10 hover:border-cyan-500/30 rounded-2xl p-4 shadow-panel transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Temperature</span>
                <Thermometer className="w-4 h-4 text-cyan-400" />
              </div>
              {weatherLoading && !weather ? (
                <div className="py-2 flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Loading…</span>
                </div>
              ) : weather ? (
                <div>
                  <div className="text-2xl font-bold font-mono text-white tracking-tight">
                    {Math.round(weather.temperature)}°C
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    {weatherInfo?.description ?? 'Active'} · Feels {Math.round(weather.apparentTemperature)}°C
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-base font-bold font-mono text-slate-400">Unavailable</div>
                  <p className="text-[11px] text-slate-500 mt-1">Sensor offline</p>
                </div>
              )}
            </div>

            {/* 2. AQI */}
            <div className="bg-command-950/80 border border-white/10 hover:border-emerald-500/30 rounded-2xl p-4 shadow-panel transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Air Quality</span>
                <Gauge className="w-4 h-4 text-emerald-400" />
              </div>
              {airQualityLoading && !airQuality ? (
                <div className="py-2 flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span className="text-xs font-mono">Loading…</span>
                </div>
              ) : airQuality && aqiValue !== undefined ? (
                <div>
                  <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-2">
                    <span>{aqiValue}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">AQI</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: aqiCategory.color }}
                    />
                    <span className="truncate">{aqiCategory.label}</span>
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-base font-bold font-mono text-slate-400">Unavailable</div>
                  <p className="text-[11px] text-slate-500 mt-1">Index offline</p>
                </div>
              )}
            </div>

            {/* 3. Traffic */}
            <div className="bg-command-950/80 border border-white/10 hover:border-amber-500/30 rounded-2xl p-4 shadow-panel transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Traffic</span>
                <Car className="w-4 h-4 text-amber-400" />
              </div>
              {trafficLoading && !traffic ? (
                <div className="py-2 flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="text-xs font-mono">Loading…</span>
                </div>
              ) : traffic && trafficClassification ? (
                <div>
                  <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1.5">
                    <span>{traffic.currentSpeed}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-normal">km/h</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: trafficClassification.color }}
                    />
                    <span className="truncate">{trafficClassification.label}</span>
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-base font-bold font-mono text-slate-400">Unavailable</div>
                  <p className="text-[11px] text-slate-500 mt-1">Flow sensor offline</p>
                </div>
              )}
            </div>

            {/* 4. Active Reports */}
            <div className="bg-command-950/80 border border-white/10 hover:border-rose-500/30 rounded-2xl p-4 shadow-panel transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Active Reports</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-baseline gap-2">
                  <span>{activeReports.length}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">Active</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  {criticalReports.length > 0
                    ? `${criticalReports.length} Critical severity`
                    : `${citizenReports.length} total logged`}
                </p>
              </div>
            </div>

            {/* 5. Latest News */}
            <div className="bg-command-950/80 border border-white/10 hover:border-blue-500/30 rounded-2xl p-4 shadow-panel transition-all col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">Latest News</span>
                <Newspaper className="w-4 h-4 text-cyan-400" />
              </div>
              {newsLoading && newsArticles.length === 0 ? (
                <div className="py-2 flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Loading…</span>
                </div>
              ) : newsArticles.length > 0 ? (
                <div>
                  <a
                    href={newsArticles[0].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-slate-200 hover:text-cyan-300 transition-colors line-clamp-1 block leading-snug"
                    title={newsArticles[0].title}
                  >
                    {newsArticles[0].title}
                  </a>
                  <p className="text-[10px] font-mono text-slate-500 mt-1 truncate">
                    {newsArticles[0].domain} · {formatNewsDate(newsArticles[0].seendate)}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-base font-bold font-mono text-slate-400">Unavailable</div>
                  <p className="text-[11px] text-slate-500 mt-1">No headlines found</p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── MAIN: INTERACTIVE MAPLIBRE MAP ── */}
        <section aria-label="Interactive City Geospatial Map" className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                Interactive Geospatial Map
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                {trafficPoints.length} Traffic Nodes
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {pois.length} Civic POIs
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                {citizenReports.length} Reports
              </span>
            </div>
          </div>

          <div className="h-[440px] sm:h-[480px] lg:h-[520px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-hud relative bg-[#06080d]">
            <MapView
              cityTrafficPoints={trafficPoints}
              showTrafficMarkers={true}
              pois={filteredPois.length ? filteredPois : pois}
              showPois={true}
              citizenReports={citizenReports}
              showCitizenReports={true}
            />

            {/* Map floating status overlay */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
              <div className="bg-command-950/85 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-2 shadow-panel">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>MapLibre GL Vector Pipeline · {selectedLocation.name}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── CITY STATUS SECTION ── */}
        <section aria-label="City Status Details" className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                City Status
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Live multi-source urban telemetry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* 1. Air Quality Details */}
            <div className="bg-command-950/70 border border-white/10 rounded-2xl p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold font-mono text-white tracking-wide">
                    Air Quality
                  </h3>
                </div>
                {airQualityLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : airQuality ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatDataFreshness(airQuality.timestamp)}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 uppercase">Unavailable</span>
                )}
              </div>

              {airQualityLoading && !airQuality ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-xs font-mono">Connecting to Open-Meteo AQ sensors…</span>
                </div>
              ) : airQuality && aqiValue !== undefined ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">
                        {airQuality.usAqi !== undefined ? 'US AQI INDEX' : 'EUROPEAN AQI'}
                      </p>
                      <div className="text-3xl font-bold font-mono text-white tracking-tight">
                        {aqiValue}
                      </div>
                      <div className="mt-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide ${aqiCategory.bgColor} ${aqiCategory.textColor} border ${aqiCategory.borderColor}`}
                        >
                          {aqiCategory.label}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-2xl border ${aqiCategory.borderColor} ${aqiCategory.bgColor}`}>
                      <Gauge className="w-8 h-8" style={{ color: aqiCategory.color }} />
                    </div>
                  </div>

                  {/* Pollutant Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {airQuality.pm2_5 !== undefined && (
                      <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono block">PM2.5</span>
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {airQuality.pm2_5.toFixed(1)} <span className="text-[9px] text-slate-500">µg/m³</span>
                        </span>
                      </div>
                    )}
                    {airQuality.pm10 !== undefined && (
                      <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono block">PM10</span>
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {airQuality.pm10.toFixed(1)} <span className="text-[9px] text-slate-500">µg/m³</span>
                        </span>
                      </div>
                    )}
                    {airQuality.ozone !== undefined && (
                      <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono block">Ozone (O₃)</span>
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {airQuality.ozone.toFixed(1)} <span className="text-[9px] text-slate-500">µg/m³</span>
                        </span>
                      </div>
                    )}
                    {airQuality.nitrogenDioxide !== undefined && (
                      <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono block">NO₂</span>
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {airQuality.nitrogenDioxide.toFixed(1)} <span className="text-[9px] text-slate-500">µg/m³</span>
                        </span>
                      </div>
                    )}
                    {airQuality.carbonMonoxide !== undefined && (
                      <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                        <span className="text-[10px] text-slate-400 font-mono block">CO</span>
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {airQuality.carbonMonoxide.toFixed(1)} <span className="text-[9px] text-slate-500">µg/m³</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                  <AlertCircle className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-mono text-slate-400">Air quality data unavailable</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    {airQualityError || 'No live monitoring sensors found for these coordinates.'}
                  </p>
                  <button
                    onClick={retryAirQuality}
                    className="mt-2 text-xs font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry sensor connection
                  </button>
                </div>
              )}
            </div>

            {/* 2. Traffic Details */}
            <div className="bg-command-950/70 border border-white/10 rounded-2xl p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold font-mono text-white tracking-wide">
                    TomTom Traffic Flow
                  </h3>
                </div>
                {trafficLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : traffic ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    {trafficLastUpdated ? `Updated ${trafficLastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Live'}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 uppercase">Unavailable</span>
                )}
              </div>

              {trafficLoading && !traffic ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Querying TomTom Traffic Flow API…</span>
                </div>
              ) : traffic && trafficClassification ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">
                        CURRENT VELOCITY
                      </p>
                      <div className="text-3xl font-bold font-mono text-white tracking-tight flex items-baseline gap-1.5">
                        <span>{traffic.currentSpeed}</span>
                        <span className="text-xs font-normal text-slate-400">km/h</span>
                      </div>
                      <div className="mt-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wide ${trafficClassification.bgColor} ${trafficClassification.textColor} border ${trafficClassification.borderColor}`}
                        >
                          {trafficClassification.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">
                        FREE FLOW BASELINE
                      </p>
                      <div className="text-xl font-bold font-mono text-slate-300">
                        {traffic.freeFlowSpeed} <span className="text-xs text-slate-500">km/h</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        Confidence: {Math.round(traffic.confidence * 100)}%
                      </p>
                    </div>
                  </div>

                  {/* Flow comparison meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Flow Velocity Ratio</span>
                      <span>
                        {traffic.freeFlowSpeed > 0
                          ? `${Math.round((traffic.currentSpeed / traffic.freeFlowSpeed) * 100)}% of speed limit`
                          : 'Normal'}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, traffic.freeFlowSpeed > 0 ? (traffic.currentSpeed / traffic.freeFlowSpeed) * 100 : 100)}%`,
                          backgroundColor: trafficClassification.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Travel Time</span>
                      <span className="text-slate-200 font-semibold">{formatTravelTime(traffic.currentTravelTime)}</span>
                      {trafficDelay > 0 && (
                        <span className="text-[10px] text-amber-400 block">
                          +{formatTravelTime(trafficDelay)} delay
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Road Status</span>
                      <span className={`font-semibold ${traffic.roadClosure ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {traffic.roadClosure ? 'Road Closed' : 'Open Corridor'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                  <Car className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-mono text-slate-400">Traffic data unavailable</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    {trafficError || 'No live arterial flow segment mapped for this specific area.'}
                  </p>
                  <button
                    onClick={refreshTraffic}
                    className="mt-2 text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry traffic flow
                  </button>
                </div>
              )}
            </div>

            {/* 3. Weather Details */}
            <div className="bg-command-950/70 border border-white/10 rounded-2xl p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold font-mono text-white tracking-wide">
                    Weather Conditions
                  </h3>
                </div>
                {weatherLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : weather ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    {formatDataFreshness(weather.timestamp)}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-rose-400 uppercase">Unavailable</span>
                )}
              </div>

              {weatherLoading && !weather ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Fetching Open-Meteo weather telemetry…</span>
                </div>
              ) : weather && weatherInfo ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">
                        OBSERVED TEMPERATURE
                      </p>
                      <div className="text-3xl font-bold font-mono text-white tracking-tight">
                        {Math.round(weather.temperature)}°C
                      </div>
                      <p className="text-xs text-slate-300 mt-1 font-medium">
                        {weatherInfo.description}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        Feels like {Math.round(weather.apparentTemperature)}°C
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-command-900/80 border border-white/10 text-cyan-400">
                      <WeatherIcon name={weatherInfo.iconName} className="w-8 h-8" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Humidity</span>
                      <span className="text-slate-200 font-semibold">{weather.humidity}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Wind Speed</span>
                      <span className="text-slate-200 font-semibold">{weather.windSpeed} <span className="text-[9px] text-slate-500">km/h</span></span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-command-900/60 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Rainfall</span>
                      <span className="text-slate-200 font-semibold">{weather.precipitation ?? 0} <span className="text-[9px] text-slate-500">mm</span></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                  <Cloud className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-mono text-slate-400">Weather data unavailable</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    {weatherError || 'No meteorological telemetry available for this location.'}
                  </p>
                  <button
                    onClick={retryWeather}
                    className="mt-2 text-xs font-mono text-cyan-400 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry weather stream
                  </button>
                </div>
              )}
            </div>

            {/* 4. Active Civic Issues */}
            <div className="bg-command-950/70 border border-white/10 rounded-2xl p-5 shadow-panel space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold font-mono text-white tracking-wide">
                    Active Civic Issues
                  </h3>
                </div>
                <Link
                  to="/report-issue"
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <span>+ File Issue</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <span className="text-3xl font-bold font-mono text-white tracking-tight">
                      {activeReports.length}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-2">unresolved issues</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {citizenReports.length} total logged
                  </span>
                </div>

                {/* Workflow status distribution */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-xl bg-command-900/60 border border-white/5">
                    <span className="text-[10px] text-blue-400 font-semibold block">NEW</span>
                    <span className="text-base font-bold text-white">
                      {citizenReports.filter((r) => r.status === 'NEW').length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-command-900/60 border border-white/5">
                    <span className="text-[10px] text-amber-400 font-semibold block">ASSIGNED</span>
                    <span className="text-base font-bold text-white">
                      {citizenReports.filter((r) => r.status === 'ASSIGNED').length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-command-900/60 border border-white/5">
                    <span className="text-[10px] text-cyan-400 font-semibold block">IN PROGRESS</span>
                    <span className="text-base font-bold text-white">
                      {citizenReports.filter((r) => r.status === 'IN_PROGRESS').length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-command-900/60 border border-white/5">
                    <span className="text-[10px] text-emerald-400 font-semibold block">RESOLVED</span>
                    <span className="text-base font-bold text-white">
                      {citizenReports.filter((r) => r.status === 'RESOLVED').length}
                    </span>
                  </div>
                </div>

                {/* Severity Breakdown Strip */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-slate-500">Severity split:</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {citizenReports.filter((r) => r.severity === 'Critical').length} Critical
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {citizenReports.filter((r) => r.severity === 'High').length} High
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {citizenReports.filter((r) => r.severity === 'Medium' || r.severity === 'Low').length} Med/Low
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── RECENT CIVIC ACTIVITY (LATEST 5 REPORTS) ── */}
        <section aria-label="Recent Civic Activity" className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  Recent Civic Activity
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Latest 5 reports with issue, severity, location and status
              </p>
            </div>

            <Link
              to="/municipal-command"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <span>Command View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {latestFiveReports.length > 0 ? (
            <div className="grid grid-cols-1 gap-2.5">
              {latestFiveReports.map((report) => {
                const severityColor = SEVERITY_COLORS[report.severity] || '#94a3b8';
                const issueLabel = ISSUE_TYPE_LABELS[report.issueType] || report.issueType;
                const locationLabel = report.location.address ||
                  (report.location.latitude && report.location.longitude
                    ? `${report.location.latitude.toFixed(4)}, ${report.location.longitude.toFixed(4)}`
                    : 'Unavailable');

                return (
                  <div
                    key={report.id}
                    className="bg-command-950/70 hover:bg-command-900/80 border border-white/5 hover:border-white/15 rounded-xl p-3.5 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: severityColor }}
                        title={`Severity: ${report.severity}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-white truncate">
                            {issueLabel}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                            style={{
                              color: severityColor,
                              borderColor: `${severityColor}40`,
                              backgroundColor: `${severityColor}15`,
                            }}
                          >
                            {report.severity}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ID: {report.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{locationLabel}</span>
                          <span className="text-slate-600">·</span>
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{formatReportRelativeTime(report.submittedAt)}</span>
                        </div>

                        {report.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-sans">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-white/5 border border-white/10 text-slate-300">
                        {STATUS_LABELS[report.status] || report.status}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Dept: {report.department || 'Civic Operations'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-command-950/70 border border-white/10 rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/80 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-mono text-slate-200">No civic reports filed for this city</p>
                <p className="text-xs text-slate-500">
                  Municipal logs indicate no open infrastructure anomalies in {selectedLocation.name}.
                </p>
              </div>
              <Link
                to="/report-issue"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors"
              >
                + Submit First Report
              </Link>
            </div>
          )}
        </section>

        {/* ── CITY NEWS (LATEST 3 ARTICLES) ── */}
        <section aria-label="City News" className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1">
            <div>
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
                  City News
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Latest 3 articles for {selectedLocation.name} from live GDELT streams
              </p>
            </div>

            <Link
              to="/city-news"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <span>View All News</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {newsLoading && newsArticles.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="bg-command-950/70 border border-white/5 rounded-2xl p-4 space-y-3 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-14 bg-white/5 rounded w-full" />
                </div>
              ))}
            </div>
          ) : latestThreeArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {latestThreeArticles.map((article, index) => (
                <a
                  key={`${article.url}-${index}`}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-command-950/70 hover:bg-command-900/80 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 shadow-panel transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span className="truncate text-slate-400 font-semibold">{article.domain}</span>
                      <span className="shrink-0">{formatNewsDate(article.seendate)}</span>
                    </div>

                    <h3 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h3>

                    {article.snippet && (
                      <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                        {article.snippet}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-cyan-400">
                    <span>Read source coverage</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-command-950/70 border border-white/10 rounded-2xl p-6 text-center space-y-2">
              <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-mono text-slate-400">News headlines unavailable</p>
              <p className="text-[11px] text-slate-500">
                {newsError || `No news articles recorded for ${selectedLocation.name} in the past 48 hours.`}
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
