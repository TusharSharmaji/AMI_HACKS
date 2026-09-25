export type CongestionLevel = 'Light' | 'Moderate' | 'Heavy' | 'Severe';

/** Clean internal model for TomTom road segment traffic flow */
export interface TrafficSegmentData {
  currentSpeed: number; // km/h
  freeFlowSpeed: number; // km/h
  currentTravelTime: number; // seconds
  freeFlowTravelTime: number; // seconds
  confidence: number; // 0.0 to 1.0
  roadClosure: boolean;
  coordinates: [number, number][]; // [longitude, latitude] GeoJSON positions
  congestionRatio: number; // clamp(1 - currentSpeed / freeFlowSpeed, 0, 1)
  congestionPercentage: number; // 0 to 100%
  condition: CongestionLevel;
  roadClass?: string; // FRC (Functional Road Class)
  fetchedAt: Date;
}

/** Raw TomTom Flow Segment Data response structure */
export interface TomTomFlowSegmentResponse {
  flowSegmentData?: {
    frc?: string;
    currentSpeed: number;
    freeFlowSpeed: number;
    currentTravelTime: number;
    freeFlowTravelTime: number;
    confidence: number;
    roadClosure: boolean;
    coordinates?: {
      coordinate: Array<{ latitude: number; longitude: number }>;
    };
    '@version'?: string;
  };
  error?: string;
  httpStatusCode?: number;
  detailedError?: {
    code: string;
    message: string;
  };
}

export interface CongestionClassification {
  condition: CongestionLevel;
  percentage: number;
  label: string;
  color: string; // Hex for map LineString
  textColor: string;
  bgColor: string;
  borderColor: string;
}

/** Represents a sampled city-wide traffic node on the map */
export interface CityTrafficPoint {
  id: string;
  latitude: number;
  longitude: number;
  currentSpeed: number; // km/h
  freeFlowSpeed: number; // km/h
  currentTravelTime: number; // seconds
  freeFlowTravelTime: number; // seconds
  confidence: number;
  roadClosure: boolean;
  congestionPercentage: number;
  congestionRatio: number;
  condition: CongestionLevel;
  classification: CongestionClassification;
  roadClass?: string;
  roadName?: string;
  coordinates: [number, number][];
  fetchedAt: Date;
}

