import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sun, Wind, Car, AlertTriangle, Activity, ArrowRight,
  TrendingDown, MapPin, Radio, Sparkles,
  Box, FlaskConical, History, ShieldAlert, Building2,
  MessageSquareCode, Newspaper, Settings, ChevronDown,
} from 'lucide-react';
import { MapView } from '../components/map/MapView';
import { getReports, REPORT_SAVED_EVENT } from '../services/reportService';
import type { CivicReportMeta } from '../types/report';
import { useLocation } from '../hooks/useLocation';
import { useCivicDataContext } from '../hooks/useCivicDataContext';
import { useTrafficData } from '../hooks/useTrafficData';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { usePoiData } from '../hooks/usePoiData';
import { useMapLayers } from '../context/MapLayersContext';
import { getWeatherCodeInfo, getAqiCategory } from '../utils/civicDataUtils';
import { calculateRiskAssessment } from '../services/riskEngine';
import { useCityPulseSignals } from '../hooks/useCityPulseSignals';
import { CityPulseSignalsCard } from '../components/dashboard/CityPulseSignalsCard';


// ─── Helper: Risk level to gauge color ───────────────────────────────────────
function riskLevelColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'ELEVATED': return '#f59e0b';
    case 'GUARDED': return '#eab308';
    case 'LOW': return '#22c55e';
    default: return '#eab308';
  }
}

// ─── Donut Chart for City Health Score ───────────────────────────────────────
const DonutGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = riskLevelColor(level);
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
      {/* Track */}
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
      {/* Filled arc */}
      <circle
        cx="65" cy="65" r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      {/* Center text */}
      <text x="65" y="58" textAnchor="middle" fill="white" fontSize="22" fontWeight="800" fontFamily="Inter,sans-serif">{score}</text>
      <text x="65" y="74" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11" fontFamily="Inter,sans-serif">/ 100</text>
      <text x="65" y="88" textAnchor="middle" fill={color} fontSize="10" fontWeight="700" fontFamily="Inter,sans-serif">{level}</text>
    </svg>
  );
};


// ─── Feature Module Definitions ───────────────────────────────────────────────
const MODULES = [
  {
    id: 'live-city', name: 'Live City', path: '/live-city',
    description: 'Real-time city status, weather, air quality & traffic',
    icon: Activity,
    bg: 'from-teal-600/80 to-teal-900/90',
    accent: 'border-teal-500/40',
    iconBg: 'bg-teal-500/20',
    iconColor: 'text-teal-300',
  },
  {
    id: 'digital-twin', name: 'Digital Twin', path: '/digital-twin',
    description: "Explore the city's 3D environment",
    icon: Box,
    bg: 'from-blue-600/80 to-blue-900/90',
    accent: 'border-blue-500/40',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-300',
  },
  {
    id: 'risk-intelligence', name: 'Risk Intelligence', path: '/risk-intelligence',
    description: 'Understand current civic & environmental risks',
    icon: ShieldAlert,
    bg: 'from-red-600/80 to-red-900/90',
    accent: 'border-red-500/40',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-300',
  },
  {
    id: 'scenario-lab', name: 'Scenario Lab', path: '/scenario-lab',
    description: 'Explore "what-if" city scenarios',
    icon: FlaskConical,
    bg: 'from-purple-600/80 to-purple-900/90',
    accent: 'border-purple-500/40',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-300',
  },
  {
    id: 'city-replay', name: 'City Replay', path: '/city-replay',
    description: 'Explore recorded city conditions',
    icon: History,
    bg: 'from-amber-600/80 to-amber-900/90',
    accent: 'border-amber-500/40',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
  },
  {
    id: 'report-issue', name: 'Report Issue', path: '/report-issue',
    description: 'Report civic problems with photos',
    icon: AlertTriangle,
    bg: 'from-pink-600/80 to-rose-900/90',
    accent: 'border-pink-500/40',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-300',
  },
  {
    id: 'municipal-command', name: 'Municipal Command', path: '/municipal-command',
    description: 'Manage civic incidents and response',
    icon: Building2,
    bg: 'from-cyan-600/80 to-cyan-900/90',
    accent: 'border-cyan-500/40',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-300',
  },
  {
    id: 'ask-citypulse', name: 'Ask CityPulse', path: '/ask-citypulse',
    description: 'Get AI-powered answers about your city',
    icon: MessageSquareCode,
    bg: 'from-violet-600/80 to-violet-900/90',
    accent: 'border-violet-500/40',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-300',
  },
  {
    id: 'city-news', name: 'City News', path: '/city-news',
    description: 'Discover the latest city updates',
    icon: Newspaper,
    bg: 'from-sky-600/80 to-sky-900/90',
    accent: 'border-sky-500/40',
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-300',
  },
  {
    id: 'settings', name: 'Settings', path: '/',
    description: 'Theme, city preferences and more',
    icon: Settings,
    bg: 'from-slate-600/80 to-slate-900/90',
    accent: 'border-slate-500/40',
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-300',
  },
];

// ─── DATA SOURCES ─────────────────────────────────────────────────────────────
function useDataSources(weather: any, airQuality: any, trafficPoints: any[], pois: any[]) {
  return useMemo(() => [
    { name: 'Weather', icon: Sun, status: weather ? 'Active' : 'Unavailable', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { name: 'Traffic', icon: Car, status: trafficPoints.length >= 6 ? 'Active' : trafficPoints.length > 0 ? 'Partial' : 'Unavailable', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { name: 'AQI', icon: Wind, status: airQuality ? 'Active' : 'Unavailable', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { name: 'OSM', icon: MapPin, status: pois.length > 0 ? 'Active' : 'Limited', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { name: 'News', icon: Newspaper, status: 'Active', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { name: 'Gemini', icon: Sparkles, status: 'Limited', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  ], [weather, airQuality, trafficPoints.length, pois.length]);
}

// ─── Main Overview Component ──────────────────────────────────────────────────
export const Overview: React.FC = () => {
  const { selectedLocation } = useLocation();
  const { weather, airQuality } = useCivicDataContext();
  const { traffic } = useTrafficData();
  const { trafficPoints } = useCityTraffic();
  const { pois, filteredPois } = usePoiData();
  const { showTraffic, setShowTraffic, showPois, setShowPois, showReports, setShowReports, showWeather, setShowWeather } = useMapLayers();
  const { signals, focusSignalOnMap } = useCityPulseSignals();
  const [showSignals, setShowSignals] = useState(true);
  const navigate = useNavigate();


  const [citizenReports, setCitizenReports] = useState<CivicReportMeta[]>(() => getReports());
  const [mapUpdatedTime, setMapUpdatedTime] = useState(new Date());

  useEffect(() => {
    const handleStorage = () => setCitizenReports(getReports());
    const handleReportSaved = (e: Event) => {
      const r = (e as CustomEvent<CivicReportMeta>).detail;
      if (r) setCitizenReports(prev => prev.some(x => x.id === r.id) ? prev : [r, ...prev]);
      else setCitizenReports(getReports());
    };
    const handleFocus = () => { setCitizenReports(getReports()); setMapUpdatedTime(new Date()); };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(REPORT_SAVED_EVENT, handleReportSaved);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(REPORT_SAVED_EVENT, handleReportSaved);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const riskAssessment = useMemo(() =>
    calculateRiskAssessment({ location: selectedLocation, weather, airQuality, traffic, trafficPoints, citizenReports, pois: filteredPois.length > 0 ? filteredPois : pois }),
    [selectedLocation, weather, airQuality, traffic, trafficPoints, citizenReports, pois, filteredPois]
  );

  const dataSources = useDataSources(weather, airQuality, trafficPoints, pois.length > 0 ? pois : filteredPois);
  const activeSourceCount = dataSources.filter(s => s.status === 'Active').length;

  const tempVal = weather?.temperature !== undefined ? Math.round(weather.temperature) : null;
  const feelsLike = weather?.apparentTemperature !== undefined ? Math.round(weather.apparentTemperature) : null;
  const weatherDesc = weather ? getWeatherCodeInfo(weather.weatherCode, weather.isDay).description : '—';
  const aqiVal = airQuality?.usAqi ?? airQuality?.europeanAqi ?? null;
  const aqiCat = getAqiCategory(airQuality?.usAqi).label;
  const trafficSpeed = traffic?.currentSpeed ?? (trafficPoints[0]?.currentSpeed || null);
  const trafficCondition = traffic?.condition ? `Current road flow` : 'Monitoring flow';
  const activeReportsCount = citizenReports.filter(r => r.status !== 'RESOLVED').length;
  const newReportsThisWeek = citizenReports.filter(r => {
    const d = new Date(r.submittedAt);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const minutesAgo = Math.floor((new Date().getTime() - mapUpdatedTime.getTime()) / 60000);
  const lastUpdatedText = minutesAgo < 1 ? 'Just now' : `${minutesAgo} min ago`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b1220] text-slate-100 select-none font-sans">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d1b35 0%, #0a1628 40%, #0b1a2f 100%)' }}>
        {/* City photo tint overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Hawa_Mahal_Jaipur.jpg/1200px-Hawa_Mahal_Jaipur.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            opacity: 0.25,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1b35] via-[#0d1b35]/70 to-transparent pointer-events-none" />

        <div className="relative z-10 px-6 py-7 flex items-center justify-between gap-6">
          {/* Left: greeting */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE TELEMETRY
              </span>
            </div>
            <h1 className="text-[28px] md:text-[32px] font-black text-white leading-tight mb-1">
              {getGreeting()} <span className="wave">👋</span>
            </h1>
            <h2 className="text-[18px] md:text-[20px] font-bold text-white/90 leading-snug mb-2">
              Here's what's happening in <span className="text-cyan-400">{selectedLocation.name}</span> today!
            </h2>
            <p className="text-[13px] text-slate-400">Live data · Real insights · Safer, Cleaner, More Livable Cities</p>
          </div>

          {/* Right: CityPulse AI Card */}
          <div className="hidden lg:flex shrink-0 w-[240px] flex-col rounded-2xl overflow-hidden border border-purple-500/30" style={{ background: 'linear-gradient(135deg, #2d1b69 0%, #1a0533 100%)' }}>
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 border-b border-white/10">
              <div className="w-8 h-8 rounded-xl bg-purple-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-white">CityPulse AI</div>
                <div className="text-[10px] text-purple-300/80 leading-tight">Gemini-powered civic intelligence</div>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                Ask questions about your city, get instant insights.
              </p>
              <button
                onClick={() => navigate('/ask-citypulse')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-[13px] hover:bg-purple-50 transition-all"
              >
                <span>Ask CityPulse</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 space-y-5 mt-5">
        {/* ── 4 METRIC CARDS ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Weather */}
          <MetricCard
            label="Weather"
            icon={<Sun className="w-5 h-5 text-amber-400" />}
            iconBg="bg-amber-500/15 border-amber-500/25"
            accent="border-amber-500/25"
            accentStrip="bg-amber-500"
            value={tempVal !== null ? `${tempVal}°C` : '—'}
            sub={weatherDesc}
            extra={feelsLike !== null ? `Feels like ${feelsLike}°C` : undefined}
          />
          {/* Air Quality */}
          <MetricCard
            label="Air Quality"
            icon={<Wind className="w-5 h-5 text-emerald-400" />}
            iconBg="bg-emerald-500/15 border-emerald-500/25"
            accent="border-emerald-500/25"
            accentStrip="bg-emerald-500"
            value={aqiVal !== null ? `${aqiVal} AQI` : '—'}
            sub={aqiCat}
            badge={aqiCat}
            badgeColor="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          />
          {/* Traffic */}
          <MetricCard
            label="Traffic Flow"
            icon={<Car className="w-5 h-5 text-red-400" />}
            iconBg="bg-red-500/15 border-red-500/25"
            accent="border-red-500/25"
            accentStrip="bg-red-500"
            value={trafficSpeed !== null ? `${trafficSpeed} km/h` : '—'}
            sub={trafficCondition}
          />
          {/* Civic Reports */}
          <MetricCard
            label="Civic Reports"
            icon={<AlertTriangle className="w-5 h-5 text-purple-400" />}
            iconBg="bg-purple-500/15 border-purple-500/25"
            accent="border-purple-500/25"
            accentStrip="bg-purple-500"
            value={String(activeReportsCount)}
            sub="Active reports"
            extra={newReportsThisWeek > 0 ? `${newReportsThisWeek} new this week` : undefined}
          />
        </div>

        {/* ── MAP + CITY HEALTH ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* MAP */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Map Layer Toolbar */}
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              {/* City selector mini */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1424]/90 border border-white/10 text-[12px] text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium">{selectedLocation.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              {/* Layer toggles */}
              {[
                { label: 'Signals', color: 'bg-amber-400', active: showSignals, toggle: () => setShowSignals(!showSignals) },
                { label: 'Traffic', color: 'bg-cyan-500', active: showTraffic, toggle: () => setShowTraffic(!showTraffic) },
                { label: 'Civic Reports', color: 'bg-red-500', active: showReports, toggle: () => setShowReports(!showReports) },
                { label: 'POIs', color: 'bg-blue-500', active: showPois, toggle: () => setShowPois(!showPois) },
                { label: 'Weather', color: 'bg-sky-500', active: showWeather, toggle: () => setShowWeather(!showWeather) },
              ].map(layer => (
                <button
                  key={layer.label}
                  onClick={layer.toggle}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    layer.active
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-[#0d1424]/80 border-white/8 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${layer.color} ${layer.active ? 'opacity-100' : 'opacity-40'}`} />
                  {layer.label}
                </button>
              ))}

              {/* 2D/3D + Controls on the right */}
              <div className="ml-auto flex items-center gap-1.5">
                <button
                  onClick={() => navigate('/digital-twin')}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
                >
                  3D
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative flex-1 rounded-2xl border border-white/10 overflow-hidden" style={{ height: '440px' }}>
              <MapView
                cityTrafficPoints={trafficPoints}
                showTrafficMarkers={showTraffic}
                pois={filteredPois.length ? filteredPois : pois}
                showPois={showPois}
                citizenReports={citizenReports}
                showCitizenReports={showReports}
                signals={signals}
                showSignals={showSignals}
              />

              {/* Live Map badge */}
              <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold text-white">Live Map</span>
                  <span className="text-[10px] text-slate-400">Last updated: {lastUpdatedText}</span>
                </div>
              </div>

              {/* Right side map controls */}
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
                <button
                  onClick={() => navigate('/digital-twin')}
                  className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-white text-[11px] font-bold hover:bg-white/15 transition-all flex items-center justify-center"
                >2D</button>
                <button
                  onClick={() => navigate('/digital-twin')}
                  className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-slate-400 text-[11px] hover:text-white hover:bg-white/15 transition-all flex items-center justify-center"
                >3D</button>
                <div className="w-8 h-px bg-white/10 my-0.5" />
                <button className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-slate-300 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center">
                  <span className="text-lg font-light">+</span>
                </button>
                <button className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/15 text-slate-300 hover:text-white hover:bg-white/15 transition-all flex items-center justify-center">
                  <span className="text-lg font-light">−</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* City Health Score */}
            <div className="rounded-2xl border border-white/10 p-4" style={{ background: '#0d1424' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-white">City Health Score</span>
                <button onClick={() => navigate('/risk-intelligence')} className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                  View Details <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <DonutGauge score={riskAssessment.overallScore} level={riskAssessment.level} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span className="text-[13px] font-bold text-emerald-400">Improving trend</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Based on live environmental, traffic, civic and infrastructure data
                  </p>
                </div>
              </div>
            </div>

            {/* CityPulse Signals Component */}
            <CityPulseSignalsCard
              signals={signals}
              onFocusSignal={focusSignalOnMap}
              onNavigateRisk={() => navigate('/risk-intelligence')}
            />


            {/* Live Data Sources */}
            <div className="rounded-2xl border border-white/10 p-4 flex-1" style={{ background: '#0d1424' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-white">Live Data Sources</span>
                <span className="text-[11px] font-bold text-cyan-400">
                  {activeSourceCount}/{dataSources.length} Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {dataSources.map(src => {
                  const Icon = src.icon;
                  const isActive = src.status === 'Active';
                  return (
                    <div
                      key={src.name}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border ${
                        isActive ? src.bg : 'bg-white/3 border-white/8'
                      } transition-all`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? src.color : 'text-slate-600'}`} />
                      <span className="text-[10px] font-semibold text-white">{src.name}</span>
                      <span className={`text-[9px] font-bold ${
                        src.status === 'Active' ? 'text-emerald-400'
                        : src.status === 'Limited' ? 'text-amber-400'
                        : src.status === 'Partial' ? 'text-sky-400'
                        : 'text-slate-500'
                      }`}>{src.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── EXPLORE CITYPULSE ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[18px] font-black text-white">Explore CityPulse</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">Choose a module to explore real-time city data, insights and tools</p>
            </div>
            <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-[12px] text-slate-300 hover:text-white transition-all">
              View All Modules <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {MODULES.slice(0, 5).map(mod => (
              <ModuleCard key={mod.id} mod={mod} navigate={navigate} />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
            {MODULES.slice(5).map(mod => (
              <ModuleCard key={mod.id} mod={mod} navigate={navigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  accent: string;
  accentStrip: string;
  value: string;
  sub: string;
  extra?: string;
  badge?: string;
  badgeColor?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, icon, iconBg, accent, accentStrip, value, sub, extra, badge, badgeColor }) => (
  <div className={`relative rounded-2xl border ${accent} p-5 overflow-hidden`} style={{ background: '#0d1424' }}>
    {/* Left accent strip */}
    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${accentStrip}`} />
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl border ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
    </div>
    <div className="text-[28px] font-black text-white tracking-tight leading-none mb-1">{value}</div>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-slate-400">{sub}</span>
      {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>}
    </div>
    {extra && <div className="text-[11px] text-slate-500 mt-1">{extra}</div>}
  </div>
);

const ModuleCard: React.FC<{ mod: typeof MODULES[0]; navigate: (p: string) => void }> = ({ mod, navigate }) => {
  const Icon = mod.icon;
  return (
    <div
      onClick={() => navigate(mod.path)}
      className={`group relative rounded-2xl border ${mod.accent} cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
      style={{ background: `linear-gradient(135deg, ${getModuleBgStart(mod.id)}, ${getModuleBgEnd(mod.id)})` }}
    >
      <div className="p-4 flex flex-col justify-between min-h-[140px]">
        <div>
          <div className={`w-10 h-10 rounded-xl ${mod.iconBg} flex items-center justify-center mb-3 border border-white/10`}>
            <Icon className={`w-5 h-5 ${mod.iconColor}`} />
          </div>
          <div className="text-[13px] font-bold text-white mb-1">{mod.name}</div>
          <div className="text-[11px] text-white/60 leading-snug">{mod.description}</div>
        </div>
        <div className="flex justify-end mt-3">
          <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
};

function getModuleBgStart(id: string): string {
  const map: Record<string, string> = {
    'live-city': '#0d4035', 'digital-twin': '#0d1f4f', 'risk-intelligence': '#4a0d0d',
    'scenario-lab': '#2d0d4a', 'city-replay': '#4a300d', 'report-issue': '#4a0d2d',
    'municipal-command': '#0d3545', 'ask-citypulse': '#2d0d4f', 'city-news': '#0d2a45',
    'settings': '#1a1f2e',
  };
  return map[id] || '#0d1424';
}
function getModuleBgEnd(id: string): string {
  const map: Record<string, string> = {
    'live-city': '#071a14', 'digital-twin': '#070d1f', 'risk-intelligence': '#1a0505',
    'scenario-lab': '#130520', 'city-replay': '#1a1205', 'report-issue': '#1a0512',
    'municipal-command': '#051420', 'ask-citypulse': '#130520', 'city-news': '#051020',
    'settings': '#0a0d14',
  };
  return map[id] || '#070d1a';
}
