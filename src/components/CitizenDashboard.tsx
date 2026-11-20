import { Droplets, MapPin, Waves, Bird, AlertTriangle, AreaChart, TrendingUp, ChevronRight, List } from 'lucide-react';
import { Card } from './Header';
import ParkMap from './ParkMap';
import MapOverlayPanel from '@/components/MapOverlayPanel';
import { useApp } from '@/lib/app-context';
import { STATUS_CONFIG, timeAgo } from '@/lib/types';
import type { ParkZone, PondWithLatest, WildlifeObservation, IncidentReport } from '@/lib/supabase';

interface CitizenDashboardProps {
  zones: ParkZone[];
  ponds: PondWithLatest[];
  wildlife: WildlifeObservation[];
  reports: IncidentReport[];
  onSelectZone: (zone: ParkZone) => void;
  onNavigate: (view: 'map' | 'telemetry' | 'report') => void;
}

export default function CitizenDashboard({ zones, ponds, wildlife, reports, onSelectZone, onNavigate }: CitizenDashboardProps) {
  const { t } = useApp();

  const totalArea = zones.reduce((sum, z) => sum + z.area_hectares, 0);
  const latestBirdCount = wildlife
    .filter((w) => w.species_category === 'birds')
    .sort((a, b) => new Date(b.observation_date).getTime() - new Date(a.observation_date).getTime())[0];
  const pendingReports = reports.filter((r) => r.status === 'pending' || r.status === 'investigating').length;
  const recentReports = [...reports].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 p-6 sm:p-10">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(13,148,136,0.3) 0%, transparent 50%)',
        }} />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-teal-400" />
            <span className="text-teal-400 text-sm font-semibold uppercase tracking-wider">Kigali, Rwanda</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">
            Nyandungu Eco-Park Monitoring
          </h1>
          <p className="text-slate-300 text-base mb-5 max-w-2xl">
            Real-time ecological telemetry, interactive park mapping, and citizen environmental reporting for Africa's largest urban wetland restoration project.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('map')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-medium transition-colors text-sm">
              {t('exploreZones')} <TrendingUp className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('report')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/10 text-sm backdrop-blur-sm">
              {t('nav_report')} <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AreaChart} label={t('totalArea')} value={`${totalArea} ha`} color="emerald" />
        <StatCard icon={Waves} label={t('pondsMonitored')} value={ponds.length.toString()} color="blue" />
        <StatCard icon={Bird} label={t('speciesCount')} value={latestBirdCount ? latestBirdCount.species_count.toString() : '—'} color="teal" />
        <StatCard icon={AlertTriangle} label={t('activeReports')} value={pendingReports.toString()} color="amber" />
      </div>

      {/* Map section — seamless, no white card wrapper */}
      <div className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t('nav_map')}</h2>
            <p className="text-sm text-slate-500">{t('clickZoneHint')}</p>
          </div>
          <button
            onClick={() => onNavigate('map')}
            className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
          >
            {t('viewAllZones')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Map with floating zone sidebar — integrated, not boxed */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm" style={{ height: '460px' }}>
          <ParkMap
            zones={zones}
            ponds={ponds}
            onSelectZone={onSelectZone}
            height="100%"
            showLegend={true}
            variant="fullpage"
          />
          <MapOverlayPanel
            title="Park Zones"
            subtitle={`${zones.length} ecological zones`}
            icon={List}
            position="top-3 right-3"
          >
              <div className="p-2 space-y-1.5">
                {zones
                  .sort((a, b) => {
                    const order: Record<string, number> = { critical: 0, degraded: 1, moderate: 2, healthy: 3 };
                    return order[a.ecological_status] - order[b.ecological_status];
                  })
                  .map((zone) => {
                    const cfg = STATUS_CONFIG[zone.ecological_status];
                    return (
                      <button
                        key={zone.id}
                        onClick={() => onSelectZone(zone)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-teal-50/70 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-semibold text-xs text-slate-900 group-hover:text-teal-700 leading-tight">{zone.name}</span>
                          <span className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: cfg.hex }} />
                        </div>
                        <div className="text-[10px] text-slate-500">{zone.area_hectares} ha · {cfg.label}</div>
                      </button>
                    );
                  })}
              </div>
          </MapOverlayPanel>
        </div>
      </div>

      {/* Recent Reports */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">{t('nav_reports')}</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {recentReports.map((report) => {
            return (
              <Card key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 capitalize">{report.report_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-400">By {report.reporter_name} · {timeAgo(report.created_at)}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                    report.status === 'resolved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                    report.status === 'investigating' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                    'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{report.description}</p>
              </Card>
            );
          })}
          {recentReports.length === 0 && (
            <Card className="p-8 text-center col-span-2">
              <p className="text-slate-400">No reports yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof MapPin; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    teal: 'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </Card>
  );
}
