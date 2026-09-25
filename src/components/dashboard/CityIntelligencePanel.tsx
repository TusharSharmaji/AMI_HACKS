import React from 'react';
import { 
  Cpu, 
  Radio, 
  WifiOff, 
  Server
} from 'lucide-react';
import { INTELLIGENCE_FEEDS } from '../../utils/constants';
import type { IntelligenceItem } from '../../types';
import { Badge } from '../ui/Badge';

interface CityIntelligencePanelProps {
  feeds?: IntelligenceItem[];
}

export const CityIntelligencePanel: React.FC<CityIntelligencePanelProps> = ({
  feeds = INTELLIGENCE_FEEDS,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            City Intelligence Feeds
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <Server className="w-3 h-3 text-slate-400" />
          <span>4 PIPELINES</span>
        </div>
      </div>

      <div className="space-y-2">
        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="p-3 rounded-xl bg-command-950/60 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                  {feed.source}
                </span>
                <h4 className="text-xs font-medium text-slate-200 mt-0.5">
                  {feed.layer}
                </h4>
              </div>
              <Badge variant="outline" size="sm">
                {feed.protocol}
              </Badge>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-slate-400">
                <WifiOff className="w-3 h-3 text-amber-500/80" />
                <span className="text-amber-300/90">{feed.status}</span>
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {feed.channel}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 rounded-lg bg-command-950/40 border border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-500 animate-pulse" />
          <span>Supervisory Bus: Polling Enabled</span>
        </div>
        <span className="text-slate-400">Pending Integration</span>
      </div>
    </div>
  );
};
