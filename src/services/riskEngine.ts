import type { SelectedLocation } from '../types/location';
import type { WeatherData } from '../types/weather';
import type { AirQualityData } from '../types/airQuality';
import type { TrafficSegmentData, CityTrafficPoint } from '../types/traffic';
import type { CivicReportMeta } from '../types/report';
import type { PoiItem } from '../types/poi';
import { getAqiCategory, getWeatherCodeInfo } from '../utils/civicDataUtils';
import { ISSUE_TYPE_LABELS } from '../types/report';

export type RiskLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskComponentBreakdown {
  id: string;
  name: string;
  score: number; // 0 - 100
  weightPercent: number; // e.g. 25
  maxPoints: number;
  earnedPoints: number;
  available: boolean;
  statusText: string;
  signals: string[];
}

export interface RiskHotspot {
  id: string;
  latitude: number;
  longitude: number;
  score: number; // 0 - 100
  level: RiskLevel;
  radiusMeters: number;
  primaryFactor: string;
  supportingSignals: string[];
  reportCount: number;
  trafficCount: number;
  nearPoiNames: string[];
  updatedAt: string;
}

export interface RiskFactorItem {
  id: string;
  rank: number;
  title: string;
  detail: string;
  severity: RiskLevel;
  source: 'Traffic' | 'Civic Reports' | 'Weather' | 'Air Quality' | 'Infrastructure';
}

export interface AttentionArea {
  id: string;
  title: string;
  description: string;
  locationText?: string;
  impactLevel: RiskLevel;
}

export interface RiskFeedStatus {
  source: string;
  status: 'Active' | 'Partial' | 'Unavailable' | 'Limited';
}

export interface RiskAssessment {
  overallScore: number; // 0 - 100
  level: RiskLevel;
  trend: 'UP' | 'DOWN' | 'STABLE' | 'UNAVAILABLE';
  confidence: ConfidenceLevel;
  confidenceReason: string;
  availableSourcesCount: number;
  totalSourcesCount: number;
  feedStatuses: RiskFeedStatus[];
  components: RiskComponentBreakdown[];
  topFactors: RiskFactorItem[];
  hotspots: RiskHotspot[];
  attentionAreas: AttentionArea[];
  dataFreshness: {
    weatherAge?: string;
    airQualityAge?: string;
    trafficAge?: string;
    reportsAge?: string;
    poisCount: number;
  };
  updatedAt: Date;
}

/**
 * Calculates distance in kilometers between two lat/lng positions via Haversine formula
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

/**
 * Helper to convert 0-100 score to CityPulse Risk Level
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'ELEVATED';
  if (score >= 20) return 'GUARDED';
  return 'LOW';
}

/**
 * Helper to calculate age in minutes string
 */
function getAgeString(date?: Date | string | null): string {
  if (!date) return 'Data unavailable';
  const timestamp = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  if (isNaN(timestamp)) return 'Recently';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60)));
  if (diffMinutes === 0) return 'Just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const hours = Math.floor(diffMinutes / 60);
  return `${hours} hr${hours > 1 ? 's' : ''} ago`;
}

/**
 * DETERMINISTIC CIVIC RISK INTELLIGENCE ENGINE
 * Computes deterministic scores from live CityPulse datasets without invention or fake data.
 */
export function calculateRiskAssessment(params: {
  location: SelectedLocation;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  traffic: TrafficSegmentData | null;
  trafficPoints: CityTrafficPoint[];
  citizenReports: CivicReportMeta[];
  pois: PoiItem[];
  weatherLastUpdated?: Date | null;
  trafficLastUpdated?: Date | null;
}): RiskAssessment {
  const {
    location,
    weather,
    airQuality,
    traffic,
    trafficPoints,
    citizenReports,
    pois,
    weatherLastUpdated,
    trafficLastUpdated,
  } = params;

  let availableSourcesCount = 0;
  const totalSourcesCount = 5;

  // ── 1. Air Quality Risk (25% Weight) ──────────────────────────────────────
  const aqiVal = airQuality?.usAqi ?? airQuality?.europeanAqi;
  let envScore = 0;
  const envSignals: string[] = [];
  let envAvailable = false;

  if (aqiVal !== undefined && aqiVal !== null && !isNaN(aqiVal)) {
    envAvailable = true;
    availableSourcesCount++;
    const cat = getAqiCategory(aqiVal);

    if (aqiVal <= 50) envScore = Math.round((aqiVal / 50) * 15);
    else if (aqiVal <= 100) envScore = Math.round(15 + ((aqiVal - 50) / 50) * 20);
    else if (aqiVal <= 150) envScore = Math.round(35 + ((aqiVal - 100) / 50) * 25);
    else if (aqiVal <= 200) envScore = Math.round(60 + ((aqiVal - 150) / 50) * 25);
    else envScore = Math.round(85 + Math.min(15, ((aqiVal - 200) / 100) * 15));

    envSignals.push(`AQI Index: ${aqiVal} (${cat.label})`);
    if (airQuality?.pm2_5 !== undefined) {
      envSignals.push(`PM2.5: ${airQuality.pm2_5.toFixed(1)} µg/m³`);
    }
    if (airQuality?.pm10 !== undefined) {
      envSignals.push(`PM10: ${airQuality.pm10.toFixed(1)} µg/m³`);
    }
  } else {
    envSignals.push('Air quality telemetry unavailable');
  }

  // ── 2. Traffic Risk (25% Weight) ──────────────────────────────────────────
  let trafficScore = 0;
  const trafficSignals: string[] = [];
  let trafficAvailable = false;

  if (trafficPoints.length > 0 || traffic !== null) {
    trafficAvailable = true;
    availableSourcesCount++;

    let avgCongestion = 0;
    let severeCount = 0;
    let closureCount = 0;

    if (trafficPoints.length > 0) {
      let sumCongestion = 0;
      trafficPoints.forEach((p) => {
        const ratio = Math.max(0, Math.min(1, 1 - p.currentSpeed / Math.max(1, p.freeFlowSpeed)));
        sumCongestion += ratio;
        if (p.congestionPercentage >= 40 || p.condition === 'Heavy' || p.condition === 'Severe') {
          severeCount++;
        }
        if (p.roadClosure) {
          closureCount++;
        }
      });
      avgCongestion = sumCongestion / trafficPoints.length;
    } else if (traffic) {
      avgCongestion = traffic.congestionRatio || 0;
      if (traffic.roadClosure) closureCount++;
    }

    const citywidePercentage = traffic?.congestionPercentage ?? Math.round(avgCongestion * 100);

    trafficScore = Math.min(
      100,
      Math.round(
        avgCongestion * 50 +
          (severeCount / Math.max(1, trafficPoints.length)) * 35 +
          closureCount * 15 +
          (citywidePercentage > 40 ? 15 : 0)
      )
    );

    trafficSignals.push(
      `Based on congestion across ${trafficPoints.length || 1} successfully sampled road point(s)`
    );
    if (severeCount > 0) {
      trafficSignals.push(`${severeCount} heavy/severe congestion node(s) detected`);
    } else {
      trafficSignals.push('Road network operating with normal traffic flow');
    }
    if (closureCount > 0) {
      trafficSignals.push(`${closureCount} active road closure reported`);
    }
  } else {
    trafficSignals.push('TomTom traffic flow stream unavailable');
  }

  // ── 3. Civic Incident Risk (25% Weight) ───────────────────────────────────
  let incidentScore = 0;
  const incidentSignals: string[] = [];
  const incidentAvailable = true; // Local report intake pipeline is active
  availableSourcesCount++;

  const activeReports = citizenReports.filter((r) => r.status !== 'RESOLVED');

  if (activeReports.length > 0) {
    let rawScore = 0;
    let criticalCount = 0;
    let highCount = 0;

    activeReports.forEach((r) => {
      let sevPts = 5;
      if (r.severity === 'Critical') { sevPts = 25; criticalCount++; }
      else if (r.severity === 'High') { sevPts = 15; highCount++; }
      else if (r.severity === 'Medium') { sevPts = 8; }

      let statusMult = 1.0;
      if (r.status === 'ASSIGNED') statusMult = 0.85;
      else if (r.status === 'IN_PROGRESS') statusMult = 0.65;

      let ageMult = 1.0;
      if (r.submittedAt) {
        const ageHours = (Date.now() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) ageMult = 0.3;
        else if (ageHours > 6) ageMult = 0.6;
      }

      rawScore += sevPts * statusMult * ageMult;
    });

    incidentScore = Math.min(100, Math.round(rawScore));
    incidentSignals.push(`${activeReports.length} active citizen report(s) filed in database`);
    if (criticalCount > 0 || highCount > 0) {
      incidentSignals.push(`${criticalCount} Critical & ${highCount} High severity reports awaiting dispatch`);
    } else {
      incidentSignals.push('Active reports are low to medium severity');
    }
  } else {
    incidentScore = 0;
    incidentSignals.push('Zero active unresolved civic incident reports');
  }

  // ── 4. Weather Risk (15% Weight) ──────────────────────────────────────────
  let weatherScore = 0;
  const weatherSignals: string[] = [];
  let weatherAvailable = false;

  if (weather !== null) {
    weatherAvailable = true;
    availableSourcesCount++;

    const codeInfo = getWeatherCodeInfo(weather.weatherCode, weather.isDay);
    let baseCodeScore = 10;

    // Severe weather code checks
    if ([95, 96, 99].includes(weather.weatherCode)) baseCodeScore = 80;
    else if ([65, 67, 75, 82, 86].includes(weather.weatherCode)) baseCodeScore = 65;
    else if ([55, 57, 61, 63, 71, 73, 80, 81, 85].includes(weather.weatherCode)) baseCodeScore = 40;
    else if ([45, 48, 51, 53].includes(weather.weatherCode)) baseCodeScore = 25;

    let windBonus = 0;
    if (weather.windSpeed > 45) windBonus = 30;
    else if (weather.windSpeed > 25) windBonus = 15;

    let tempBonus = 0;
    if (weather.temperature > 42 || weather.temperature < 0) tempBonus = 20;
    else if (weather.temperature > 37 || weather.temperature < 5) tempBonus = 10;

    weatherScore = Math.min(100, Math.round(baseCodeScore + windBonus + tempBonus));
    weatherSignals.push(`Condition: ${codeInfo.description} (${Math.round(weather.temperature)}°C)`);
    weatherSignals.push(`Wind speed: ${weather.windSpeed} km/h, Humidity: ${weather.humidity}%`);
  } else {
    weatherSignals.push('Open-Meteo weather stream unavailable');
  }

  // ── 5. Infrastructure Exposure (10% Weight) ──────────────────────────────
  let infraScore = 0;
  const infraSignals: string[] = [];
  const infraAvailable = pois.length > 0;
  if (infraAvailable) availableSourcesCount++;

  // Find incidents or congested traffic near critical POIs
  const criticalPois = pois.filter(
    (p) =>
      p.emergency ||
      ['hospital', 'police', 'fire_station', 'airport', 'transit_station'].includes(p.category)
  );

  let nearPoiIncidentsCount = 0;
  const affectedPoiNames = new Set<string>();

  activeReports.forEach((r) => {
    criticalPois.forEach((poi) => {
      const dist = calculateDistanceKm(
        r.location.latitude,
        r.location.longitude,
        poi.latitude,
        poi.longitude
      );
      if (dist <= 1.5) {
        nearPoiIncidentsCount++;
        affectedPoiNames.add(poi.name);
      }
    });
  });

  const heavyTrafficNodes = trafficPoints.filter(
    (p) => p.condition === 'Heavy' || p.condition === 'Severe' || p.roadClosure
  );

  heavyTrafficNodes.forEach((tp) => {
    criticalPois.forEach((poi) => {
      const dist = calculateDistanceKm(tp.latitude, tp.longitude, poi.latitude, poi.longitude);
      if (dist <= 1.5) {
        nearPoiIncidentsCount++;
        affectedPoiNames.add(poi.name);
      }
    });
  });

  if (nearPoiIncidentsCount > 0) {
    infraScore = Math.min(100, Math.round(nearPoiIncidentsCount * 18));
    infraSignals.push(
      `${nearPoiIncidentsCount} incident/congestion event(s) near critical civic facilities`
    );
    infraSignals.push(`Nearby facilities: ${Array.from(affectedPoiNames).slice(0, 3).join(', ')}`);
  } else if (infraAvailable) {
    infraScore = 0;
    infraSignals.push(`${criticalPois.length} critical facilities buffered; zero active hazard exposures`);
  } else {
    infraScore = 0;
    infraSignals.push('OSM POI infrastructure layer limited or loading');
  }

  // ── Feed Status Summary ──────────────────────────────────────────────────
  const feedStatuses: RiskFeedStatus[] = [
    { source: 'Weather (Open-Meteo)', status: weatherAvailable ? 'Active' : 'Unavailable' },
    { source: 'Air Quality (AQI)', status: envAvailable ? 'Active' : 'Unavailable' },
    { source: 'Traffic Flow (TomTom)', status: trafficPoints.length >= 6 ? 'Active' : trafficAvailable ? 'Partial' : 'Unavailable' },
    { source: 'Civic Reports Intake', status: 'Active' },
    { source: 'Infrastructure POIs', status: infraAvailable ? 'Active' : 'Limited' },
  ];

  // ── 6. Component Re-normalization & Overall Calculation ───────────────────
  const componentsRaw = [
    { id: 'environmental', name: 'Air Quality Risk', score: envScore, weightPercent: 25, available: envAvailable, signals: envSignals },
    { id: 'traffic', name: 'Traffic Flow Risk', score: trafficScore, weightPercent: 25, available: trafficAvailable, signals: trafficSignals },
    { id: 'incidents', name: 'Civic Incident Risk', score: incidentScore, weightPercent: 25, available: incidentAvailable, signals: incidentSignals },
    { id: 'weather', name: 'Weather Risk', score: weatherScore, weightPercent: 15, available: weatherAvailable, signals: weatherSignals },
    { id: 'infrastructure', name: 'Infrastructure Exposure', score: infraScore, weightPercent: 10, available: infraAvailable, signals: infraSignals },
  ];

  let sumEarnedWeighted = 0;
  let sumMaxWeighted = 0;

  const components: RiskComponentBreakdown[] = componentsRaw.map((c) => {
    const earned = c.available ? (c.score * c.weightPercent) / 100 : 0;
    const max = c.available ? c.weightPercent : 0;
    if (c.available) {
      sumEarnedWeighted += earned;
      sumMaxWeighted += max;
    }
    return {
      id: c.id,
      name: c.name,
      score: c.score,
      weightPercent: c.weightPercent,
      maxPoints: c.weightPercent,
      earnedPoints: Math.round(earned * 10) / 10,
      available: c.available,
      statusText: c.available ? scoreToRiskLevel(c.score) : 'Data Unavailable',
      signals: c.signals,
    };
  });

  const overallScore = sumMaxWeighted > 0 ? Math.round((sumEarnedWeighted / sumMaxWeighted) * 100) : 0;
  const level = scoreToRiskLevel(overallScore);

  // Confidence assessment based on available sources & completeness
  let confidence: ConfidenceLevel = 'HIGH';
  let confidenceReason = 'All 5 live telemetry feeds active and verified';

  if (availableSourcesCount < 3) {
    confidence = 'LOW';
    confidenceReason = `Only ${availableSourcesCount} of ${totalSourcesCount} telemetry feeds available`;
  } else if (availableSourcesCount < 5) {
    confidence = 'MEDIUM';
    confidenceReason = `${availableSourcesCount} of ${totalSourcesCount} feeds active; missing sources re-normalized`;
  }

  // ── 7. Top Risk Signals & Factors ─────────────────────────────────────────
  const activeComponents = components.filter((c) => c.available).sort((a, b) => b.score - a.score);
  const topFactors: RiskFactorItem[] = [];

  activeComponents.forEach((c, idx) => {
    if (c.score > 0 && topFactors.length < 3) {
      let sourceName: RiskFactorItem['source'] = 'Civic Reports';
      if (c.id === 'traffic') sourceName = 'Traffic';
      else if (c.id === 'weather') sourceName = 'Weather';
      else if (c.id === 'environmental') sourceName = 'Air Quality';
      else if (c.id === 'infrastructure') sourceName = 'Infrastructure';

      topFactors.push({
        id: `factor-${c.id}`,
        rank: idx + 1,
        title: c.name,
        detail: c.signals[0] || `${c.score}/100 calculated risk score`,
        severity: scoreToRiskLevel(c.score),
        source: sourceName,
      });
    }
  });

  if (topFactors.length === 0) {
    topFactors.push({
      id: 'factor-nominal',
      rank: 1,
      title: 'Nominal Operating Conditions',
      detail: 'All telemetry sources reporting normal baseline risk levels',
      severity: 'LOW',
      source: 'Civic Reports',
    });
  }

  // ── 8. Spatial Hotspots Calculation (Real Data Clusters) ───────────────────
  const hotspots: RiskHotspot[] = [];

  const obsPoints: Array<{
    lat: number;
    lng: number;
    type: 'report' | 'traffic';
    data: any;
  }> = [];

  activeReports.forEach((r) => {
    if (r.location?.latitude && r.location?.longitude) {
      obsPoints.push({ lat: r.location.latitude, lng: r.location.longitude, type: 'report', data: r });
    }
  });

  trafficPoints.forEach((tp) => {
    if (tp.condition === 'Heavy' || tp.condition === 'Severe' || tp.roadClosure) {
      obsPoints.push({ lat: tp.latitude, lng: tp.longitude, type: 'traffic', data: tp });
    }
  });

  const visited = new Set<number>();

  obsPoints.forEach((pt, i) => {
    if (visited.has(i)) return;
    visited.add(i);

    const cluster = [pt];
    obsPoints.forEach((other, j) => {
      if (i === j || visited.has(j)) return;
      const dist = calculateDistanceKm(pt.lat, pt.lng, other.lat, other.lng);
      if (dist <= 1.5) {
        visited.add(j);
        cluster.push(other);
      }
    });

    if (cluster.length >= 1) {
      const avgLat = cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length;

      const clusterReports = cluster.filter((c) => c.type === 'report');
      const clusterTraffic = cluster.filter((c) => c.type === 'traffic');

      let hotspotScore = Math.min(
        100,
        Math.round(clusterReports.length * 20 + clusterTraffic.length * 15 + 25)
      );

      const nearPois = criticalPois
        .filter((poi) => calculateDistanceKm(avgLat, avgLng, poi.latitude, poi.longitude) <= 1.2)
        .map((poi) => poi.name);

      let primarySignal = 'Civic incident concentration';
      if (clusterTraffic.length > clusterReports.length) {
        primarySignal = 'Heavy road congestion cluster';
      }

      const supportingSignals: string[] = [];
      if (clusterReports.length > 0) supportingSignals.push(`${clusterReports.length} active report(s)`);
      if (clusterTraffic.length > 0) supportingSignals.push(`${clusterTraffic.length} severe traffic node(s)`);
      if (nearPois.length > 0) supportingSignals.push(`Near: ${nearPois[0]}`);

      hotspots.push({
        id: `hotspot-${i}`,
        latitude: avgLat,
        longitude: avgLng,
        score: hotspotScore,
        level: scoreToRiskLevel(hotspotScore),
        radiusMeters: Math.min(1800, Math.max(600, cluster.length * 400)),
        primaryFactor: primarySignal,
        supportingSignals,
        reportCount: clusterReports.length,
        trafficCount: clusterTraffic.length,
        nearPoiNames: nearPois,
        updatedAt: getAgeString(new Date()),
      });
    }
  });

  hotspots.sort((a, b) => b.score - a.score);

  // ── 9. Attention Areas (Neutral, factual insights) ──────────────────────────
  const attentionAreas: AttentionArea[] = [];

  if (hotspots.length > 0) {
    const topSpot = hotspots[0];
    attentionAreas.push({
      id: 'attn-1',
      title: `${topSpot.primaryFactor} near ${location.name}`,
      description: `${topSpot.supportingSignals.join(' · ')}. Elevated signal concentration detected in this geographic sector.`,
      impactLevel: topSpot.level,
    });
  }

  if (aqiVal !== undefined && aqiVal > 100) {
    attentionAreas.push({
      id: 'attn-2',
      title: `Air Quality Warning (${getAqiCategory(aqiVal).label})`,
      description: `Current AQI index of ${aqiVal} exceeds healthy thresholds for sensitive groups in ${location.name}.`,
      impactLevel: aqiVal > 150 ? 'HIGH' : 'ELEVATED',
    });
  }

  if (activeReports.some((r) => r.severity === 'Critical')) {
    const crit = activeReports.find((r) => r.severity === 'Critical')!;
    attentionAreas.push({
      id: 'attn-3',
      title: `Critical Incident Report (${ISSUE_TYPE_LABELS[crit.issueType] || crit.issueType})`,
      description: `Unresolved critical report filed for ${crit.department || 'Civic Services'}. ${crit.description || ''}`,
      impactLevel: 'CRITICAL',
    });
  }

  if (attentionAreas.length === 0) {
    attentionAreas.push({
      id: 'attn-baseline',
      title: 'Normal Operating Baseline',
      description: `All monitored live metrics in ${location.name} are currently within nominal thresholds.`,
      impactLevel: 'LOW',
    });
  }

  return {
    overallScore,
    level,
    trend: 'UNAVAILABLE', // No historical snapshot database available yet
    confidence,
    confidenceReason,
    availableSourcesCount,
    totalSourcesCount,
    feedStatuses,
    components,
    topFactors,
    hotspots: hotspots.slice(0, 6),
    attentionAreas,
    dataFreshness: {
      weatherAge: getAgeString(weatherLastUpdated),
      airQualityAge: getAgeString(weatherLastUpdated),
      trafficAge: getAgeString(trafficLastUpdated),
      reportsAge: 'Live stream',
      poisCount: pois.length,
    },
    updatedAt: new Date(),
  };
}
