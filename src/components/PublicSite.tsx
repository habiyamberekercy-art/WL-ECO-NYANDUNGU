import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, Compass, Map as MapIcon, Activity, AlertTriangle, BarChart3, ChevronDown, Globe, Check, LogIn, User as UserIcon, List } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/app-context';
import { STATUS_CONFIG, LANGUAGES, timeAgo } from '@/lib/types';
import type { ParkZone, Language } from '@/lib/supabase';
import CitizenDashboard from '@/components/CitizenDashboard';
import ParkMap from '@/components/ParkMap';
import MapOverlayPanel from '@/components/MapOverlayPanel';
import ZoneDetail from '@/components/ZoneDetail';
import TelemetryGrid from '@/components/TelemetryGrid';
import ReportForm from '@/components/ReportForm';

type PubView = 'dashboard' | 'map' | 'telemetry' | 'report';

export default function PublicSite() {
  const { zones, ponds, wildlife, reports, reload } = useData();
  const { profile } = useAuth();
  const { language, setLanguage } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<PubView>('dashboard');
  const [selectedZone, setSelectedZone] = useState<ParkZone | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === language)!;
  const initials = (profile?.full_name || profile?.email || '?')[0].toUpperCase();

  const navItems: { id: PubView; label: string; icon: typeof Compass }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Compass },
    { id: 'map', label: 'Park Map', icon: MapIcon },
    { id: 'telemetry', label: 'Telemetry', icon: Activity },
    { id: 'report', label: 'Report Incident', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top utility bar */}
      <div className="bg-slate-900 text-slate-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline opacity-60">Kigali, Rwanda</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span className="opacity-60">Nyandungu Eco-Park · 121.7 ha</span>
          </div>
          <div className="flex items-center gap-3">
            {profile ? (
              <div className="relative">
                <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-1.5 hover:text-white py-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-[10px]">{initials}</div>
                  <span className="font-medium">{profile.full_name || 'Account'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[180px] z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-700">{profile.full_name || 'User'}</div>
                      <div className="text-[10px] text-slate-400">{profile.email}</div>
                    </div>
                    <button onClick={() => navigate((profile.role === 'admin' || profile.role === 'manager') ? '/admin-dashboard' : '/user-portal')} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      <UserIcon className="w-3.5 h-3.5" /> My Portal
                    </button>
                    <Link to="/login" className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      <LogIn className="w-3.5 h-3.5" /> Switch Account
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 hover:text-white transition-colors py-1">
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
            )}
            {/* Language */}
            <div className="relative">
              <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 hover:text-white transition-colors py-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="font-medium hidden sm:inline">{currentLang.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-200 py-1 min-w-[140px] z-50">
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code as Language); setLangOpen(false); }} className={`flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-slate-50 ${language === lang.code ? 'text-teal-600 font-semibold' : 'text-slate-700'}`}>
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

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <button onClick={() => setView('dashboard')} className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-slate-900 leading-none tracking-tight">WL<span className="text-teal-600">-ECO</span></div>
                <div className="text-[10px] text-slate-400 leading-none mt-0.5 hidden sm:block">Nyandungu Eco-Park Monitoring</div>
              </div>
            </button>
            <nav className="hidden md:flex items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button key={item.id} onClick={() => { setView(item.id); setSelectedZone(null); }} className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="md:hidden flex items-center gap-0.5 overflow-x-auto pb-2 -mt-1">
            {navItems.map((item) => {
              const active = view === item.id;
              return <button key={item.id} onClick={() => { setView(item.id); setSelectedZone(null); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${active ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}>{item.label}</button>;
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      {view === 'dashboard' && (
        <CitizenDashboard zones={zones} ponds={ponds} wildlife={wildlife} reports={reports} onSelectZone={setSelectedZone} onNavigate={(v) => setView(v as PubView)} />
      )}

      {view === 'map' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Nyandungu Interactive Map</h1>
            <p className="text-slate-500">Click any zone or pond to explore ecological details</p>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm" style={{ height: '600px' }}>
            <ParkMap zones={zones} ponds={ponds} onSelectZone={setSelectedZone} height="100%" showLegend={true} showGps={true} variant="fullpage" />
            <MapOverlayPanel
              title="Park Zones"
              subtitle={`${zones.length} ecological zones · ${zones.reduce((s, z) => s + z.area_hectares, 0)} ha total`}
              icon={List}
              position="top-3 right-3"
              widthClass="w-60"
              maxHeightClass="max-h-[540px]"
            >
                <div className="p-2.5 space-y-1.5">
                  {zones.map((zone) => {
                    const cfg = STATUS_CONFIG[zone.ecological_status];
                    return (
                      <button key={zone.id} onClick={() => setSelectedZone(zone)} className="w-full text-left p-2.5 rounded-lg hover:bg-teal-50/70 transition-all group">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-900 group-hover:text-teal-700 leading-tight">{zone.name}</span>
                          <span className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" style={{ background: cfg.hex }} />
                        </div>
                        <div className="text-xs text-slate-500">{zone.area_hectares} ha · {cfg.label}</div>
                      </button>
                    );
                  })}
                </div>
            </MapOverlayPanel>
          </div>
        </div>
      )}

      {view === 'telemetry' && <TelemetryGrid ponds={ponds} />}
      {view === 'report' && <ReportForm zones={zones} onDone={() => setView('dashboard')} />}

      {selectedZone && <ZoneDetail zone={selectedZone} onClose={() => setSelectedZone(null)} />}
    </div>
  );
}
