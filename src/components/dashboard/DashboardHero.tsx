import React from 'react';
import { Sparkles, MapPin, Radio } from 'lucide-react';
import type { SelectedLocation } from '../../types/location';

interface DashboardHeroProps {
  location: SelectedLocation;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ location }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 17) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  };

  const locationSubtitle = [location.state, location.country].filter(Boolean).join(', ');

  return (
    <div className="relative w-full rounded-2xl p-6 bg-gradient-to-r from-command-950/95 via-command-900/90 to-cyan-950/40 border border-white/10 dark:border-white/10 light:border-slate-200 shadow-hud backdrop-blur-md overflow-hidden select-none">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-1/3 -bottom-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              CITY OVERVIEW
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold font-sans text-white dark:text-white light:text-slate-900 tracking-tight leading-tight">
            {getGreeting()} Here's what's happening in <span className="text-cyan-400">{location.name}</span> today.
          </h1>

          <p className="text-xs md:text-sm text-slate-300 dark:text-slate-300 light:text-slate-600 font-sans leading-relaxed max-w-2xl">
            Live data • Real insights • Safer, Cleaner, More Livable Cities
          </p>
        </div>

        {/* Selected City Location Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.04] dark:bg-white/[0.04] light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 shrink-0 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-white dark:text-white light:text-slate-900">{location.name}</div>
            <div className="text-[10px] text-slate-400">{locationSubtitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
