export interface SelectedLocation {
  id?: number | string;
  name: string;
  country: string;
  state?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
  elevation?: number;
  postcode?: string;
}

export const DEFAULT_LOCATION: SelectedLocation = {
  id: 1269515,
  name: 'Jaipur',
  state: 'Rajasthan',
  country: 'India',
  latitude: 26.9124,
  longitude: 75.7873,
  timezone: 'Asia/Kolkata',
  population: 3046163,
  elevation: 435,
};

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  admin4?: string;
  timezone?: string;
  population?: number;
  postcodes?: string[];
}

export interface GeocodingApiResponse {
  results?: GeocodingResult[];
  generationtime_ms?: number;
}

export interface ReverseGeocodeNominatimResponse {
  place_id?: number;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
    road?: string;
  };
}
