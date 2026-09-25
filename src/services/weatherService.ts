import type {
  WeatherData,
  OpenMeteoWeatherResponse,
} from '../types/weather';

const OPEN_METEO_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_WEATHER_PARAMS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'is_day',
].join(',');

/**
 * Fetches real-time weather data for the given coordinates from Open-Meteo.
 * No API key required.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: CURRENT_WEATHER_PARAMS,
    timezone: 'auto',
  });

  const url = `${OPEN_METEO_WEATHER_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Weather API error: HTTP ${response.status}`);
  }

  const data: OpenMeteoWeatherResponse = await response.json();

  if (!data.current) {
    throw new Error('Weather API returned no current data');
  }

  const c = data.current;

  return {
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    precipitation: c.precipitation,
    weatherCode: c.weather_code,
    windSpeed: c.wind_speed_10m,
    isDay: c.is_day === 1,
    timestamp: c.time,
  };
}
