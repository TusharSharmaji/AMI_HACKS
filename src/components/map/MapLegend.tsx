import React, { useState } from 'react';
import {
  Layers,
  Car,
  HeartPulse,
  Shield,
  Flame,
  Building2,
  GraduationCap,
  Train,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CheckSquare,
  Square,
  Activity,
} from 'lucide-react';
import type { PoiCategory } from '../../types/poi';
import { POI_CATEGORIES } from '../../types/poi';

interface MapLegendProps {
  showTrafficMarkers: boolean;
  onToggleTrafficMarkers: () => void;
  trafficCount: number;
  trafficLoading?: boolean;
  enabledPoiCategories: Record<PoiCategory, boolean>;
  onTogglePoiCategory: (category: PoiCategory) => void;
  onEnableAllPoiCategories: () => void;
  onDisableAllPoiCategories: () => void;
  poiCounts: Record<PoiCategory, number>;
  totalPoisCount: number;
  poiLoading?: boolean;
  onRefreshData?: () => void;
}

const CATEGORY_ICONS: Record<PoiCategory, React.ReactNode> = {
  healthcare: <HeartPulse className="w-3.5 h-3.5 text-rose-400" />,
  police: <Shield className="w-3.5 h-3.5 text-blue-400" />,
  fire: <Flame className="w-3.5 h-3.5 text-orange-400" />,
  civic: <Building2 className="w-3.5 h-3.5 text-purple-400" />,
  education: <GraduationCap className="w-3.5 h-3.5 text-yellow-400" />,
  transit: <Train className="w-3.5 h-3.5 text-cyan-400" />,
  landmarks: <MapPin className="w-3.5 h-3.5 text-emerald-400" />,
};

export const MapLegend: React.FC<MapLegendProps> = ({
  showTrafficMarkers,
  onToggleTrafficMarkers,
  trafficCount,
  trafficLoading = false,
  enabledPoiCategories,
  onTogglePoiCategory,
  onEnableAllPoiCategories,
  onDisableAllPoiCategories,
  poiCounts,
  totalPoisCount,
  poiLoading = false,
  onRefreshData,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCategoryCount = Object.values(enabledPoiCategories).filter(Boolean).length;
  const isAllCategoriesActive = activeCategoryCount === 7;

  return (
    <div className="relative font-mono text-xs select-none">
      {/* Minimized Pill Toggle */}
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-command-900/95 hover:bg-command-800 text-slate-200 border border-white/15 px-3 py-1.5 rounded-xl shadow-hud backdrop-blur-md flex items-center gap-2.5 transition-all group pointer-events-auto"
          title="Map Layers & Civic Infrastructure Legend"
          aria-label="Open Map Layers and Civic Infrastructure Legend"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold text-[11px] text-slate-100">LAYERS &amp; POIs</span>
          <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold">
            {trafficCount + (isAllCategoriesActive ? totalPoisCount : Object.entries(enabledPoiCategories).reduce((acc, [cat, on]) => on ? acc + (poiCounts[cat as PoiCategory] || 0) : acc, 0))}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      ) : (
        /* Expanded Floating Legend Card */
        <div className="w-72 sm:w-80 bg-command-950/95 border border-white/15 rounded-2xl shadow-hud backdrop-blur-xl overflow-hidden pointer-events-auto transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3 bg-command-900/60 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">
                Map Layers &amp; Legend
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  disabled={trafficLoading || poiLoading}
                  className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-white/5 transition-colors disabled:opacity-40"
                  title="Refresh Traffic & POIs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${trafficLoading || poiLoading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                title="Collapse Legend"
                aria-label="Collapse map layers legend"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3.5 custom-scrollbar">
            {/* SECTION 1: TRAFFIC FLOW & MARKERS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-bold text-slate-200 uppercase">
                    City-Wide Traffic
                  </span>
                </div>
                <button
                  onClick={onToggleTrafficMarkers}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                    showTrafficMarkers
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {showTrafficMarkers ? 'VISIBLE' : 'HIDDEN'}
                </button>
              </div>

              {/* Traffic Condition Classification Dots */}
              <div className="bg-command-900/40 border border-white/5 rounded-xl p-2.5 space-y-1.5">
                <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Congestion Scale (TomTom)</span>
                  <span className="text-cyan-400 font-bold">{trafficCount} points</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                    <span className="text-slate-200">Light</span>
                    <span className="text-emerald-400 ml-auto font-bold">0-20%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
                    <span className="text-slate-200">Moderate</span>
                    <span className="text-amber-400 ml-auto font-bold">20-40%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" />
                    <span className="text-slate-200">Heavy</span>
                    <span className="text-orange-400 ml-auto font-bold">40-60%</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]" />
                    <span className="text-slate-200">Severe</span>
                    <span className="text-rose-400 ml-auto font-bold">&gt;60%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: CIVIC POIs */}
            <div className="space-y-2 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-bold text-slate-200 uppercase">
                    Civic POI Categories
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={onEnableAllPoiCategories}
                    className="text-cyan-400 hover:text-cyan-300 px-1 py-0.5 hover:underline"
                  >
                    All
                  </button>
                  <span className="text-slate-600">/</span>
                  <button
                    onClick={onDisableAllPoiCategories}
                    className="text-slate-400 hover:text-slate-300 px-1 py-0.5 hover:underline"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Category Checkbox Grid */}
              <div className="space-y-1 bg-command-900/30 border border-white/5 rounded-xl p-1.5">
                {(Object.keys(POI_CATEGORIES) as PoiCategory[]).map((catKey) => {
                  const meta = POI_CATEGORIES[catKey];
                  const isEnabled = enabledPoiCategories[catKey] ?? true;
                  const count = poiCounts[catKey] || 0;

                  return (
                    <button
                      key={catKey}
                      onClick={() => onTogglePoiCategory(catKey)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-all ${
                        isEnabled
                          ? 'bg-command-800/80 text-white hover:bg-command-800'
                          : 'text-slate-500 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border"
                          style={{
                            backgroundColor: isEnabled ? meta.bgColor : 'transparent',
                            borderColor: isEnabled ? meta.borderColor : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          {CATEGORY_ICONS[catKey]}
                        </div>
                        <span className={`truncate ${isEnabled ? 'text-slate-200 font-medium' : 'text-slate-500 line-through'}`}>
                          {meta.shortLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: isEnabled ? meta.bgColor : 'rgba(255,255,255,0.05)',
                            color: isEnabled ? meta.color : '#64748b',
                          }}
                        >
                          {count}
                        </span>
                        {isEnabled ? (
                          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer citation note */}
            <div className="text-[9px] text-slate-500 flex items-center justify-between border-t border-white/5 pt-2">
              <span>OpenStreetMap &amp; TomTom Flow</span>
              <span className="text-cyan-400/80">Real-time Telemetry</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
