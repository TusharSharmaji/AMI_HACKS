import type {
  TrafficSegmentData,
  TomTomFlowSegmentResponse,
  CongestionLevel,
  CongestionClassification,
  CityTrafficPoint,
} from '../types/traffic';

const TOMTOM_FLOW_URL = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';

/**
 * Calculates CityPulse congestion classification from speeds.
 * Formula: congestion = clamp(1 - currentSpeed / freeFlowSpeed, 0, 1)
 *
 * Classifications:
 *   0–20%  -> Light
 *   20–40% -> Moderate
 *   40–60% -> Heavy
 *   >60%   -> Severe
 */
export function classifyCongestion(
  currentSpeed: number,
  freeFlowSpeed: number,
  roadClosure: boolean
): CongestionClassification {
  if (roadClosure) {
    return {
      condition: 'Severe',
      percentage: 100,
      label: 'Road Closed',
      color: '#ef4444', // Red
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
    };
  }

  let ratio = 0;
  if (freeFlowSpeed > 0) {
    const rawRatio = 1 - currentSpeed / freeFlowSpeed;
    ratio = Math.max(0, Math.min(1, rawRatio));
  }

  const percentage = Math.round(ratio * 100);

  let condition: CongestionLevel;
  let label: string;
  let color: string;
  let textColor: string;
  let bgColor: string;
  let borderColor: string;

  if (percentage <= 20) {
    condition = 'Light';
    label = 'Light Traffic';
    color: color = '#10b981'; // Emerald
    textColor = 'text-emerald-400';
    bgColor = 'bg-emerald-500/10';
    borderColor = 'border-emerald-500/30';
  } else if (percentage <= 40) {
    condition = 'Moderate';
    label = 'Moderate Congestion';
    color = '#f59e0b'; // Amber
    textColor = 'text-amber-400';
    bgColor = 'bg-amber-500/10';
    borderColor = 'border-amber-500/30';
  } else if (percentage <= 60) {
    condition = 'Heavy';
    label = 'Heavy Congestion';
    color = '#f97316'; // Orange
    textColor = 'text-orange-400';
    bgColor = 'bg-orange-500/10';
    borderColor = 'border-orange-500/30';
  } else {
    condition = 'Severe';
    label = 'Severe Delay';
    color = '#ef4444'; // Red
    textColor = 'text-rose-400';
    bgColor = 'bg-rose-500/10';
    borderColor = 'border-rose-500/30';
  }

  return {
    condition,
    percentage,
    label,
    color,
    textColor,
    bgColor,
    borderColor,
  };
}

/**
 * Format travel time in seconds to human-readable format (e.g. 4m 45s or 45s)
 */
export function formatTravelTime(seconds: number): string {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Fetches real-time traffic flow segment data from TomTom Traffic Flow API.
 * Uses the API key configured in VITE_TOMTOM_API_KEY.
 *
 * @param latitude Latitude of the selected location
 * @param longitude Longitude of the selected location
 * @param signal Optional AbortSignal for canceling in-flight requests
 */
export async function fetchTrafficSegment(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<TrafficSegmentData> {
  const apiKey = import.meta.env.VITE_TOMTOM_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('TomTom API key is missing. Please set VITE_TOMTOM_API_KEY in your environment.');
  }

  // Validate coordinates
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid geographic coordinates provided for traffic lookup.');
  }

  const params = new URLSearchParams({
    key: apiKey,
    point: `${latitude.toFixed(6)},${longitude.toFixed(6)}`,
    unit: 'kmph',
  });

  const url = `${TOMTOM_FLOW_URL}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new Error('Network error: Unable to contact TomTom Traffic Flow service.');
  }

  // Handle specific HTTP error status codes
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`TomTom API authentication failed (${response.status}). Please check your API key.`);
    }

    if (response.status === 429) {
      throw new Error('TomTom API rate limit exceeded. Please wait a moment before refreshing.');
    }

    // Attempt to parse error message from TomTom
    try {
      const errJson = (await response.json()) as TomTomFlowSegmentResponse;
      if (errJson.error?.includes('Point too far') || errJson.detailedError?.message?.includes('Point too far')) {
        throw new Error('No road traffic segment available near this location.');
      }
      if (errJson.detailedError?.message) {
        throw new Error(`TomTom Traffic notice: ${errJson.detailedError.message}`);
      }
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message.startsWith('TomTom Traffic')) {
        throw parseErr;
      }
      if (parseErr instanceof Error && parseErr.message.includes('No road traffic segment')) {
        throw parseErr;
      }
    }

    throw new Error(`TomTom Traffic API error: HTTP ${response.status}`);
  }

  let data: TomTomFlowSegmentResponse;
  try {
    data = (await response.json()) as TomTomFlowSegmentResponse;
  } catch {
    throw new Error('Malformed response received from TomTom Traffic service.');
  }

  const fs = data.flowSegmentData;
  if (!fs) {
    throw new Error('No traffic flow segment returned for this location.');
  }

  // Parse fields safely with defensive fallbacks
  const currentSpeed = typeof fs.currentSpeed === 'number' ? fs.currentSpeed : 0;
  const freeFlowSpeed = typeof fs.freeFlowSpeed === 'number' ? fs.freeFlowSpeed : 0;
  const currentTravelTime = typeof fs.currentTravelTime === 'number' ? fs.currentTravelTime : 0;
  const freeFlowTravelTime = typeof fs.freeFlowTravelTime === 'number' ? fs.freeFlowTravelTime : 0;
  const confidence = typeof fs.confidence === 'number' ? Math.max(0, Math.min(1, fs.confidence)) : 1;
  const roadClosure = Boolean(fs.roadClosure);
  const roadClass = fs.frc || undefined;

  // Safe coordinate parsing into GeoJSON [lng, lat] pairs
  const rawCoords = fs.coordinates?.coordinate || [];
  const coordinates: [number, number][] = rawCoords
    .filter((c) => typeof c?.latitude === 'number' && typeof c?.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude))
    .map((c) => [c.longitude, c.latitude]); // MapLibre GeoJSON standard is [longitude, latitude]

  if (coordinates.length < 2) {
    throw new Error('Insufficient road segment geometry returned by TomTom.');
  }

  // Classify congestion
  const classification = classifyCongestion(currentSpeed, freeFlowSpeed, roadClosure);

  return {
    currentSpeed,
    freeFlowSpeed,
    currentTravelTime,
    freeFlowTravelTime,
    confidence,
    roadClosure,
    coordinates,
    congestionRatio: classification.percentage / 100,
    congestionPercentage: classification.percentage,
    condition: classification.condition,
    roadClass,
    fetchedAt: new Date(),
  };
}

// In-memory cache for city-wide traffic samples (TTL 2 minutes)
interface CityTrafficCacheEntry {
  points: CityTrafficPoint[];
  timestamp: number;
}
const cityTrafficCache = new Map<string, CityTrafficCacheEntry>();
const CITY_CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * Calculates Euclidean distance between two points (in degrees).
 */
function getCoordDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat1 - lat2;
  const dLon = lon1 - lon2;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Small deterministic-ish jitter so that repeated calls for the same city
 * don't always query the exact same coordinates (which can all snap to one
 * single TomTom road segment).
 */
function jitter(): number {
  return (Math.random() - 0.5) * 0.008; // ±0.004° ≈ ±400 m
}

/**
 * Generates a uniform grid of sampling coordinates across a rectangular area
 * centered on (centerLat, centerLng).
 *
 * @param centerLat   City center latitude
 * @param centerLng   City center longitude
 * @param gridSize    Number of rows & columns (e.g. 4 → 4×4 = 16 points)
 * @param halfSpread  Half the width/height of the sampling rectangle in degrees.
 *                    0.06° ≈ 6.7 km, so full extent ≈ 13.4 km.
 */
function generateSamplingGrid(
  centerLat: number,
  centerLng: number,
  gridSize: number,
  halfSpread: number
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const step = (halfSpread * 2) / (gridSize - 1);

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const lat = centerLat - halfSpread + row * step + jitter();
      const lng = centerLng - halfSpread + col * step + jitter();
      points.push([lat, lng]);
    }
  }
  return points;
}

/**
 * Sleeps for the given number of milliseconds. Used to throttle TomTom calls.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a single CityTrafficPoint from a coordinate pair.
 * Returns null on any failure (water body, no road, rate limit on that point, etc.)
 * so that one bad point never blocks the rest.
 */
async function fetchSinglePoint(
  lat: number,
  lng: number,
  idx: number,
  signal?: AbortSignal
): Promise<CityTrafficPoint | null> {
  try {
    const segment = await fetchTrafficSegment(lat, lng, signal);

    // Use the actual road midpoint returned by TomTom, not our sample coordinate
    let midLat = lat;
    let midLng = lng;
    if (segment.coordinates.length > 0) {
      const midIdx = Math.floor(segment.coordinates.length / 2);
      midLng = segment.coordinates[midIdx][0];
      midLat = segment.coordinates[midIdx][1];
    }

    const classification = classifyCongestion(
      segment.currentSpeed,
      segment.freeFlowSpeed,
      segment.roadClosure
    );

    return {
      id: `traffic-${idx}-${midLat.toFixed(4)}-${midLng.toFixed(4)}`,
      latitude: midLat,
      longitude: midLng,
      currentSpeed: segment.currentSpeed,
      freeFlowSpeed: segment.freeFlowSpeed,
      currentTravelTime: segment.currentTravelTime,
      freeFlowTravelTime: segment.freeFlowTravelTime,
      confidence: segment.confidence,
      roadClosure: segment.roadClosure,
      congestionPercentage: segment.congestionPercentage,
      congestionRatio: segment.congestionRatio,
      condition: segment.condition,
      classification,
      roadClass: segment.roadClass,
      coordinates: segment.coordinates,
      fetchedAt: segment.fetchedAt,
    };
  } catch {
    // Gracefully skip — this sample coordinate may be over water, a park, etc.
    return null;
  }
}

/**
 * Fetches multiple real traffic flow observations across a city by sampling a
 * 4×4 grid of coordinates spread ~13 km across, calling TomTom for each, and
 * deduplicating results that snap to the same road segment.
 *
 * Key design decisions:
 *  - 4×4 grid (16 probes) with ±400 m jitter → diverse road hits
 *  - Batched 4-at-a-time with 120 ms inter-batch delay to respect rate limits
 *  - Individual failures are silently skipped
 *  - Deduplication threshold 0.003° ≈ 330 m based on returned road midpoint
 *
 * @param centerLat Center latitude of the city
 * @param centerLng Center longitude of the city
 * @param signal    Optional AbortSignal
 */
export async function fetchCityWideTraffic(
  centerLat: number,
  centerLng: number,
  signal?: AbortSignal
): Promise<CityTrafficPoint[]> {
  const cacheKey = `${centerLat.toFixed(3)}_${centerLng.toFixed(3)}`;
  const now = Date.now();
  const cached = cityTrafficCache.get(cacheKey);

  if (cached && now - cached.timestamp < CITY_CACHE_TTL_MS) {
    return cached.points;
  }

  // ── Generate sample grid ──
  // 4×4 grid with ±0.065° spread ≈ 14.5 km total extent
  const sampleCoords = generateSamplingGrid(centerLat, centerLng, 4, 0.065);

  // ── Fetch in batches of 4 to avoid TomTom 429s ──
  const BATCH_SIZE = 4;
  const BATCH_DELAY_MS = 120;
  const allPoints: CityTrafficPoint[] = [];

  for (let batchStart = 0; batchStart < sampleCoords.length; batchStart += BATCH_SIZE) {
    // Bail out early if the caller cancelled
    if (signal?.aborted) break;

    const batch = sampleCoords.slice(batchStart, batchStart + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(([lat, lng], localIdx) =>
        fetchSinglePoint(lat, lng, batchStart + localIdx, signal)
      )
    );

    for (const res of batchResults) {
      if (res.status === 'fulfilled' && res.value) {
        allPoints.push(res.value);
      }
    }

    // Small delay between batches (skip after the last batch)
    if (batchStart + BATCH_SIZE < sampleCoords.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // ── Deduplicate points that snapped to the same road segment ──
  // Two points are considered duplicates if their returned midpoints are
  // within ~0.003° (≈330 m) of each other.
  const PROXIMITY_THRESHOLD = 0.003;
  const deduplicated: CityTrafficPoint[] = [];

  for (const point of allPoints) {
    const isDuplicate = deduplicated.some(
      (existing) =>
        getCoordDistance(
          existing.latitude,
          existing.longitude,
          point.latitude,
          point.longitude
        ) < PROXIMITY_THRESHOLD
    );
    if (!isDuplicate) {
      deduplicated.push(point);
    }
  }

  // Store in cache
  cityTrafficCache.set(cacheKey, {
    points: deduplicated,
    timestamp: now,
  });

  return deduplicated;
}


