import { Compass, MapPin, Waves, Bird, AlertTriangle, ChevronRight, TrendingUp, AreaChart } from 'lucide-react';
import { Card } from '@/components/Header';
import { Link } from 'react-router-dom';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { STATUS_CONFIG, timeAgo } from '@/lib/types';
import ParkMap from '@/components/ParkMap';
import { useState } from 'react';
import type { ParkZone } from '@/lib/supabase';

export default function UserExplore() {
  const { zones, ponds, wildlife, reports, settings } = useData();
  const { profile } = useAuth();
  const [selectedZone, setSelectedZone] = useState<ParkZone | null>(null);

  const totalArea = zones.reduce((sum, z) => sum + z.area_hectares, 0);
  const latestBirdCount = wildlife
    .filter((w) => w.species_category === 'birds')
    .sort((a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime())[0];
  const pendingReports = reports.filter((r) => r.status === 'pending' || r.status === 'investigating').length;
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3);
  const welcomeMsg = (settings.find((s) => s.name === 'welcome_message')?.value as string) || 'Welcome to Nyandungu Eco-Park Explorer Hub';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 sm:p-10">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(16,185,129,0.3) 0%, transparent 50%)',
        }} />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-emerald-200" />
            <span className="text-emerald-200 text-sm font-semibold uppercase tracking-wider">Kigali, Rwanda</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 leading-tight">
            {welcomeMsg}
          </h1>
          <p className="text-emerald-100 text-base mb-5 max-w-xl">
            Hello {profile?.full_name || 'Explorer'}! Discover the wildlife, wetlands, and walking trails of Africa's largest urban wetland restoration project.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-medium transition-colors text-sm backdrop-blur-sm border border-white/10"
          >
            <Compass className="w-4 h-4" /> Explore Public Map <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AreaChart} label="Total Area" value={`${totalArea} ha`} color="emerald" />
        <StatCard icon={Waves} label="Ponds Monitored" value={ponds.length.toString()} color="cyan" />
        <StatCard icon={Bird} label="Bird Species" value={latestBirdCount ? latestBirdCount.species_count.toString() : '—'} color="teal" />
        <StatCard icon={AlertTriangle} label="Active Reports" value={pendingReports.toString()} color="amber" />
      </div>

      {/* Interactive map */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Park Map</h2>
            <p className="text-sm text-slate-500">Tap any zone or pond to explore ecological details</p>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-emerald-100 shadow-sm" style={{ height: '460px' }}>
          <ParkMap
            zones={zones}
            ponds={ponds}
            onSelectZone={setSelectedZone}
            height="100%"
            showLegend={true}
            showGps={true}
            variant="fullpage"
          />
        </div>
      </div>

      {/* Recent community reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Community Reports</h2>
          <Link to="/" className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {recentReports.map((report) => (
            <Card key={report.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-sm font-semibold text-slate-800 capitalize">{report.report_type.replace(/_/g, ' ')}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                  report.status === 'resolved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                  report.status === 'investigating' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                  'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{report.description}</p>
              <div className="text-xs text-slate-400 mt-2">By {report.reporter_name} · {timeAgo(report.created_at)}</div>
            </Card>
          ))}
          {recentReports.length === 0 && (
            <Card className="p-8 text-center col-span-3">
              <p className="text-slate-400">No community reports yet.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Zone detail drawer */}
      {selectedZone && (
        <ZoneDetailDrawer zone={selectedZone} onClose={() => setSelectedZone(null)} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof MapPin; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </Card>
  );
}

function ZoneDetailDrawer({ zone, onClose }: { zone: ParkZone; onClose: () => void }) {
  const cfg = STATUS_CONFIG[zone.ecological_status];
  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto">
        <div className="relative h-40 bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
          <Compass className="w-12 h-12 text-white/60" />
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center">
            <span className="text-lg">x</span>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <h2 className="text-xl font-bold text-slate-800">{zone.name}</h2>
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.borderColor} ${cfg.bgColor}`}>
            <div className={`w-3 h-3 rounded-full ${cfg.dotColor}`} />
            <div>
              <div className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-slate-500">{cfg.description}</div>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{zone.description}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl">
              <div className="text-xs text-slate-400">Area</div>
              <div className="text-base font-semibold text-slate-800">{zone.area_hectares} ha</div>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl">
              <div className="text-xs text-slate-400">Coordinates</div>
              <div className="text-sm font-semibold text-slate-800">{zone.latitude.toFixed(4)}°S, {zone.longitude.toFixed(4)}°E</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
