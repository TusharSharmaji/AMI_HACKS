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
import type { CityObservation } from '../../types/observation';
import { History } from 'lucide-react';

interface ReplayMapProps {
  observation: CityObservation | null;
}

const REPLAY_TRAFFIC_SOURCE = 'replay-traffic-source';
const REPLAY_TRAFFIC_LAYER = 'replay-traffic-layer';

export const ReplayMap: React.FC<ReplayMapProps> = ({ observation }) => {
  const { selectedLocation, mapTarget } = useLocation();
  const { mapTheme } = useMapLayers();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const targetStyleUrl = mapTheme === 'dark' ? MAP_STYLES[0].url : MAP_STYLES[1].url;

  const syncReplayToMap = useCallback(
    (mapInstance: Map, obs: CityObservation | null) => {
      if (!mapInstance || !mapInstance.isStyleLoaded() || !obs) return;

      const lat = obs.latitude || selectedLocation.latitude;
      const lng = obs.longitude || selectedLocation.longitude;

      // Sample visual circle representing recorded snapshot telemetry
      const features = [
        {
          type: 'Feature' as const,
          id: obs.id,
          geometry: { type: 'Point' as const, coordinates: [lng, lat] },
          properties: {
            color: obs.risk?.score && obs.risk.score >= 60 ? '#f97316' : '#06b6d4',
            score: obs.risk?.score || 0,
            level: obs.risk?.level || 'LOW',
          },
        },
      ];

      const geojsonData = {
        type: 'FeatureCollection' as const,
        features,
      };

      const existingSource = mapInstance.getSource(REPLAY_TRAFFIC_SOURCE) as GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        mapInstance.addSource(REPLAY_TRAFFIC_SOURCE, { type: 'geojson', data: geojsonData });
        mapInstance.addLayer({
          id: REPLAY_TRAFFIC_LAYER,
          type: 'circle',
          source: REPLAY_TRAFFIC_SOURCE,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 14, 14, 28, 18, 50],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.35,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
          },
        });
      }
    },
    [selectedLocation]
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
      new AttributionControl({ compact: true, customAttribution: 'CityPulse Archival Replay' }),
      'bottom-right'
    );

    mapInstance.on('load', () => {
      setIsMapLoaded(true);
      mapInstance.resize();
      createCityPulseMarkerElement(selectedLocation);
      syncReplayToMap(mapInstance, observation);
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
      if (mapRef.current) syncReplayToMap(mapRef.current, observation);
    });
  }, [targetStyleUrl, isMapLoaded, syncReplayToMap, observation]);

  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;
    syncReplayToMap(mapRef.current, observation);
  }, [observation, isMapLoaded, syncReplayToMap]);

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

      {/* Replay Timestamp Pill */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="bg-command-950/90 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono shadow-hud pointer-events-auto flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-bold text-white text-[10px] uppercase tracking-wider">
            {observation
              ? `RECORDED OBSERVATION · ${new Date(observation.timestamp).toLocaleTimeString()}`
              : 'LIVE OBSERVATION BASELINE'}
          </span>
        </div>
      </div>
    </div>
  );
};
