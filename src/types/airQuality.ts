/** Internal clean air quality data model */
export interface AirQualityData {
  europeanAqi?: number;
  usAqi?: number;
  pm2_5?: number;
  pm10?: number;
  carbonMonoxide?: number;
  nitrogenDioxide?: number;
  ozone?: number;
  timestamp?: string;
}

/** Raw Open-Meteo Air Quality hourly response shape */
export interface OpenMeteoAirQualityHourly {
  time: string[];
  pm2_5?: number[];
  pm10?: number[];
  european_aqi?: number[];
  us_aqi?: number[];
  carbon_monoxide?: number[];
  nitrogen_dioxide?: number[];
  ozone?: number[];
}

export interface OpenMeteoAirQualityCurrent {
  time: string;
  interval?: number;
  pm2_5?: number;
  pm10?: number;
  european_aqi?: number;
  us_aqi?: number;
  carbon_monoxide?: number;
  nitrogen_dioxide?: number;
  ozone?: number;
}

export interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation?: number;
  current_units?: Record<string, string>;
  current?: OpenMeteoAirQualityCurrent;
  hourly_units?: Record<string, string>;
  hourly?: OpenMeteoAirQualityHourly;
}

/** AQI category classification */
export interface AqiCategory {
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
}
