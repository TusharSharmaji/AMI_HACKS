import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'outline' | 'waiting';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-mono font-medium tracking-wide uppercase transition-colors';
  
  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2 py-0.5 rounded-md',
  };

  const variantStyles = {
    default: 'bg-command-800 text-slate-300 border border-command-700',
    cyan: 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60',
    emerald: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60',
    amber: 'bg-amber-950/60 text-amber-300 border border-amber-800/60',
    rose: 'bg-rose-950/60 text-rose-300 border border-rose-800/60',
    outline: 'bg-transparent text-slate-400 border border-slate-700/60',
    waiting: 'bg-slate-900/90 text-slate-400 border border-slate-800 shadow-sm',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
