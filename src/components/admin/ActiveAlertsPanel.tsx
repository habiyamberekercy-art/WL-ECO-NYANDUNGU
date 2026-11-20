import { Siren, Droplets, FileText, CheckCircle2 } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { timeAgo } from '@/lib/types';

export default function ActiveAlertsPanel() {
  const { alerts, ponds } = useData();
  const pondName = (id: string | null) => ponds.find((p) => p.id === id)?.name;

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden" aria-live="polite">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Siren className={`w-4 h-4 ${alerts.length ? 'text-red-400' : 'text-slate-400'}`} />
          <h2 className="text-sm font-bold text-slate-200">Active Alerts</h2>
          {alerts.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold">{alerts.length}</span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-teal-400 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-teal-400" />
          </span>
          Live
        </span>
      </div>
      <div className="divide-y divide-slate-700/50 max-h-[320px] overflow-y-auto">
        {alerts.map((a) => {
          const Icon = a.source === 'sensor' ? Droplets : FileText;
          const place = pondName(a.pond_id);
          return (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.severity === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-200 break-words">{a.message}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {a.source === 'sensor' ? 'Sensor' : 'Report'}
                  {place ? ` · ${place}` : ''} · {timeAgo(a.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-slate-500 text-sm">
            <CheckCircle2 className="w-6 h-6 text-teal-500" />
            All readings are within safe limits.
          </div>
        )}
      </div>
    </section>
  );
}
