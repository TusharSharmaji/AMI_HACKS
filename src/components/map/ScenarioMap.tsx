import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Map,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  type GeoJSONSource,
} from 'maplibre-gl';
import { MAP_STYLES } from '../../utils/constants';
import { useLocation } from '../../hooks/useLocation';
import { useMapLayers } from '../../context/MapLayersContext';
import { createCityPulseMarkerElement } from './LocationMarker';
import type { ModeledSpatialNode } from '../../services/scenarioEngine';
import type { CityTrafficPoint } from '../../types/traffic';
import type { CivicReportMeta } from '../../types/report';
import { Info } from 'lucide-react';

interface ScenarioMapProps {
  viewMode: 'CURRENT' | 'SCENARIO';
  spatialNodes: ModeledSpatialNode[];
  trafficPoints: CityTrafficPoint[];
  citizenReports: CivicReportMeta[];
}

const TRAFFIC_SOURCE_ID = 'scenario-traffic-source';
const TRAFFIC_LAYER_ID = 'scenario-traffic-layer';
const REPORTS_SOURCE_ID = 'scenario-reports-source';
const REPORTS_LAYER_ID = 'scenario-reports-layer';

export const ScenarioMap: React.FC<ScenarioMapProps> = ({
  viewMode,
  spatialNodes,
  trafficPoints,
  citizenReports,
}) => {
  const { selectedLocation, mapTarget } = useLocation();
  const { mapTheme } = useMapLayers();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const targetStyleUrl = mapTheme === 'dark' ? MAP_STYLES[0].url : MAP_STYLES[1].url;

  const syncLayersToMap = useCallback(
    (mapInstance: Map) => {
      if (!mapInstance || !mapInstance.isStyleLoaded()) return;

      // 1. Traffic Layer Data
      const trafficFeatures =
        viewMode === 'SCENARIO'
          ? spatialNodes.map((n) => ({
              type: 'Feature' as const,
              id: n.id,
              geometry: { type: 'Point' as const, coordinates: [n.longitude, n.latitude] },
              properties: {
                color: n.color,
                congestion: n.modeledCongestion,
                condition: n.modeledCondition,
              },
            }))
          : trafficPoints.map((p) => ({
              type: 'Feature' as const,
              id: p.id,
              geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
              properties: {
                color: p.classification.color,
                congestion: p.congestionPercentage,
                condition: p.condition,
              },
            }));

      const trafficGeojson = {
        type: 'FeatureCollection' as const,
        features: trafficFeatures,
      };

      const existingTrafficSource = mapInstance.getSource(TRAFFIC_SOURCE_ID) as GeoJSONSource | undefined;
      if (existingTrafficSource) {
        existingTrafficSource.setData(trafficGeojson);
      } else {
        mapInstance.addSource(TRAFFIC_SOURCE_ID, { type: 'geojson', data: trafficGeojson });
        mapInstance.addLayer({
          id: TRAFFIC_LAYER_ID,
          type: 'circle',
          source: TRAFFIC_SOURCE_ID,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 12, 18, 18],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }

      // 2. Citizen Reports Layer Data
      const activeReports = citizenReports.filter((r) => r.status !== 'RESOLVED');
      const reportsGeojson = {
        type: 'FeatureCollection' as const,
        features: activeReports.map((r) => ({
          type: 'Feature' as const,
          id: r.id,
          geometry: { type: 'Point' as const, coordinates: [r.location.longitude, r.location.latitude] },
          properties: {
            severity: r.severity,
            color: r.severity === 'Critical' ? '#ef4444' : r.severity === 'High' ? '#f97316' : '#f59e0b',
          },
        })),
      };

      const existingReportsSource = mapInstance.getSource(REPORTS_SOURCE_ID) as GeoJSONSource | undefined;
      if (existingReportsSource) {
        existingReportsSource.setData(reportsGeojson);
      } else {
        mapInstance.addSource(REPORTS_SOURCE_ID, { type: 'geojson', data: reportsGeojson });
        mapInstance.addLayer({
          id: REPORTS_LAYER_ID,
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
    },
    [viewMode, spatialNodes, trafficPoints, citizenReports]
  );

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
      new AttributionControl({ compact: true, customAttribution: 'CityPulse Scenario Simulation' }),
      'bottom-right'
    );

    mapInstance.on('load', () => {
      setIsMapLoaded(true);
      mapInstance.resize();
      createCityPulseMarkerElement(selectedLocation);
      syncLayersToMap(mapInstance);
    });

    mapRef.current = mapInstance;

    return () => {
      mapInstance.remove();
      mapRef.current = null;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    mapRef.current.setStyle(targetStyleUrl);
    mapRef.current.once('style.load', () => {
      if (mapRef.current) syncLayersToMap(mapRef.current);
    });
  }, [targetStyleUrl, isMapLoaded, syncLayersToMap]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    syncLayersToMap(mapRef.current);
  }, [viewMode, spatialNodes, trafficPoints, citizenReports, isMapLoaded, syncLayersToMap]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    mapRef.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: mapTarget.zoom || 12.8,
      duration: 1000,
    });
  }, [selectedLocation, mapTarget, isMapLoaded]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#07090e] select-none rounded-2xl border border-white/10 shadow-2xl">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Mode Status Pill */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-command-950/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono shadow-hud pointer-events-auto flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              viewMode === 'SCENARIO' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="font-bold text-white text-[10px] uppercase tracking-wider">
            {viewMode === 'SCENARIO' ? 'MODELED SCENARIO OVERLAY' : 'LIVE CURRENT CONDITIONS'}
          </span>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-command-950/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono shadow-hud pointer-events-auto flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Light
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Heavy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Severe
          </span>
        </div>
      </div>

      {spatialNodes.length === 0 && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none">
          <div className="bg-command-950/90 border border-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300 shadow-hud flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Spatial impact derived from baseline coordinates</span>
          </div>
        </div>
      )}
    </div>
  );
};
