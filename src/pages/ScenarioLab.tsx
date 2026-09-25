import React, { useState, useMemo, useEffect } from 'react';
import {
  FlaskConical,
  RotateCcw,
  Sparkles,
  Sliders,
  Car,
  CloudRain,
  Thermometer,
  AlertTriangle,
  Building2,
  CheckCircle2,
  X,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useLocation } from '../hooks/useLocation';
import { useCivicDataContext } from '../hooks/useCivicDataContext';
import { useTrafficData } from '../hooks/useTrafficData';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { usePoiData } from '../hooks/usePoiData';
import { getReports, REPORT_SAVED_EVENT } from '../services/reportService';
import { getWeatherCodeInfo } from '../utils/civicDataUtils';
import type { CivicReportMeta } from '../types/report';
import {
  calculateScenario,
  DEFAULT_SCENARIO_PARAMS,
  SCENARIO_PRESETS,
  type ScenarioParameters,
  type ScenarioResult,
} from '../services/scenarioEngine';
import { ScenarioMap } from '../components/map/ScenarioMap';
import { explainScenarioSimulation } from '../services/geminiService';
import { recordObservation } from '../services/observationService';

export const ScenarioLab: React.FC = () => {
  const { selectedLocation } = useLocation();

  // ── Real City Data Sources ──
  const { weather, airQuality } = useCivicDataContext();
  const { traffic } = useTrafficData();
  const { trafficPoints } = useCityTraffic();
  const { pois, filteredPois } = usePoiData();

  // Civic reports
  const [citizenReports, setCitizenReports] = useState<CivicReportMeta[]>(() => getReports());

  useEffect(() => {
    const handleStorage = () => setCitizenReports(getReports());
    const handleReportSaved = () => setCitizenReports(getReports());
    window.addEventListener('storage', handleStorage);
    window.addEventListener(REPORT_SAVED_EVENT, handleReportSaved);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(REPORT_SAVED_EVENT, handleReportSaved);
    };
  }, []);

  // ── Record Observation for City Replay when live data updates ──
  useEffect(() => {
    if (selectedLocation && weather) {
      const codeInfo = getWeatherCodeInfo(weather.weatherCode, weather.isDay);
      recordObservation({
        cityId: String(selectedLocation.id),
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
          totalReports: citizenReports.length,
          activeReports: citizenReports.filter((r) => r.status !== 'RESOLVED').length,
          criticalReports: citizenReports.filter((r) => r.severity === 'Critical' && r.status !== 'RESOLVED').length,
          highReports: citizenReports.filter((r) => r.severity === 'High' && r.status !== 'RESOLVED').length,
        },
      });
    }
  }, [selectedLocation, weather, airQuality, traffic, trafficPoints, citizenReports]);

  // ── UI States ──
  const [scenarioParams, setScenarioParams] = useState<ScenarioParameters>(DEFAULT_SCENARIO_PARAMS);
  const [activePresetKey, setActivePresetKey] = useState<string>('custom');
  const [mapViewMode, setMapViewMode] = useState<'CURRENT' | 'SCENARIO'>('SCENARIO');

  // AI Modal State
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // ── Scenario Calculation Pipeline ──
  const scenarioResult: ScenarioResult = useMemo(() => {
    return calculateScenario({
      location: selectedLocation,
      weather,
      airQuality,
      traffic,
      trafficPoints,
      citizenReports,
      pois: filteredPois.length > 0 ? filteredPois : pois,
      scenarioParams,
    });
  }, [selectedLocation, weather, airQuality, traffic, trafficPoints, citizenReports, pois, filteredPois, scenarioParams]);

  // Reset to Current Conditions Baseline
  const handleReset = () => {
    setScenarioParams(DEFAULT_SCENARIO_PARAMS);
    setActivePresetKey('custom');
    setMapViewMode('CURRENT');
  };

  // Apply Preset
  const handleSelectPreset = (key: string) => {
    setActivePresetKey(key);
    if (key === 'custom') {
      setScenarioParams(DEFAULT_SCENARIO_PARAMS);
    } else if (SCENARIO_PRESETS[key]) {
      setScenarioParams(SCENARIO_PRESETS[key]);
      setMapViewMode('SCENARIO');
    }
  };

  // Trigger Gemini Explanation
  const handleGenerateAiExplanation = async () => {
    setAiLoading(true);
    setAiError(null);
    setShowAiModal(true);

    try {
      const text = await explainScenarioSimulation(scenarioResult, selectedLocation.name);
      setAiExplanation(text);
    } catch (err: any) {
      setAiError(err.message || 'Unable to generate AI explanation for scenario.');
    } finally {
      setAiLoading(false);
    }
  };

  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#07090e] select-none text-slate-100 p-4 md:p-6 font-sans space-y-6">
      {/* ── TOP HEADER BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/15 border border-amber-500/30 text-amber-300">
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              SCENARIO LAB
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-white/5 border border-white/10 text-slate-300">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              SIMULATION BASED ON CURRENT CITYPULSE CONDITIONS
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold font-mono text-white tracking-tight leading-tight">
            {selectedLocation.name} Urban Scenario Sandbox
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {locationSubtitle} · Baseline captured from live telemetry · Modeled outcome sandbox
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all"
            title="Reset to current live conditions"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset to Baseline</span>
          </button>

          <button
            onClick={handleGenerateAiExplanation}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono font-semibold text-cyan-300 hover:text-white transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Explain Scenario with AI</span>
          </button>
        </div>
      </div>

      {/* ── PRESETS BAR ── */}
      <div className="bg-command-950/90 border border-white/10 rounded-2xl p-3 shadow-hud backdrop-blur-md flex items-center gap-2 overflow-x-auto font-mono text-xs">
        <span className="text-slate-400 uppercase text-[10px] font-bold tracking-wider px-2 shrink-0 flex items-center gap-1">
          <Sliders className="w-3.5 h-3.5 text-amber-400" /> Presets:
        </span>
        <button
          onClick={() => handleSelectPreset('custom')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activePresetKey === 'custom'
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
              : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06]'
          }`}
        >
          Custom Scenario
        </button>
        {Object.entries(SCENARIO_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => handleSelectPreset(key)}
            className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
              activePresetKey === key
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-white/[0.03] border-white/5 text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ── MAIN LAYOUT: CONTROLS (LEFT 4) + MAP (CENTER 5) + RESULTS (RIGHT 3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: SCENARIO PARAMETER CONTROLS (4 Cols) */}
        <div className="lg:col-span-4 bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Scenario Control Parameters
            </span>
            <span className="text-[10px] text-slate-500">Live Baseline Input</span>
          </div>

          {/* Scenario Name Input */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-slate-400 font-semibold">Scenario Title</label>
            <input
              type="text"
              value={scenarioParams.name}
              onChange={(e) => {
                setScenarioParams({ ...scenarioParams, name: e.target.value });
                setActivePresetKey('custom');
              }}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
              placeholder="e.g. Heavy Rain + Traffic Surge"
            />
          </div>

          {/* 1. Traffic Congestion Shift */}
          <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-cyan-400" /> Traffic Congestion
              </span>
              <span className="text-cyan-300 font-bold">
                {scenarioParams.trafficAdjustment > 0 ? `+${scenarioParams.trafficAdjustment}%` : `${scenarioParams.trafficAdjustment}%`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[-20, -10, 0, 10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setScenarioParams({ ...scenarioParams, trafficAdjustment: val });
                    setActivePresetKey('custom');
                  }}
                  className={`px-2 py-1 rounded-lg border text-[10px] ${
                    scenarioParams.trafficAdjustment === val
                      ? 'bg-cyan-500/25 border-cyan-500/60 text-white font-bold'
                      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {val === 0 ? 'Current' : val > 0 ? `+${val}%` : `${val}%`}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Rainfall Addition */}
          <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <CloudRain className="w-3.5 h-3.5 text-sky-400" /> Additional Rainfall
              </span>
              <span className="text-sky-300 font-bold">+{scenarioParams.rainfallAddition} mm</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0, 10, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setScenarioParams({ ...scenarioParams, rainfallAddition: val });
                    setActivePresetKey('custom');
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] ${
                    scenarioParams.rainfallAddition === val
                      ? 'bg-sky-500/25 border-sky-500/60 text-white font-bold'
                      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {val === 0 ? 'Current' : `+${val} mm`}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Temperature Shift */}
          <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Temperature Shift
              </span>
              <span className="text-amber-300 font-bold">
                {scenarioParams.tempAdjustment > 0 ? `+${scenarioParams.tempAdjustment}°C` : `${scenarioParams.tempAdjustment}°C`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[-5, -2, 0, 2, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setScenarioParams({ ...scenarioParams, tempAdjustment: val });
                    setActivePresetKey('custom');
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] ${
                    scenarioParams.tempAdjustment === val
                      ? 'bg-amber-500/25 border-amber-500/60 text-white font-bold'
                      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {val === 0 ? 'Current' : val > 0 ? `+${val}°C` : `${val}°C`}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Road Disruption */}
          <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Road Disruption
              </span>
              <span className="text-red-300 font-bold uppercase text-[10px]">{scenarioParams.roadDisruption}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
              {[
                { id: 'none', label: 'None' },
                { id: 'minor', label: 'Minor Disruption' },
                { id: 'major', label: 'Major Disruption' },
                { id: 'closure', label: 'Arterial Closure' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setScenarioParams({ ...scenarioParams, roadDisruption: opt.id as any });
                    setActivePresetKey('custom');
                  }}
                  className={`p-2 rounded-lg border text-left ${
                    scenarioParams.roadDisruption === opt.id
                      ? 'bg-red-500/20 border-red-500/50 text-white font-bold'
                      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Civic Incident Load */}
          <div className="space-y-2 bg-white/[0.02] p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-violet-400" /> Civic Incident Load
              </span>
              <span className="text-violet-300 font-bold">+{scenarioParams.civicIncidentLoad}%</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0, 25, 50, 100].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setScenarioParams({ ...scenarioParams, civicIncidentLoad: val });
                    setActivePresetKey('custom');
                  }}
                  className={`px-3 py-1 rounded-lg border text-[10px] ${
                    scenarioParams.civicIncidentLoad === val
                      ? 'bg-violet-500/25 border-violet-500/60 text-white font-bold'
                      : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {val === 0 ? 'Current' : `+${val}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: INTERACTIVE SCENARIO MAP (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-2 h-[520px] lg:h-auto">
          <div className="flex items-center justify-between text-xs font-mono px-1">
            <span className="font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Scenario Spatial Map
            </span>

            {/* Toggle: CURRENT vs SCENARIO */}
            <div className="bg-command-950 border border-white/10 rounded-xl p-0.5 flex items-center gap-1 text-[10px]">
              <button
                onClick={() => setMapViewMode('CURRENT')}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                  mapViewMode === 'CURRENT'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                CURRENT
              </button>
              <button
                onClick={() => setMapViewMode('SCENARIO')}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all ${
                  mapViewMode === 'SCENARIO'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SCENARIO
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-[440px]">
            <ScenarioMap
              viewMode={mapViewMode}
              spatialNodes={scenarioResult.spatialNodes}
              trafficPoints={trafficPoints}
              citizenReports={citizenReports}
            />
          </div>
        </div>

        {/* RIGHT PANEL: SCENARIO RESULT DASHBOARD (3 Cols) */}
        <div className="lg:col-span-3 flex flex-col space-y-4 font-mono text-xs">
          {/* Main Risk Comparison Card */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-4">
            <div className="border-b border-white/5 pb-2 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Scenario Result
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold">
                {scenarioResult.modeledRisk.level}
              </span>
            </div>

            {/* Scores Comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 space-y-1">
                <div className="text-[9px] text-slate-400 uppercase">Baseline Risk</div>
                <div className="text-2xl font-extrabold text-white">
                  {scenarioResult.baselineRisk.overallScore}
                  <span className="text-xs font-normal text-slate-400"> / 100</span>
                </div>
              </div>

              <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 space-y-1">
                <div className="text-[9px] text-amber-300 font-bold uppercase">Modeled Risk</div>
                <div className="text-2xl font-extrabold text-amber-400">
                  {scenarioResult.modeledRisk.overallScore}
                  <span className="text-xs font-normal text-amber-300/60"> / 100</span>
                </div>
              </div>
            </div>

            {/* Modeled Change Delta */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Modeled Change</span>
                <span className="text-[9px] text-slate-500">Difference from live baseline</span>
              </div>
              <span
                className={`text-lg font-extrabold flex items-center gap-1 ${
                  scenarioResult.riskScoreDelta > 0
                    ? 'text-red-400'
                    : scenarioResult.riskScoreDelta < 0
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}
              >
                {scenarioResult.riskScoreDelta > 0 ? `+${scenarioResult.riskScoreDelta}` : scenarioResult.riskScoreDelta}
                <span className="text-xs font-normal text-slate-400">pts</span>
              </span>
            </div>
          </div>

          {/* Modeled Impact Deltas Breakdown */}
          <div className="bg-command-950/90 border border-white/10 rounded-2xl p-4 shadow-hud backdrop-blur-md space-y-3">
            <div className="text-xs font-bold text-white uppercase border-b border-white/5 pb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Modeled Component Impact
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <span className="text-slate-300">Traffic Impact</span>
                <span className={`font-bold ${scenarioResult.trafficImpactPercent > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {scenarioResult.trafficImpactPercent > 0 ? `+${scenarioResult.trafficImpactPercent}%` : `${scenarioResult.trafficImpactPercent}%`}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <span className="text-slate-300">Weather Impact</span>
                <span className={`font-bold ${scenarioResult.weatherImpactPercent > 0 ? 'text-sky-400' : 'text-slate-400'}`}>
                  {scenarioResult.weatherImpactPercent > 0 ? `+${scenarioResult.weatherImpactPercent}%` : `${scenarioResult.weatherImpactPercent}%`}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <span className="text-slate-300">Civic Pressure</span>
                <span className={`font-bold ${scenarioResult.civicPressurePercent > 0 ? 'text-violet-400' : 'text-slate-400'}`}>
                  {scenarioResult.civicPressurePercent > 0 ? `+${scenarioResult.civicPressurePercent}%` : `${scenarioResult.civicPressurePercent}%`}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <span className="text-slate-300">Environmental Impact</span>
                <span className={`font-bold ${scenarioResult.environmentalImpactPercent > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {scenarioResult.environmentalImpactPercent > 0 ? `+${scenarioResult.environmentalImpactPercent}%` : `${scenarioResult.environmentalImpactPercent}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Spatial Note */}
          <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl text-[10px] text-slate-400 leading-relaxed space-y-1">
            <div className="text-slate-300 font-bold uppercase text-[9px]">Spatial Estimate Status</div>
            <p>{scenarioResult.spatialEstimateNote}</p>
          </div>
        </div>
      </div>

      {/* ── MODAL: AI SCENARIO EXPLANATION ── */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-command-950 border border-cyan-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span className="text-base font-bold text-white">AI Scenario Explanation</span>
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
                <span>Synthesizing natural language scenario analysis from modeled parameters...</span>
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
              <span>Powered by Gemini AI · Explaining computed scenario facts</span>
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
