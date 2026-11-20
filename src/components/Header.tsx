import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Droplets, Globe, ChevronDown, Footprints, Microscope, Shield, Check, LogOut, LogIn } from 'lucide-react';
import { useApp } from '@/lib/app-context';
import { useAuth } from '@/lib/auth-context';
import { getPersonaFromProfile } from '@/lib/auth-context';
import { LANGUAGES, PERSONAS } from '@/lib/types';
import type { Language, Persona } from '@/lib/supabase';

export type View = 'dashboard' | 'map' | 'telemetry' | 'report' | 'analytics' | 'admin';

const personaIcons: Record<string, typeof Footprints> = {
  Footprints, Microscope, Shield,
};

export default function Header({
  currentView,
  onNavigate,
  onRequireLogin,
}: {
  currentView: View;
  onNavigate: (v: View) => void;
  onRequireLogin: (persona: Persona) => void;
}) {
  const { language, setLanguage, persona, setPersona, t } = useApp();
  const { profile, signOut } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) setPersonaOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems: { view: View; label: string; personas: Persona[] }[] = [
    { view: 'dashboard', label: t('nav_dashboard'), personas: ['citizen', 'officer', 'admin'] },
    { view: 'map', label: t('nav_map'), personas: ['citizen', 'officer', 'admin'] },
    { view: 'telemetry', label: t('nav_telemetry'), personas: ['citizen', 'officer', 'admin'] },
    { view: 'report', label: t('nav_report'), personas: ['citizen', 'officer', 'admin'] },
    { view: 'analytics', label: t('nav_analytics'), personas: ['officer', 'admin'] },
    { view: 'admin', label: t('nav_admin'), personas: ['admin'] },
  ];

  const visibleNav = navItems.filter((item) => item.personas.includes(persona));
  const currentPersona = PERSONAS.find((p) => p.id === persona)!;
  const PersonaIcon = personaIcons[currentPersona.icon] || Footprints;
  const currentLang = LANGUAGES.find((l) => l.code === language)!;

  const handlePersonaChange = (p: Persona) => {
    setPersonaOpen(false);

    if (p === 'citizen') {
      // Citizen is always accessible — no login required
      setPersona(p);
      const validViews = navItems.filter((item) => item.personas.includes(p)).map((item) => item.view);
      if (!validViews.includes(currentView)) {
        onNavigate('dashboard');
      }
      return;
    }

    // Officer or Admin requires login
    const userRole = profile?.role;
    const requiredRole = p === 'admin' ? 'admin' : 'manager';

    if (userRole === requiredRole || (p === 'officer' && userRole === 'admin')) {
      // User has the right role — switch persona
      setPersona(p);
      const validViews = navItems.filter((item) => item.personas.includes(p)).map((item) => item.view);
      if (!validViews.includes(currentView)) {
        onNavigate('dashboard');
      }
    } else {
      // Need to log in
      onRequireLogin(p);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setPersona('citizen');
    setPersonaOpen(false);
    onNavigate('dashboard');
  };

  const personaColors: Record<Persona, string> = {
    citizen: 'from-teal-400 to-teal-600',
    officer: 'from-blue-400 to-blue-600',
    admin: 'from-slate-600 to-slate-800',
  };

  return (
    <>
      {/* Top utility bar */}
      <div className="bg-slate-900 text-slate-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline opacity-60">Kigali, Rwanda</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span className="opacity-60">Nyandungu Eco-Park · 121.7 ha</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language switcher */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 hover:text-white transition-colors py-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="font-medium">{currentLang.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px] z-50">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code as Language); setLangOpen(false); }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        language === lang.code ? 'text-teal-600 font-semibold' : 'text-slate-700'
                      }`}
                    >
                      {lang.label}
                      {language === lang.code && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${personaColors[persona]} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-slate-900 leading-none tracking-tight">
                  WL<span className="text-teal-600">-ECO</span>
                </div>
                <div className="text-[10px] text-slate-400 leading-none mt-0.5 hidden sm:block">{t('siteTagline')}</div>
              </div>
            </button>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {visibleNav.map((item) => {
                const active = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Persona Switcher / Account */}
            <div ref={personaRef} className="relative flex-shrink-0">
              <button
                onClick={() => setPersonaOpen(!personaOpen)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${personaColors[persona]} flex items-center justify-center`}>
                  <PersonaIcon className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  {profile ? (
                    <>
                      <div className="text-sm font-semibold text-slate-900 leading-none">{profile.full_name || profile.email}</div>
                      <div className="text-[10px] text-slate-400 leading-none mt-0.5">{currentPersona.label}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold text-slate-900 leading-none">{currentPersona.label}</div>
                      <div className="text-[10px] text-slate-400 leading-none mt-0.5">{currentPersona.description}</div>
                    </>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${personaOpen ? 'rotate-180' : ''}`} />
              </button>
              {personaOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[280px] z-50">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {t('persona')}
                  </div>
                  {PERSONAS.map((p) => {
                    const Icon = personaIcons[p.icon] || Footprints;
                    const active = persona === p.id;
                    const needsLogin = p.id !== 'citizen' && !profile;
                    const wrongRole = p.id !== 'citizen' && profile && p.id === 'admin' && profile.role !== 'admin';
                    const officerBlocked = p.id === 'officer' && profile && profile.role !== 'manager' && profile.role !== 'admin';

                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePersonaChange(p.id as Persona)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 hover:bg-slate-50 transition-colors ${active ? 'bg-teal-50/50' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${personaColors[p.id as Persona]} flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-sm font-medium ${active ? 'text-teal-700' : 'text-slate-900'}`}>
                            {p.label}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            {needsLogin ? (
                              <><LogIn className="w-3 h-3" /> Sign in required</>
                            ) : wrongRole || officerBlocked ? (
                              <>{p.description}</>
                            ) : (
                              p.description
                            )}
                          </div>
                        </div>
                        {active && <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />}
                      </button>
                    );
                  })}

                  {/* Sign out button if logged in */}
                  {profile && (
                    <>
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-red-50 transition-colors text-red-600"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <div className="text-sm font-medium">Sign Out</div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <div className="md:hidden flex items-center gap-0.5 overflow-x-auto pb-2 -mt-1">
            {visibleNav.map((item) => {
              const active = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Toast({ message, show }: { message: string; show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl">
        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
        <span className="text-sm font-medium">{message}</span>
      </div>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
