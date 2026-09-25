import type { CityObservation } from '../types/observation';

const STORAGE_KEY = 'citypulse_observation_history_v1';
const MAX_SNAPSHOTS = 500;
export const OBSERVATION_RECORDED_EVENT = 'citypulse:observation_recorded';

/**
 * Retrieves all stored observation snapshots from localStorage
 */
export function getAllObservations(): CityObservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse CityPulse observation history:', err);
    return [];
  }
}

/**
 * Retrieves observation snapshots filtered by cityId sorted by timestamp ascending
 */
export function getCityObservations(cityId: string): CityObservation[] {
  const all = getAllObservations();
  return all
    .filter((obs) => obs.cityId === cityId || obs.cityId.toLowerCase() === cityId.toLowerCase())
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Records a new compact observation snapshot to localStorage
 */
export function recordObservation(
  data: Omit<CityObservation, 'id' | 'timestamp'>
): CityObservation | null {
  try {
    const all = getAllObservations();
    const citySnaps = all.filter((o) => o.cityId === data.cityId);
    
    // De-duplicate if last observation for this city was recorded less than 60s ago
    if (citySnaps.length > 0) {
      const last = citySnaps[citySnaps.length - 1];
      const ageMs = Date.now() - new Date(last.timestamp).getTime();
      if (ageMs < 60000) {
        return last; // Reuse existing recent snapshot
      }
    }

    const newObs: CityObservation = {
      ...data,
      id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    const updated = [...all, newObs];

    // Maintain max limit (rolling buffer)
    if (updated.length > MAX_SNAPSHOTS) {
      updated.splice(0, updated.length - MAX_SNAPSHOTS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent(OBSERVATION_RECORDED_EVENT, { detail: newObs })
    );

    return newObs;
  } catch (err) {
    console.error('Failed to record CityPulse observation snapshot:', err);
    return null;
  }
}

/**
 * Clears observation history for a specific city or all cities
 */
export function clearObservationHistory(cityId?: string): void {
  if (!cityId) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    const remaining = getAllObservations().filter((o) => o.cityId !== cityId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }
}
