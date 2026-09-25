import type { 
  SelectedLocation, 
  GeocodingApiResponse, 
  ReverseGeocodeNominatimResponse 
} from '../types/location';

const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Searches real geographic locations using the free Open-Meteo Geocoding API.
 * Supports cities, towns, villages, regions, countries, and postcodes.
 */
export async function searchLocations(
  query: string,
  count = 8,
  signal?: AbortSignal
): Promise<SelectedLocation[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const url = `${OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(
    trimmed
  )}&count=${count}&language=en&format=json`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Geocoding service returned status: ${response.status}`);
    }

    const data: GeocodingApiResponse = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Map into clean, standardized SelectedLocation models
    return data.results.map((item) => {
      // Pick best administrative region description (admin1 is state/province, admin2 is district)
      const state = item.admin1 || item.admin2 || undefined;
      const postcode = item.postcodes && item.postcodes.length > 0 ? item.postcodes[0] : undefined;

      return {
        id: item.id,
        name: item.name,
        country: item.country || (item.country_code ? item.country_code.toUpperCase() : 'Global'),
        state,
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone,
        population: item.population,
        elevation: item.elevation,
        postcode,
      };
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Ignore request cancellations from debouncing/typing
      return [];
    }
    console.error('Error fetching geocoding results from Open-Meteo:', error);
    throw error;
  }
}

/**
 * Reverse-geocodes latitude and longitude into a real place name and country.
 * Uses free OpenStreetMap Nominatim with graceful fallback.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<SelectedLocation> {
  const roundedLat = Number(latitude.toFixed(5));
  const roundedLng = Number(longitude.toFixed(5));

  try {
    const url = `${NOMINATIM_REVERSE_URL}?lat=${roundedLat}&lon=${roundedLng}&format=json&zoom=14&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CityPulse/2.0 (Geospatial Civic Health Platform)',
      },
      signal,
    });

    if (response.ok) {
      const data: ReverseGeocodeNominatimResponse = await response.json();
      const addr = data.address;

      if (addr) {
        const name =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.suburb ||
          addr.road ||
          data.display_name?.split(',')[0] ||
          'Detected Location';

        const state = addr.state || addr.county || undefined;
        const country = addr.country || 'Detected Region';

        return {
          id: `geo-${roundedLat}-${roundedLng}`,
          name,
          state,
          country,
          latitude: roundedLat,
          longitude: roundedLng,
          postcode: addr.postcode,
        };
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding request warning, falling back to coordinate descriptor:', err);
  }

  // Fallback to coordinates when reverse service is offline/rate-limited
  return {
    id: `geo-${roundedLat}-${roundedLng}`,
    name: `Sector [${roundedLat.toFixed(3)}°, ${roundedLng.toFixed(3)}°]`,
    country: 'Geospatial Coordinates',
    latitude: roundedLat,
    longitude: roundedLng,
  };
}
