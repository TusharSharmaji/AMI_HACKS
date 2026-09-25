import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Map, 
  NavigationControl, 
  ScaleControl, 
  AttributionControl, 
  Marker,
  Popup,
  type GeoJSONSource
} from 'maplibre-gl';
import { 
  Maximize2, 
  RotateCcw, 
  MapPin, 
} from 'lucide-react';
import { MAP_STYLES } from '../../utils/constants';
import { useLocation } from '../../hooks/useLocation';
import { useMapLayers } from '../../context/MapLayersContext';
import { createCityPulseMarkerElement } from './LocationMarker';
import type { CityTrafficPoint } from '../../types/traffic';
import type { PoiItem } from '../../types/poi';
import { POI_CATEGORIES } from '../../types/poi';
import type { CivicReportMeta, ReportStatus } from '../../types/report';
import { ISSUE_TYPE_LABELS, SEVERITY_COLORS, WORKFLOW_STAGES } from '../../types/report';
import { getReports, updateReportStatus, REPORT_SAVED_EVENT } from '../../services/reportService';
import { formatTravelTime } from '../../services/trafficService';
import { registerPoiMapImages } from './MarkerElements';
import type { CityPulseSignal } from '../../services/signalEngine';

interface MapViewProps {
  onCoordinatesChange?: (coords: { lng: number; lat: number; zoom: number }) => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  cityTrafficPoints?: CityTrafficPoint[];
  showTrafficMarkers?: boolean;
  pois?: PoiItem[];
  showPois?: boolean;
  citizenReports?: CivicReportMeta[];
  showCitizenReports?: boolean;
  signals?: CityPulseSignal[];
  showSignals?: boolean;
}

const CITY_TRAFFIC_SOURCE_ID = 'citypulse-city-traffic-source';
const CITY_TRAFFIC_HALO_LAYER_ID = 'citypulse-traffic-points-halo';
const CITY_TRAFFIC_CORE_LAYER_ID = 'citypulse-traffic-points-core';

const CIVIC_POI_SOURCE_ID = 'citypulse-civic-poi-source';
const CIVIC_POI_HALO_LAYER_ID = 'citypulse-civic-poi-halo';
const CIVIC_POI_SYMBOL_LAYER_ID = 'citypulse-civic-poi-symbol';

const CITIZEN_REPORTS_SOURCE_ID = 'citypulse-citizen-reports-source';
const CITIZEN_REPORTS_HALO_LAYER_ID = 'citypulse-citizen-reports-halo';
const CITIZEN_REPORTS_CORE_LAYER_ID = 'citypulse-citizen-reports-core';

const CITY_SIGNALS_SOURCE_ID = 'citypulse-signals-source';
const CITY_SIGNALS_HALO_LAYER_ID = 'citypulse-signals-halo';
const CITY_SIGNALS_CORE_LAYER_ID = 'citypulse-signals-core';

export const MapView: React.FC<MapViewProps> = ({
  onCoordinatesChange,
  className = '',
  isExpanded = false,
  onToggleExpand,
  cityTrafficPoints = [],
  showTrafficMarkers,
  pois = [],
  showPois,
  citizenReports,
  showCitizenReports,
  signals = [],
  showSignals = true,
}) => {

  const { selectedLocation, mapTarget } = useLocation();
  const { mapTheme, showTraffic: ctxShowTraffic, showPois: ctxShowPois, showReports: ctxShowReports } = useMapLayers();

  // Use props if explicitly passed, otherwise fallback to context
  const effectiveShowTraffic = showTrafficMarkers !== undefined ? showTrafficMarkers : ctxShowTraffic;
  const effectiveShowPois = showPois !== undefined ? showPois : ctxShowPois;
  const effectiveShowReports = showCitizenReports !== undefined ? showCitizenReports : ctxShowReports;

  // Citizen reports state & synchronization
  const [localReports, setLocalReports] = useState<CivicReportMeta[]>(() => citizenReports ?? getReports());

  useEffect(() => {
    if (citizenReports !== undefined) {
      setLocalReports(citizenReports);
    }
  }, [citizenReports]);

  // Keep localReports refreshed on cross-tab writes, same-tab saves, and focus
  useEffect(() => {
    const handleStorage = () => setLocalReports(getReports());
    const handleReportSaved = (e: Event) => {
      const newReport = (e as CustomEvent<CivicReportMeta>).detail;
      if (newReport) {
        setLocalReports((prev) => {
          if (prev.some((r) => r.id === newReport.id)) return prev;
          return [newReport, ...prev];
        });
      } else {
        setLocalReports(getReports());
      }
    };
    const handleFocus = () => setLocalReports(getReports());

    window.addEventListener('storage', handleStorage);
    window.addEventListener(REPORT_SAVED_EVENT, handleReportSaved);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(REPORT_SAVED_EVENT, handleReportSaved);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const activeMarkerRef = useRef<Marker | null>(null);
  const activePopupRef = useRef<Popup | null>(null);

  const cityTrafficPointsRef = useRef<CityTrafficPoint[]>(cityTrafficPoints);
  const showTrafficMarkersRef = useRef<boolean>(effectiveShowTraffic);
  const poisRef = useRef<PoiItem[]>(pois);
  const showPoisRef = useRef<boolean>(effectiveShowPois);
  const citizenReportsRef = useRef<CivicReportMeta[]>(localReports);
  const showCitizenReportsRef = useRef<boolean>(effectiveShowReports);
  const signalsRef = useRef<CityPulseSignal[]>(signals);
  const showSignalsRef = useRef<boolean>(showSignals);

  useEffect(() => { cityTrafficPointsRef.current = cityTrafficPoints; }, [cityTrafficPoints]);
  useEffect(() => { showTrafficMarkersRef.current = effectiveShowTraffic; }, [effectiveShowTraffic]);
  useEffect(() => { poisRef.current = pois; }, [pois]);
  useEffect(() => { showPoisRef.current = effectiveShowPois; }, [effectiveShowPois]);
  useEffect(() => { citizenReportsRef.current = localReports; }, [localReports]);
  useEffect(() => { showCitizenReportsRef.current = effectiveShowReports; }, [effectiveShowReports]);
  useEffect(() => { signalsRef.current = signals; }, [signals]);
  useEffect(() => { showSignalsRef.current = showSignals; }, [showSignals]);

  // Global handler for advancing report status from popup
  useEffect(() => {
    (window as any).__citypulseAdvanceReportStatus = (id: string, nextStatus: ReportStatus) => {
      updateReportStatus(id, nextStatus);
      const updated = getReports();
      setLocalReports(updated);
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
    };

    return () => {
      delete (window as any).__citypulseAdvanceReportStatus;
    };
  }, []);

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const coordsCallbackRef = useRef(onCoordinatesChange);
  useEffect(() => {
    coordsCallbackRef.current = onCoordinatesChange;
  }, [onCoordinatesChange]);

  // Target style based on current map theme
  const targetStyleUrl = mapTheme === 'dark' ? MAP_STYLES[0].url : MAP_STYLES[1].url;

  // ─── Popups ─────────────────────────────────────────────────────────────────

  const openTrafficPopup = useCallback((mapInstance: Map, coordinates: [number, number], props: any) => {
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const currentSpeed = Number(props.currentSpeed) || 0;
    const freeFlowSpeed = Number(props.freeFlowSpeed) || 0;
    const currentTravelTime = Number(props.currentTravelTime) || 0;
    const freeFlowTravelTime = Number(props.freeFlowTravelTime) || 0;
    const confidence = Number(props.confidence) || 1;
    const roadClosure = props.roadClosure === true || props.roadClosure === 'true';
    const congestionPercentage = Number(props.congestionPercentage) || 0;
    const label = props.label || 'Traffic Flow';
    const color = props.color || '#10b981';
    const bgColor = props.bgColor || 'rgba(16, 185, 129, 0.15)';
    const borderColor = props.borderColor || '#10b981';

    const popupHtml = `
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; font-size: 11px; min-width: 220px; line-height: 1.4; color: #f1f5f9;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-weight: 700; color: #fff; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
            Traffic Node
          </span>
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${bgColor}; color: ${color}; border: 1px solid ${borderColor};">
            ${label}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
          <div style="background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">Current Speed</div>
            <div style="font-weight: 700; color: #38bdf8; font-size: 14px;">${currentSpeed} <span style="font-size: 9px; font-weight: 400; color: #94a3b8;">km/h</span></div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">Free-Flow</div>
            <div style="font-weight: 700; color: #e2e8f0; font-size: 14px;">${freeFlowSpeed} <span style="font-size: 9px; font-weight: 400; color: #94a3b8;">km/h</span></div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">Travel Time</div>
            <div style="font-weight: 600; color: #e2e8f0;">${formatTravelTime(currentTravelTime)}</div>
            ${freeFlowTravelTime > 0 ? `<div style="font-size: 8px; color: #64748b;">norm: ${formatTravelTime(freeFlowTravelTime)}</div>` : ''}
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">Road Status</div>
            <div style="font-weight: 600; color: ${roadClosure ? '#ef4444' : color};">
              ${roadClosure ? 'Closed' : `${congestionPercentage}% Delay`}
            </div>
          </div>
        </div>
        <div style="font-size: 8px; color: #64748b; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; display: flex; justify-content: space-between;">
          <span>Confidence: ${Math.round(confidence * 100)}%</span>
          <span style="color: #38bdf8; font-weight: 600;">TomTom Live</span>
        </div>
      </div>
    `;

    const popup = new Popup({
      className: 'citypulse-traffic-popup',
      closeButton: true,
      closeOnClick: true,
      offset: 14,
    })
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(mapInstance);

    activePopupRef.current = popup;
  }, []);

  const openPoiPopup = useCallback((mapInstance: Map, coordinates: [number, number], props: any) => {
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const { name, categoryLabel, address, phone, emergency, color } = props;
    const popupHtml = `
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; font-size: 11px; min-width: 210px; color: #f1f5f9;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-weight: 700; color: #fff; font-size: 12px;">${name}</span>
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${color}22; color: ${color}; border: 1px solid ${color}66;">
            ${categoryLabel}
          </span>
        </div>
        ${emergency === 'yes' ? `<div style="display:inline-block;margin-bottom:6px;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);">24/7 EMERGENCY</div>` : ''}
        ${address ? `<div style="color: #94a3b8; font-size: 10px; margin-bottom: 4px;">${address}</div>` : ''}
        ${phone ? `<div style="color: #cbd5e1; font-size: 10px; margin-bottom: 4px;">Tel: <span style="color:#fff;">${phone}</span></div>` : ''}
        <div style="font-size: 8px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; display: flex; justify-content: space-between;">
          <span>${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}</span>
          <span style="color: #10b981; font-weight: 600;">Civic Facility</span>
        </div>
      </div>
    `;

    const popup = new Popup({
      className: 'citypulse-traffic-popup',
      closeButton: true,
      closeOnClick: true,
      offset: 14,
    })
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(mapInstance);

    activePopupRef.current = popup;
  }, []);

  const openReportPopup = useCallback((mapInstance: Map, coordinates: [number, number], props: any) => {
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const { id, issueLabel, severity, status, description, color } = props;
    const currentIdx = WORKFLOW_STAGES.indexOf(status as ReportStatus);
    const nextStatus = currentIdx < WORKFLOW_STAGES.length - 1 ? WORKFLOW_STAGES[currentIdx + 1] : null;

    const popupHtml = `
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; font-size: 11px; min-width: 220px; color: #f1f5f9;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-weight: 700; color: #38bdf8;">${id}</span>
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${color}22; color: ${color}; border: 1px solid ${color}55;">
            ${status}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
          <div style="background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 8px; color: #94a3b8;">ISSUE</div>
            <div style="font-weight: 700; color: #fff;">${issueLabel}</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 8px; color: #94a3b8;">SEVERITY</div>
            <div style="font-weight: 700; color: ${color};">${severity}</div>
          </div>
        </div>
        ${description ? `<div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px; font-size: 10px; color: #cbd5e1; margin-bottom: 8px; max-height: 60px; overflow-y: auto;">${description}</div>` : ''}
        ${nextStatus ? `
          <button
            onclick="window.__citypulseAdvanceReportStatus && window.__citypulseAdvanceReportStatus('${id}', '${nextStatus}')"
            style="width: 100%; margin-bottom: 6px; background: rgba(6, 182, 212, 0.2); border: 1px solid rgba(6, 182, 212, 0.4); color: #22d3ee; padding: 5px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; text-transform: uppercase; font-family: monospace;"
          >
            Advance: ${status} → ${nextStatus}
          </button>
        ` : ''}
        <div style="font-size: 8px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; display: flex; justify-content: space-between;">
          <span>${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}</span>
          <span style="color: #06b6d4; font-weight: 700;">Citizen Report</span>
        </div>
      </div>
    `;

    const popup = new Popup({
      className: 'citypulse-traffic-popup',
      closeButton: true,
      closeOnClick: true,
      offset: 14,
    })
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(mapInstance);

    activePopupRef.current = popup;
  }, []);

  // ─── Layer Synchronizers ────────────────────────────────────────────────────

  const syncTrafficPointsToMap = useCallback((mapInstance: Map, points: CityTrafficPoint[], show: boolean) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: (!show || !points) ? [] : points.map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        geometry: { type: 'Point' as const, coordinates: [p.longitude, p.latitude] },
        properties: {
          id: p.id,
          currentSpeed: p.currentSpeed,
          freeFlowSpeed: p.freeFlowSpeed,
          currentTravelTime: p.currentTravelTime,
          freeFlowTravelTime: p.freeFlowTravelTime,
          confidence: p.confidence,
          roadClosure: p.roadClosure ? 'true' : 'false',
          congestionPercentage: p.congestionPercentage,
          condition: p.condition,
          color: p.classification.color,
          label: p.classification.label,
          bgColor: p.classification.bgColor,
          borderColor: p.classification.borderColor,
        },
      })),
    };

    const existingSource = mapInstance.getSource(CITY_TRAFFIC_SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      mapInstance.addSource(CITY_TRAFFIC_SOURCE_ID, { type: 'geojson', data: geojsonData });

      // Subtle halo ring
      mapInstance.addLayer({
        id: CITY_TRAFFIC_HALO_LAYER_ID,
        type: 'circle',
        source: CITY_TRAFFIC_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 13, 10, 16, 15],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.22,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.6,
        },
      });

      // Sharp, high-contrast core
      mapInstance.addLayer({
        id: CITY_TRAFFIC_CORE_LAYER_ID,
        type: 'circle',
        source: CITY_TRAFFIC_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 13, 6, 16, 8.5],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.95,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapInstance.on('mouseenter', CITY_TRAFFIC_CORE_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', CITY_TRAFFIC_CORE_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      mapInstance.on('click', CITY_TRAFFIC_CORE_LAYER_ID, (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates.slice() as [number, number];
        openTrafficPopup(mapInstance, coordinates, feature.properties);
      });
    }
  }, [openTrafficPopup]);

  const syncPoisToMap = useCallback((mapInstance: Map, poisList: PoiItem[], show: boolean) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: (!show || !poisList) ? [] : poisList.map((poi) => {
        const meta = POI_CATEGORIES[poi.category];
        return {
          type: 'Feature' as const,
          id: poi.id,
          geometry: { type: 'Point' as const, coordinates: [poi.longitude, poi.latitude] },
          properties: {
            id: poi.id,
            osmId: poi.osmId,
            name: poi.name,
            category: poi.category,
            categoryLabel: poi.categoryLabel,
            color: meta?.color || '#3b82f6',
            address: poi.address || '',
            phone: poi.phone || '',
            emergency: poi.emergency ? 'yes' : 'no',
          },
        };
      }),
    };

    const existingSource = mapInstance.getSource(CIVIC_POI_SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      mapInstance.addSource(CIVIC_POI_SOURCE_ID, { type: 'geojson', data: geojsonData });

      // Subtle halo for POIs at medium zoom
      mapInstance.addLayer({
        id: CIVIC_POI_HALO_LAYER_ID,
        type: 'circle',
        source: CIVIC_POI_SOURCE_ID,
        minzoom: 12.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12.5, 9, 15, 14, 18, 20],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.18,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.45,
        },
      });

      // POI Symbol Layer: Avoid overlapping clutter at lower zooms
      mapInstance.addLayer({
        id: CIVIC_POI_SYMBOL_LAYER_ID,
        type: 'symbol',
        source: CIVIC_POI_SOURCE_ID,
        minzoom: 12.5,
        layout: {
          'icon-image': ['concat', 'poi-marker-', ['get', 'category']],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12.5, 0.65, 15, 0.85, 18, 1.05],
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
        },
      });

      mapInstance.on('mouseenter', CIVIC_POI_SYMBOL_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', CIVIC_POI_SYMBOL_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      mapInstance.on('click', CIVIC_POI_SYMBOL_LAYER_ID, (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates.slice() as [number, number];
        openPoiPopup(mapInstance, coordinates, feature.properties);
      });
    }
  }, [openPoiPopup]);

  const syncCitizenReportsToMap = useCallback((mapInstance: Map, reportsList: CivicReportMeta[], show: boolean) => {
    if (!mapInstance) return;

    const features = (!show || !reportsList) ? [] : reportsList
      .filter((r) =>
        r.location &&
        typeof r.location.longitude === 'number' &&
        typeof r.location.latitude === 'number' &&
        isFinite(r.location.longitude) &&
        isFinite(r.location.latitude)
      )
      .map((r) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [r.location.longitude, r.location.latitude] as [number, number],
        },
        properties: {
          id: r.id,
          issueType: r.issueType,
          issueLabel: ISSUE_TYPE_LABELS[r.issueType] || r.issueType,
          severity: r.severity,
          color: SEVERITY_COLORS[r.severity] || '#eab308',
          status: r.status,
          description: r.description,
        },
      }));

    const geojsonData = { type: 'FeatureCollection' as const, features };
    const existingSource = mapInstance.getSource(CITIZEN_REPORTS_SOURCE_ID) as GeoJSONSource | undefined;

    if (existingSource) {
      existingSource.setData(geojsonData);
      return;
    }

    if (!mapInstance.isStyleLoaded()) return;

    mapInstance.addSource(CITIZEN_REPORTS_SOURCE_ID, { type: 'geojson', data: geojsonData });

    mapInstance.addLayer({
      id: CITIZEN_REPORTS_HALO_LAYER_ID,
      type: 'circle',
      source: CITIZEN_REPORTS_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 7, 13, 11, 16, 17],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.22,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': ['get', 'color'],
        'circle-stroke-opacity': 0.6,
      },
    });

    mapInstance.addLayer({
      id: CITIZEN_REPORTS_CORE_LAYER_ID,
      type: 'circle',
      source: CITIZEN_REPORTS_SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 13, 6, 16, 8.5],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.95,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    });

    mapInstance.on('mouseenter', CITIZEN_REPORTS_CORE_LAYER_ID, () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });
    mapInstance.on('mouseleave', CITIZEN_REPORTS_CORE_LAYER_ID, () => {
      mapInstance.getCanvas().style.cursor = '';
    });

    mapInstance.on('click', CITIZEN_REPORTS_CORE_LAYER_ID, (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates.slice() as [number, number];
      openReportPopup(mapInstance, coordinates, feature.properties);
    });
  }, [openReportPopup]);

  const openSignalPopup = useCallback((mapInstance: Map, coordinates: [number, number], props: any) => {
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const title = props.title || 'CityPulse Signal';
    const confidence = props.confidence || 'MEDIUM';
    const explanation = props.explanation || '';
    const disclaimer = props.disclaimer || '';
    const locationName = props.locationName || '';
    const timeWindow = props.timeWindow || '';
    const metrics: any[] = typeof props.metrics === 'string' ? JSON.parse(props.metrics || '[]') : (props.metrics || []);
    const evidence: string[] = typeof props.evidence === 'string' ? JSON.parse(props.evidence || '[]') : (props.evidence || []);

    const confColor = confidence === 'HIGH' ? '#ef4444' : confidence === 'MEDIUM' ? '#f59e0b' : '#38bdf8';
    const confBg = confidence === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : confidence === 'MEDIUM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)';

    const metricsHtml = metrics.map((m: any) => `
      <div style="background: rgba(255,255,255,0.04); padding: 5px 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="font-size: 8px; color: #94a3b8; text-transform: uppercase;">${m.label}</div>
        <div style="font-weight: 700; color: #fff; font-size: 12px; margin-top: 2px;">${m.value}</div>
      </div>
    `).join('');

    const evidenceHtml = evidence.map((e: string) => `
      <li style="margin-bottom: 3px;">${e}</li>
    `).join('');

    const popupHtml = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; font-size: 11px; min-width: 250px; max-width: 320px; line-height: 1.4; color: #f1f5f9;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 6px; margin-bottom: 8px;">
          <span style="font-weight: 800; color: #fbbf24; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px;">
            ⚡ CityPulse Signal
          </span>
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; background: ${confBg}; color: ${confColor}; border: 1px solid ${confColor}40;">
            ${confidence} CONFIDENCE
          </span>
        </div>
        <div style="font-size: 13px; font-weight: 800; color: #ffffff; margin-bottom: 4px; line-height: 1.25;">
          ${title}
        </div>
        <div style="display: flex; gap: 8px; font-size: 9px; color: #94a3b8; margin-bottom: 8px;">
          <span>📍 ${locationName}</span>
          <span>⏱️ ${timeWindow}</span>
        </div>
        ${metricsHtml ? `<div style="display: grid; grid-template-columns: repeat(${Math.min(metrics.length, 3)}, 1fr); gap: 4px; margin-bottom: 8px;">${metricsHtml}</div>` : ''}
        ${evidenceHtml ? `
          <div style="background: rgba(255,255,255,0.03); padding: 6px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px;">
            <div style="font-size: 9px; font-weight: 700; color: #38bdf8; text-transform: uppercase; margin-bottom: 3px;">Observed Evidence</div>
            <ul style="margin: 0; padding-left: 14px; font-size: 10px; color: #cbd5e1;">${evidenceHtml}</ul>
          </div>
        ` : ''}
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px; line-height: 1.35;">
          ${explanation}
        </div>
        <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 6px; padding: 5px 7px; font-size: 9px; color: #fde68a; line-height: 1.3;">
          ⚠️ <strong>Note:</strong> ${disclaimer}
        </div>
      </div>
    `;

    const popup = new Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '340px',
      className: 'citypulse-custom-popup',
    })
      .setLngLat(coordinates)
      .setHTML(popupHtml)
      .addTo(mapInstance);
    activePopupRef.current = popup;
  }, []);

  const syncSignalsToMap = useCallback((mapInstance: Map, signalsList: CityPulseSignal[], show: boolean) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    const geojsonData = {
      type: 'FeatureCollection' as const,
      features: (!show || !signalsList) ? [] : signalsList.map((sig) => ({
        type: 'Feature' as const,
        id: sig.id,
        geometry: { type: 'Point' as const, coordinates: [sig.longitude, sig.latitude] },
        properties: {
          id: sig.id,
          title: sig.title,
          category: sig.category,
          confidence: sig.confidence,
          locationName: sig.locationName,
          timeWindow: sig.timeWindow,
          explanation: sig.explanation,
          disclaimer: sig.disclaimer,
          metrics: JSON.stringify(sig.metrics),
          evidence: JSON.stringify(sig.evidence),
        },
      })),
    };

    const existingSource = mapInstance.getSource(CITY_SIGNALS_SOURCE_ID) as GeoJSONSource | undefined;
    if (existingSource) {
      existingSource.setData(geojsonData);
    } else {
      mapInstance.addSource(CITY_SIGNALS_SOURCE_ID, { type: 'geojson', data: geojsonData });

      // Signal outer pulsing halo
      mapInstance.addLayer({
        id: CITY_SIGNALS_HALO_LAYER_ID,
        type: 'circle',
        source: CITY_SIGNALS_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 14, 13, 22, 16, 32],
          'circle-color': '#f59e0b',
          'circle-opacity': 0.25,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#f59e0b',
          'circle-stroke-opacity': 0.8,
        },
      });

      // Signal core
      mapInstance.addLayer({
        id: CITY_SIGNALS_CORE_LAYER_ID,
        type: 'circle',
        source: CITY_SIGNALS_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 13, 9, 16, 12],
          'circle-color': '#fbbf24',
          'circle-opacity': 0.95,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapInstance.on('mouseenter', CITY_SIGNALS_CORE_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });
      mapInstance.on('mouseleave', CITY_SIGNALS_CORE_LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = '';
      });

      mapInstance.on('click', CITY_SIGNALS_CORE_LAYER_ID, (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates.slice() as [number, number];
        openSignalPopup(mapInstance, coordinates, feature.properties);
      });
    }
  }, [openSignalPopup]);

  // ─── Map Initialization ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapContainer.current) return;

    // Use the CARTO style URL directly — these are public CDN URLs with no API key required
    const initialStyleUrl = targetStyleUrl;
    console.log('[CityPulse Map] Initializing MapLibre with style:', initialStyleUrl);

    const mapInstance = new Map({
      container: mapContainer.current,
      style: initialStyleUrl,
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: 12.8,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    // ─── Error Handling ──────────────────────────────────────────────────
    mapInstance.on('error', (e) => {
      console.error('[CityPulse Map] MapLibre error:', e.error?.message || e.error || e);
    });

    // ─── Controls ────────────────────────────────────────────────────────
    mapInstance.addControl(
      new NavigationControl({ visualizePitch: false, showCompass: true, showZoom: true }),
      'bottom-right'
    );
    mapInstance.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');
    mapInstance.addControl(
      new AttributionControl({ compact: true, customAttribution: 'CityPulse · © OpenStreetMap · CARTO' }),
      'bottom-right'
    );

    mapInstance.on('load', async () => {
      console.log('[CityPulse Map] Style loaded successfully');
      setIsMapLoaded(true);
      mapInstance.resize();

      try {
        await registerPoiMapImages(mapInstance);
      } catch (err) {
        console.warn('[CityPulse Map] POI image registration failed:', err);
      }

      // Add center marker
      const el = createCityPulseMarkerElement(selectedLocation);
      const marker = new Marker({ element: el, anchor: 'center' })
        .setLngLat([selectedLocation.longitude, selectedLocation.latitude])
        .addTo(mapInstance);
      activeMarkerRef.current = marker;

      // Sync layers
      syncTrafficPointsToMap(mapInstance, cityTrafficPointsRef.current, showTrafficMarkersRef.current);
      syncPoisToMap(mapInstance, poisRef.current, showPoisRef.current);
      syncCitizenReportsToMap(mapInstance, citizenReportsRef.current, showCitizenReportsRef.current);
      syncSignalsToMap(mapInstance, signalsRef.current, showSignalsRef.current);
    });

    mapInstance.on('moveend', () => {
      const center = mapInstance.getCenter();
      coordsCallbackRef.current?.({
        lng: Number(center.lng.toFixed(5)),
        lat: Number(center.lat.toFixed(5)),
        zoom: Number(mapInstance.getZoom().toFixed(2)),
      });
    });

    map.current = mapInstance;

    return () => {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      if (activeMarkerRef.current) {
        activeMarkerRef.current.remove();
        activeMarkerRef.current = null;
      }
      mapInstance.remove();
      map.current = null;
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme when mapTheme changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    map.current.setStyle(targetStyleUrl);
    map.current.once('style.load', async () => {
      if (map.current) {
        await registerPoiMapImages(map.current);
        syncTrafficPointsToMap(map.current, cityTrafficPointsRef.current, showTrafficMarkersRef.current);
        syncPoisToMap(map.current, poisRef.current, showPoisRef.current);
        syncCitizenReportsToMap(map.current, citizenReportsRef.current, showCitizenReportsRef.current);
        syncSignalsToMap(map.current, signalsRef.current, showSignalsRef.current);
      }
    });
  }, [targetStyleUrl, isMapLoaded, syncTrafficPointsToMap, syncPoisToMap, syncCitizenReportsToMap, syncSignalsToMap]);

  // Synchronize layers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    syncTrafficPointsToMap(map.current, cityTrafficPoints, effectiveShowTraffic);
  }, [cityTrafficPoints, effectiveShowTraffic, isMapLoaded, syncTrafficPointsToMap]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    syncPoisToMap(map.current, pois, effectiveShowPois);
  }, [pois, effectiveShowPois, isMapLoaded, syncPoisToMap]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    syncCitizenReportsToMap(map.current, localReports, effectiveShowReports);
  }, [localReports, effectiveShowReports, isMapLoaded, syncCitizenReportsToMap]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    syncSignalsToMap(map.current, signals, showSignals);
  }, [signals, showSignals, isMapLoaded, syncSignalsToMap]);

  // Update location & marker
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const targetLng = selectedLocation.longitude;
    const targetLat = selectedLocation.latitude;
    const targetZoom = mapTarget.zoom || 12.8;

    map.current.flyTo({
      center: [targetLng, targetLat],
      zoom: targetZoom,
      duration: 1200,
      essential: true,
    });

    if (activeMarkerRef.current) {
      activeMarkerRef.current.remove();
      activeMarkerRef.current = null;
    }

    const el = createCityPulseMarkerElement(selectedLocation);
    const marker = new Marker({ element: el, anchor: 'center' })
      .setLngLat([targetLng, targetLat])
      .addTo(map.current);

    activeMarkerRef.current = marker;
  }, [selectedLocation, mapTarget, isMapLoaded]);

  // Controls
  const handleResetNorth = () => {
    map.current?.resetNorthPitch({ duration: 600 });
  };

  const handleRecenter = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: mapTarget.zoom || 12.8,
      duration: 800,
    });
  };

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#07090e] dark:bg-[#07090e] select-none ${className}`}>
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* ── Minimal Floating Map Controls (Top Right) ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={handleRecenter}
          className="p-2 rounded-xl bg-command-950/85 hover:bg-command-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white backdrop-blur-md shadow-panel transition-all"
          title="Recenter City"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        <button
          onClick={handleResetNorth}
          className="p-2 rounded-xl bg-command-950/85 hover:bg-command-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white backdrop-blur-md shadow-panel transition-all"
          title="Reset Orientation North"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-2 rounded-xl bg-command-950/85 hover:bg-command-900 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-white backdrop-blur-md shadow-panel transition-all"
            title={isExpanded ? 'Restore Layout' : 'Expand Map View'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
