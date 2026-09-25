import type { CityLocation, NavRoute, CivicMetricItem, IntelligenceItem, CivicActivityItem } from '../types';

export const APP_NAME = 'CITYPULSE';
export const APP_SUBTITLE = 'Live Civic Health & Digital Twin Platform';

export const NAV_ROUTES: NavRoute[] = [
  {
    name: 'Overview',
    path: '/',
    description: 'High-level geospatial command view and live weather and air quality monitoring',
    iconName: 'LayoutDashboard',
  },
  {
    name: 'Live City',
    path: '/live-city',
    description: 'Real-time urban operations, environmental metrics, and multi-sensor streams',
    badge: 'Live',
    iconName: 'Activity',
  },
  {
    name: 'Digital Twin',
    path: '/digital-twin',
    description: '3D semantic city infrastructure, building models, and spatial mesh layers',
    badge: 'Live',
    iconName: 'Box',
  },
  {
    name: 'Risk Intelligence',
    path: '/risk-intelligence',
    description: 'Predictive civic vulnerability, environmental threats, and early hazard detection',
    badge: 'Live',
    iconName: 'ShieldAlert',
  },
  {
    name: 'Report Issue',
    path: '/report-issue',
    description: 'Civic anomaly intake, citizen reporting portal, and geotagged incident dispatcher',
    badge: 'Live',
    iconName: 'AlertTriangle',
  },
  {
    name: 'Scenario Lab',
    path: '/scenario-lab',
    description: 'Simulated urban stress testing, evacuation modeling, and policy impact sandboxes',
    badge: 'Live',
    iconName: 'FlaskConical',
  },
  {
    name: 'City Replay',
    path: '/city-replay',
    description: 'Temporal replay of historical civic events, traffic surges, and incidents',
    badge: 'Live',
    iconName: 'History',
  },
  {
    name: 'Ask CityPulse',
    path: '/ask-citypulse',
    description: 'Natural language civic reasoning, municipal dataset queries, and spatial queries',
    badge: 'Live',
    iconName: 'MessageSquareCode',
  },
  {
    name: 'Municipal Command',
    path: '/municipal-command',
    description: 'Dispatch orchestration, municipal department escalation, and agency workflows',
    badge: 'Live',
    iconName: 'Building2',
  },
  {
    name: 'City News',
    path: '/city-news',
    description: 'Live city-specific news feed powered by GDELT — headlines from the last 48 hours',
    badge: 'Live',
    iconName: 'Newspaper',
  },
];

export const DARK_MAP_STYLE: any = {
  version: 8,
  name: 'CityPulse Dark',
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export const LIGHT_MAP_STYLE: any = {
  version: 8,
  name: 'CityPulse Light',
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

export const MAP_STYLES = [
  {
    id: 'dark',
    name: 'Dark',
    url: DARK_MAP_STYLE,
    description: 'Dark high-contrast night cartography',
  },
  {
    id: 'liberty',
    name: 'Liberty',
    url: LIGHT_MAP_STYLE,
    description: 'Clean detailed daylight cartography',
  },
];

export const COMMAND_CITIES: CityLocation[] = [
  {
    id: 'nyc',
    name: 'New York City',
    region: 'NY',
    country: 'United States',
    coordinates: [-74.0060, 40.7128],
    zoom: 12.5,
    pitch: 45,
    bearing: -17.6,
    tag: 'Metro Core 01',
  },
  {
    id: 'ldn',
    name: 'London',
    region: 'Greater London',
    country: 'United Kingdom',
    coordinates: [-0.1276, 51.5074],
    zoom: 12.8,
    pitch: 40,
    bearing: 15,
    tag: 'Euro Zone 02',
  },
  {
    id: 'tyo',
    name: 'Tokyo',
    region: 'Kanto',
    country: 'Japan',
    coordinates: [139.6917, 35.6895],
    zoom: 12.6,
    pitch: 50,
    bearing: 25,
    tag: 'APAC Sector 03',
  },
  {
    id: 'sfo',
    name: 'San Francisco',
    region: 'CA',
    country: 'United States',
    coordinates: [-122.4194, 37.7749],
    zoom: 13,
    pitch: 55,
    bearing: -20,
    tag: 'Bay Grid 04',
  },
  {
    id: 'sgp',
    name: 'Singapore',
    region: 'Central',
    country: 'Singapore',
    coordinates: [103.8198, 1.3521],
    zoom: 12.5,
    pitch: 45,
    bearing: 0,
    tag: 'Equatorial 05',
  },
  {
    id: 'par',
    name: 'Paris',
    region: 'Île-de-France',
    country: 'France',
    coordinates: [2.3522, 48.8566],
    zoom: 12.8,
    pitch: 40,
    bearing: -10,
    tag: 'Seine Hub 06',
  },
];

export const CIVIC_METRICS_CATALOG: CivicMetricItem[] = [
  {
    id: 'mobility',
    title: 'Urban Mobility Index',
    category: 'mobility',
    telemetryStream: 'live_transit_flow',
    unit: 'pts',
    status: 'Waiting for live data',
    icon: 'Car',
    description: 'Real-time road congestion, transit headway deviations, and arterial velocity metrics.',
  },
  {
    id: 'air_quality',
    title: 'Civic Air Quality Index',
    category: 'air_quality',
    telemetryStream: 'aqi_sensor_mesh',
    unit: 'AQI',
    status: 'Waiting for live data',
    icon: 'Wind',
    description: 'PM2.5, PM10, NO2 dispersion indices aggregated across municipal ambient stations.',
  },
  {
    id: 'infrastructure',
    title: 'Critical Infrastructure Health',
    category: 'infrastructure',
    telemetryStream: 'grid_substation_telemetry',
    unit: '%',
    status: 'Waiting for live data',
    icon: 'Zap',
    description: 'Substation load variance, water pressure distribution, and storm drain capacity status.',
  },
  {
    id: 'resilience',
    title: 'Civic Risk Composite',
    category: 'resilience',
    telemetryStream: 'hazard_risk_evaluator',
    unit: 'Risk Score',
    status: 'Waiting for live data',
    icon: 'Shield',
    description: 'Multi-hazard threat index evaluating flood risk, heat island stress, and emergency access.',
  },
];

export const INTELLIGENCE_FEEDS: IntelligenceItem[] = [
  {
    id: 'feed-01',
    source: 'Municipal Sensor Mesh',
    layer: 'Air Quality & Microclimate',
    status: 'Waiting for live data',
    timestamp: 'Awaiting sync',
    protocol: 'MQTT / CoAP',
    channel: 'stream/ambient/pm25',
  },
  {
    id: 'feed-02',
    source: 'Transit Operations Hub',
    layer: 'Surface Transit & Arterial Flow',
    status: 'Waiting for live data',
    timestamp: 'Awaiting sync',
    protocol: 'GTFS-RT',
    channel: 'stream/transit/velocity',
  },
  {
    id: 'feed-03',
    source: 'Stormwater Supervisory Bus',
    layer: 'Hydrology & Basin Runoff',
    status: 'Waiting for live data',
    timestamp: 'Awaiting sync',
    protocol: 'OPC-UA',
    channel: 'stream/drainage/capacity',
  },
  {
    id: 'feed-04',
    source: 'Emergency Services CAD',
    layer: 'Active Incidents & Hazards',
    status: 'Waiting for live data',
    timestamp: 'Awaiting sync',
    protocol: 'CAP v1.2',
    channel: 'stream/dispatch/alerts',
  },
];

export const RECENT_CIVIC_ACTIVITY: CivicActivityItem[] = [
  {
    id: 'act-01',
    sector: 'District 04 Arterial',
    feedType: 'Traffic Influx Monitor',
    status: 'Waiting for live data',
    recordedAt: 'Pending feed',
    endpoint: '/api/v1/sensors/arterial-flow',
  },
  {
    id: 'act-02',
    sector: 'Harbor Waterfront',
    feedType: 'Tidal Basin Level Sensor',
    status: 'Waiting for live data',
    recordedAt: 'Pending feed',
    endpoint: '/api/v1/sensors/tide-gauge',
  },
  {
    id: 'act-03',
    sector: 'Central Power Corridor',
    feedType: 'Grid Feeder Stability',
    status: 'Waiting for live data',
    recordedAt: 'Pending feed',
    endpoint: '/api/v1/sensors/grid-status',
  },
  {
    id: 'act-04',
    sector: 'Civic Center Public Domain',
    feedType: 'Citizen Report Intake Pipeline',
    status: 'Waiting for live data',
    recordedAt: 'Pending feed',
    endpoint: '/api/v1/reports/incoming',
  },
];
