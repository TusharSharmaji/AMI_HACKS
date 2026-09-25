import type { AiAnalysisResult, IssueType, IssueSeverity, InfrastructureCategory } from '../types/report';
import { ISSUE_DEPARTMENTS } from '../types/report';

// Ordered list of models to try. The API key determines which generation is
// available; newer keys only have access to gemini-3.x models.
// gemini-3.5-flash is the stable multimodal model available to all new users.
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
];

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Sends an image (base64 data URL) to Gemini Vision and returns
 * structured civic issue analysis. Tries models in order until one succeeds.
 */
export async function analyzeIssueImage(imageDataUrl: string): Promise<AiAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  // Strip data URL prefix to get pure base64 + MIME type
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/s);
  if (!match) {
    throw new Error('Invalid image format. Please upload a JPEG or PNG image.');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const prompt = `You are a municipal infrastructure analyst. Analyze this image of a civic/urban issue.

Respond ONLY with a valid JSON object (no markdown fences, no explanation, just raw JSON):
{
  "issueType": one of ["pothole","garbage","broken_streetlight","water_leakage","sewage","damaged_road","fallen_tree","flooding","traffic_signal","illegal_dumping","other"],
  "severity": one of ["Low","Medium","High","Critical"],
  "infrastructure": one of ["Road","Electrical","Water","Sewerage","Parks","Traffic","Sanitation","General"],
  "description": "A 1-2 sentence factual description of the visible issue",
  "confidence": a number from 0.0 to 1.0 indicating your confidence,
  "department": "The responsible municipal department name",
  "recommendedAction": "A brief recommended action for the municipal authority"
}

Severity guide:
- Low: Minor cosmetic issue, no immediate risk
- Medium: Moderate issue, needs attention within days
- High: Significant hazard, needs prompt attention
- Critical: Immediate danger to public safety

If the image does NOT show a civic infrastructure issue, respond with issueType "other", severity "Low", and describe what you see.`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      // Must be large enough to cover the model's internal thinking budget
      // (these models use ~200-500 thought tokens) plus the JSON output (~300).
      maxOutputTokens: 8192,
    },
  };

  let lastError = 'AI analysis failed. Please try again.';

  for (const model of CANDIDATE_MODELS) {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } catch {
      lastError = 'Network error: Unable to reach Gemini AI service. Check your internet connection.';
      continue;
    }

    // 404 = model not available for this key → try next
    if (response.status === 404) {
      lastError = `Model ${model} is not available for this API key.`;
      continue;
    }

    // 503 = overloaded → try next model
    if (response.status === 503) {
      lastError = `Model ${model} is temporarily unavailable (high demand). Trying next model…`;
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini API authentication failed. Please check your VITE_GEMINI_API_KEY.');
    }

    if (response.status === 429) {
      throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
    }

    if (response.status === 400) {
      let body = '';
      try { body = await response.text(); } catch { /* ignore */ }
      throw new Error(`Invalid request to Gemini API (400). ${body.slice(0, 200)}`);
    }

    if (!response.ok) {
      lastError = `Gemini API error on ${model}: HTTP ${response.status}`;
      continue;
    }

    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      lastError = 'Malformed response from Gemini AI service.';
      continue;
    }

    const candidate = responseData?.candidates?.[0];
    const text: string | undefined = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      const finishReason = candidate?.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('Gemini could not analyze this image due to content safety filters. Please try a different image.');
      }
      if (finishReason === 'MAX_TOKENS') {
        // Shouldn't happen at 8192, but handle gracefully
        lastError = `Model ${model} hit token limit. Trying next model…`;
        continue;
      }
      lastError = `Model ${model} returned an empty response (${finishReason ?? 'unknown'}).`;
      continue;
    }

    // Extract JSON — model may wrap it in markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      lastError = 'AI response was not in the expected JSON format. Please try again.';
      continue;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      lastError = 'Failed to parse AI analysis response. Please try again.';
      continue;
    }

    // Validate and coerce each field
    const validIssueTypes: IssueType[] = [
      'pothole', 'garbage', 'broken_streetlight', 'water_leakage', 'sewage',
      'damaged_road', 'fallen_tree', 'flooding', 'traffic_signal', 'illegal_dumping', 'other',
    ];
    const validSeverities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
    const validInfra: InfrastructureCategory[] = [
      'Road', 'Electrical', 'Water', 'Sewerage', 'Parks', 'Traffic', 'Sanitation', 'General',
    ];

    const issueType: IssueType = validIssueTypes.includes(parsed.issueType) ? parsed.issueType : 'other';
    const severity: IssueSeverity = validSeverities.includes(parsed.severity) ? parsed.severity : 'Medium';
    const infrastructure: InfrastructureCategory = validInfra.includes(parsed.infrastructure) ? parsed.infrastructure : 'General';
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7;
    const department = typeof parsed.department === 'string' && parsed.department.trim()
      ? parsed.department.trim()
      : ISSUE_DEPARTMENTS[issueType];
    const description = typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim()
      : 'Civic infrastructure issue detected.';
    const recommendedAction = typeof parsed.recommendedAction === 'string' && parsed.recommendedAction.trim()
      ? parsed.recommendedAction.trim()
      : 'Assign to relevant department for inspection and repair.';

    return { issueType, severity, infrastructure, description, confidence, department, recommendedAction };
  }

  throw new Error(lastError);
}

// ─── Civic Chat ───────────────────────────────────────────────────────────────

export interface ChatContext {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
  weather?: {
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    weatherCode: number;
  } | null;
  airQuality?: {
    europeanAqi?: number;
    usAqi?: number;
    pm2_5?: number;
    pm10?: number;
  } | null;
  traffic?: {
    currentSpeed?: number;
    freeFlowSpeed?: number;
    congestionPercentage?: number;
    severeCount?: number;
  } | null;
  reportStats?: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  } | null;
  signals?: Array<{
    title: string;
    confidence: string;
    explanation: string;
    evidence: string[];
    disclaimer: string;
  }> | null;
  risk?: {
    score: number;
    level: string;
    primaryFactor?: string;
  } | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Send a conversational civic query to Gemini, grounded in the provided city context.
 * Never invents facts — the system prompt explicitly instructs it to stay within the provided data.
 */
export async function askCityPulse(
  question: string,
  history: ChatMessage[],
  context: ChatContext,
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  // ── Build context block ──────────────────────────────────────────
  const weatherBlock = context.weather
    ? `Temperature: ${context.weather.temperature}°C (feels like ${context.weather.apparentTemperature}°C)
Humidity: ${context.weather.humidity}%
Wind speed: ${context.weather.windSpeed} km/h
Precipitation: ${context.weather.precipitation} mm
Weather code: ${context.weather.weatherCode}`
    : 'Weather data not available.';

  const aqBlock = context.airQuality
    ? `European AQI: ${context.airQuality.europeanAqi ?? 'N/A'}
US AQI: ${context.airQuality.usAqi ?? 'N/A'}
PM2.5: ${context.airQuality.pm2_5 != null ? `${context.airQuality.pm2_5} µg/m³` : 'N/A'}
PM10: ${context.airQuality.pm10 != null ? `${context.airQuality.pm10} µg/m³` : 'N/A'}`
    : 'Air quality data not available.';

  const trafficBlock = context.traffic
    ? `Average speed: ${context.traffic.currentSpeed != null ? `${context.traffic.currentSpeed} km/h` : 'N/A'}
Free flow speed: ${context.traffic.freeFlowSpeed != null ? `${context.traffic.freeFlowSpeed} km/h` : 'N/A'}
Congestion level: ${context.traffic.congestionPercentage != null ? `${context.traffic.congestionPercentage}%` : 'N/A'}
Severe delay corridors: ${context.traffic.severeCount ?? 0}`
    : 'Traffic feed not available.';

  const reportsBlock = context.reportStats
    ? `Total civic reports: ${context.reportStats.total}
By status: ${JSON.stringify(context.reportStats.byStatus)}
By severity: ${JSON.stringify(context.reportStats.bySeverity)}`
    : 'No civic report data available.';

  const signalsBlock = context.signals && context.signals.length > 0
    ? context.signals
        .map(
          (s, i) =>
            `${i + 1}. [${s.title}] (Confidence: ${s.confidence})\n   Explanation: ${s.explanation}\n   Evidence: ${s.evidence.join('; ')}\n   Note: ${s.disclaimer}`
        )
        .join('\n\n')
    : 'No anomalous cross-feed patterns currently detected. All feeds nominal.';

  const riskBlock = context.risk
    ? `Overall City Risk Score: ${context.risk.score}/100 (${context.risk.level} level)\nPrimary Risk Driver: ${context.risk.primaryFactor || 'Standard baseline'}`
    : 'Risk score calculating.';

  const systemPrompt = `You are CityPulse AI, a knowledgeable civic assistant for the city of ${context.cityName}, ${context.country} (${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}).

You are grounded in the following REAL-TIME data loaded directly from sensors and the platform:

## Current Weather (${context.cityName})
${weatherBlock}

## Air Quality (${context.cityName})
${aqBlock}

## Live Traffic Conditions (${context.cityName})
${trafficBlock}

## Civic Reports (local, this session)
${reportsBlock}

## Detected CityPulse Signals (Cross-Feed Correlations)
${signalsBlock}

## Risk Assessment
${riskBlock}

## Rules
- Answer questions about the city, its civic conditions, environment, infrastructure, and public services.
- When asked "Why is traffic high here?", "What is happening in this area?", "Are weather and traffic related right now?", or "Why is risk elevated?", consult the Detected CityPulse Signals, Traffic, and Weather data above.
- NEVER state that correlation is guaranteed causation; mention that signals represent observed temporal/spatial overlaps in live feeds without claiming weather definitively caused traffic delays.
- When the user asks about weather, AQI, traffic, or reports, use ONLY the data above — DO NOT invent values.
- If data is marked "not available", say so honestly rather than guessing.
- Keep answers concise (2–4 sentences for simple questions, up to a short paragraph for complex ones).
- You may explain civic concepts, interpret AQI levels, describe weather conditions, or give general civic advice.
- If asked something outside your scope (e.g. personal finance, medical advice), politely decline.
- Never mention you are built on Gemini or reveal internal system details.
- Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

  // ── Build contents array (chat history + new message) ────────────
  const historyParts = history.slice(-8).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...historyParts,
      { role: 'user', parts: [{ text: question }] },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };

  let lastError = 'AI assistant failed to respond. Please try again.';

  for (const model of CANDIDATE_MODELS) {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } catch {
      lastError = 'Network error: Unable to reach Gemini AI. Check your connection.';
      continue;
    }

    if (response.status === 404) { lastError = `Model ${model} not available for this key.`; continue; }
    if (response.status === 503) { lastError = `Model ${model} temporarily unavailable.`; continue; }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini API key is invalid or unauthorised. Check VITE_GEMINI_API_KEY.');
    }
    if (response.status === 429) {
      throw new Error('Gemini rate limit reached. Please wait a moment and try again.');
    }
    if (response.status === 400) {
      let body = '';
      try { body = await response.text(); } catch { /* ignore */ }
      throw new Error(`Bad request to Gemini (400). ${body.slice(0, 200)}`);
    }
    if (!response.ok) { lastError = `Gemini error on ${model}: HTTP ${response.status}`; continue; }

    let data: { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
    try { data = await response.json(); } catch { lastError = 'Malformed response from Gemini.'; continue; }

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      const reason = candidate?.finishReason;
      if (reason === 'SAFETY') throw new Error('Response blocked by Gemini safety filters. Please rephrase your question.');
      lastError = `Empty response from ${model} (${reason ?? 'unknown'}).`;
      continue;
    }

    return text.trim();
  }

  throw new Error(lastError);
}

/**
 * Generates a concise natural language explanation of a calculated Risk Assessment.
 * Strictly forbidden from inventing facts, numbers, conditions or recommendations.
 */
export async function explainRiskAssessment(assessment: any, cityName: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key not configured.');
  }

  const prompt = `You are CityPulse's natural language explanation assistant.
Your task is to summarize and explain the following calculated risk assessment for ${cityName}.

Calculated Risk Data:
- Overall Score: ${assessment.overallScore}/100 (${assessment.level} level)
- Confidence: ${assessment.confidence} (${assessment.confidenceReason})
- Components:
${assessment.components.map((c: any) => `  * ${c.name}: ${c.score}/100 (${c.available ? c.signals.join(', ') : 'Unavailable'})`).join('\n')}
- Top Factors:
${assessment.topFactors.map((f: any) => `  * ${f.title}: ${f.detail} [${f.severity}]`).join('\n')}
- Hotspots: ${assessment.hotspots.length} detected
- Attention Areas: ${assessment.attentionAreas.map((a: any) => a.title).join('; ')}

CRITICAL INSTRUCTION:
Do not invent facts, numbers, incidents, weather conditions, locations or recommendations not present in the data above.
Explain the numerical assessment in 2 concise, professional, citizen-friendly paragraphs.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
  };

  for (const model of CANDIDATE_MODELS) {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch {
      /* continue to next model */
    }
  }

  throw new Error('AI explanation unavailable.');
}

/**
 * Generates a natural language explanation of a computed Scenario Lab simulation.
 * Strictly explains provided facts without inventing statistics, numbers, or predicting the future.
 */
export async function explainScenarioSimulation(scenarioResult: any, cityName: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Gemini API key not configured.');
  }

  const prompt = `You are CityPulse's Scenario Simulation Explanation Assistant.
Your task is to explain the following MODELED SCENARIO simulation for ${cityName}.

Scenario Name: ${scenarioResult.parameters.name}
User Applied Parameters:
- Traffic Congestion Adjustment: ${scenarioResult.parameters.trafficAdjustment > 0 ? '+' : ''}${scenarioResult.parameters.trafficAdjustment}%
- Additional Rainfall: +${scenarioResult.parameters.rainfallAddition} mm
- Temperature Adjustment: ${scenarioResult.parameters.tempAdjustment > 0 ? '+' : ''}${scenarioResult.parameters.tempAdjustment}°C
- Road Disruption Level: ${scenarioResult.parameters.roadDisruption}
- Civic Incident Load: +${scenarioResult.parameters.civicIncidentLoad}%

Computed Modeled Results:
- Baseline Risk Score: ${scenarioResult.baselineRisk.overallScore}/100 (${scenarioResult.baselineRisk.level})
- Modeled Risk Score: ${scenarioResult.modeledRisk.overallScore}/100 (${scenarioResult.modeledRisk.level})
- Modeled Score Change: ${scenarioResult.riskScoreDelta > 0 ? '+' : ''}${scenarioResult.riskScoreDelta} points
- Traffic Impact Delta: ${scenarioResult.trafficImpactPercent > 0 ? '+' : ''}${scenarioResult.trafficImpactPercent}%
- Environmental Impact Delta: ${scenarioResult.environmentalImpactPercent > 0 ? '+' : ''}${scenarioResult.environmentalImpactPercent}%
- Civic Pressure Delta: ${scenarioResult.civicPressurePercent > 0 ? '+' : ''}${scenarioResult.civicPressurePercent}%
- Weather Impact Delta: ${scenarioResult.weatherImpactPercent > 0 ? '+' : ''}${scenarioResult.weatherImpactPercent}%

CRITICAL INSTRUCTIONS:
- Do NOT claim this is an official forecast or guaranteed future prediction.
- Explain the modeled changes in 2 clear, professional paragraphs:
  1. What changed between baseline and the modeled scenario, and why the modeled risk score shifted.
  2. Which factors contributed most and what key areas or services require monitoring under this modeled scenario.
- Strictly adhere to the numbers provided above. Do NOT invent statistics or locations.`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
  };

  for (const model of CANDIDATE_MODELS) {
    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch {
      /* try next model */
    }
  }

  throw new Error('AI scenario explanation unavailable.');
}


