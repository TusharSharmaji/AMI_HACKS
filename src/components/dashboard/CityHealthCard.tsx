import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RiskAssessment } from '../../services/riskEngine';

interface CityHealthCardProps {
  assessment: RiskAssessment;
}

export const CityHealthCard: React.FC<CityHealthCardProps> = ({ assessment }) => {
  const navigate = useNavigate();

  const levelColorMap = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/50',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    ELEVATED: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    GUARDED: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
    LOW: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  };

  return (
    <div className="bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-4 select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            CITY HEALTH SCORE
          </span>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            CityPulse Risk Classification
          </div>
        </div>

        <button
          onClick={() => navigate('/risk-intelligence')}
          className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
        >
          Inspect <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Score Display */}
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl lg:text-5xl font-extrabold font-mono text-white tracking-tight">
            {assessment.overallScore}
          </span>
          <span className="text-sm font-mono text-slate-400 font-semibold">/ 100</span>
        </div>

        <div className="flex flex-col items-end">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border shadow-md ${
              levelColorMap[assessment.level] || 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
            }`}
          >
            {assessment.level}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1">
            Historical trend unavailable
          </span>
        </div>
      </div>

      {/* Component Breakdown Mini Bars */}
      <div className="space-y-2 pt-1 border-t border-white/5">
        <div className="text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
          Component Risk Breakdown
        </div>
        {assessment.components.map((comp) => (
          <div key={comp.id} className="space-y-1 text-xs font-mono">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300">{comp.name}</span>
              <span className="text-white font-bold">
                {comp.available ? `${comp.score} / 100` : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  comp.score >= 60 ? 'bg-orange-500' : comp.score >= 40 ? 'bg-amber-500' : 'bg-cyan-400'
                } rounded-full transition-all duration-500`}
                style={{ width: `${comp.available ? comp.score : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
