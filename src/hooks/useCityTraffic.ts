import { useState, useEffect, useCallback, useRef } from 'react';
import type { CityTrafficPoint } from '../types/traffic';
import { fetchCityWideTraffic } from '../services/trafficService';
import { useLocation } from './useLocation';

interface UseCityTrafficReturn {
  trafficPoints: CityTrafficPoint[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useCityTraffic(): UseCityTrafficReturn {
  const { selectedLocation } = useLocation();
  const [trafficPoints, setTrafficPoints] = useState<CityTrafficPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadTraffic = useCallback(async (isMounted: () => boolean) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const points = await fetchCityWideTraffic(
        selectedLocation.latitude,
        selectedLocation.longitude,
        controller.signal
      );

      if (isMounted()) {
        setTrafficPoints(points);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (isMounted()) {
        setError(err instanceof Error ? err.message : 'Failed to fetch city-wide traffic.');
        setLoading(false);
      }
    }
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    loadTraffic(isMounted);

    // Auto-refresh every 60 seconds
    const intervalId = setInterval(() => {
      loadTraffic(isMounted);
    }, 60000);

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(intervalId);
    };
  }, [loadTraffic]);

  const refresh = useCallback(() => {
    loadTraffic(() => true);
  }, [loadTraffic]);

  return {
    trafficPoints,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
