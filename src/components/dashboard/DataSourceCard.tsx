import React from 'react';
import { Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface DataSourceCardProps {
  sources: Array<{
    name: string;
    provider: string;
    status: 'Active' | 'Partial' | 'Unavailable' | 'Limited';
  }>;
}

export const DataSourceCard: React.FC<DataSourceCardProps> = ({ sources }) => {
  const activeCount = sources.filter((s) => s.status === 'Active' || s.status === 'Partial').length;

  return (
    <div className="bg-command-950/90 border border-white/10 rounded-2xl p-5 shadow-hud backdrop-blur-md space-y-3 font-mono text-xs select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
          <Database className="w-4 h-4 text-cyan-400" />
          LIVE DATA SOURCES
        </span>
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
          {activeCount}/{sources.length} Active Feeds
        </span>
      </div>

      <div className="space-y-2">
        {sources.map((src) => {
          const isActive = src.status === 'Active' || src.status === 'Partial';
          return (
            <div
              key={src.name}
              className="flex items-center justify-between bg-white/[0.02] p-2.5 rounded-xl border border-white/5"
            >
              <div>
                <div className="text-white font-semibold text-[11px]">{src.name}</div>
                <div className="text-[9px] text-slate-400">{src.provider}</div>
              </div>

              <div className="flex items-center gap-1.5">
                {isActive ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span
                  className={`text-[10px] font-bold ${
                    src.status === 'Active'
                      ? 'text-emerald-400'
                      : src.status === 'Partial'
                      ? 'text-cyan-400'
                      : 'text-amber-400'
                  }`}
                >
                  {src.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
