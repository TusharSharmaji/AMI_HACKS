import type {
  AirQualityData,
  OpenMeteoAirQualityResponse,
} from '../types/airQuality';

const OPEN_METEO_AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const AQ_CURRENT_PARAMS = [
  'pm2_5',
  'pm10',
  'european_aqi',
  'us_aqi',
  'carbon_monoxide',
  'nitrogen_dioxide',
  'ozone',
].join(',');

/**
 * Find the index of the hourly time slot closest to now.
 */
function findClosestTimeIndex(times: string[]): number {
  const now = Date.now();
  let closestIdx = 0;
  let closestDiff = Infinity;

  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  return closestIdx;
}

/**
 * Fetches current air quality data for the given coordinates from Open-Meteo.
 * No API key required.
 */
export async function fetchAirQuality(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<AirQualityData> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: AQ_CURRENT_PARAMS,
    hourly: AQ_CURRENT_PARAMS,
    timezone: 'auto',
  });

  const url = `${OPEN_METEO_AQ_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Air Quality API error: HTTP ${response.status}`);
  }

  const data: OpenMeteoAirQualityResponse = await response.json();

  // Prefer direct `current` object
  if (data.current) {
    const c = data.current;
    return {
      europeanAqi: c.european_aqi,
      usAqi: c.us_aqi,
      pm2_5: c.pm2_5,
      pm10: c.pm10,
      carbonMonoxide: c.carbon_monoxide,
      nitrogenDioxide: c.nitrogen_dioxide,
      ozone: c.ozone,
      timestamp: c.time,
    };
  }

  // Fallback to hourly if current is missing
  if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {
    const idx = findClosestTimeIndex(data.hourly.time);
    const h = data.hourly;

    return {
      europeanAqi: h.european_aqi?.[idx] ?? undefined,
      usAqi: h.us_aqi?.[idx] ?? undefined,
      pm2_5: h.pm2_5?.[idx] ?? undefined,
      pm10: h.pm10?.[idx] ?? undefined,
      carbonMonoxide: h.carbon_monoxide?.[idx] ?? undefined,
      nitrogenDioxide: h.nitrogen_dioxide?.[idx] ?? undefined,
      ozone: h.ozone?.[idx] ?? undefined,
      timestamp: h.time[idx],
    };
  }

  throw new Error('Air Quality API returned no air quality data');
}
