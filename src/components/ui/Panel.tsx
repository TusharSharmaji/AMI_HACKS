import React from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  headerAction,
  icon,
  children,
  className = '',
  bodyClassName = 'p-4',
  headerClassName = 'px-4 py-3 border-b border-white/5',
}) => {
  return (
    <div
      className={`bg-command-900/90 backdrop-blur-md border border-white/10 rounded-xl shadow-panel overflow-hidden transition-all duration-200 ${className}`}
    >
      {(title || headerAction) && (
        <div className={`flex items-center justify-between ${headerClassName}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-cyan-400 shrink-0">{icon}</span>}
            <div className="truncate">
              {title && (
                <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-200 truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[11px] text-slate-400 font-mono tracking-tight truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && <div className="shrink-0 ml-3">{headerAction}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
};
