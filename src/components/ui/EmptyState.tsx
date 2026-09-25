import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  Sparkles,
  Database,
  Radio
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';

interface EmptyStateProps {
  pageTitle: string;
  phase?: string;
  summary: string;
  plannedFeatures: string[];
  technicalSpecs: {
    telemetrySource?: string;
    protocols?: string[];
    dataFormat?: string;
    engine?: string;
  };
  systemStatusText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  pageTitle,
  phase: _phase,
  summary,
  plannedFeatures,
  technicalSpecs,
  systemStatusText = 'Waiting for live data integration',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'architecture'>('overview');

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl w-full">
        {/* Top Breadcrumb & Status Tag */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN TO OVERVIEW</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Badge variant="cyan" size="sm">PLANNED MODULE</Badge>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-command-900/90 border border-white/10 rounded-2xl p-6 md:p-8 shadow-panel backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-lg bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                    {pageTitle}
                  </h1>
                  <p className="text-xs text-cyan-400/90 font-mono mt-0.5">
                    MODULE STATUS: FOUNDATION SHELL READY
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed mt-3">
                {summary}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end justify-between self-stretch bg-command-950/60 p-4 rounded-xl border border-white/5 min-w-[220px]">
              <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                Live Data Pipeline
              </span>
              <div className="flex items-center gap-2 my-2">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-mono font-medium text-amber-300">
                  Waiting for integration
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Real-time API binding planned
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 pt-6 pb-4 border-b border-white/5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors ${
                activeTab === 'overview'
                  ? 'bg-command-800 text-white border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Planned Capabilities
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors ${
                activeTab === 'architecture'
                  ? 'bg-command-800 text-white border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-colors ${
                activeTab === 'schema'
                  ? 'bg-command-800 text-white border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Integration Contract
            </button>
          </div>

          {/* Tab Content */}
          <div className="pt-5">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {plannedFeatures.map((feature, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-command-950/50 border border-white/5 flex items-start gap-3"
                    >
                      <div className="p-1 rounded bg-cyan-950/80 text-cyan-400 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-200 font-medium leading-snug">
                          {feature}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                          Status: Planned
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs text-slate-300">
                      {systemStatusText}
                    </span>
                  </div>
                  <Badge variant="waiting" size="sm">ZERO MOCK DATA</Badge>
                </div>
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-command-950/70 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Target Engine
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {technicalSpecs.engine || 'MapLibre GL JS / WebGL'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-command-950/70 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Data Ingestion
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {technicalSpecs.telemetrySource || 'Public API Bus'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-command-950/70 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Protocol Stack
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {technicalSpecs.protocols?.join(', ') || 'HTTP REST / SSE'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-command-950/70 border border-white/5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Spatial Format
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {technicalSpecs.dataFormat || 'GeoJSON / Vector MVT'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-command-950/80 border border-white/5 font-mono text-xs text-slate-400 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
                    <Terminal className="w-4 h-4" />
                    <span>PIPELINE SPECIFICATION</span>
                  </div>
                  <p className="text-slate-300">
                    &gt; Architectural requirement: zero fabricated statistics or mock data.
                  </p>
                  <p className="text-slate-400">
                    &gt; Live public APIs will be connected in future updates.
                  </p>
                  <p className="text-slate-400">
                    &gt; State persistence and event triggers remain decoupled from UI layout.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'schema' && (
              <div className="p-4 rounded-xl bg-command-950/90 border border-white/5 font-mono text-xs overflow-x-auto text-slate-300">
                <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                  <span className="text-cyan-400 text-xs flex items-center gap-2">
                    <Database className="w-3.5 h-3.5" />
                    Contract Envelope: {pageTitle.toLowerCase().replace(/\s+/g, '_')}.schema.json
                  </span>
                  <Badge variant="outline" size="sm">STANDARDIZED</Badge>
                </div>
                <pre className="text-[11px] leading-relaxed text-slate-300">
{`{
  "system": "CITYPULSE",
  "module": "${pageTitle}",
  "status": "Planned",
  "bindingReady": true,
  "dataContract": {
    "provider": "${technicalSpecs.telemetrySource || 'Open Public APIs'}",
    "envelopeVersion": "2.0.0",
    "spatialDatum": "EPSG:4326 (WGS84)"
  }
}`}
                </pre>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400 font-mono">
              CITYPULSE Platform
            </span>
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="secondary" size="sm">
                  View Live Map Overview
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
