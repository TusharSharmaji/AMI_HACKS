import { useState, useEffect, useRef, useCallback } from 'react';
import type { TrafficSegmentData } from '../types/traffic';
import { fetchTrafficSegment } from '../services/trafficService';
import { useLocation } from './useLocation';

interface TrafficDataState {
  traffic: TrafficSegmentData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

interface CacheEntry {
  data: TrafficSegmentData;
  fetchedAt: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

function makeCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)}_${lng.toFixed(4)}`;
}

const trafficCache = new Map<string, CacheEntry>();

function getCached(key: string): TrafficSegmentData | null {
  const entry = trafficCache.get(key);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.data;
  }
  trafficCache.delete(key);
  return null;
}

function setCache(key: string, data: TrafficSegmentData): void {
  trafficCache.set(key, { data, fetchedAt: Date.now() });
  if (trafficCache.size > 20) {
    const firstKey = trafficCache.keys().next().value;
    if (firstKey !== undefined) trafficCache.delete(firstKey);
  }
}

/**
 * Custom hook to manage TomTom traffic flow data for the selected location.
 * - Triggers only after a location is selected
 * - Immediately clears stale traffic data when location changes
 * - Refreshes automatically every 3 minutes
 * - Supports manual refresh
 * - Aborts stale in-flight requests
 */
export function useTrafficData(): TrafficDataState {
  const { selectedLocation } = useLocation();

  const [traffic, setTraffic] = useState<TrafficSegmentData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeCoordKey = useRef<string>('');

  const loadTraffic = useCallback(
    async (lat: number, lng: number, coordKey: string, bypassCache = false) => {
      // Cancel any ongoing fetch
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Check cache first (unless manually refreshing)
      if (!bypassCache) {
        const cached = getCached(coordKey);
        if (cached) {
          setTraffic(cached);
          setLoading(false);
          setError(null);
          setLastUpdated(cached.fetchedAt);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchTrafficSegment(lat, lng, controller.signal);
        if (activeCoordKey.current === coordKey) {
          setTraffic(data);
          setError(null);
          setLastUpdated(data.fetchedAt);
          setCache(coordKey, data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (activeCoordKey.current === coordKey) {
          setError(err instanceof Error ? err.message : 'Unable to retrieve traffic flow segment.');
          setTraffic(null);
        }
      } finally {
        if (activeCoordKey.current === coordKey) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Trigger when coordinates change
  useEffect(() => {
    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;
    const coordKey = makeCacheKey(lat, lng);

    activeCoordKey.current = coordKey;

    // Immediately clear previous traffic segment to avoid showing stale road data
    setTraffic(null);
    setError(null);

    loadTraffic(lat, lng, coordKey, false);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [selectedLocation.latitude, selectedLocation.longitude, loadTraffic]);

  // Setup auto-refresh every 3 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const lat = selectedLocation.latitude;
      const lng = selectedLocation.longitude;
      const coordKey = makeCacheKey(lat, lng);
      // Auto refresh bypasses cache to get fresh real-time data
      loadTraffic(lat, lng, coordKey, true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [selectedLocation.latitude, selectedLocation.longitude, loadTraffic]);

  // Manual refresh callback
  const refresh = useCallback(() => {
    const lat = selectedLocation.latitude;
    const lng = selectedLocation.longitude;
    const coordKey = makeCacheKey(lat, lng);
    // Invalidate cache
    trafficCache.delete(coordKey);
    loadTraffic(lat, lng, coordKey, true);
  }, [selectedLocation.latitude, selectedLocation.longitude, loadTraffic]);

  return {
    traffic,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
