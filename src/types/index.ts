export * from './location';
export * from './weather';
export * from './airQuality';
export * from './traffic';
export type {
  CityPulseSignal,
  SignalCategory,
  SignalConfidence,
  SignalSeverity,
  SignalMetricItem,
} from '../services/signalEngine';

export type NavRoute = {
  name: string;
  path: string;
  description: string;
  badge?: string;
  iconName: string;
};

export type CityLocation = {
  id: string;
  name: string;
  region: string;
  country: string;
  coordinates: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  tag: string;
};

export type MetricCategory = 'mobility' | 'air_quality' | 'infrastructure' | 'resilience' | 'energy';

export interface CivicMetricItem {
  id: string;
  title: string;
  category: MetricCategory;
  telemetryStream: string;
  unit?: string;
  status: 'Waiting for live data';
  icon: string;
  description: string;
}

export interface IntelligenceItem {
  id: string;
  source: string;
  layer: string;
  status: 'Waiting for live data';
  timestamp: string;
  protocol: string;
  channel: string;
}

export interface CivicActivityItem {
  id: string;
  sector: string;
  feedType: string;
  status: 'Waiting for live data';
  recordedAt: string;
  endpoint: string;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}
