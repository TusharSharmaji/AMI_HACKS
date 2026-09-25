import React, { useEffect, useRef } from 'react';
import { Map, Marker, NavigationControl } from 'maplibre-gl';
import { MAP_STYLES } from '../../utils/constants';
import type { ReportLocation } from '../../types/report';

interface MapLocationPickerProps {
  location: ReportLocation | null;
  onSelectLocation: (loc: ReportLocation) => void;
  defaultCenter: [number, number]; // [lng, lat]
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  location,
  onSelectLocation,
  defaultCenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onSelectLocationRef = useRef(onSelectLocation);

  useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
  }, [onSelectLocation]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLng = location ? location.longitude : defaultCenter[0];
    const initialLat = location ? location.latitude : defaultCenter[1];

    const mapInstance = new Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[0].url,
      center: [initialLng, initialLat],
      zoom: 13,
      pitch: 0,
      attributionControl: false,
    });

    mapInstance.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');

    const updateMarker = (lng: number, lat: number) => {
      if (!markerRef.current) {
        const marker = new Marker({
          color: '#06b6d4',
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(mapInstance);

        marker.on('dragend', () => {
          const pos = marker.getLngLat();
          onSelectLocationRef.current({ latitude: pos.lat, longitude: pos.lng });
        });

        markerRef.current = marker;
      } else {
        markerRef.current.setLngLat([lng, lat]);
      }
    };

    mapInstance.on('load', () => {
      mapInstance.resize();
      if (location) {
        updateMarker(location.longitude, location.latitude);
      }
    });

    mapInstance.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      updateMarker(lng, lat);
      onSelectLocationRef.current({ latitude: lat, longitude: lng });
    });

    mapRef.current = mapInstance;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      mapInstance.remove();
      mapRef.current = null;
    };
  }, [defaultCenter]);

  // Synchronize marker when location changes externally (e.g. from GPS)
  useEffect(() => {
    if (!mapRef.current || !location) return;
    const { longitude, latitude } = location;

    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    } else {
      const marker = new Marker({
        color: '#06b6d4',
        draggable: true,
      })
        .setLngLat([longitude, latitude])
        .addTo(mapRef.current);

      marker.on('dragend', () => {
        const pos = marker.getLngLat();
        onSelectLocationRef.current({ latitude: pos.lat, longitude: pos.lng });
      });

      markerRef.current = marker;
    }

    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      essential: true,
    });
  }, [location]);

  return (
    <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-cyan-500/30 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 pointer-events-none bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-cyan-300 font-mono border border-cyan-500/30">
        Click or drag pin to position on map
      </div>
    </div>
  );
};
