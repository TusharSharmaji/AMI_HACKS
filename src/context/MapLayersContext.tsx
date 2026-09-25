import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type MapTheme = 'dark' | 'light';

export interface MapLayersContextType {
  mapTheme: MapTheme;
  setMapTheme: (theme: MapTheme) => void;
  toggleTheme: () => void;
  showTraffic: boolean;
  setShowTraffic: (val: boolean) => void;
  showPois: boolean;
  setShowPois: (val: boolean) => void;
  showReports: boolean;
  setShowReports: (val: boolean) => void;
  showWeather: boolean;
  setShowWeather: (val: boolean) => void;
  toggleLayer: (layer: 'traffic' | 'pois' | 'reports' | 'weather') => void;
}

const MapLayersContext = createContext<MapLayersContextType | undefined>(undefined);

export const MapLayersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapTheme, setMapThemeState] = useState<MapTheme>(() => {
    const saved = localStorage.getItem('citypulse_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const [showTraffic, setShowTraffic] = useState(true);
  const [showPois, setShowPois] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showWeather, setShowWeather] = useState(true);

  // Sync document root class with theme
  useEffect(() => {
    const root = document.documentElement;
    if (mapTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('citypulse_theme', mapTheme);
  }, [mapTheme]);

  const setMapTheme = (theme: MapTheme) => {
    setMapThemeState(theme);
  };

  const toggleTheme = () => {
    setMapThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLayer = (layer: 'traffic' | 'pois' | 'reports' | 'weather') => {
    if (layer === 'traffic') setShowTraffic((prev) => !prev);
    if (layer === 'pois') setShowPois((prev) => !prev);
    if (layer === 'reports') setShowReports((prev) => !prev);
    if (layer === 'weather') setShowWeather((prev) => !prev);
  };

  return (
    <MapLayersContext.Provider
      value={{
        mapTheme,
        setMapTheme,
        toggleTheme,
        showTraffic,
        setShowTraffic,
        showPois,
        setShowPois,
        showReports,
        setShowReports,
        showWeather,
        setShowWeather,
        toggleLayer,
      }}
    >
      {children}
    </MapLayersContext.Provider>
  );
};

export const useMapLayers = (): MapLayersContextType => {
  const context = useContext(MapLayersContext);
  if (!context) {
    throw new Error('useMapLayers must be used within a MapLayersProvider');
  }
  return context;
};
