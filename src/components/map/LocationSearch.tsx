import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Loader2, 
  X, 
  AlertCircle, 
  Globe2, 
  Users, 
  Clock, 
  Check 
} from 'lucide-react';
import { searchLocations } from '../../services/geocodingService';
import { useLocation } from '../../hooks/useLocation';
import type { SelectedLocation } from '../../types/location';

interface LocationSearchProps {
  className?: string;
  onLocationSelected?: (location: SelectedLocation) => void;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  className = '',
  onLocationSelected,
}) => {
  const { 
    selectedLocation, 
    setSelectedLocation, 
    detectUserLocation, 
    isDetectingLocation, 
    detectionError, 
    clearDetectionError 
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SelectedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    setIsOpen(true);
    if (val.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setSearchError(null);
    }
  };

  // Debounced search query when 2 or more characters entered
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setSearchError(null);

      try {
        const locations = await searchLocations(trimmed, 8, controller.signal);
        setResults(locations);
        setHighlightedIndex(locations.length > 0 ? 0 : -1);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setSearchError('Unable to query geographic service. Please verify network connection.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelect = useCallback((location: SelectedLocation) => {
    setSelectedLocation(location);
    setIsOpen(false);
    setSearchQuery('');
    setResults([]);
    onLocationSelected?.(location);
  }, [setSelectedLocation, onLocationSelected]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const formattedCoordinates = `${selectedLocation.latitude.toFixed(4)}°, ${selectedLocation.longitude.toFixed(4)}°`;
  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      {/* Current Location Display Card & Search Input Trigger */}
      <div className="bg-command-900/95 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-xl shadow-panel transition-all">
        {/* Top: Active Location Metadata Display */}
        <div className="p-3 border-b border-white/5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-800/50 text-cyan-400 shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                LOCATION
              </span>
              <h2 className="text-sm font-bold text-white tracking-wide truncate">
                {selectedLocation.name}
              </h2>
              <p className="text-[11px] font-mono text-cyan-300/90 truncate">
                {locationSubtitle}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                <span>[{formattedCoordinates}]</span>
                {selectedLocation.population !== undefined && selectedLocation.population > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3 h-3 text-slate-400" />
                      {selectedLocation.population.toLocaleString()}
                    </span>
                  </>
                )}
                {selectedLocation.timezone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {selectedLocation.timezone.split('/').pop()?.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* "Use My Location" Control */}
          <button
            onClick={() => detectUserLocation()}
            disabled={isDetectingLocation}
            className="p-2 rounded-lg bg-command-800/80 hover:bg-command-700/80 border border-white/10 text-slate-300 hover:text-cyan-300 transition-all shrink-0 flex items-center gap-1.5 text-xs font-mono disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
            title="Use my location (GPS Geolocation)"
            aria-label="Use my device location"
          >
            {isDetectingLocation ? (
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="hidden sm:inline text-[11px]">GPS</span>
          </button>
        </div>

        {/* Bottom: Search Input Field */}
        <div className="relative p-2 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search city, town, village, region, postcode..."
            className="w-full bg-command-950/80 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500/60 transition-colors"
            aria-label="Search geographic location"
            autoComplete="off"
          />

          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-4" />
          ) : searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="absolute right-3.5 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              aria-label="Clear search query"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Geolocation Denied / Warning Alert */}
      {detectionError && (
        <div className="mt-2 p-2.5 rounded-xl bg-amber-950/70 border border-amber-800/60 text-amber-200 text-xs font-mono flex items-start gap-2 shadow-panel backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold block text-amber-300">Device Location Notice</span>
            <p className="text-[11px] text-amber-200/90 leading-tight mt-0.5">{detectionError}</p>
          </div>
          <button
            onClick={clearDetectionError}
            className="p-1 rounded hover:bg-white/10 text-amber-300 shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Autocomplete Search Dropdown */}
      {isOpen && searchQuery.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-command-950/95 border border-white/15 rounded-xl shadow-hud backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 border-b border-white/5 flex items-center justify-between bg-command-900/60">
            <span>Real Geographic Matches</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Globe2 className="w-3 h-3" />
              Open-Meteo Geocoding
            </span>
          </div>

          <div className="overflow-y-auto p-1.5 space-y-1">
            {isLoading && results.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Searching global geographic database...</span>
              </div>
            ) : searchError ? (
              <div className="p-4 text-center text-xs font-mono text-rose-300 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{searchError}</span>
              </div>
            ) : results.length > 0 ? (
              results.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isCurrent =
                  item.name === selectedLocation.name &&
                  item.country === selectedLocation.country &&
                  Math.abs(item.latitude - selectedLocation.latitude) < 0.05 &&
                  Math.abs(item.longitude - selectedLocation.longitude) < 0.05;

                return (
                  <button
                    key={`${item.id}-${idx}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                      isHighlighted
                        ? 'bg-cyan-950/70 border border-cyan-800/60 text-white'
                        : 'text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white tracking-wide truncate">
                          {item.name}
                        </span>
                        {item.state && (
                          <span className="text-[11px] text-cyan-300/90 truncate">
                            {item.state}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-command-900 border border-white/5 shrink-0">
                          {item.country}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                        <span>
                          {item.latitude.toFixed(3)}°, {item.longitude.toFixed(3)}°
                        </span>
                        {item.postcode && (
                          <>
                            <span>•</span>
                            <span>Postcode: {item.postcode}</span>
                          </>
                        )}
                        {item.population !== undefined && item.population > 0 && (
                          <>
                            <span>•</span>
                            <span>Pop: {item.population.toLocaleString()}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {isCurrent ? (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs font-mono text-slate-400">
                No matching geographic locations found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
