import type { SelectedLocation } from '../types/location';
import type { WeatherData } from '../types/weather';
import type { AirQualityData } from '../types/airQuality';
import type { TrafficSegmentData, CityTrafficPoint } from '../types/traffic';
import type { CivicReportMeta } from '../types/report';
import type { PoiItem } from '../types/poi';
import {
  calculateRiskAssessment,
  type RiskAssessment,
} from './riskEngine';

export interface ScenarioParameters {
  name: string;
  trafficAdjustment: number; // e.g. -20, -10, 0, 10, 20, 30, 50 (%)
  rainfallAddition: number; // e.g. 0, 10, 25, 50, 100 (mm)
  tempAdjustment: number; // e.g. -5, -2, 0, 2, 5 (°C)
  roadDisruption: 'none' | 'minor' | 'major' | 'closure';
  civicIncidentLoad: number; // e.g. 0, 25, 50, 100 (%)
}

export interface ModeledSpatialNode {
  id: string;
  latitude: number;
  longitude: number;
  baselineCongestion: number;
  modeledCongestion: number;
  condition: string;
  modeledCondition: string;
  color: string;
}

export interface ScenarioResult {
  parameters: ScenarioParameters;
  baselineRisk: RiskAssessment;
  modeledRisk: RiskAssessment;
  riskScoreDelta: number; // modeled - baseline
  trafficImpactPercent: number;
  environmentalImpactPercent: number;
  civicPressurePercent: number;
  weatherImpactPercent: number;
  spatialNodes: ModeledSpatialNode[];
  spatialEstimateAvailable: boolean;
  spatialEstimateNote: string;
  updatedAt: Date;
}

export const DEFAULT_SCENARIO_PARAMS: ScenarioParameters = {
  name: 'Current Baseline',
  trafficAdjustment: 0,
  rainfallAddition: 0,
  tempAdjustment: 0,
  roadDisruption: 'none',
  civicIncidentLoad: 0,
};

export const SCENARIO_PRESETS: Record<string, ScenarioParameters> = {
  'heavy-rain': {
    name: 'Heavy Rain & Storm Surge',
    trafficAdjustment: 20,
    rainfallAddition: 50,
    tempAdjustment: -2,
    roadDisruption: 'minor',
    civicIncidentLoad: 25,
  },
  'traffic-surge': {
    name: 'Metropolitan Gridlock Surge',
    trafficAdjustment: 50,
    rainfallAddition: 0,
    tempAdjustment: 0,
    roadDisruption: 'minor',
    civicIncidentLoad: 50,
  },
  'road-closure': {
    name: 'Major Arterial Road Closure',
    trafficAdjustment: 30,
    rainfallAddition: 0,
    tempAdjustment: 0,
    roadDisruption: 'closure',
    civicIncidentLoad: 25,
  },
  'extreme-heat': {
    name: 'Extreme Heatwave Stress',
    trafficAdjustment: 10,
    rainfallAddition: 0,
    tempAdjustment: 5,
    roadDisruption: 'none',
    civicIncidentLoad: 50,
  },
  'civic-surge': {
    name: 'Civic Emergency Incident Surge',
    trafficAdjustment: 15,
    rainfallAddition: 0,
    tempAdjustment: 0,
    roadDisruption: 'none',
    civicIncidentLoad: 100,
  },
};

/**
 * DETERMINISTIC SCENARIO ENGINE
 * Receives real baseline city data + user scenario parameters and computes modeled risk & spatial impact.
 */
export function calculateScenario(params: {
  location: SelectedLocation;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  traffic: TrafficSegmentData | null;
  trafficPoints: CityTrafficPoint[];
  citizenReports: CivicReportMeta[];
  pois: PoiItem[];
  scenarioParams: ScenarioParameters;
}): ScenarioResult {
  const {
    location,
    weather,
    airQuality,
    traffic,
    trafficPoints,
    citizenReports,
    pois,
    scenarioParams,
  } = params;

  // 1. Calculate Real Current Baseline Risk Assessment
  const baselineRisk = calculateRiskAssessment({
    location,
    weather,
    airQuality,
    traffic,
    trafficPoints,
    citizenReports,
    pois,
  });

  // 2. Derive Modeled Weather Data
  let modeledWeather: WeatherData | null = null;
  if (weather) {
    let modeledWeatherCode = weather.weatherCode;
    if (scenarioParams.rainfallAddition >= 50) modeledWeatherCode = 82; // Violent rain shower
    else if (scenarioParams.rainfallAddition >= 25) modeledWeatherCode = 63; // Moderate rain
    else if (scenarioParams.rainfallAddition >= 10) modeledWeatherCode = 61; // Slight rain

    modeledWeather = {
      ...weather,
      temperature: weather.temperature + scenarioParams.tempAdjustment,
      windSpeed: weather.windSpeed + (scenarioParams.rainfallAddition > 25 ? 15 : 0),
      humidity: Math.min(100, weather.humidity + Math.round(scenarioParams.rainfallAddition * 0.4)),
      weatherCode: modeledWeatherCode,
    };
  }

  // 3. Derive Modeled Traffic Points & Global Segment Data
  const disruptionBonusMap: Record<ScenarioParameters['roadDisruption'], number> = {
    none: 0,
    minor: 15,
    major: 35,
    closure: 60,
  };
  const extraDisruptionRatio = disruptionBonusMap[scenarioParams.roadDisruption] / 100;
  const trafficShiftRatio = scenarioParams.trafficAdjustment / 100;

  const modeledTrafficPoints: CityTrafficPoint[] = trafficPoints.map((tp) => {
    const baseCongestion = tp.congestionPercentage / 100;
    const modeledCongestionRatio = Math.max(
      0,
      Math.min(1, baseCongestion + trafficShiftRatio + extraDisruptionRatio)
    );
    const modeledSpeed = Math.max(5, Math.round(tp.freeFlowSpeed * (1 - modeledCongestionRatio)));
    const modeledCongestionPercentage = Math.round(modeledCongestionRatio * 100);

    let modeledCondition: CityTrafficPoint['condition'] = 'Light';
    let color = '#10b981';
    if (modeledCongestionPercentage >= 70) {
      modeledCondition = 'Severe';
      color = '#ef4444';
    } else if (modeledCongestionPercentage >= 50) {
      modeledCondition = 'Heavy';
      color = '#f97316';
    } else if (modeledCongestionPercentage >= 30) {
      modeledCondition = 'Moderate';
      color = '#f59e0b';
    }

    return {
      ...tp,
      currentSpeed: modeledSpeed,
      congestionPercentage: modeledCongestionPercentage,
      condition: modeledCondition,
      roadClosure: tp.roadClosure || (scenarioParams.roadDisruption === 'closure' && tp.id.endsWith('-0')),
      classification: {
        condition: modeledCondition,
        percentage: modeledCongestionPercentage,
        label: modeledCondition,
        color,
        description: `Modeled flow speed ${modeledSpeed} km/h`,
        textColor: 'text-white',
        bgColor: 'bg-black/80',
        borderColor: 'border-white/20',
      },
    };
  });

  let modeledTrafficSegment: TrafficSegmentData | null = null;
  if (traffic) {
    const baseRatio = traffic.congestionRatio || 0;
    const newRatio = Math.max(0, Math.min(1, baseRatio + trafficShiftRatio + extraDisruptionRatio));
    modeledTrafficSegment = {
      ...traffic,
      currentSpeed: Math.max(5, Math.round(traffic.freeFlowSpeed * (1 - newRatio))),
      congestionPercentage: Math.round(newRatio * 100),
      congestionRatio: newRatio,
    };
  }

  // 4. Derive Modeled Citizen Reports
  let modeledCitizenReports = [...citizenReports];
  if (scenarioParams.civicIncidentLoad > 0) {
    const activeCount = citizenReports.filter((r) => r.status !== 'RESOLVED').length;
    const additionalReportsCount = Math.round((activeCount * scenarioParams.civicIncidentLoad) / 100) || 1;

    for (let i = 0; i < additionalReportsCount; i++) {
      const baseReport = citizenReports[i % Math.max(1, citizenReports.length)];
      const latOffset = (Math.random() - 0.5) * 0.04;
      const lngOffset = (Math.random() - 0.5) * 0.04;

      modeledCitizenReports.push({
        id: `modeled-report-${i}`,
        issueType: baseReport?.issueType || 'other',
        infrastructure: baseReport?.infrastructure || 'General',
        description: `[Modeled Incident Load +${scenarioParams.civicIncidentLoad}%] Simulated urgency report`,
        recommendedAction: 'Inspect and resolve modeled incident',
        location: {
          address: `${location.name} Modeled Sector ${i + 1}`,
          latitude: (baseReport?.location?.latitude || location.latitude) + latOffset,
          longitude: (baseReport?.location?.longitude || location.longitude) + lngOffset,
        },
        severity: i % 2 === 0 ? 'High' : 'Medium',
        status: 'NEW',
        department: baseReport?.department || 'Emergency Operations',
        aiConfidence: 0.9,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 5. Calculate Modeled Risk Assessment using shared Risk Engine
  const modeledRisk = calculateRiskAssessment({
    location,
    weather: modeledWeather,
    airQuality,
    traffic: modeledTrafficSegment,
    trafficPoints: modeledTrafficPoints,
    citizenReports: modeledCitizenReports,
    pois,
  });

  // 6. Calculate Impact Metrics
  const riskScoreDelta = modeledRisk.overallScore - baselineRisk.overallScore;

  const baselineTrafficComp = baselineRisk.components.find((c) => c.id === 'traffic')?.score || 0;
  const modeledTrafficComp = modeledRisk.components.find((c) => c.id === 'traffic')?.score || 0;
  const trafficImpactPercent = Math.round(modeledTrafficComp - baselineTrafficComp);

  const baselineEnvComp = baselineRisk.components.find((c) => c.id === 'environmental')?.score || 0;
  const modeledEnvComp = modeledRisk.components.find((c) => c.id === 'environmental')?.score || 0;
  const environmentalImpactPercent = Math.round(modeledEnvComp - baselineEnvComp);

  const baselineCivicComp = baselineRisk.components.find((c) => c.id === 'incidents')?.score || 0;
  const modeledCivicComp = modeledRisk.components.find((c) => c.id === 'incidents')?.score || 0;
  const civicPressurePercent = Math.round(modeledCivicComp - baselineCivicComp);

  const baselineWeatherComp = baselineRisk.components.find((c) => c.id === 'weather')?.score || 0;
  const modeledWeatherComp = modeledRisk.components.find((c) => c.id === 'weather')?.score || 0;
  const weatherImpactPercent = Math.round(modeledWeatherComp - baselineWeatherComp);

  // 7. Spatial Nodes & Geographic Evidence Check
  const spatialNodes: ModeledSpatialNode[] = modeledTrafficPoints.map((p) => ({
    id: p.id,
    latitude: p.latitude,
    longitude: p.longitude,
    baselineCongestion: trafficPoints.find((t) => t.id === p.id)?.congestionPercentage || p.congestionPercentage,
    modeledCongestion: p.congestionPercentage,
    condition: trafficPoints.find((t) => t.id === p.id)?.condition || 'Light',
    modeledCondition: p.condition,
    color: p.classification.color,
  }));

  const spatialEstimateAvailable = spatialNodes.length > 0 || citizenReports.length > 0;
  const spatialEstimateNote = spatialEstimateAvailable
    ? `Spatial impact derived across ${spatialNodes.length} sampled grid nodes and ${modeledCitizenReports.length} civic report locations.`
    : 'Spatial impact cannot be estimated from currently available data.';

  return {
    parameters: scenarioParams,
    baselineRisk,
    modeledRisk,
    riskScoreDelta,
    trafficImpactPercent,
    environmentalImpactPercent,
    civicPressurePercent,
    weatherImpactPercent,
    spatialNodes,
    spatialEstimateAvailable,
    spatialEstimateNote,
    updatedAt: new Date(),
  };
}
