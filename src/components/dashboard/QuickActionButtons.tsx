import React from 'react';
import {
  Target,
  RefreshCw,
  FileText,
  Activity,
  MapPin,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface QuickActionButtonsProps {
  onFocusCity?: () => void;
  onRefreshView?: () => void;
  onToggleLayers?: () => void;
  onReportIssueShortcut?: () => void;
}

export const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({
  onFocusCity,
  onRefreshView,
  onToggleLayers,
  onReportIssueShortcut,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Quick Actions
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onFocusCity}
          icon={<Target className="w-3.5 h-3.5 text-cyan-400" />}
          className="justify-start text-[11px] font-mono"
        >
          Center Map
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleLayers}
          icon={<Activity className="w-3.5 h-3.5 text-cyan-400" />}
          className="justify-start text-[11px] font-mono"
        >
          Live View
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefreshView}
          icon={<RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
          className="justify-start text-[11px] font-mono"
        >
          Refresh Data
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onReportIssueShortcut}
          icon={<FileText className="w-3.5 h-3.5 text-amber-400" />}
          className="justify-start text-[11px] font-mono"
        >
          Report Issue
        </Button>
      </div>
    </div>
  );
};
