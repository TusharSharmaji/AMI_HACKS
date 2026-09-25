import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Box,
  ShieldAlert,
  AlertTriangle,
  FlaskConical,
  History,
  MessageSquareCode,
  Building2,
  Newspaper,
  MapPin,
  Settings,
} from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { name: 'Overview', path: '/', icon: LayoutDashboard },
  { name: 'Live City', path: '/live-city', icon: Activity },
  { name: 'Digital Twin', path: '/digital-twin', icon: Box },
  { name: 'Risk Intelligence', path: '/risk-intelligence', icon: ShieldAlert },
  { name: 'Scenario Lab', path: '/scenario-lab', icon: FlaskConical },
  { name: 'City Replay', path: '/city-replay', icon: History },
  { name: 'Report Issue', path: '/report-issue', icon: AlertTriangle },
  { name: 'Municipal Command', path: '/municipal-command', icon: Building2 },
  { name: 'Ask CityPulse', path: '/ask-citypulse', icon: MessageSquareCode },
  { name: 'City News', path: '/city-news', icon: Newspaper },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onCloseMobile }) => {
  const { selectedLocation } = useLocation();
  const navigate = useNavigate();
  const locationSubtitle = [selectedLocation.state, selectedLocation.country].filter(Boolean).join(', ');

  return (
    <aside
      className={`flex flex-col bg-[#0d1424] border-r border-white/8 select-none transition-colors duration-200 ${
        isMobile
          ? 'fixed inset-y-0 left-0 w-[230px] shadow-2xl z-50'
          : 'w-[230px] shrink-0'
      }`}
    >
      {/* ── Brand ── */}
      <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 2C8 2 4 5.5 4 10c0 5 8 12 8 12s8-7 8-12c0-4.5-4-8-8-8z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)" />
            <circle cx="12" cy="10" r="3" fill="white" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-black tracking-wide text-white leading-none">CITYPULSE</div>
          <div className="text-[10px] text-slate-400 mt-0.5 leading-none">Live Civic Health &amp; Digital Twin Platform</div>
        </div>
      </div>

      {/* ── Nav Links ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => { if (isMobile && onCloseMobile) onCloseMobile(); }}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-[9px] rounded-xl text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-[#1a3a5c] text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="truncate text-[13px]">{item.name}</span>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  }`}>
                    LIVE
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── City Preview Card ── */}
      <div className="shrink-0 px-3 py-3 border-t border-white/8">
        {/* City image placeholder with gradient */}
        <div
          className="w-full h-24 rounded-xl overflow-hidden relative mb-3 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1a2a4a 0%, #0d3d5f 50%, #1a1a2e 100%)',
          }}
        >
          <div className="absolute inset-0 flex items-end p-2">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] text-white font-semibold">{selectedLocation.name}</span>
            </div>
          </div>
          {/* Decorative city silhouette */}
          <svg viewBox="0 0 200 80" className="absolute bottom-0 left-0 right-0 w-full opacity-30" preserveAspectRatio="none">
            <path d="M0,80 L0,50 L10,50 L10,40 L20,40 L20,30 L30,30 L30,40 L40,40 L40,20 L50,20 L50,40 L60,40 L60,45 L70,45 L70,25 L80,25 L80,35 L90,35 L90,15 L100,15 L100,35 L110,35 L110,45 L120,45 L120,30 L130,30 L130,40 L140,40 L140,50 L150,50 L150,35 L160,35 L160,50 L170,50 L170,40 L180,40 L180,50 L190,50 L190,55 L200,55 L200,80 Z" fill="#60a5fa" />
          </svg>
        </div>

        <div className="px-1 mb-2">
          <div className="text-[15px] font-bold text-white">{selectedLocation.name}</div>
          <div className="text-[12px] text-slate-400">{locationSubtitle}</div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 text-[12px] text-slate-300 hover:text-white transition-all group"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
            <span>Change City</span>
          </div>
          <span className="text-slate-500 group-hover:text-slate-300">→</span>
        </button>
      </div>
    </aside>
  );
};
