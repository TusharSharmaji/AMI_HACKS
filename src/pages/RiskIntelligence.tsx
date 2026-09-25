import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Activity,
  Info,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  X,
  Car,
  Wind,
  CloudSun,
  Building2,
  Landmark,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';
import { RiskMap } from '../components/map/RiskMap';
import { useLocation } from '../hooks/useLocation';
import { useCivicDataContext } from '../hooks/useCivicDataContext';
import { useTrafficData } from '../hooks/useTrafficData';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { usePoiData } from '../hooks/usePoiData';
import { getReports, REPORT_SAVED_EVENT } from '../services/reportService';
import type { CivicReportMeta } from '../types/report';
import {
  calculateRiskAssessment,
  type RiskAssessment,
  type RiskHotspot,
} from '../services/riskEngine';
import { explainRiskAssessment } from '../services/geminiService';

export const RiskIntelligence: React.FC = () => {
  const { selectedLocation } = useLocation();

  // Real data sources
  const {
    weather,
    airQuality,
    weatherLoading,
    airQualityLoading,
    retryWeather,
    retryAirQuality,
  } = useCivicDataContext();

  const {
    traffic,
    loading: trafficLoading,
    lastUpdated: trafficLastUpdated,
    refresh: refreshTraffic,
  } = useTrafficData();

  const { trafficPoints, refresh: refreshCityTraffic } = useCityTraffic();
  const { pois, filteredPois, refresh: refreshPois } = usePoiData();

  // Civic reports
  const [citizenReports, setCitizenReports] = useState<CivicReportMeta[]>(() => getReports());

  useEffect(() => {
    const handleStorage = () => setCitizenReports(getReports());
    const handleReportSaved = (e: Event) => {
      const newReport = (e as CustomEvent<CivicReportMeta>).detail;
      if (newReport) {
        setCitizenReports((prev) => (prev.some((r) => r.id === newReport.id) ? prev : [newReport, ...prev]));
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

  // UI States
  const [selectedHotspot, setSelectedHotspot] = useState<RiskHotspot | null>(null);
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [showCalculationModal, setShowCalculationModal] = useState(false);

  // AI Explanation state
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Deterministic Risk Assessment Computation
  const assessment: RiskAssessment = useMemo(() => {
    return calculateRiskAssessment({
      location: selectedLocation,
      weather,
      airQuality,
      traffic,
      trafficPoints,
      citizenReports,
      pois: filteredPois.length > 0 ? filteredPois : pois,
      weatherLastUpdated: new Date(),
      trafficLastUpdated,
    });
  }, [selectedLocation, weather, airQuality, traffic, trafficPoints, citizenReports, pois, filteredPois, trafficLastUpdated]);

  // Recalculate on city change & clear old selections
  useEffect(() => {
    setSelectedHotspot(null);
    setExpandedComponent(null);
    setAiExplanation(null);
    setAiError(null);
  }, [selectedLocation]);

  // Handle manual refresh
  const handleRefreshAll = () => {
    retryWeather();
    retryAirQuality();
    refreshTraffic();
    refreshCityTraffic();
    refreshPois();
    setCitizenReports(getReports());
  };

  // Trigger Gemini AI explanation
  const handleGenerateAiExplanation = async () => {
    setAiLoading(true);
    setAiError(null);
    setShowAiModal(true);

    try {
      const text = await explainRiskAssessment(assessment, selectedLocation.name);
      setAiExplanation(text);
    } catch (err: any) {
      setAiError(err.message || 'Unable to generate AI explanation.');
    } finally {
      setAiLoading(false);
    }
  };

  const isDataLoading = weatherLoading || airQualityLoading || trafficLoading;
  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#07090e] select-none text-slate-100 p-4 md:p-6 font-sans space-y-6">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-red-500/15 border border-red-500/30 text-red-400">
              <ShieldAlert className="w-3 h-3 text-red-400" />
              RISK INTELLIGENCE
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                assessment.confidence === 'HIGH'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : assessment.confidence === 'MEDIUM'
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              }`}
              title={assessment.confidenceReason}
            >
              <CheckCircle2 className="w-3 h-3" />
              {assessment.confidence} CONFIDENCE
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold font-mono text-white tracking-tight leading-tight">
            {selectedLocation.name} Civic Risk Assessment
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {locationSubtitle} · Current environmental and civic conditions derived from live CityPulse streams
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowCalculationModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">How is this calculated?</span>
          </button>

          <button
            onClick={handleGenerateAiExplanation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono font-semibold text-cyan-300 hover:text-white transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Explain with AI</span>
          </button>

          <button
            onClick={handleRefreshAll}
            disabled={isDataLoading}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1"
            title="Refresh All Feeds"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isDataLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── MAIN GRID: MAP (LEFT/CENTER) + SUMMARY (RIGHT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT / CENTER: RISK MAP (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col h-[480px] lg:h-[580px] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="flex items-center gap-2 font-semibold text-white uppercase tracking-wider">
              <Activity className="w-4 h-4 text-cyan-400" />
              Geographic Risk Map &amp; Spatial Clusters
            </span>
            <span>{assessment.hotspots.length} Risk Hotspots Detected</span>
          </div>

          <RiskMap
            hotspots={assessment.hotspots}
            trafficPoints={trafficPoints}
            citizenReports={citizenReports}
            onSelectHotspot={(spot) => setSelectedHotspot(spot)}
          />
        </div>

        {/* RIGHT: OVERALL CITY RISK & TOP SIGNALS (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Overall Score Card */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Overall City Risk Score
                </span>
                <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                  CityPulse Risk Classification
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                {assessment.availableSourcesCount}/{assessment.totalSourcesCount} Live Sources Available
              </span>
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-extrabold font-mono text-white tracking-tight">
                  {assessment.overallScore}
                </span>
                <span className="text-sm font-mono text-slate-400 font-semibold">/ 100</span>
              </div>

              {/* Level Badge */}
              <div className="flex flex-col items-end">
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-mono font-bold tracking-wider uppercase border shadow-md ${
                    assessment.level === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400 border-red-500/50'
                      : assessment.level === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                      : assessment.level === 'ELEVATED'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : assessment.level === 'GUARDED'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                  }`}
                >
                  {assessment.level}
                </span>
                <span className="text-[9px] font-mono text-slate-500 mt-1">
                  Trend: {assessment.trend === 'UNAVAILABLE' ? 'Not enough historical data' : assessment.trend}
                </span>
              </div>
            </div>

            {/* Confidence Statement */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-xs font-mono text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-[11px] leading-relaxed">{assessment.confidenceReason}</span>
            </div>
          </div>

          {/* Top Risk Signals Card */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md flex-1 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Top Risk Signals
              </span>
              <span className="text-[10px] font-mono text-slate-500">Real-Time Ingest</span>
            </div>

            <div className="space-y-2">
              {assessment.topFactors.map((factor) => (
                <div
                  key={factor.id}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 p-2.5 rounded-xl font-mono text-xs transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-cyan-400 text-[10px]">0{factor.rank}</span>
                      <span>{factor.title}</span>
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        factor.severity === 'CRITICAL' || factor.severity === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : factor.severity === 'ELEVATED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {factor.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed pl-4">{factor.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOTSPOT INSPECTOR DETAILS (If selected) ── */}
      {selectedHotspot && (
        <div className="bg-command-950/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl font-mono text-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-bold text-white text-sm uppercase">Selected Hotspot Details</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                {selectedHotspot.level} ({selectedHotspot.score}/100)
              </span>
            </div>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Primary Risk Driver</div>
              <div className="text-white font-bold text-sm mt-0.5">{selectedHotspot.primaryFactor}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Coordinates: {selectedHotspot.latitude.toFixed(4)}, {selectedHotspot.longitude.toFixed(4)}
              </div>
            </div>

            <div>
              <div className="text-[9px] text-slate-400 uppercase">Supporting Signals</div>
              <ul className="text-slate-300 text-[11px] mt-0.5 space-y-0.5 list-disc pl-4">
                {selectedHotspot.supportingSignals.map((sig, i) => (
                  <li key={i}>{sig}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="text-[9px] text-slate-400 uppercase">Nearby Critical Facilities</div>
              <div className="text-cyan-300 font-semibold text-[11px] mt-0.5">
                {selectedHotspot.nearPoiNames.length > 0
                  ? selectedHotspot.nearPoiNames.join(', ')
                  : 'No immediate facility buffers impacted'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOWER SECTION: COMPONENT BREAKDOWN & ATTENTION AREAS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Component Risk Breakdown (7 Cols) */}
        <div className="lg:col-span-7 bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Risk Component Breakdown
              </h2>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                Click any component bar to expand &amp; inspect underlying signals
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Weighted Risk Model</span>
          </div>

          <div className="space-y-3 font-mono">
            {assessment.components.map((comp) => {
              const isExpanded = expandedComponent === comp.id;
              const barColor =
                comp.score >= 80
                  ? 'bg-red-500'
                  : comp.score >= 60
                  ? 'bg-orange-500'
                  : comp.score >= 40
                  ? 'bg-amber-500'
                  : comp.score >= 20
                  ? 'bg-cyan-500'
                  : 'bg-emerald-500';

              return (
                <div
                  key={comp.id}
                  className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-xl p-3 transition-colors cursor-pointer"
                  onClick={() => setExpandedComponent(isExpanded ? null : comp.id)}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-white flex items-center gap-2">
                      {comp.id === 'traffic' && <Car className="w-3.5 h-3.5 text-cyan-400" />}
                      {comp.id === 'incidents' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      {comp.id === 'environmental' && <Wind className="w-3.5 h-3.5 text-emerald-400" />}
                      {comp.id === 'weather' && <CloudSun className="w-3.5 h-3.5 text-sky-400" />}
                      {comp.id === 'infrastructure' && <Building2 className="w-3.5 h-3.5 text-violet-400" />}
                      <span>{comp.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Weight: {comp.weightPercent}%)
                      </span>
                    </span>

                    <div className="flex items-center gap-3">
                      {comp.available && (
                        <span className="text-[11px] text-slate-400">
                          Contrib: <strong className="text-cyan-300">+{comp.earnedPoints} pts</strong>
                        </span>
                      )}
                      <span className="font-bold text-white">
                        {comp.available ? `${comp.score} / 100` : 'Unavailable'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                      style={{ width: `${comp.available ? comp.score : 0}%` }}
                    />
                  </div>

                  {/* Short Data Signal Summary */}
                  {comp.signals[0] && (
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {comp.signals[0]}
                    </div>
                  )}

                  {/* Accordion Expand: Why this score? */}
                  {isExpanded && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                      <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                        WHY THIS SCORE? (Contributing Telemetry Signals)
                      </div>
                      <ul className="space-y-1 text-slate-300 list-disc pl-4">
                        {comp.signals.map((sig, i) => (
                          <li key={i}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* City Attention Areas & Data Freshness (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* City Attention Areas */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-cyan-400" />
                City Attention Areas
              </span>
              <span className="text-[10px] font-mono text-slate-500">Actionable Insights</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {assessment.attentionAreas.map((area) => (
                <div
                  key={area.id}
                  className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{area.title}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        area.impactLevel === 'CRITICAL' || area.impactLevel === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {area.impactLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{area.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Data Freshness */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Data Stream Freshness
              </span>
              <span className="text-[10px] text-slate-400">Verified Timestamps</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-[9px] text-slate-400">WEATHER</div>
                <div className="text-white font-semibold">{assessment.dataFreshness.weatherAge}</div>
              </div>
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-[9px] text-slate-400">AIR QUALITY</div>
                <div className="text-white font-semibold">{assessment.dataFreshness.airQualityAge}</div>
              </div>
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-[9px] text-slate-400">TRAFFIC FLOW</div>
                <div className="text-white font-semibold">{assessment.dataFreshness.trafficAge}</div>
              </div>
              <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <div className="text-[9px] text-slate-400">CIVIC REPORTS</div>
                <div className="text-emerald-400 font-semibold">{assessment.dataFreshness.reportsAge}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL 1: HOW IS THIS CALCULATED? ── */}
      {showCalculationModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-command-950 border border-white/15 rounded-2xl max-w-xl w-full p-6 shadow-2xl font-mono text-xs space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <span className="text-base font-bold text-white">How Risk is Calculated</span>
              </div>
              <button
                onClick={() => setShowCalculationModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300 leading-relaxed">
              The CityPulse Risk Intelligence Engine evaluates current civic and environmental conditions
              using a deterministic 5-component weighted risk model:
            </p>

            <div className="space-y-2 bg-white/[0.03] p-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-center text-slate-200">
                <span className="font-bold text-white">1. Air Quality Risk (25%)</span>
                <span className="text-cyan-400">EPA AQI Breakpoints</span>
              </div>
              <div className="flex justify-between items-center text-slate-200">
                <span className="font-bold text-white">2. Traffic Flow Risk (25%)</span>
                <span className="text-cyan-400">TomTom Speed &amp; Delay</span>
              </div>
              <div className="flex justify-between items-center text-slate-200">
                <span className="font-bold text-white">3. Civic Incident Risk (25%)</span>
                <span className="text-cyan-400">Severity &amp; Status Weighted</span>
              </div>
              <div className="flex justify-between items-center text-slate-200">
                <span className="font-bold text-white">4. Weather Hazard Risk (15%)</span>
                <span className="text-cyan-400">WMO Weather Codes &amp; Wind</span>
              </div>
              <div className="flex justify-between items-center text-slate-200">
                <span className="font-bold text-white">5. Infrastructure Exposure (10%)</span>
                <span className="text-cyan-400">Proximity to Critical POIs</span>
              </div>
            </div>

            <div className="space-y-2 text-slate-300 leading-relaxed border-t border-white/10 pt-3">
              <div className="font-bold text-white text-xs uppercase text-cyan-400">
                Transparency &amp; Re-normalization Rules:
              </div>
              <p>
                • Scores are calculated on a 0–100 scale using CityPulse Risk Classification bands (0–19 Low, 20–39 Guarded, 40–59 Elevated, 60–79 High, 80–100 Critical).
              </p>
              <p>
                • <strong>Disclaimer:</strong> This is an analytical indicator, not an official government warning.
              </p>
              <p>
                • If a telemetry source is temporarily unavailable, its weight is re-normalized across available components and the assessment confidence is adjusted accordingly.
              </p>
              <p>
                • Scores reflect current conditions derived strictly from live data streams without fabrication.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowCalculationModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold uppercase tracking-wider text-xs"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: AI EXPLANATION ── */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-command-950 border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-base font-bold text-white">AI Risk Explanation</span>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiLoading && (
              <div className="py-8 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                <span>Synthesizing natural language explanation from live assessment...</span>
              </div>
            )}

            {aiError && (
              <div className="bg-red-950/80 border border-red-500/40 p-4 rounded-xl text-red-300 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>AI Service Notice</span>
                </div>
                <p>{aiError}</p>
              </div>
            )}

            {aiExplanation && (
              <div className="bg-white/[0.03] border border-white/10 p-4 rounded-xl text-slate-200 leading-relaxed whitespace-pre-line text-xs space-y-2">
                {aiExplanation}
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500">
              <span>Powered by Gemini AI · Explaining computed data</span>
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
