import type { AqiCategory } from '../types/airQuality';

/** Weather code description mapping from WMO codes used by Open-Meteo */
export interface WeatherCodeInfo {
  description: string;
  iconName: string; // Lucide icon name
  iconNameNight?: string; // Optional night-specific icon
}

const WEATHER_CODE_MAP: Record<number, WeatherCodeInfo> = {
  0: { description: 'Clear sky', iconName: 'Sun', iconNameNight: 'Moon' },
  1: { description: 'Mainly clear', iconName: 'Sun', iconNameNight: 'Moon' },
  2: { description: 'Partly cloudy', iconName: 'CloudSun', iconNameNight: 'CloudMoon' },
  3: { description: 'Overcast', iconName: 'Cloud' },
  45: { description: 'Fog', iconName: 'CloudFog' },
  48: { description: 'Depositing rime fog', iconName: 'CloudFog' },
  51: { description: 'Light drizzle', iconName: 'CloudDrizzle' },
  53: { description: 'Moderate drizzle', iconName: 'CloudDrizzle' },
  55: { description: 'Dense drizzle', iconName: 'CloudDrizzle' },
  56: { description: 'Light freezing drizzle', iconName: 'CloudDrizzle' },
  57: { description: 'Dense freezing drizzle', iconName: 'CloudDrizzle' },
  61: { description: 'Slight rain', iconName: 'CloudRain' },
  63: { description: 'Moderate rain', iconName: 'CloudRain' },
  65: { description: 'Heavy rain', iconName: 'CloudRainWind' },
  66: { description: 'Light freezing rain', iconName: 'CloudRain' },
  67: { description: 'Heavy freezing rain', iconName: 'CloudRainWind' },
  71: { description: 'Slight snow fall', iconName: 'CloudSnow' },
  73: { description: 'Moderate snow fall', iconName: 'CloudSnow' },
  75: { description: 'Heavy snow fall', iconName: 'CloudSnow' },
  77: { description: 'Snow grains', iconName: 'Snowflake' },
  80: { description: 'Slight rain showers', iconName: 'CloudRain' },
  81: { description: 'Moderate rain showers', iconName: 'CloudRain' },
  82: { description: 'Violent rain showers', iconName: 'CloudRainWind' },
  85: { description: 'Slight snow showers', iconName: 'CloudSnow' },
  86: { description: 'Heavy snow showers', iconName: 'CloudSnow' },
  95: { description: 'Thunderstorm', iconName: 'CloudLightning' },
  96: { description: 'Thunderstorm with slight hail', iconName: 'CloudLightning' },
  99: { description: 'Thunderstorm with heavy hail', iconName: 'CloudLightning' },
};

/**
 * Returns a human-readable description + icon for a WMO weather code.
 */
export function getWeatherCodeInfo(code: number, isDay: boolean): WeatherCodeInfo {
  const info = WEATHER_CODE_MAP[code];
  if (!info) {
    return { description: 'Unknown', iconName: 'HelpCircle' };
  }

  // Use night icon variant when available and it's nighttime
  if (!isDay && info.iconNameNight) {
    return { ...info, iconName: info.iconNameNight };
  }

  return info;
}

/**
 * US AQI category classification following official EPA breakpoints.
 */
export function getAqiCategory(usAqi: number | undefined): AqiCategory {
  if (usAqi === undefined || usAqi === null) {
    return {
      label: 'Unavailable',
      color: '#64748b',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-700',
      bgColor: 'bg-slate-900/60',
    };
  }

  if (usAqi <= 50) {
    return {
      label: 'Good',
      color: '#22c55e',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-800/60',
      bgColor: 'bg-emerald-950/60',
    };
  }
  if (usAqi <= 100) {
    return {
      label: 'Moderate',
      color: '#eab308',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-800/60',
      bgColor: 'bg-yellow-950/60',
    };
  }
  if (usAqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      color: '#f97316',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-800/60',
      bgColor: 'bg-orange-950/60',
    };
  }
  if (usAqi <= 200) {
    return {
      label: 'Unhealthy',
      color: '#ef4444',
      textColor: 'text-red-400',
      borderColor: 'border-red-800/60',
      bgColor: 'bg-red-950/60',
    };
  }
  if (usAqi <= 300) {
    return {
      label: 'Very Unhealthy',
      color: '#a855f7',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-800/60',
      bgColor: 'bg-purple-950/60',
    };
  }
  return {
    label: 'Hazardous',
    color: '#991b1b',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-800/60',
    bgColor: 'bg-rose-950/60',
  };
}

/**
 * Format a timestamp string into a relative "X min ago" or "just now" string.
 */
export function formatDataFreshness(timestamp: string | undefined): string {
  if (!timestamp) return 'No data';

  const dataTime = new Date(timestamp).getTime();
  if (isNaN(dataTime)) return 'Unknown';

  const diffMs = Date.now() - dataTime;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Updated just now';
  if (diffMin < 60) return `Updated ${diffMin} min ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Updated ${diffHours}h ago`;

  return 'Latest available';
}
