import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Box,
  ShieldAlert,
  FlaskConical,
  History,
  AlertTriangle,
  Building2,
  MessageSquareCode,
  Newspaper,
  ArrowRight,
} from 'lucide-react';

export interface ModuleDefinition {
  id: string;
  name: string;
  path: string;
  description: string;
  icon: any;
  accentColor: string; // Tailwinds classes
  borderColor: string;
  badge?: string;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'live-city',
    name: 'Live City',
    path: '/live-city',
    description: 'Real-time city operations, weather conditions, air quality, and TomTom traffic streams.',
    icon: Activity,
    accentColor: 'from-emerald-500/20 via-cyan-500/10 to-transparent text-cyan-300',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400',
    badge: 'Live',
  },
  {
    id: 'digital-twin',
    name: 'Digital Twin 3D',
    path: '/digital-twin',
    description: 'Explore the city in immersive 3D with OpenFreeMap vector buildings and tilt camera controls.',
    icon: Box,
    accentColor: 'from-blue-500/20 via-indigo-500/10 to-transparent text-blue-300',
    borderColor: 'border-blue-500/30 hover:border-blue-400',
    badge: '3D',
  },
  {
    id: 'risk-intelligence',
    name: 'Risk Intelligence',
    path: '/risk-intelligence',
    description: 'Understand current civic and environmental vulnerability scores and spatial hotspots.',
    icon: ShieldAlert,
    accentColor: 'from-orange-500/20 via-red-500/10 to-transparent text-orange-300',
    borderColor: 'border-orange-500/30 hover:border-orange-400',
    badge: 'Live',
  },
  {
    id: 'scenario-lab',
    name: 'Scenario Lab',
    path: '/scenario-lab',
    description: 'Simulate "what-if" urban stress tests, severe weather, traffic surges, and road closures.',
    icon: FlaskConical,
    accentColor: 'from-purple-500/20 via-violet-500/10 to-transparent text-purple-300',
    borderColor: 'border-purple-500/30 hover:border-purple-400',
    badge: 'Sandbox',
  },
  {
    id: 'city-replay',
    name: 'City Replay',
    path: '/city-replay',
    description: 'Replay recorded historical CityPulse observations and scrub through past city states.',
    icon: History,
    accentColor: 'from-amber-500/20 via-yellow-500/10 to-transparent text-amber-300',
    borderColor: 'border-amber-500/30 hover:border-amber-400',
    badge: 'Timeline',
  },
  {
    id: 'report-issue',
    name: 'Report Issue',
    path: '/report-issue',
    description: 'Submit geotagged civic incident reports with photos and Gemini AI analysis.',
    icon: AlertTriangle,
    accentColor: 'from-rose-500/20 via-pink-500/10 to-transparent text-rose-300',
    borderColor: 'border-rose-500/30 hover:border-rose-400',
    badge: 'Intake',
  },
  {
    id: 'municipal-command',
    name: 'Municipal Command',
    path: '/municipal-command',
    description: 'Dispatch orchestration, municipal agency workflows, and incident triage status.',
    icon: Building2,
    accentColor: 'from-cyan-500/20 via-blue-500/10 to-transparent text-cyan-300',
    borderColor: 'border-cyan-500/30 hover:border-cyan-400',
    badge: 'Ops',
  },
  {
    id: 'ask-citypulse',
    name: 'Ask CityPulse',
    path: '/ask-citypulse',
    description: 'Natural language civic AI reasoning grounded in real-time city datasets.',
    icon: MessageSquareCode,
    accentColor: 'from-violet-500/20 via-purple-500/10 to-transparent text-violet-300',
    borderColor: 'border-violet-500/30 hover:border-violet-400',
    badge: 'Gemini AI',
  },
  {
    id: 'city-news',
    name: 'City News',
    path: '/city-news',
    description: 'Live city-specific news headlines powered by GDELT from the last 48 hours.',
    icon: Newspaper,
    accentColor: 'from-sky-500/20 via-cyan-500/10 to-transparent text-sky-300',
    borderColor: 'border-sky-500/30 hover:border-sky-400',
    badge: 'GDELT',
  },
];

export const FeatureModuleCard: React.FC<{ module: ModuleDefinition }> = ({ module }) => {
  const navigate = useNavigate();
  const IconComponent = module.icon;

  return (
    <div
      onClick={() => navigate(module.path)}
      className={`group relative bg-gradient-to-br bg-command-950/90 dark:bg-command-950/90 ${module.accentColor} border ${module.borderColor} rounded-2xl p-5 shadow-hud backdrop-blur-md cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col justify-between select-none min-h-[190px]`}
    >
      <div>
        {/* Top Icon & Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <IconComponent className="w-5 h-5 text-white" />
          </div>

          {module.badge && (
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-slate-300">
              {module.badge}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold font-sans text-white group-hover:text-cyan-300 transition-colors mb-1.5">
          {module.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-300 dark:text-slate-300 light:text-slate-600 font-sans leading-relaxed">
          {module.description}
        </p>
      </div>

      {/* Bottom Action Arrow */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-end text-xs font-mono font-semibold text-slate-400 group-hover:text-cyan-300 transition-colors gap-1">
        <span>Explore</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
