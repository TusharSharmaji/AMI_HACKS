export interface WeatherSnapshot {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  description: string;
}

export interface AirQualitySnapshot {
  aqi: number;
  pm2_5?: number;
  pm10?: number;
  category: string;
}

export interface TrafficSnapshot {
  averageSpeed: number;
  congestionPercentage: number;
  sampleCount: number;
  severeCount: number;
  closureCount: number;
}

export interface CivicSnapshot {
  totalReports: number;
  activeReports: number;
  criticalReports: number;
  highReports: number;
}

export interface RiskSnapshot {
  score: number;
  level: string;
  availableSourcesCount: number;
}

export interface CityObservation {
  id: string;
  timestamp: string; // ISO string
  cityId: string;
  cityName: string;
  latitude: number;
  longitude: number;
  weather?: WeatherSnapshot;
  airQuality?: AirQualitySnapshot;
  traffic?: TrafficSnapshot;
  civic?: CivicSnapshot;
  risk?: RiskSnapshot;
}
