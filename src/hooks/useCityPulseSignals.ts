import { useMemo, useState, useEffect } from 'react';
import { useLocation } from './useLocation';
import { useCivicDataContext } from './useCivicDataContext';
import { useTrafficData } from './useTrafficData';
import { useCityTraffic } from './useCityTraffic';
import { getReports, REPORT_SAVED_EVENT } from '../services/reportService';
import { detectCityPulseSignals, type CityPulseSignal } from '../services/signalEngine';
import type { CivicReportMeta } from '../types/report';

export function useCityPulseSignals() {
  const { selectedLocation, moveToCoordinates } = useLocation();
  const { weather, airQuality } = useCivicDataContext();
  const { traffic } = useTrafficData();
  const { trafficPoints } = useCityTraffic();

  const [reports, setReports] = useState<CivicReportMeta[]>(() => getReports());
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => setReports(getReports());
    window.addEventListener(REPORT_SAVED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(REPORT_SAVED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const signals = useMemo<CityPulseSignal[]>(() => {
    if (!selectedLocation) return [];
    return detectCityPulseSignals({
      location: selectedLocation,
      weather,
      airQuality,
      traffic,
      trafficPoints,
      citizenReports: reports,
    });
  }, [selectedLocation, weather, airQuality, traffic, trafficPoints, reports]);

  const selectedSignal = useMemo(() => {
    if (!selectedSignalId) return signals[0] || null;
    return signals.find((s) => s.id === selectedSignalId) || signals[0] || null;
  }, [signals, selectedSignalId]);

  const focusSignalOnMap = (signal: CityPulseSignal) => {
    setSelectedSignalId(signal.id);
    moveToCoordinates(signal.latitude, signal.longitude, 14);
  };

  return {
    signals,
    selectedSignal,
    selectedSignalId,
    setSelectedSignalId,
    focusSignalOnMap,
    hasSignals: signals.length > 0,
  };
}
