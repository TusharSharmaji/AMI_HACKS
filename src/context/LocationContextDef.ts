import { createContext } from 'react';
import type { SelectedLocation } from '../types/location';

export interface LocationContextType {
  selectedLocation: SelectedLocation;
  setSelectedLocation: (location: SelectedLocation) => void;
  isDetectingLocation: boolean;
  detectionError: string | null;
  clearDetectionError: () => void;
  detectUserLocation: () => Promise<void>;
  mapTarget: {
    latitude: number;
    longitude: number;
    zoom?: number;
    timestamp: number;
  };
  moveToCoordinates: (lat: number, lng: number, zoom?: number) => void;
}

export const LocationContext = createContext<LocationContextType | undefined>(undefined);
