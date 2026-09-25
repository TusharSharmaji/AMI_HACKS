import React, { useState, useRef, useEffect } from 'react';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  ChevronDown,
  Sun,
  Moon,
  Bell,
  CloudSun,
  Box,
  User,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useLocation } from '../../hooks/useLocation';
import { useCivicDataContext } from '../../hooks/useCivicDataContext';
import { useMapLayers } from '../../context/MapLayersContext';
import { useUser } from '../../context/UserContext';
import { searchLocations } from '../../services/geocodingService';
import { getWeatherCodeInfo } from '../../utils/civicDataUtils';
import type { SelectedLocation } from '../../types/location';

interface HeaderProps {
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
}

const PRESET_CITIES: SelectedLocation[] = [
  { name: 'Jaipur', state: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
  { name: 'Mumbai', state: 'Maharashtra', country: 'India', latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Delhi', state: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', state: 'Karnataka', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
];

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav, isMobileNavOpen }) => {
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();
  const isDigitalTwin = routerLocation.pathname === '/digital-twin';

  const { selectedLocation, setSelectedLocation } = useLocation();
  const { weather } = useCivicDataContext();
  const { mapTheme, toggleTheme } = useMapLayers();
  const { user, signOut } = useUser();

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SelectedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [showCityMenu, setShowCityMenu] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setShowCityMenu(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);


  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(trimmed, 5);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch { setSearchResults([]); }
      finally { setIsSearching(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleSelectCity = (city: SelectedLocation) => {
    setSelectedLocation(city);
    setShowCityMenu(false);
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  const tempVal = weather?.temperature !== undefined ? Math.round(weather.temperature) : null;
  const weatherDesc = weather ? getWeatherCodeInfo(weather.weatherCode, weather.isDay).description : '';
  return (
    <header className="h-[60px] bg-[#0d1424] border-b border-white/8 flex items-center gap-3 px-4 shrink-0 z-30 transition-colors duration-200">
      {/* Mobile menu button */}
      {onToggleMobileNav && (
        <button onClick={onToggleMobileNav} className="md:hidden p-2 text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileNavOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      )}

      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-sm">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
            placeholder="Search city, location, or place..."
            className="w-full bg-white/5 hover:bg-white/8 focus:bg-white/10 border border-white/10 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-2 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
          />
          {isSearching && <span className="absolute right-3 w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />}
        </div>
        {showSearchDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0d1424] border border-white/12 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 z-50 max-h-56 overflow-y-auto">
            {searchResults.map((loc) => (
              <button
                key={`${loc.latitude}-${loc.longitude}`}
                onClick={() => handleSelectCity(loc)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-white/8 transition-colors"
              >
                <span className="font-semibold text-white">{loc.name}</span>
                <span className="text-slate-400 ml-1.5">{[loc.state, loc.country].filter(Boolean).join(', ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City Selector */}
      <div ref={cityRef} className="relative shrink-0">
        <button
          onClick={() => setShowCityMenu(!showCityMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-[13px] text-slate-200 transition-all"
        >
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-medium truncate max-w-[120px]">{selectedLocation.name}, {selectedLocation.state}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>
        {showCityMenu && (
          <div className="absolute top-full left-0 mt-1.5 w-52 bg-[#0d1424] border border-white/12 rounded-xl shadow-2xl p-1.5 z-50">
            <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider border-b border-white/8 mb-1">Preset Cities</div>
            {PRESET_CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => handleSelectCity(city)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-[12px] transition-colors ${
                  selectedLocation.name === city.name
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {city.name}, {city.state}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Weather */}
      {tempVal !== null && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20 shrink-0">
          <CloudSun className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[13px] font-bold text-white leading-none">{tempVal}°C</div>
            <div className="text-[10px] text-amber-300/80 leading-none mt-0.5 truncate max-w-[70px]">{weatherDesc}</div>
          </div>
        </div>
      )}

      {/* Date & Time */}
      {currentTime && (
        <div className="hidden xl:flex flex-col items-end shrink-0 px-2">
          <div className="text-[13px] font-bold text-white leading-none">{currentDate.split(',')[0] + ', ' + currentDate.split(', ').slice(1).join(', ')}</div>
          <div className="text-[11px] text-slate-400 leading-none mt-0.5">{currentTime}</div>
        </div>
      )}

      {/* 2D/3D Toggle */}
      <button
        onClick={() => navigate(isDigitalTwin ? '/' : '/digital-twin')}
        className={`hidden md:flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[12px] font-bold border transition-all ${
          isDigitalTwin
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
        }`}
      >
        <Box className="w-3.5 h-3.5" />
        <span>{isDigitalTwin ? '3D' : '2D'}</span>
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all shrink-0"
        title={`Switch to ${mapTheme === 'dark' ? 'Light' : 'Dark'} Theme`}
      >
        {mapTheme === 'dark'
          ? <Sun className="w-4 h-4 text-amber-400" />
          : <Moon className="w-4 h-4 text-slate-400" />
        }
      </button>

      {/* Notifications */}
      <button className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all shrink-0">
        <Bell className="w-4 h-4" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#0d1424]" />
      </button>

      {/* Profile */}
      <div className="relative shrink-0" ref={profileRef}>
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 hover:ring-2 hover:ring-cyan-400/50 transition-all shadow-md"
          title={`${user.name} (${user.role})`}
        >
          {user.avatarInitials}
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 top-10 w-52 bg-[#0d1424] border border-white/12 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-3 border-b border-white/8 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user.avatarInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-white leading-tight truncate">
                    {user.name}
                  </div>
                  <div className="text-[10px] font-medium text-cyan-400 leading-tight mt-0.5 truncate">
                    {user.role}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-1.5 space-y-0.5">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/overview');
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  toggleTheme();
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {mapTheme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Theme</span>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                  {mapTheme}
                </span>
              </button>

              <div className="h-px bg-white/8 my-1" />

              <button
                onClick={() => {
                  signOut();
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5 text-red-400" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

