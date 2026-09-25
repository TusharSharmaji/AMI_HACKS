import React from 'react';
import { 
  Car, 
  Wind, 
  Zap, 
  Shield, 
  AlertCircle,
  Activity,
  Layers
} from 'lucide-react';
import { CIVIC_METRICS_CATALOG } from '../../utils/constants';
import type { CivicMetricItem } from '../../types';
import { Badge } from '../ui/Badge';

interface CivicMetricPanelProps {
  metrics?: CivicMetricItem[];
}

export const CivicMetricPanel: React.FC<CivicMetricPanelProps> = ({
  metrics = CIVIC_METRICS_CATALOG,
}) => {
  const getMetricIcon = (iconName: string) => {
    switch (iconName) {
      case 'Car':
        return <Car className="w-4 h-4 text-cyan-400" />;
      case 'Wind':
        return <Wind className="w-4 h-4 text-emerald-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-rose-400" />;
      default:
        return <Activity className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Civic Indicators
          </h2>
        </div>
        <Badge variant="waiting" size="sm">
          UNINITIALIZED
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="group relative bg-command-950/70 hover:bg-command-900/80 border border-white/5 hover:border-white/15 rounded-xl p-3 transition-all duration-150"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-command-800/80 border border-white/5 shrink-0">
                  {getMetricIcon(metric.icon)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">
                    {metric.title}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    Feed: {metric.telemetryStream}
                  </p>
                </div>
              </div>
            </div>

            {/* Metric Value Display - Clearly waiting for live data, no fabricated numbers */}
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400/90 font-mono text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="tracking-tight">Waiting for live data</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {metric.unit || 'Index'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
