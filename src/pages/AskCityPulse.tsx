import React, {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';
import {
  MessageSquareCode, Send, Loader2,
  AlertTriangle, Trash2, ChevronRight, CloudSun, Wind, FileText,
} from 'lucide-react';
import { askCityPulse } from '../services/geminiService';
import type { ChatMessage, ChatContext } from '../services/geminiService';
import { getReports } from '../services/reportService';
import { useCivicDataContext } from '../hooks/useCivicDataContext';
import { useLocation } from '../hooks/useLocation';
import { useTrafficData } from '../hooks/useTrafficData';
import { useCityTraffic } from '../hooks/useCityTraffic';
import { detectCityPulseSignals } from '../services/signalEngine';
import { calculateRiskAssessment } from '../services/riskEngine';

// ─── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  'Why is traffic high here?',
  'Are weather and traffic related right now?',
  'Why is risk elevated?',
  'What cross-feed CityPulse Signals are active?',
  'What is the current air quality like?',
  'How is the weather right now?',
  'How many civic reports have been submitted?',
  'Summarise the current civic health of the city.',
];


// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return Math.random().toString(36).slice(2);
}

/** Very lightweight markdown → plain JSX renderer (bold, line breaks only). */
function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return (
      <span key={i}>
        {parts}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    );
  });
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMessage & { id: string; isStreaming?: boolean } }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold mt-0.5 ${
          isUser
            ? 'bg-cyan-600/30 border border-cyan-600/40 text-cyan-300'
            : 'bg-violet-600/30 border border-violet-600/40 text-violet-300'
        }`}
      >
        {isUser ? 'YOU' : 'CP'}
      </div>

      {/* Content */}
      <div
        className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-cyan-900/40 border border-cyan-800/40 text-cyan-50 rounded-tr-sm'
            : 'bg-white/[0.04] border border-white/8 text-slate-200 rounded-tl-sm'
        }`}
      >
        {msg.isStreaming ? (
          <span className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Thinking…</span>
          </span>
        ) : (
          renderMarkdown(msg.content)
        )}
      </div>
    </div>
  );
};

// ─── Context Pill ─────────────────────────────────────────────────────────────
const ContextPill: React.FC<{ label: string; value: string; icon: React.ReactNode; loaded: boolean }> = ({
  label, value, icon, loaded,
}) => (
  <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5 text-[10px] font-mono">
    <span className={loaded ? 'text-cyan-400' : 'text-slate-600'}>{icon}</span>
    <span className="text-slate-500">{label}:</span>
    <span className={loaded ? 'text-slate-300' : 'text-slate-600'}>{value}</span>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AskCityPulse: React.FC = () => {
  const { selectedLocation } = useLocation();
  const { weather, airQuality, weatherLoading, airQualityLoading } = useCivicDataContext();
  const { traffic } = useTrafficData();
  const { trafficPoints } = useCityTraffic();

  const [messages, setMessages] = useState<(ChatMessage & { id: string; isStreaming?: boolean })[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cityName = selectedLocation?.name ?? 'City';

  // Check API key on mount
  useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    setApiKeyMissing(!key || key.trim() === '');
  }, []);

  // Scroll to bottom on new messages
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Build context snapshot
  const buildContext = useCallback((): ChatContext => {
    const reports = getReports();
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const r of reports) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    }

    // Deterministic Signals
    const detectedSignals = detectCityPulseSignals({
      location: selectedLocation,
      weather,
      airQuality,
      traffic,
      trafficPoints,
      citizenReports: reports,
    });

    // Deterministic Risk Assessment
    const riskAssessment = calculateRiskAssessment({
      location: selectedLocation,
      weather,
      airQuality,
      traffic,
      trafficPoints,
      citizenReports: reports,
      pois: [],
    });

    return {
      cityName: selectedLocation.name,
      country: selectedLocation.country,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      weather: weather
        ? {
            temperature: weather.temperature,
            apparentTemperature: weather.apparentTemperature,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed,
            precipitation: weather.precipitation,
            weatherCode: weather.weatherCode,
          }
        : null,
      airQuality: airQuality
        ? {
            europeanAqi: airQuality.europeanAqi,
            usAqi: airQuality.usAqi,
            pm2_5: airQuality.pm2_5,
            pm10: airQuality.pm10,
          }
        : null,
      traffic: traffic
        ? {
            currentSpeed: traffic.currentSpeed,
            freeFlowSpeed: traffic.freeFlowSpeed,
            congestionPercentage: traffic.congestionPercentage,
            severeCount: trafficPoints.filter((p) => p.condition === 'Severe').length,
          }
        : null,
      reportStats: reports.length > 0 ? { total: reports.length, byStatus, bySeverity } : null,
      signals: detectedSignals.map((s) => ({
        title: s.title,
        confidence: s.confidence,
        explanation: s.explanation,
        evidence: s.evidence,
        disclaimer: s.disclaimer,
      })),
      risk: {
        score: riskAssessment.overallScore,
        level: riskAssessment.level,
        primaryFactor: riskAssessment.topFactors[0]?.title,
      },
    };
  }, [selectedLocation, weather, airQuality, traffic, trafficPoints]);


  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setError(null);
    setInput('');

    const userMsg = { id: generateId(), role: 'user' as const, content: question };
    const thinkingMsg = { id: generateId(), role: 'assistant' as const, content: '', isStreaming: true };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setLoading(true);

    // History = all confirmed (non-streaming) messages before this one
    const historyForApi: ChatMessage[] = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const ctx = buildContext();
      const reply = await askCityPulse(question, historyForApi, ctx);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === thinkingMsg.id
            ? { ...m, content: reply, isStreaming: false }
            : m
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== thinkingMsg.id));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, messages, buildContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // ── Context pill values ──────────────────────────────────────────
  const weatherReady = !weatherLoading && weather != null;
  const aqReady = !airQualityLoading && airQuality != null;
  const reportCount = getReports().length;

  const weatherLabel = weatherReady
    ? `${Math.round(weather!.temperature)}°C`
    : weatherLoading ? 'Loading…' : 'Unavailable';

  const aqLabel = aqReady
    ? `AQI ${airQuality!.europeanAqi ?? airQuality!.usAqi ?? '?'}`
    : airQualityLoading ? 'Loading…' : 'Unavailable';

  return (
    <div className="h-full flex flex-col bg-[#090d14] overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-5 pb-3 border-b border-white/8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <MessageSquareCode className="w-5 h-5 text-cyan-400" />
              <h1 className="text-base font-bold font-mono text-white tracking-tight">Ask CityPulse</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/15 border border-violet-500/30 text-violet-300">
                AI
              </span>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-red-400 border border-white/8 hover:border-red-800/40 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Context pills */}
          <div className="flex flex-wrap gap-2">
            <ContextPill
              label="City"
              value={cityName}
              icon={<ChevronRight className="w-3 h-3" />}
              loaded={true}
            />
            <ContextPill
              label="Weather"
              value={weatherLabel}
              icon={<CloudSun className="w-3 h-3" />}
              loaded={weatherReady}
            />
            <ContextPill
              label="Air"
              value={aqLabel}
              icon={<Wind className="w-3 h-3" />}
              loaded={aqReady}
            />
            <ContextPill
              label="Reports"
              value={`${reportCount} total`}
              icon={<FileText className="w-3 h-3" />}
              loaded={reportCount > 0}
            />
          </div>
        </div>
      </div>

      {/* ── API key error ── */}
      {apiKeyMissing && (
        <div className="shrink-0 mx-4 mt-4 max-w-3xl mx-auto">
          <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-bold text-rose-400 mb-0.5">VITE_GEMINI_API_KEY not set</p>
              <p className="text-[11px] text-slate-400">
                Add your Gemini API key to <code className="bg-white/10 px-1 rounded">.env</code> as{' '}
                <code className="bg-white/10 px-1 rounded">VITE_GEMINI_API_KEY=your_key_here</code>, then restart the dev server.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Message list ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            /* Welcome state */
            <div className="py-8">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center mx-auto mb-4">
                  <MessageSquareCode className="w-7 h-7 text-violet-400" />
                </div>
                <h2 className="text-base font-bold font-mono text-white mb-1">
                  CityPulse AI
                </h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Ask me about {cityName}'s weather, air quality, civic reports, or any
                  urban infrastructure question. I use the live data currently loaded in the platform.
                </p>
              </div>

              {/* Suggested prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    disabled={loading || apiKeyMissing}
                    onClick={() => send(prompt)}
                    className="text-left text-xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 hover:border-white/15 rounded-xl px-4 py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 group"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-cyan-500 transition-colors shrink-0" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => <Bubble key={msg.id} msg={msg} />)
          )}

          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-2 bg-rose-950/30 border border-rose-800/30 rounded-xl px-4 py-3">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-rose-300">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-[10px] font-mono text-rose-500 hover:text-rose-300 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 border-t border-white/8 bg-[#090d14]/90 backdrop-blur-sm px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            disabled={loading || apiKeyMissing}
            placeholder={
              apiKeyMissing
                ? 'API key not configured…'
                : `Ask about ${cityName}… (Enter to send, Shift+Enter for new line)`
            }
            rows={1}
            className="flex-1 resize-none bg-white/[0.04] border border-white/10 hover:border-white/15 focus:border-cyan-700/60 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || apiKeyMissing}
            className="shrink-0 w-10 h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-slate-600 text-white flex items-center justify-center transition-colors"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </form>
        <p className="text-center text-[9px] font-mono text-slate-700 mt-2 max-w-3xl mx-auto">
          CityPulse AI uses live platform data. It may make mistakes — verify critical civic information through official channels.
        </p>
      </div>
    </div>
  );
};
