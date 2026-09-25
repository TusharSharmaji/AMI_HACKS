import { createContext } from 'react';
import type { WeatherData } from '../types/weather';
import type { AirQualityData } from '../types/airQuality';

export interface CivicDataContextType {
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  weatherLoading: boolean;
  airQualityLoading: boolean;
  weatherError: string | null;
  airQualityError: string | null;
  lastUpdated: Date | null;
  retryWeather: () => void;
  retryAirQuality: () => void;
}

export const CivicDataContext = createContext<CivicDataContextType | undefined>(undefined);
