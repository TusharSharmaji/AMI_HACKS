import React, { useState } from 'react';
import {
  Activity,
  HeartPulse,
  Shield,
  Flame,
  Building2,
  GraduationCap,
  Train,
  MapPin,
  Phone,
  Loader2,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import type { PoiItem, PoiCategory } from '../../types/poi';
import { POI_CATEGORIES } from '../../types/poi';
import { useLocation } from '../../hooks/useLocation';

interface CivicPoiPanelProps {
  pois: PoiItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CATEGORY_ICONS: Record<PoiCategory, React.ReactNode> = {
  healthcare: <HeartPulse className="w-3.5 h-3.5" />,
  police: <Shield className="w-3.5 h-3.5" />,
  fire: <Flame className="w-3.5 h-3.5" />,
  civic: <Building2 className="w-3.5 h-3.5" />,
  education: <GraduationCap className="w-3.5 h-3.5" />,
  transit: <Train className="w-3.5 h-3.5" />,
  landmarks: <MapPin className="w-3.5 h-3.5" />,
};

export const CivicPoiPanel: React.FC<CivicPoiPanelProps> = ({
  pois,
  loading,
  error,
  onRetry,
}) => {
  const { moveToCoordinates } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<PoiCategory | 'all'>('all');

  const filteredPois = selectedCategory === 'all'
    ? pois
    : pois.filter((p) => p.category === selectedCategory);

  const handleFocusPoi = (poi: PoiItem) => {
    moveToCoordinates(poi.latitude, poi.longitude, 15.5);
  };

  return (
    <div className="bg-command-950/70 border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-200 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Civic Infrastructure
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded font-bold">
            {pois.length} POIs
          </span>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 custom-scrollbar text-[10px]">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-2 py-1 rounded-md shrink-0 transition-colors ${
            selectedCategory === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'bg-white/5 text-slate-400 hover:text-white'
          }`}
        >
          All ({pois.length})
        </button>
        {(Object.keys(POI_CATEGORIES) as PoiCategory[]).map((catKey) => {
          const meta = POI_CATEGORIES[catKey];
          const count = pois.filter((p) => p.category === catKey).length;
          if (count === 0) return null;

          const isSelected = selectedCategory === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className="px-2 py-1 rounded-md shrink-0 flex items-center gap-1 transition-colors border"
              style={{
                backgroundColor: isSelected ? meta.bgColor : 'rgba(255,255,255,0.03)',
                borderColor: isSelected ? meta.borderColor : 'rgba(255,255,255,0.06)',
                color: isSelected ? meta.color : '#94a3b8',
                fontWeight: isSelected ? '700' : '500',
              }}
            >
              {CATEGORY_ICONS[catKey]}
              <span>{meta.shortLabel}</span>
              <span className="opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Content List */}
      {loading && pois.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-xs">Fetching OpenStreetMap civic POIs…</span>
        </div>
      ) : error && pois.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-xs text-rose-400">{error}</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-command-800 text-xs text-cyan-300 hover:bg-command-700"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      ) : filteredPois.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500">
          No points of interest recorded for this category in the visible radius.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {filteredPois.slice(0, 15).map((poi) => {
            const meta = POI_CATEGORIES[poi.category];
            return (
              <div
                key={poi.id}
                onClick={() => handleFocusPoi(poi)}
                className="bg-command-900/40 hover:bg-command-900/80 border border-white/5 hover:border-white/15 p-2 rounded-lg cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {poi.name}
                      </span>
                    </div>
                    {poi.address && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 ml-3.5">
                        {poi.address}
                      </p>
                    )}
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-cyan-400 transition-all shrink-0"
                    title="Focus on map"
                  >
                    <Navigation className="w-3 h-3" />
                  </button>
                </div>
                {(poi.phone || poi.emergency) && (
                  <div className="flex items-center gap-2 mt-1.5 ml-3.5 text-[9px]">
                    {poi.emergency && (
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1 py-0.2 rounded font-bold">
                        24/7 EMERGENCY
                      </span>
                    )}
                    {poi.phone && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-cyan-400" />
                        {poi.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attribution footer */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500">
        <span>Source: OpenStreetMap Contributors</span>
        <span className="text-cyan-400/80">Radius: ~4.5 km</span>
      </div>
    </div>
  );
};
