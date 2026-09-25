import type { SelectedLocation } from '../types/location';
import type { WeatherData } from '../types/weather';
import type { AirQualityData } from '../types/airQuality';
import type { TrafficSegmentData, CityTrafficPoint } from '../types/traffic';
import type { CivicReportMeta } from '../types/report';
import { ISSUE_TYPE_LABELS } from '../types/report';
import type { CityObservation } from '../types/observation';
import { getCityObservations } from './observationService';

export type SignalCategory =
  | 'WEATHER_TRAFFIC'
  | 'WEATHER_REPORTS'
  | 'TRAFFIC_REPORTS'
  | 'AQI_STAGNATION'
  | 'REPORT_CLUSTER'
  | 'COMPOUND_CORRELATION';

export type SignalConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type SignalSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SignalMetricItem {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface CityPulseSignal {
  id: string;
  title: string;
  category: SignalCategory;
  severity: SignalSeverity;
  confidence: SignalConfidence;
  latitude: number;
  longitude: number;
  locationName: string;
  summary: string;
  metrics: SignalMetricItem[];
  evidence: string[];
  explanation: string;
  disclaimer: string;
  timeWindow: string;
  historicalNote?: string;
  createdAt: string;
}

/**
 * Calculates distance in kilometers between two lat/lng positions via Haversine formula
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface DetectSignalsParams {
  location: SelectedLocation;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  traffic: TrafficSegmentData | null;
  trafficPoints: CityTrafficPoint[];
  citizenReports: CivicReportMeta[];
}

/**
 * DETERMINISTIC CROSS-FEED SIGNAL & CORRELATION ENGINE
 * Analyzes real live CityPulse data across feeds.
 * Never invents signals, never uses random values, never asserts causation.
 */
export function detectCityPulseSignals(params: {
  location: SelectedLocation;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  traffic: TrafficSegmentData | null;
  trafficPoints: CityTrafficPoint[];
  citizenReports: CivicReportMeta[];
}): CityPulseSignal[] {
  const {
    location,
    weather,
    airQuality,
    traffic,
    trafficPoints,
    citizenReports,
  } = params;

  const signals: CityPulseSignal[] = [];
  const now = new Date();
  const timeWindow = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Live Session)`;

  // Fetch real historical observations from City Replay if available
  const cityIdStr = String(location.id || location.name.toLowerCase());
  const historicalSnaps: CityObservation[] = getCityObservations(cityIdStr);
  const previousSnap = historicalSnaps.length >= 2 ? historicalSnaps[historicalSnaps.length - 2] : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. WEATHER + TRAFFIC CORRELATION
  // ─────────────────────────────────────────────────────────────────────────────
  if (weather && traffic) {
    const isPrecipitation = (weather.precipitation ?? 0) > 0.1;
    const isRainSnowCode = (weather.weatherCode >= 51 && weather.weatherCode <= 67) ||
                           (weather.weatherCode >= 71 && weather.weatherCode <= 77) ||
                           (weather.weatherCode >= 80 && weather.weatherCode <= 82) ||
                           (weather.weatherCode >= 95 && weather.weatherCode <= 99);
    const isHighWind = (weather.windSpeed ?? 0) >= 38;
    const hasAdverseWeather = isPrecipitation || isRainSnowCode || isHighWind;

    const isCongested = (traffic.congestionPercentage ?? 0) >= 25 ||
                        (traffic.currentSpeed != null && traffic.currentSpeed < 32);
    const severeTrafficPoints = trafficPoints.filter((p) => p.condition === 'Severe' || p.condition === 'Heavy');

    if (hasAdverseWeather && (isCongested || severeTrafficPoints.length > 0)) {
      const congestionVal = traffic.congestionPercentage ?? 0;
      const precipVal = weather.precipitation ?? 0;
      const severeCount = severeTrafficPoints.length;

      const evidence: string[] = [
        `Live precipitation of ${precipVal.toFixed(1)} mm/hr and wind speed of ${weather.windSpeed.toFixed(1)} km/h recorded.`,
        `TomTom traffic sensor telemetry shows ${congestionVal}% congestion with ${severeCount} severe traffic segment(s).`,
      ];

      let historicalNote: string | undefined = undefined;
      if (previousSnap && previousSnap.weather && previousSnap.traffic) {
        const prevCongestion = previousSnap.traffic.congestionPercentage;
        const prevPrecip = previousSnap.weather.precipitation;
        historicalNote = `City Replay record from ${new Date(previousSnap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} showed ${prevCongestion}% congestion with ${prevPrecip.toFixed(1)} mm precipitation.`;
      }

      const isHighConfidence = (precipVal >= 0.8 || severeCount >= 2) && congestionVal >= 35;

      let lat = location.latitude;
      let lng = location.longitude;
      if (severeTrafficPoints.length > 0) {
        lat = severeTrafficPoints[0].latitude;
        lng = severeTrafficPoints[0].longitude;
      }

      signals.push({
        id: `sig-weather-traffic-${Date.now()}`,
        title: 'Weather & Arterial Traffic Congestion Pattern',
        category: 'WEATHER_TRAFFIC',
        severity: isHighConfidence ? 'HIGH' : 'MEDIUM',
        confidence: isHighConfidence ? 'HIGH' : 'MEDIUM',
        latitude: lat,
        longitude: lng,
        locationName: location.name,
        summary: `Active weather conditions (${precipVal > 0 ? `${precipVal.toFixed(1)} mm rain` : `${weather.windSpeed.toFixed(0)} km/h wind`}) coincide with ${congestionVal}% traffic congestion across municipal arterials.`,
        metrics: [
          { label: 'Precipitation', value: `${precipVal.toFixed(1)} mm`, trend: precipVal > 0 ? 'up' : 'stable' },
          { label: 'Congestion', value: `${congestionVal}%`, trend: congestionVal > 30 ? 'up' : 'stable' },
          { label: 'Slow Arterials', value: `${severeCount} points`, trend: 'up' },
        ],
        evidence,
        explanation: 'Elevated roadway congestion and speed reductions are observed concurrently with adverse atmospheric conditions across arterial corridors.',
        disclaimer: 'These signals overlap in time and location. This observation does not establish that rainfall directly caused the traffic increase.',
        timeWindow,
        historicalNote,
        createdAt: now.toISOString(),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. WEATHER + CIVIC REPORTS (Waterlogging, Flooding, Fallen Trees)
  // ─────────────────────────────────────────────────────────────────────────────
  if (weather && citizenReports.length > 0) {
    const isWetOrStormy = (weather.precipitation ?? 0) > 0.1 ||
      (weather.weatherCode >= 51 && weather.weatherCode <= 99) ||
      (weather.windSpeed ?? 0) >= 30;

    const weatherRelatedReports = citizenReports.filter(
      (r) =>
        r.status !== 'RESOLVED' &&
        (r.issueType === 'flooding' ||
         r.issueType === 'water_leakage' ||
         r.issueType === 'fallen_tree' ||
         r.issueType === 'damaged_road')
    );

    if (isWetOrStormy && weatherRelatedReports.length > 0) {
      const topReport = weatherRelatedReports[0];
      const evidence = [
        `Active weather registered at ${weather.precipitation.toFixed(1)} mm precipitation, wind speed ${weather.windSpeed} km/h.`,
        `${weatherRelatedReports.length} unresolved citizen report(s) filed for drainage, flooding, or roadway hazards.`,
      ];

      let historicalNote: string | undefined = undefined;
      if (previousSnap && previousSnap.civic) {
        historicalNote = `Previous City Replay snapshot recorded ${previousSnap.civic.activeReports} active civic reports.`;
      }

      signals.push({
        id: `sig-weather-reports-${topReport.id}`,
        title: 'Precipitation & Drainage / Infrastructure Hazard Co-occurrence',
        category: 'WEATHER_REPORTS',
        severity: weatherRelatedReports.some((r) => r.severity === 'Critical' || r.severity === 'High') ? 'HIGH' : 'MEDIUM',
        confidence: weatherRelatedReports.length >= 2 ? 'HIGH' : 'MEDIUM',
        latitude: topReport.location.latitude,
        longitude: topReport.location.longitude,
        locationName: topReport.location.address || `${location.name} Ward`,
        summary: `${weatherRelatedReports.length} water/drainage report(s) coincide with active local precipitation.`,
        metrics: [
          { label: 'Rainfall', value: `${weather.precipitation.toFixed(1)} mm`, trend: 'up' },
          { label: 'Drainage Reports', value: `${weatherRelatedReports.length}`, trend: 'up' },
          { label: 'Primary Issue', value: ISSUE_TYPE_LABELS[topReport.issueType] || topReport.issueType, trend: 'stable' },
        ],
        evidence,
        explanation: 'Citizen reports citing water accumulation or debris coincide geographically with current meteorological telemetry.',
        disclaimer: 'These signals overlap in time and location. This does not establish that meteorological conditions were the sole cause of the reported defects.',
        timeWindow,
        historicalNote,
        createdAt: now.toISOString(),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TRAFFIC + CIVIC REPORTS (Road Work / Pothole near Congestion Node)
  // ─────────────────────────────────────────────────────────────────────────────
  if (trafficPoints.length > 0 && citizenReports.length > 0) {
    const roadReports = citizenReports.filter(
      (r) =>
        r.status !== 'RESOLVED' &&
        (r.issueType === 'pothole' ||
         r.issueType === 'damaged_road' ||
         r.issueType === 'traffic_signal' ||
         r.issueType === 'other')
    );

    for (const report of roadReports) {
      const nearbyPoint = trafficPoints.find((pt) => {
        const dist = calculateDistanceKm(report.location.latitude, report.location.longitude, pt.latitude, pt.longitude);
        return dist <= 1.8 && (pt.condition === 'Severe' || pt.condition === 'Heavy' || pt.roadClosure);
      });

      if (nearbyPoint) {
        const distKm = calculateDistanceKm(report.location.latitude, report.location.longitude, nearbyPoint.latitude, nearbyPoint.longitude);
        const reportTitle = ISSUE_TYPE_LABELS[report.issueType] || report.description || 'Road Defect';
        signals.push({
          id: `sig-traffic-report-${report.id}`,
          title: 'Roadway Infrastructure Defect & Traffic Bottleneck Pattern',
          category: 'TRAFFIC_REPORTS',
          severity: nearbyPoint.roadClosure || report.severity === 'Critical' ? 'HIGH' : 'MEDIUM',
          confidence: 'HIGH',
          latitude: report.location.latitude,
          longitude: report.location.longitude,
          locationName: report.location.address || `${location.name} Sector`,
          summary: `Citizen-reported "${reportTitle}" is located within ${distKm.toFixed(1)} km of a congested traffic corridor (${nearbyPoint.currentSpeed} km/h).`,
          metrics: [
            { label: 'Proximity', value: `${distKm.toFixed(1)} km`, trend: 'stable' },
            { label: 'Traffic Speed', value: `${nearbyPoint.currentSpeed} km/h`, trend: 'down' },
            { label: 'Report Severity', value: report.severity, trend: 'up' },
          ],
          evidence: [
            `Verified civic report #${report.id.substring(0, 6)} filed at (${report.location.latitude.toFixed(3)}, ${report.location.longitude.toFixed(3)}).`,
            `TomTom sensor ${nearbyPoint.id} records speed reduction (${nearbyPoint.currentSpeed} km/h vs free flow ${nearbyPoint.freeFlowSpeed} km/h).`,
          ],
          explanation: 'A citizen-reported roadway defect or signal disruption is located immediately adjacent to an observed vehicular slowdown.',
          disclaimer: 'These signals overlap in geographic proximity and time. Local traffic diversion or inspection is recommended to confirm causality.',
          timeWindow,
          createdAt: now.toISOString(),
        });
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. AQI ANOMALY / STAGNATION
  // ─────────────────────────────────────────────────────────────────────────────
  if (airQuality && weather) {
    const aqi = airQuality.usAqi ?? airQuality.europeanAqi ?? 0;
    const pm25 = airQuality.pm2_5 ?? 0;
    const isAqiElevated = aqi >= 100 || pm25 >= 45;
    const isWindStagnant = (weather.windSpeed ?? 0) <= 9.0;

    if (isAqiElevated && isWindStagnant) {
      signals.push({
        id: `sig-aqi-stagnation-${Date.now()}`,
        title: 'Atmospheric Stagnation & Particulate Concentration Anomaly',
        category: 'AQI_STAGNATION',
        severity: aqi >= 150 ? 'HIGH' : 'MEDIUM',
        confidence: aqi >= 150 ? 'HIGH' : 'MEDIUM',
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: location.name,
        summary: `Elevated particulate levels (AQI: ${aqi}, PM2.5: ${pm25.toFixed(1)} µg/m³) coincide with low boundary-layer wind velocity (${weather.windSpeed.toFixed(1)} km/h).`,
        metrics: [
          { label: 'Air Quality (US AQI)', value: `${aqi}`, trend: 'up' },
          { label: 'PM2.5 Level', value: `${pm25.toFixed(1)} µg/m³`, trend: 'up' },
          { label: 'Wind Velocity', value: `${weather.windSpeed.toFixed(1)} km/h`, trend: 'down' },
        ],
        evidence: [
          `Open-Meteo AQI sensor registers AQI ${aqi} with PM2.5 concentration of ${pm25.toFixed(1)} µg/m³.`,
          `Simultaneous local wind velocity of ${weather.windSpeed.toFixed(1)} km/h restricts horizontal aerosol dispersion.`,
        ],
        explanation: 'Low surface wind velocity suppresses particulate dispersion, allowing localized vehicular and ambient emissions to pool in the urban basin.',
        disclaimer: 'Low wind velocity correlates with poor dispersion; this does not pinpoint individual industrial or vehicular sources.',
        timeWindow,
        createdAt: now.toISOString(),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GEOGRAPHIC CIVIC-REPORT CLUSTERING
  // ─────────────────────────────────────────────────────────────────────────────
  const activeReports = citizenReports.filter((r) => r.status !== 'RESOLVED');
  if (activeReports.length >= 2) {
    for (let i = 0; i < activeReports.length; i++) {
      const cluster = [activeReports[i]];
      for (let j = 0; j < activeReports.length; j++) {
        if (i !== j) {
          const d = calculateDistanceKm(
            activeReports[i].location.latitude,
            activeReports[i].location.longitude,
            activeReports[j].location.latitude,
            activeReports[j].location.longitude
          );
          if (d <= 1.5) {
            cluster.push(activeReports[j]);
          }
        }
      }

      if (cluster.length >= 2) {
        const types = Array.from(new Set(cluster.map((r) => ISSUE_TYPE_LABELS[r.issueType] || r.issueType))).join(', ');
        signals.push({
          id: `sig-cluster-${cluster[0].id}`,
          title: 'Localized Geographic Civic Incident Cluster',
          category: 'REPORT_CLUSTER',
          severity: cluster.some((r) => r.severity === 'Critical') ? 'HIGH' : 'MEDIUM',
          confidence: cluster.length >= 3 ? 'HIGH' : 'MEDIUM',
          latitude: cluster[0].location.latitude,
          longitude: cluster[0].location.longitude,
          locationName: cluster[0].location.address || `${location.name} District`,
          summary: `${cluster.length} citizen incident reports clustered within a 1.5 km radius near ${cluster[0].location.address || 'neighborhood'}.`,
          metrics: [
            { label: 'Clustered Reports', value: `${cluster.length}`, trend: 'up' },
            { label: 'Cluster Radius', value: '< 1.5 km', trend: 'stable' },
            { label: 'Issue Types', value: types, trend: 'stable' },
          ],
          evidence: cluster.map(
            (r) => `Report #${r.id.substring(0, 6)}: "${ISSUE_TYPE_LABELS[r.issueType] || r.description}" (${r.severity} severity).`
          ),
          explanation: 'Multiple independent civic reports have been logged in close spatial proximity, indicating localized infrastructure stress.',
          disclaimer: 'Spatial clustering indicates heightened community reporting; municipal field assessment is required to verify unified root cause.',
          timeWindow,
          createdAt: now.toISOString(),
        });
        break;
      }
    }
  }

  return signals;
}
