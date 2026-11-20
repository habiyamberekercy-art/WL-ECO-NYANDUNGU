import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Droplets, Compass, Heart, User as UserIcon, Settings, LogOut,
  ChevronDown, MapPin, Globe, Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/app-context';
import { LANGUAGES } from '@/lib/types';
import type { Language } from '@/lib/supabase';

const navItems = [
  { to: '/user-portal', label: 'Explore', icon: Compass, end: true },
  { to: '/user-portal/favorites', label: 'My Favorites', icon: Heart },
  { to: '/user-portal/profile', label: 'Profile', icon: UserIcon },
  { to: '/user-portal/settings', label: 'Settings', icon: Settings },
];

export default function UserLayout() {
  const { profile, signOut } = useAuth();
  const { language, setLanguage } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const currentLang = LANGUAGES.find((l) => l.code === language)!;
  const initials = (profile?.full_name || profile?.email || '?')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top navigation — warm, nature-inspired */}
      <header className="sticky top-0 z-30 bg-white border-b border-emerald-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <NavLink to="/user-portal" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-slate-800 leading-none tracking-tight">
                  Nyandungu<span className="text-emerald-600"> Eco-Hub</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-none mt-0.5 hidden sm:block">Explorer Portal</div>
              </div>
            </NavLink>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-stone-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            {/* Right: language + avatar */}
            <div className="flex items-center gap-2">
              {/* Language */}
              <div ref={langRef} className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-stone-100 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">{currentLang.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-stone-200 py-1 min-w-[140px] z-50">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code as Language); setLangOpen(false); }}
                        className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-stone-50 transition-colors ${
                          language === lang.code ? 'text-emerald-600 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        {lang.label}
                        {language === lang.code && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Avatar dropdown */}
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 p-1 pr-2 rounded-full border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {initials}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 hidden sm:block max-w-[120px] truncate">
                    {profile?.full_name || 'Explorer'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-stone-200 py-2 min-w-[260px] z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{profile?.full_name || 'Explorer'}</div>
                          <div className="text-xs text-slate-400 truncate">{profile?.email}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        <span className="text-[11px] text-slate-400">Nyandungu Eco-Park Explorer</span>
                      </div>
                    </div>
                    {/* Menu items */}
                    <NavLink
                      to="/user-portal/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-sm text-slate-700"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" /> My Profile
                    </NavLink>
                    <NavLink
                      to="/user-portal/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-sm text-slate-700"
                    >
                      <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                    </NavLink>
                    <div className="border-t border-stone-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-red-50 transition-colors text-sm text-red-600 font-medium"
                      >
                        <LogOut className="w-4 h-4" /> Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex items-center gap-0.5 overflow-x-auto pb-2 -mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-stone-100'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="bg-stone-50">
        <Outlet />
      </main>
    </div>
  );
}
