import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Info } from 'lucide-react';
import {
  Map,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Popup,
  type GeoJSONSource,
} from 'maplibre-gl';
import { MAP_STYLES } from '../../utils/constants';
import { useLocation } from '../../hooks/useLocation';
import { useMapLayers } from '../../context/MapLayersContext';
import { createCityPulseMarkerElement } from './LocationMarker';
import type { RiskHotspot, RiskLevel } from '../../services/riskEngine';
import type { CityTrafficPoint } from '../../types/traffic';
import type { CivicReportMeta } from '../../types/report';
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS } from '../../types/report';

interface RiskMapProps {
  hotspots: RiskHotspot[];
  trafficPoints?: CityTrafficPoint[];
  citizenReports?: CivicReportMeta[];
  onSelectHotspot?: (hotspot: RiskHotspot) => void;
}

const HOTSPOT_SOURCE_ID = 'risk-hotspots-source';
const HOTSPOT_HALO_LAYER_ID = 'risk-hotspots-halo';
const HOTSPOT_CORE_LAYER_ID = 'risk-hotspots-core';

const TRAFFIC_SOURCE_ID = 'risk-traffic-source';
const TRAFFIC_CORE_LAYER_ID = 'risk-traffic-core';

const REPORTS_SOURCE_ID = 'risk-reports-source';
const REPORTS_CORE_LAYER_ID = 'risk-reports-core';

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  LOW: '#10b981',
  GUARDED: '#06b6d4',
  ELEVATED: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export const RiskMap: React.FC<RiskMapProps> = ({
  hotspots,
  trafficPoints = [],
  citizenReports = [],
  onSelectHotspot,
}) => {
  const { selectedLocation, mapTarget } = useLocation();
  const { mapTheme } = useMapLayers();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const activePopupRef = useRef<Popup | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const targetStyleUrl = mapTheme === 'dark' ? MAP_STYLES[0].url : MAP_STYLES[1].url;

  // ── Popups ──────────────────────────────────────────────────────────────────

  const openHotspotPopup = useCallback(
    (mapInstance: Map, coords: [number, number], props: any) => {
      if (activePopupRef.current) activePopupRef.current.remove();

      const color = props.color || '#f97316';
      const signals = props.supportingSignals ? JSON.parse(props.supportingSignals) : [];
      const reportCount = props.reportCount ? parseInt(props.reportCount, 10) : 0;
      const trafficCount = props.trafficCount ? parseInt(props.trafficCount, 10) : 0;

      const html = `
        <div style="font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; min-width: 230px; color: #f1f5f9; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-weight: 700; color: #fff; text-transform: uppercase; font-size: 10px;">RISK HOTSPOT</span>
            <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${color}25; color: ${color}; border: 1px solid ${color}60;">
              ${props.level} (${props.score}/100)
            </span>
          </div>
          <div style="margin-bottom: 6px;">
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">Primary Signal</div>
            <div style="font-weight: 700; color: #fff; font-size: 12px; margin-top: 1px;">${props.primaryFactor}</div>
          </div>
          <div style="margin-bottom: 8px; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 9px; color: #38bdf8; text-transform: uppercase; font-weight: 700; margin-bottom: 3px;">Supporting Evidence</div>
            <div style="font-size: 10px; color: #cbd5e1; line-height: 1.4;">
              ${reportCount > 0 ? `• ${reportCount} active civic report(s)<br/>` : ''}
              ${trafficCount > 0 ? `• ${trafficCount} severe traffic sample(s)<br/>` : ''}
              ${signals.map((s: string) => `• ${s}`).join('<br/>')}
            </div>
          </div>
          <div style="font-size: 9px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; display: flex; justify-content: space-between;">
            <span>Updated: ${props.updatedAt || 'Just now'}</span>
            <span style="color: ${color}; font-weight: 700;">Spatial Cluster</span>
          </div>
        </div>
      `;

      activePopupRef.current = new Popup({
        className: 'citypulse-traffic-popup',
        closeButton: true,
        closeOnClick: true,
        offset: 14,
      })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(mapInstance);
    },
    []
  );

  // ── Sync Hotspots ───────────────────────────────────────────────────────────
  const syncHotspotsToMap = useCallback(
    (mapInstance: Map, spotList: RiskHotspot[]) => {
      if (!mapInstance || !mapInstance.isStyleLoaded()) return;

      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: spotList.map((h) => ({
          type: 'Feature' as const,
          id: h.id,
          geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
          properties: {
            id: h.id,
            score: h.score,
            level: h.level,
            color: RISK_LEVEL_COLORS[h.level],
            primaryFactor: h.primaryFactor,
            supportingSignals: JSON.stringify(h.supportingSignals),
            reportCount: h.reportCount,
            trafficCount: h.trafficCount,
            updatedAt: h.updatedAt,
            radiusMeters: h.radiusMeters,
          },
        })),
      };

      const existingSource = mapInstance.getSource(HOTSPOT_SOURCE_ID) as GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        mapInstance.addSource(HOTSPOT_SOURCE_ID, { type: 'geojson', data: geojsonData });

        // Soft, semi-transparent risk circle
        mapInstance.addLayer({
          id: HOTSPOT_HALO_LAYER_ID,
          type: 'circle',
          source: HOTSPOT_SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 16, 14, 34, 18, 60],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.28,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.7,
          },
        });

        // Core dot
        mapInstance.addLayer({
          id: HOTSPOT_CORE_LAYER_ID,
          type: 'circle',
          source: HOTSPOT_SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 11, 18, 16],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.95,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        mapInstance.on('mouseenter', HOTSPOT_CORE_LAYER_ID, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });
        mapInstance.on('mouseleave', HOTSPOT_CORE_LAYER_ID, () => {
          mapInstance.getCanvas().style.cursor = '';
        });

        mapInstance.on('click', HOTSPOT_CORE_LAYER_ID, (e) => {
          if (!e.features || e.features.length === 0) return;
          const f = e.features[0];
          const coords = (f.geometry as any).coordinates.slice() as [number, number];
          openHotspotPopup(mapInstance, coords, f.properties);

          const matchedSpot = spotList.find((h) => h.id === f.properties?.id);
          if (matchedSpot && onSelectHotspot) {
            onSelectHotspot(matchedSpot);
          }
        });
      }
    },
    [openHotspotPopup, onSelectHotspot]
  );

  // ── Sync Reports ────────────────────────────────────────────────────────────
  const syncReportsToMap = useCallback((mapInstance: Map, reportsList: CivicReportMeta[]) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: reportsList
        .filter((r) => r.status !== 'RESOLVED')
        .map((r) => ({
          type: 'Feature' as const,
          id: r.id,
          geometry: { type: 'Point' as const, coordinates: [r.location.longitude, r.location.latitude] },
          properties: {
            id: r.id,
            issueLabel: ISSUE_TYPE_LABELS[r.issueType] || r.issueType,
            severity: r.severity,
            color: SEVERITY_COLORS[r.severity] || '#eab308',
          },
        })),
    };

    const existingSource = mapInstance.getSource(REPORTS_SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      mapInstance.addSource(REPORTS_SOURCE_ID, { type: 'geojson', data: geojsonData });
      mapInstance.addLayer({
        id: REPORTS_CORE_LAYER_ID,
        type: 'circle',
        source: REPORTS_SOURCE_ID,
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
  }, []);

  // ── Sync Traffic ────────────────────────────────────────────────────────────
  const syncTrafficToMap = useCallback((mapInstance: Map, pts: CityTrafficPoint[]) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: pts
        .filter((p) => p.condition === 'Heavy' || p.condition === 'Severe' || p.roadClosure)
        .map((p) => ({
          type: 'Feature' as const,
          id: p.id,
          geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
          properties: { color: p.classification.color },
        })),
    };

    const existingSource = mapInstance.getSource(TRAFFIC_SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      mapInstance.addSource(TRAFFIC_SOURCE_ID, { type: 'geojson', data: geojsonData });
      mapInstance.addLayer({
        id: TRAFFIC_CORE_LAYER_ID,
        type: 'circle',
        source: TRAFFIC_SOURCE_ID,
        paint: {
          'circle-radius': 4.5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
  }, []);

  // ── Init Map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return;

    const mapInstance = new Map({
      container: mapContainer.current,
      style: targetStyleUrl,
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 12.8,
      attributionControl: false,
    });

    mapInstance.addControl(
      new NavigationControl({ visualizePitch: false, showCompass: true, showZoom: true }),
      'bottom-right'
    );
    mapInstance.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    mapInstance.addControl(
      new AttributionControl({ compact: true, customAttribution: 'CityPulse Risk Intelligence' }),
      'bottom-right'
    );

    mapInstance.on('load', () => {
      setIsMapLoaded(true);
      mapInstance.resize();

      createCityPulseMarkerElement(selectedLocation);

      syncHotspotsToMap(mapInstance, hotspots);
      syncReportsToMap(mapInstance, citizenReports);
      syncTrafficToMap(mapInstance, trafficPoints);
    });

    mapRef.current = mapInstance;

    return () => {
      if (activePopupRef.current) activePopupRef.current.remove();
      mapInstance.remove();
      mapRef.current = null;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    mapRef.current.setStyle(targetStyleUrl);
    mapRef.current.once('style.load', () => {
      if (mapRef.current) {
        syncHotspotsToMap(mapRef.current, hotspots);
        syncReportsToMap(mapRef.current, citizenReports);
        syncTrafficToMap(mapRef.current, trafficPoints);
      }
    });
  }, [targetStyleUrl, isMapLoaded, syncHotspotsToMap, syncReportsToMap, syncTrafficToMap, hotspots, citizenReports, trafficPoints]);

  // Sync hotspots
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    syncHotspotsToMap(mapRef.current, hotspots);
  }, [hotspots, isMapLoaded, syncHotspotsToMap]);

  // Sync city flyTo
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    mapRef.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: mapTarget.zoom || 12.8,
      duration: 1000,
    });
  }, [selectedLocation, mapTarget, isMapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090e] dark:bg-[#07090e] select-none rounded-2xl border border-white/10 shadow-2xl">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* No Hotspots Overlay Banner */}
      {hotspots.length === 0 && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="bg-command-950/90 border border-white/10 backdrop-blur-md rounded-xl px-3 py-2 text-xs font-mono text-slate-300 shadow-hud flex items-center gap-2 pointer-events-auto">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>No significant risk hotspots detected from current data</span>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-command-950/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-xs font-mono shadow-hud pointer-events-auto space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
            Risk Map Legend
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Guarded
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Elevated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
