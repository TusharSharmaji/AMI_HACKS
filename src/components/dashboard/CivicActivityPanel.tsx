import React from 'react';
import { 
  Bell, 
  TerminalSquare, 
  Clock, 
  CheckCircle
} from 'lucide-react';
import { RECENT_CIVIC_ACTIVITY } from '../../utils/constants';
import type { CivicActivityItem } from '../../types';
import { Badge } from '../ui/Badge';

interface CivicActivityPanelProps {
  activities?: CivicActivityItem[];
}

export const CivicActivityPanel: React.FC<CivicActivityPanelProps> = ({
  activities = RECENT_CIVIC_ACTIVITY,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Recent Civic Activity
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>EVENT LOG</span>
        </div>
      </div>

      <div className="space-y-2">
        {activities.map((act) => (
          <div
            key={act.id}
            className="p-3 rounded-xl bg-command-950/60 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200">
                {act.sector}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {act.feedType}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-white/5">
              <span className="text-amber-400/90 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                {act.status}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                {act.endpoint}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2.5 rounded-lg bg-command-950/40 border border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <TerminalSquare className="w-3 h-3 text-emerald-400" />
          <span>Audit Stream: Standby</span>
        </div>
        <Badge variant="outline" size="sm">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
            READY
          </span>
        </Badge>
      </div>
    </div>
  );
};
