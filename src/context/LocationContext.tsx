import React, { useState, useCallback, type ReactNode } from 'react';
import { DEFAULT_LOCATION, type SelectedLocation } from '../types/location';
import { reverseGeocode } from '../services/geocodingService';
import { LocationContext } from './LocationContextDef';

export { LocationContext, type LocationContextType } from './LocationContextDef';

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [selectedLocation, setSelectedLocationState] = useState<SelectedLocation>(DEFAULT_LOCATION);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Map target coordinates trigger map flyTo in MapView
  const [mapTarget, setMapTarget] = useState<{
    latitude: number;
    longitude: number;
    zoom?: number;
    timestamp: number;
  }>({
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    zoom: 12.8,
    timestamp: 0,
  });

  const clearDetectionError = useCallback(() => {
    setDetectionError(null);
  }, []);

  const moveToCoordinates = useCallback((lat: number, lng: number, zoom = 12.8) => {
    setMapTarget({
      latitude: lat,
      longitude: lng,
      zoom,
      timestamp: performance.now(),
    });
  }, []);

  const setSelectedLocation = useCallback((location: SelectedLocation) => {
    setSelectedLocationState(location);
    setDetectionError(null);
    moveToCoordinates(location.latitude, location.longitude, 12.8);
  }, [moveToCoordinates]);

  const detectUserLocation = useCallback(async () => {
    clearDetectionError();

    if (!navigator.geolocation) {
      setDetectionError('Geolocation is not supported by your browser. Please search for a location manually.');
      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const detected = await reverseGeocode(latitude, longitude);
          setSelectedLocationState(detected);
          moveToCoordinates(latitude, longitude, 13.5);
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
          const fallbackLocation: SelectedLocation = {
            id: `geo-${latitude}-${longitude}`,
            name: 'Current Location',
            country: 'Detected Position',
            latitude,
            longitude,
          };
          setSelectedLocationState(fallbackLocation);
          moveToCoordinates(latitude, longitude, 13.5);
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setDetectionError('Location access was denied. You can search for any city, town, or postal code manually using the search bar.');
            break;
          case error.POSITION_UNAVAILABLE:
            setDetectionError('Location information is currently unavailable. Please search for a location manually.');
            break;
          case error.TIMEOUT:
            setDetectionError('The request to detect your location timed out. Please try again or search manually.');
            break;
          default:
            setDetectionError('An error occurred while detecting your location. You can search for any location manually.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, [clearDetectionError, moveToCoordinates]);

  return (
    <LocationContext.Provider
      value={{
        selectedLocation,
        setSelectedLocation,
        isDetectingLocation,
        detectionError,
        clearDetectionError,
        detectUserLocation,
        mapTarget,
        moveToCoordinates,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
