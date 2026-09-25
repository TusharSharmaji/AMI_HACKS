import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PoiItem, PoiCategory } from '../types/poi';
import { fetchCivicPois } from '../services/overpassService';
import { useLocation } from './useLocation';

const DEFAULT_CATEGORY_STATE: Record<PoiCategory, boolean> = {
  healthcare: true,
  police: true,
  fire: true,
  civic: true,
  education: true,
  transit: true,
  landmarks: true,
};

interface UsePoiDataReturn {
  pois: PoiItem[];
  filteredPois: PoiItem[];
  enabledCategories: Record<PoiCategory, boolean>;
  categoryCounts: Record<PoiCategory, number>;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  toggleCategory: (category: PoiCategory) => void;
  setCategoryEnabled: (category: PoiCategory, enabled: boolean) => void;
  enableAllCategories: () => void;
  disableAllCategories: () => void;
  refresh: () => void;
}

export function usePoiData(): UsePoiDataReturn {
  const { selectedLocation } = useLocation();
  const [pois, setPois] = useState<PoiItem[]>([]);
  const [enabledCategories, setEnabledCategories] = useState<Record<PoiCategory, boolean>>(DEFAULT_CATEGORY_STATE);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPois = useCallback(async (isMounted: () => boolean) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCivicPois(
        selectedLocation.latitude,
        selectedLocation.longitude,
        4500,
        controller.signal
      );

      if (isMounted()) {
        setPois(data);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (isMounted()) {
        setError(err instanceof Error ? err.message : 'Failed to retrieve civic points of interest.');
        setLoading(false);
      }
    }
  }, [selectedLocation.latitude, selectedLocation.longitude]);

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    loadPois(isMounted);

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadPois]);

  const toggleCategory = useCallback((category: PoiCategory) => {
    setEnabledCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const setCategoryEnabled = useCallback((category: PoiCategory, enabled: boolean) => {
    setEnabledCategories((prev) => ({
      ...prev,
      [category]: enabled,
    }));
  }, []);

  const enableAllCategories = useCallback(() => {
    setEnabledCategories({
      healthcare: true,
      police: true,
      fire: true,
      civic: true,
      education: true,
      transit: true,
      landmarks: true,
    });
  }, []);

  const disableAllCategories = useCallback(() => {
    setEnabledCategories({
      healthcare: false,
      police: false,
      fire: false,
      civic: false,
      education: false,
      transit: false,
      landmarks: false,
    });
  }, []);

  const refresh = useCallback(() => {
    loadPois(() => true);
  }, [loadPois]);

  // Compute counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<PoiCategory, number> = {
      healthcare: 0,
      police: 0,
      fire: 0,
      civic: 0,
      education: 0,
      transit: 0,
      landmarks: 0,
    };
    for (const poi of pois) {
      if (counts[poi.category] !== undefined) {
        counts[poi.category]++;
      }
    }
    return counts;
  }, [pois]);

  // Compute filtered POIs according to enabledCategories
  const filteredPois = useMemo(() => {
    return pois.filter((poi) => enabledCategories[poi.category]);
  }, [pois, enabledCategories]);

  return {
    pois,
    filteredPois,
    enabledCategories,
    categoryCounts,
    loading,
    error,
    lastUpdated,
    toggleCategory,
    setCategoryEnabled,
    enableAllCategories,
    disableAllCategories,
    refresh,
  };
}
