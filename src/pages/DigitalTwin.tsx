import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Map,
  NavigationControl as MLNavigationControl,
  ScaleControl as MLScaleControl,
  AttributionControl as MLAttributionControl,
  type GeoJSONSource,
} from 'maplibre-gl';
import {
  Building2,
  Car,
  Landmark,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Layers,
  Move3d,
  ArrowLeftRight,
  Radio,
  X,
  CheckCircle,
} from 'lucide-react';
import { MAP_STYLES } from '../utils/constants';
import { useLocation } from '../hooks/useLocation';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { usePoiData } from '../hooks/usePoiData';
import { getReports, REPORT_SAVED_EVENT, updateReportStatus } from '../services/reportService';
import { formatTravelTime } from '../services/trafficService';
import type { CityTrafficPoint } from '../types/traffic';
import type { PoiItem } from '../types/poi';
import { POI_CATEGORIES } from '../types/poi';
import type { CivicReportMeta, ReportStatus } from '../types/report';
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, WORKFLOW_STAGES } from '../types/report';

// Ensure Cesium asset path and global exposure
if (typeof window !== 'undefined') {
  (window as any).CESIUM_BASE_URL = '/cesium/';
  if (typeof (Cesium.buildModuleUrl as any)?.setBaseUrl === 'function') {
    (Cesium.buildModuleUrl as any).setBaseUrl('/cesium/');
  }
  (window as any).Cesium = Cesium;
}

// ─── 2D MapLibre Source & Layer Constants ─────────────────────────────────────
const ML_TRAFFIC_SOURCE = 'dt-2d-traffic-source';
const ML_TRAFFIC_HALO = 'dt-2d-traffic-halo';
const ML_TRAFFIC_CORE = 'dt-2d-traffic-core';

const ML_POI_SOURCE = 'dt-2d-poi-source';
const ML_POI_HALO = 'dt-2d-poi-halo';
const ML_POI_SYMBOL = 'dt-2d-poi-symbol';

const ML_REPORTS_SOURCE = 'dt-2d-reports-source';
const ML_REPORTS_HALO = 'dt-2d-reports-halo';
const ML_REPORTS_CORE = 'dt-2d-reports-core';

interface SelectedBuildingInfo {
  name?: string;
  type?: string;
  height?: string;
  levels?: string;
  address?: string;
  coords?: string;
}

interface SelectedOverlayInfo {
  type: 'traffic' | 'poi' | 'report';
  data: any;
}

export const DigitalTwin: React.FC = () => {
  const { selectedLocation } = useLocation();

  // Reuse existing hooks
  const { trafficPoints } = useCityTraffic();
  const { pois, filteredPois } = usePoiData();

  // Reports state
  const [citizenReports, setCitizenReports] = useState<CivicReportMeta[]>(() => getReports());
  useEffect(() => {
    const h1 = () => setCitizenReports(getReports());
    const h2 = (e: Event) => {
      const nr = (e as CustomEvent<CivicReportMeta>).detail;
      if (nr) {
        setCitizenReports((prev) => (prev.some((r) => r.id === nr.id) ? prev : [nr, ...prev]));
      } else {
        setCitizenReports(getReports());
      }
    };
    window.addEventListener('storage', h1);
    window.addEventListener(REPORT_SAVED_EVENT, h2);
    window.addEventListener('focus', h1);
    return () => {
      window.removeEventListener('storage', h1);
      window.removeEventListener(REPORT_SAVED_EVENT, h2);
      window.removeEventListener('focus', h1);
    };
  }, []);

  // Mode & Panels
  const [is3D, setIs3D] = useState(true);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const [isCesiumReady, setIsCesiumReady] = useState(false);

  // Layer toggles
  const [showBuildings, setShowBuildings] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [showPoisLayer, setShowPoisLayer] = useState(true);
  const [showReportsLayer, setShowReportsLayer] = useState(true);

  // Inspector state
  const [selectedBuilding, setSelectedBuilding] = useState<SelectedBuildingInfo | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<SelectedOverlayInfo | null>(null);

  // Container refs
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const maplibreContainerRef = useRef<HTMLDivElement>(null);

  // Cesium instance refs
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const trafficDsRef = useRef<Cesium.CustomDataSource | null>(null);
  const poiDsRef = useRef<Cesium.CustomDataSource | null>(null);
  const reportsDsRef = useRef<Cesium.CustomDataSource | null>(null);

  // MapLibre instance refs (for 2D view)
  const maplibreRef = useRef<Map | null>(null);
  const [isMaplibreLoaded, setIsMaplibreLoaded] = useState(false);

  // Subtitle
  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');
  const activePois = useMemo(() => (filteredPois.length ? filteredPois : pois), [filteredPois, pois]);

  // ─── 1. Cesium Viewer & 3D Tiles Initialization ─────────────────────────────
  useEffect(() => {
    if (!is3D) return;
    if (!cesiumContainerRef.current) return;

    let destroyed = false;
    setCesiumError(null);
    setIsCesiumReady(false);

    const token = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN;
    if (!token) {
      setCesiumError('VITE_CESIUM_ION_ACCESS_TOKEN is missing or undefined in environment.');
      return;
    }

    Cesium.Ion.defaultAccessToken = token;

    let viewer: Cesium.Viewer;
    try {
      viewer = new Cesium.Viewer(cesiumContainerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
        scene3DOnly: true,
      });

      viewerRef.current = viewer;
      (window as any).__cesiumViewer = viewer;

      // Visual excellence: depth testing and smooth lighting
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.highDynamicRange = true;

      // Data sources for overlays
      const trafficDs = new Cesium.CustomDataSource('traffic-nodes');
      const poiDs = new Cesium.CustomDataSource('poi-nodes');
      const reportsDs = new Cesium.CustomDataSource('reports-nodes');

      viewer.dataSources.add(trafficDs);
      viewer.dataSources.add(poiDs);
      viewer.dataSources.add(reportsDs);

      trafficDsRef.current = trafficDs;
      poiDsRef.current = poiDs;
      reportsDsRef.current = reportsDs;

      trafficDs.show = showTraffic;
      poiDs.show = showPoisLayer;
      reportsDs.show = showReportsLayer;

      // Fly to initial city
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          selectedLocation.longitude,
          selectedLocation.latitude - 0.015,
          1500
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0.0,
        },
        duration: 1.8,
      });

      // Load Real Cesium OSM Buildings 3D Tileset
      Cesium.createOsmBuildingsAsync()
        .then((tileset) => {
          if (destroyed) {
            viewer.scene.primitives.remove(tileset);
            return;
          }
          viewer.scene.primitives.add(tileset);
          tilesetRef.current = tileset;
          (window as any).__osmTileset = tileset;
          tileset.show = showBuildings;
          setIsCesiumReady(true);
        })
        .catch((err) => {
          console.error('Cesium OSM Buildings load error:', err);
          if (!destroyed) {
            setCesiumError(`Cesium OSM Buildings 3D Tileset failed: ${err.message || err}`);
          }
        });

      // Scene picking handler
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement: any) => {
        if (!viewer || viewer.isDestroyed()) return;
        const picked = viewer.scene.pick(movement.position);

        if (Cesium.defined(picked)) {
          // 1. Check if it's an overlay entity
          if (picked.id && (picked.id as any)._cityPulseType) {
            const type = (picked.id as any)._cityPulseType as 'traffic' | 'poi' | 'report';
            const data = (picked.id as any)._rawData;
            setSelectedOverlay({ type, data });
            setSelectedBuilding(null);
            return;
          }

          // 2. Check if it's an OSM 3D Building tile feature
          if (picked instanceof Cesium.Cesium3DTileFeature) {
            const props: Record<string, any> = {};
            if (typeof picked.getPropertyIds === 'function') {
              const ids = picked.getPropertyIds();
              for (const id of ids) {
                props[id] = picked.getProperty(id);
              }
            }

            const name = props['name'] || props['building:name'] || props['name:en'] || '';
            const bType = props['building'] || props['type'] || '';
            const height =
              props['cesium#estimatedHeight'] ||
              props['height'] ||
              props['render_height'] ||
              '';
            const levels = props['building:levels'] || props['levels'] || '';
            const street = props['addr:street'] || '';
            const housenumber = props['addr:housenumber'] || '';
            const postcode = props['addr:postcode'] || '';
            const address = [housenumber, street, postcode].filter(Boolean).join(' ');

            let coordsText = '';
            try {
              const cartesian = viewer.scene.pickPosition(movement.position);
              if (cartesian) {
                const carto = Cesium.Cartographic.fromCartesian(cartesian);
                coordsText = `${Cesium.Math.toDegrees(carto.latitude).toFixed(5)}, ${Cesium.Math.toDegrees(carto.longitude).toFixed(5)}`;
              }
            } catch {
              coordsText = `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`;
            }

            setSelectedBuilding({
              name: name || undefined,
              type: bType && bType !== 'yes' ? bType : undefined,
              height: height ? (typeof height === 'number' ? `~${Math.round(height)}m` : String(height)) : undefined,
              levels: levels ? String(levels) : undefined,
              address: address || undefined,
              coords: coordsText,
            });
            setSelectedOverlay(null);
            return;
          }
        }

        // Clicked empty area
        setSelectedBuilding(null);
        setSelectedOverlay(null);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      (viewer as any).__clickEventHandler = handler;
    } catch (err: any) {
      console.error('Cesium Viewer initialization error:', err);
      setCesiumError(`Cesium Digital Twin failed to initialize: ${err.message || err}`);
    }

    return () => {
      destroyed = true;
      if (viewer && !viewer.isDestroyed()) {
        try {
          if ((viewer as any).__clickEventHandler) {
            (viewer as any).__clickEventHandler.destroy();
          }
          viewer.destroy();
        } catch (e) {
          console.warn('Error during Cesium destruction:', e);
        }
      }
      viewerRef.current = null;
      tilesetRef.current = null;
      trafficDsRef.current = null;
      poiDsRef.current = null;
      reportsDsRef.current = null;
      delete (window as any).__cesiumViewer;
      delete (window as any).__osmTileset;
    };
  }, [is3D]);

  // ─── 2. Fly camera on City Change (3D Mode) ─────────────────────────────────
  useEffect(() => {
    if (!is3D || !viewerRef.current || viewerRef.current.isDestroyed()) return;
    viewerRef.current.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedLocation.longitude,
        selectedLocation.latitude - 0.015,
        1500
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0.0,
      },
      duration: 1.8,
    });
    setSelectedBuilding(null);
    setSelectedOverlay(null);
  }, [selectedLocation, is3D]);

  // ─── 3. Sync Cesium Overlays (Traffic, POIs, Reports) ────────────────────────
  useEffect(() => {
    const ds = trafficDsRef.current;
    if (!ds || !viewerRef.current || viewerRef.current.isDestroyed()) return;
    ds.entities.removeAll();

    trafficPoints.forEach((p) => {
      const entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, 0),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString(p.classification.color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      (entity as any)._cityPulseType = 'traffic';
      (entity as any)._rawData = p;
    });
  }, [trafficPoints, is3D]);

  useEffect(() => {
    const ds = poiDsRef.current;
    if (!ds || !viewerRef.current || viewerRef.current.isDestroyed()) return;
    ds.entities.removeAll();

    activePois.forEach((poi) => {
      const meta = POI_CATEGORIES[poi.category];
      const entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(poi.longitude, poi.latitude, 0),
        point: {
          pixelSize: 13,
          color: Cesium.Color.fromCssColorString(meta?.color || '#3b82f6'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      (entity as any)._cityPulseType = 'poi';
      (entity as any)._rawData = poi;
    });
  }, [activePois, is3D]);

  useEffect(() => {
    const ds = reportsDsRef.current;
    if (!ds || !viewerRef.current || viewerRef.current.isDestroyed()) return;
    ds.entities.removeAll();

    citizenReports.forEach((r) => {
      const color = SEVERITY_COLORS[r.severity] || '#eab308';
      const entity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(r.location.longitude, r.location.latitude, 0),
        point: {
          pixelSize: 16,
          color: Cesium.Color.fromCssColorString(color),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      (entity as any)._cityPulseType = 'report';
      (entity as any)._rawData = r;
    });
  }, [citizenReports, is3D]);

  // ─── 4. Cesium Layer Visibility Toggles ─────────────────────────────────────
  useEffect(() => {
    if (tilesetRef.current) {
      tilesetRef.current.show = showBuildings;
    }
  }, [showBuildings]);

  useEffect(() => {
    if (trafficDsRef.current) {
      trafficDsRef.current.show = showTraffic;
    }
  }, [showTraffic]);

  useEffect(() => {
    if (poiDsRef.current) {
      poiDsRef.current.show = showPoisLayer;
    }
  }, [showPoisLayer]);

  useEffect(() => {
    if (reportsDsRef.current) {
      reportsDsRef.current.show = showReportsLayer;
    }
  }, [showReportsLayer]);

  // ─── 5. 2D MapLibre Mode (When is3D === false) ──────────────────────────────
  useEffect(() => {
    if (is3D) {
      if (maplibreRef.current) {
        maplibreRef.current.remove();
        maplibreRef.current = null;
        setIsMaplibreLoaded(false);
      }
      return;
    }

    if (!maplibreContainerRef.current) return;

    const m = new Map({
      container: maplibreContainerRef.current,
      style: MAP_STYLES[0].url,
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 14,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    m.addControl(new MLNavigationControl({ visualizePitch: false, showCompass: true, showZoom: true }), 'bottom-right');
    m.addControl(new MLScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    m.addControl(new MLAttributionControl({ compact: true, customAttribution: 'CityPulse 2D View · © OpenStreetMap' }), 'bottom-right');

    m.on('load', () => {
      setIsMaplibreLoaded(true);
      m.resize();
    });

    maplibreRef.current = m;

    return () => {
      m.remove();
      maplibreRef.current = null;
      setIsMaplibreLoaded(false);
    };
  }, [is3D]);

  // Sync 2D MapLibre center when selectedLocation changes
  useEffect(() => {
    if (is3D || !maplibreRef.current) return;
    maplibreRef.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 14,
      pitch: 0,
      bearing: 0,
      duration: 1000,
    });
  }, [selectedLocation, is3D]);

  // Sync 2D overlays to MapLibre
  const syncMaplibreOverlays = useCallback(() => {
    const m = maplibreRef.current;
    if (!m || !isMaplibreLoaded) return;

    // Traffic
    const trafficGj = {
      type: 'FeatureCollection' as const,
      features: !showTraffic
        ? []
        : trafficPoints.map((p) => ({
            type: 'Feature' as const,
            id: p.id,
            geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
            properties: { ...p, color: p.classification.color },
          })),
    };
    const tSrc = m.getSource(ML_TRAFFIC_SOURCE) as GeoJSONSource | undefined;
    if (tSrc) {
      tSrc.setData(trafficGj);
    } else {
      m.addSource(ML_TRAFFIC_SOURCE, { type: 'geojson', data: trafficGj });
      m.addLayer({
        id: ML_TRAFFIC_HALO,
        type: 'circle',
        source: ML_TRAFFIC_SOURCE,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.3,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['get', 'color'],
        },
      });
      m.addLayer({
        id: ML_TRAFFIC_CORE,
        type: 'circle',
        source: ML_TRAFFIC_SOURCE,
        paint: {
          'circle-radius': 6.5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      m.on('click', ML_TRAFFIC_CORE, (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        setSelectedOverlay({ type: 'traffic', data: f.properties });
      });
    }

    // POIs
    const poiGj = {
      type: 'FeatureCollection' as const,
      features: !showPoisLayer
        ? []
        : activePois.map((p) => ({
            type: 'Feature' as const,
            id: p.id,
            geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
            properties: { ...p, color: POI_CATEGORIES[p.category]?.color || '#3b82f6' },
          })),
    };
    const pSrc = m.getSource(ML_POI_SOURCE) as GeoJSONSource | undefined;
    if (pSrc) {
      pSrc.setData(poiGj);
    } else {
      m.addSource(ML_POI_SOURCE, { type: 'geojson', data: poiGj });
      m.addLayer({
        id: ML_POI_HALO,
        type: 'circle',
        source: ML_POI_SOURCE,
        paint: { 'circle-radius': 9, 'circle-color': ['get', 'color'], 'circle-opacity': 0.25 },
      });
      m.addLayer({
        id: ML_POI_SYMBOL,
        type: 'circle',
        source: ML_POI_SOURCE,
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });
      m.on('click', ML_POI_SYMBOL, (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        setSelectedOverlay({ type: 'poi', data: f.properties });
      });
    }

    // Reports
    const repGj = {
      type: 'FeatureCollection' as const,
      features: !showReportsLayer
        ? []
        : citizenReports.map((r) => ({
            type: 'Feature' as const,
            id: r.id,
            geometry: { type: 'Point' as const, coordinates: [r.location.longitude, r.location.latitude] },
            properties: { ...r, color: SEVERITY_COLORS[r.severity] || '#eab308' },
          })),
    };
    const rSrc = m.getSource(ML_REPORTS_SOURCE) as GeoJSONSource | undefined;
    if (rSrc) {
      rSrc.setData(repGj);
    } else {
      m.addSource(ML_REPORTS_SOURCE, { type: 'geojson', data: repGj });
      m.addLayer({
        id: ML_REPORTS_HALO,
        type: 'circle',
        source: ML_REPORTS_SOURCE,
        paint: { 'circle-radius': 11, 'circle-color': ['get', 'color'], 'circle-opacity': 0.3 },
      });
      m.addLayer({
        id: ML_REPORTS_CORE,
        type: 'circle',
        source: ML_REPORTS_SOURCE,
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      m.on('click', ML_REPORTS_CORE, (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        setSelectedOverlay({ type: 'report', data: f.properties });
      });
    }
  }, [showTraffic, showPoisLayer, showReportsLayer, trafficPoints, activePois, citizenReports, isMaplibreLoaded]);

  useEffect(() => {
    if (!is3D) {
      syncMaplibreOverlays();
    }
  }, [is3D, syncMaplibreOverlays]);

  // ─── Camera Actions ─────────────────────────────────────────────────────────
  const resetCamera = useCallback(() => {
    if (is3D && viewerRef.current && !viewerRef.current.isDestroyed()) {
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          selectedLocation.longitude,
          selectedLocation.latitude - 0.015,
          1500
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-35),
          roll: 0.0,
        },
        duration: 1.5,
      });
    } else if (!is3D && maplibreRef.current) {
      maplibreRef.current.flyTo({
        center: [selectedLocation.longitude, selectedLocation.latitude],
        zoom: 14,
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
    }
  }, [is3D, selectedLocation]);

  const adjustPitch = useCallback((deltaDegrees: number) => {
    if (is3D && viewerRef.current && !viewerRef.current.isDestroyed()) {
      const rad = Cesium.Math.toRadians(deltaDegrees);
      if (deltaDegrees > 0) {
        viewerRef.current.camera.lookUp(rad);
      } else {
        viewerRef.current.camera.lookDown(Math.abs(rad));
      }
    }
  }, [is3D]);

  const adjustRotate = useCallback((deltaDegrees: number) => {
    if (is3D && viewerRef.current && !viewerRef.current.isDestroyed()) {
      const rad = Cesium.Math.toRadians(deltaDegrees);
      if (deltaDegrees > 0) {
        viewerRef.current.camera.rotateRight(rad);
      } else {
        viewerRef.current.camera.rotateLeft(Math.abs(rad));
      }
    }
  }, [is3D]);

  // ─── Advance Report Status ──────────────────────────────────────────────────
  const advanceReportStatus = (id: string, currentStatus: ReportStatus) => {
    const currentIdx = WORKFLOW_STAGES.indexOf(currentStatus);
    if (currentIdx < WORKFLOW_STAGES.length - 1) {
      const nextStatus = WORKFLOW_STAGES[currentIdx + 1];
      updateReportStatus(id, nextStatus);
      setCitizenReports(getReports());
      if (selectedOverlay && selectedOverlay.data.id === id) {
        setSelectedOverlay({
          ...selectedOverlay,
          data: { ...selectedOverlay.data, status: nextStatus },
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#06080d] select-none">
      {/* ── 3D Scene Container (Cesium) ── */}
      {is3D && (
        <div
          ref={cesiumContainerRef}
          className="absolute inset-0 w-full h-full"
          id="cesium-digital-twin-container"
        />
      )}

      {/* ── 2D Map Container (MapLibre fallback / return to 2D) ── */}
      {!is3D && (
        <div
          ref={maplibreContainerRef}
          className="absolute inset-0 w-full h-full"
          id="maplibre-2d-container"
        />
      )}

      {/* ── Error Banner if Cesium Fails ── */}
      {cesiumError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
          <div className="bg-red-950/90 border border-red-500/50 backdrop-blur-md rounded-2xl p-4 shadow-2xl text-red-200 text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Cesium Digital Twin Failed to Initialize</span>
            </div>
            <p className="text-red-300/90 leading-relaxed">{cesiumError}</p>
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIs3D(false)}
                className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800/80 border border-red-700/50 text-white font-semibold transition-colors"
              >
                Switch to 2D View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Left: Header Badge ── */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="bg-command-950/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-hud pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              DIGITAL TWIN
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">Real 3D City</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              CesiumJS • OSM Buildings 3D Tiles
            </span>
          </div>
          <h1 className="text-lg font-bold font-mono text-white tracking-tight leading-tight">
            {selectedLocation.name}
          </h1>
          {locationSubtitle && (
            <p className="text-[11px] text-slate-400 font-mono">{locationSubtitle}</p>
          )}
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {is3D
              ? 'Streaming Cesium OSM Buildings 3D Tileset on World Terrain'
              : 'Standard 2D MapLibre Vector Map'}
          </p>
        </div>
      </div>

      {/* ── Right Panel: Controls ── */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto w-64">
        <div className="bg-command-950/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-hud overflow-hidden">
          {/* Panel header */}
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
                Controls
              </span>
            </div>
            {panelCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {!panelCollapsed && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
              {/* Layer toggles */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Layers</span>

                {[
                  {
                    label: '3D Buildings',
                    on: showBuildings,
                    toggle: () => setShowBuildings(!showBuildings),
                    color: 'text-violet-400',
                  },
                  {
                    label: 'Traffic',
                    on: showTraffic,
                    toggle: () => setShowTraffic(!showTraffic),
                    color: 'text-cyan-400',
                  },
                  {
                    label: 'Civic POIs',
                    on: showPoisLayer,
                    toggle: () => setShowPoisLayer(!showPoisLayer),
                    color: 'text-emerald-400',
                  },
                  {
                    label: 'Reports',
                    on: showReportsLayer,
                    toggle: () => setShowReportsLayer(!showReportsLayer),
                    color: 'text-amber-400',
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.toggle}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {item.on ? (
                        <Eye className={`w-3.5 h-3.5 ${item.color}`} />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span className={`text-xs font-mono ${item.on ? 'text-slate-200' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        item.on ? 'text-emerald-400' : 'text-slate-600'
                      }`}
                    >
                      {item.on ? 'ON' : 'OFF'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Camera controls */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Camera</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIs3D(!is3D)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                      is3D
                        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Move3d className="w-3.5 h-3.5" />
                    {is3D ? '3D View' : '2D View'}
                  </button>
                  <button
                    onClick={resetCamera}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-mono font-semibold bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                {is3D && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg border border-white/5 px-2 py-1">
                      <span className="text-[10px] font-mono text-slate-500">Tilt</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => adjustPitch(10)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                          title="Look Up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => adjustPitch(-10)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                          title="Look Down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white/[0.03] rounded-lg border border-white/5 px-2 py-1">
                      <span className="text-[10px] font-mono text-slate-500">Rotate</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => adjustRotate(-15)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                          title="Rotate Left"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => adjustRotate(15)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                          title="Rotate Right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Live Stats</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-violet-300">
                    <Building2 className="w-3 h-3" />
                    <span>{isCesiumReady ? 'Global 3D' : 'Loading...'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Car className="w-3 h-3" />
                    <span>{trafficPoints.length} Traffic</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Landmark className="w-3 h-3" />
                    <span>{activePois.length} POIs</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{citizenReports.length} Reports</span>
                  </div>
                </div>
              </div>

              {/* Return to 2D */}
              {is3D ? (
                <button
                  onClick={() => setIs3D(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Return to 2D
                </button>
              ) : (
                <button
                  onClick={() => setIs3D(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 hover:text-white transition-all"
                >
                  <Move3d className="w-3.5 h-3.5" />
                  Switch to 3D Cesium
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Building Inspector Popup (Cesium Scene Picking) ── */}
      {selectedBuilding && (
        <div className="absolute bottom-12 left-4 z-30 pointer-events-auto max-w-xs w-full animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-command-950/95 backdrop-blur-md border border-violet-500/30 rounded-2xl p-4 shadow-2xl text-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-violet-400" />
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  OSM 3D Building
                </span>
              </div>
              <button
                onClick={() => setSelectedBuilding(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {selectedBuilding.name && (
                <div>
                  <div className="text-[9px] text-slate-400 uppercase">Building Name</div>
                  <div className="text-white font-bold text-sm">{selectedBuilding.name}</div>
                </div>
              )}

              {selectedBuilding.type && (
                <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase">Type</span>
                  <span className="text-slate-200 capitalize font-semibold">{selectedBuilding.type}</span>
                </div>
              )}

              {selectedBuilding.height && (
                <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase">Estimated Height</span>
                  <span className="text-cyan-400 font-semibold">{selectedBuilding.height}</span>
                </div>
              )}

              {selectedBuilding.levels && (
                <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase">Levels</span>
                  <span className="text-violet-300 font-semibold">{selectedBuilding.levels}</span>
                </div>
              )}

              {selectedBuilding.address && (
                <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5">
                  <div className="text-[9px] text-slate-400 uppercase">Address</div>
                  <div className="text-slate-300">{selectedBuilding.address}</div>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500">
                <span>{selectedBuilding.coords || 'OpenStreetMap 3D'}</span>
                <span className="text-violet-400 font-semibold">Cesium OSM 3D Tiles</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay Inspector Popup (Traffic / POI / Report) ── */}
      {selectedOverlay && (
        <div className="absolute bottom-12 left-4 z-30 pointer-events-auto max-w-sm w-full animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-command-950/95 backdrop-blur-md border border-white/15 rounded-2xl p-4 shadow-2xl text-slate-100 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
                {selectedOverlay.type === 'traffic' && (
                  <>
                    <Car className="w-4 h-4 text-cyan-400" />
                    <span>TomTom Traffic Flow Node</span>
                  </>
                )}
                {selectedOverlay.type === 'poi' && (
                  <>
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span>Civic Facility POI</span>
                  </>
                )}
                {selectedOverlay.type === 'report' && (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Citizen Report</span>
                  </>
                )}
              </span>
              <button
                onClick={() => setSelectedOverlay(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Traffic Node Content */}
            {selectedOverlay.type === 'traffic' && (() => {
              const p = selectedOverlay.data as CityTrafficPoint;
              const color = p.classification?.color || '#10b981';
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Congestion Level</span>
                    <span
                      className="px-2 py-0.5 rounded font-bold uppercase text-[10px]"
                      style={{ background: `${color}25`, color, border: `1px solid ${color}60` }}
                    >
                      {p.classification?.label || p.condition || 'Flowing'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/5">
                    <div>
                      <div className="text-[9px] text-slate-400">CURRENT SPEED</div>
                      <div className="text-sm font-bold text-white">{p.currentSpeed} km/h</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">FREE FLOW</div>
                      <div className="text-sm font-bold text-slate-300">{p.freeFlowSpeed} km/h</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">TRAVEL TIME</div>
                      <div className="text-xs font-semibold text-white">{formatTravelTime(p.currentTravelTime)}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">FREE FLOW TIME</div>
                      <div className="text-xs font-semibold text-slate-400">{formatTravelTime(p.freeFlowTravelTime)}</div>
                    </div>
                  </div>
                  {p.roadClosure && (
                    <div className="px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-bold">
                      ROAD CLOSED
                    </div>
                  )}
                  <div className="text-[9px] text-slate-500 border-t border-white/5 pt-1.5 flex justify-between">
                    <span>{p.latitude?.toFixed(5)}, {p.longitude?.toFixed(5)}</span>
                    <span className="text-cyan-400 font-semibold">TomTom Live API</span>
                  </div>
                </div>
              );
            })()}

            {/* POI Content */}
            {selectedOverlay.type === 'poi' && (() => {
              const poi = selectedOverlay.data as PoiItem;
              const cat = POI_CATEGORIES[poi.category];
              return (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-white">{poi.name}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{ background: `${cat?.color || '#3b82f6'}20`, color: cat?.color || '#3b82f6' }}
                    >
                      {poi.categoryLabel || poi.category}
                    </span>
                    {poi.emergency && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40">
                        24/7 Emergency
                      </span>
                    )}
                  </div>
                  {poi.address && (
                    <div className="bg-white/[0.03] p-1.5 rounded-lg border border-white/5 text-slate-300 text-[11px]">
                      {poi.address}
                    </div>
                  )}
                  {poi.phone && (
                    <div className="text-slate-400 text-[10px]">
                      Tel: <span className="text-white">{poi.phone}</span>
                    </div>
                  )}
                  <div className="text-[9px] text-slate-500 border-t border-white/5 pt-1.5 flex justify-between">
                    <span>{poi.latitude?.toFixed(5)}, {poi.longitude?.toFixed(5)}</span>
                    <span className="text-emerald-400 font-semibold">Civic Database</span>
                  </div>
                </div>
              );
            })()}

            {/* Report Content */}
            {selectedOverlay.type === 'report' && (() => {
              const r = selectedOverlay.data as CivicReportMeta;
              const color = SEVERITY_COLORS[r.severity] || '#eab308';
              const curIdx = WORKFLOW_STAGES.indexOf(r.status);
              const nextStatus = curIdx < WORKFLOW_STAGES.length - 1 ? WORKFLOW_STAGES[curIdx + 1] : null;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">{r.id}</span>
                    <span
                      className="px-2 py-0.5 rounded font-bold uppercase text-[10px]"
                      style={{ background: `${color}25`, color, border: `1px solid ${color}60` }}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/5">
                    <div>
                      <div className="text-[9px] text-slate-400">ISSUE</div>
                      <div className="text-xs font-bold text-white">{ISSUE_TYPE_LABELS[r.issueType] || r.issueType}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">SEVERITY</div>
                      <div className="text-xs font-bold" style={{ color }}>{r.severity}</div>
                    </div>
                  </div>
                  {r.description && (
                    <div className="bg-black/40 p-2 rounded-lg text-slate-300 text-[11px] leading-relaxed max-h-24 overflow-y-auto">
                      {r.description}
                    </div>
                  )}
                  {nextStatus && (
                    <button
                      onClick={() => advanceReportStatus(r.id, r.status)}
                      className="w-full py-1.5 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Advance Workflow: {r.status} → {nextStatus}
                    </button>
                  )}
                  <div className="text-[9px] text-slate-500 border-t border-white/5 pt-1.5 flex justify-between">
                    <span>{r.location?.latitude?.toFixed(5)}, {r.location?.longitude?.toFixed(5)}</span>
                    <span className="text-amber-400 font-semibold">Citizen Report</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Bottom Left Status Bar ── */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-command-950/85 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-2 shadow-panel">
          <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>
            {is3D
              ? `CesiumJS • OSM Buildings 3D Tiles · ${selectedLocation.name}`
              : `MapLibre GL 2D · ${selectedLocation.name}`}
          </span>
        </div>
      </div>
    </div>
  );
};
