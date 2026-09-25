import { useState, useEffect, useRef, useCallback } from 'react';
import type { WeatherData } from '../types/weather';
import type { AirQualityData } from '../types/airQuality';
import { fetchWeather } from '../services/weatherService';
import { fetchAirQuality } from '../services/airQualityService';
import { useLocation } from './useLocation';

interface CivicDataState {
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

/** Simple coordinate-keyed cache with TTL */
interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

function makeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

const weatherCache = new Map<string, CacheEntry<WeatherData>>();
const aqCache = new Map<string, CacheEntry<AirQualityData>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
  // Simple LRU: keep max 20 entries
  if (cache.size > 20) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

/**
 * Custom hook that consumes the selected location and fetches real
 * weather + air quality data. Manages loading, error, caching, and
 * abort controller lifecycle.
 *
 * NOTE: Mount this hook exactly once (via CivicDataProvider in App.tsx).
 * All pages should consume data via useCivicDataContext() instead of
 * calling this hook directly, to avoid redundant parallel fetches.
 */
export function useCivicData(): CivicDataState {
  const { selectedLocation } = useLocation();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [airQualityLoading, setAirQualityLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [airQualityError, setAirQualityError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Abort controllers for cancelling stale requests
  const weatherAbortRef = useRef<AbortController | null>(null);
  const aqAbortRef = useRef<AbortController | null>(null);

  // Track the coordinates we're currently fetching for to prevent stale updates
  const activeCoords = useRef<string>('');

  const loadWeather = useCallback(
    async (lat: number, lng: number, coordKey: string) => {
      // Cancel any pending weather request
      weatherAbortRef.current?.abort();
      const controller = new AbortController();
      weatherAbortRef.current = controller;

      // Check cache first
      const cached = getCached(weatherCache, coordKey);
      if (cached) {
        setWeather(cached);
        setWeatherLoading(false);
        setWeatherError(null);
        return;
      }

      setWeatherLoading(true);
      setWeatherError(null);

      try {
        const data = await fetchWeather(lat, lng, controller.signal);
        // Only update if this is still the active coordinate
        if (activeCoords.current === coordKey) {
          setWeather(data);
          setWeatherError(null);
          setLastUpdated(new Date());
          setCache(weatherCache, coordKey, data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (activeCoords.current === coordKey) {
          setWeatherError(
            err instanceof Error ? err.message : 'Failed to load weather data'
          );
          setWeather(null);
        }
      } finally {
        if (activeCoords.current === coordKey) {
          setWeatherLoading(false);
        }
      }
    },
    []
  );

  const loadAirQuality = useCallback(
    async (lat: number, lng: number, coordKey: string) => {
      // Cancel any pending AQ request
      aqAbortRef.current?.abort();
      const controller = new AbortController();
      aqAbortRef.current = controller;

      // Check cache first
      const cached = getCached(aqCache, coordKey);
      if (cached) {
        setAirQuality(cached);
        setAirQualityLoading(false);
        setAirQualityError(null);
        return;
      }

      setAirQualityLoading(true);
      setAirQualityError(null);

      try {
        const data = await fetchAirQuality(lat, lng, controller.signal);
        if (activeCoords.current === coordKey) {
          setAirQuality(data);
          setAirQualityError(null);
          setLastUpdated(new Date());
          setCache(aqCache, coordKey, data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (activeCoords.current === coordKey) {
          setAirQualityError(
            err instanceof Error ? err.message : 'Failed to load air quality data'
          );
          setAirQuality(null);
        }
      } finally {
        if (activeCoords.current === coordKey) {
          setAirQualityLoading(false);
        }
      }
    },
    []
  );

  // Trigger data fetch when selected location changes
  useEffect(() => {
    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;
    const coordKey = makeCacheKey(lat, lng);

    // Clear stale data immediately to prevent showing old location's data
    activeCoords.current = coordKey;
    setWeather(null);
    setAirQuality(null);

    loadWeather(lat, lng, coordKey);
    loadAirQuality(lat, lng, coordKey);

    // Cleanup: abort on unmount or coordinate change
    return () => {
      weatherAbortRef.current?.abort();
      aqAbortRef.current?.abort();
    };
  }, [selectedLocation.latitude, selectedLocation.longitude, loadWeather, loadAirQuality]);

  // Retry handlers
  const retryWeather = useCallback(() => {
    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;
    const coordKey = makeCacheKey(lat, lng);
    // Clear cache for this coordinate so retry actually re-fetches
    weatherCache.delete(coordKey);
    loadWeather(lat, lng, coordKey);
  }, [selectedLocation.latitude, selectedLocation.longitude, loadWeather]);

  const retryAirQuality = useCallback(() => {
    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;
    const coordKey = makeCacheKey(lat, lng);
    aqCache.delete(coordKey);
    loadAirQuality(lat, lng, coordKey);
  }, [selectedLocation.latitude, selectedLocation.longitude, loadAirQuality]);

  return {
    weather,
    airQuality,
    weatherLoading,
    airQualityLoading,
    weatherError,
    airQualityError,
    lastUpdated,
    retryWeather,
    retryAirQuality,
  };
}
