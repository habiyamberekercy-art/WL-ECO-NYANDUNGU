import { ArrowLeft, MapPin, X, Droplets } from 'lucide-react';
import { Card } from './Header';
import { STATUS_CONFIG, ZONE_TYPE_CONFIG, formatDate } from '@/lib/types';
import { useApp } from '@/lib/app-context';
import type { ParkZone } from '@/lib/supabase';

interface ZoneDetailProps {
  zone: ParkZone;
  onClose: () => void;
}

const zoneTypeIcons: Record<string, string> = {
  TreePalm: '🌴', Trees: '🌳', Flower2: '🌸', Droplets: '💧', Footprints: '🚶',
};

export default function ZoneDetail({ zone, onClose }: ZoneDetailProps) {
  const { t } = useApp();
  const cfg = STATUS_CONFIG[zone.ecological_status];
  const typeCfg = ZONE_TYPE_CONFIG[zone.zone_type];

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-[slideIn_0.3s_ease-out]">
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        
        {/* Image header */}
        <div className="relative h-48 bg-slate-200">
          {zone.image_url ? (
            <img src={zone.image_url} alt={zone.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full ${cfg.bgColor} flex items-center justify-center`}>
              <MapPin className="w-12 h-12 text-slate-400" />
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeCfg.color} bg-white/90`}>
                {typeCfg.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{zone.name}</h2>
            {zone.image_url && (
              <p className="text-[11px] text-white/70 mt-0.5">Photo: Nyandungu Eco-Park</p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status badge */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.borderColor} ${cfg.bgColor}`}>
            <div className={`w-3 h-3 rounded-full ${cfg.dotColor}`} />
            <div>
              <div className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-slate-500">{cfg.description}</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">About This Zone</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{zone.description}</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-400 mb-0.5">Area</div>
              <div className="text-base font-semibold text-slate-900">{zone.area_hectares} ha</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-xs text-slate-400 mb-0.5">Coordinates</div>
              <div className="text-sm font-semibold text-slate-900">
                {zone.latitude.toFixed(4)}°S, {zone.longitude.toFixed(4)}°E
              </div>
            </div>
          </div>

          {/* Zone type details */}
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-xs text-slate-400 mb-1">Zone Type</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{zoneTypeIcons[typeCfg.icon] || '📍'}</span>
              <span className="text-sm font-semibold text-slate-900">{typeCfg.label}</span>
            </div>
          </div>

          {/* Ecological notes */}
          <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-teal-800">Ecological Health Notes</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {zone.ecological_status === 'healthy' && 'This zone shows strong ecological indicators. Water quality, vegetation density, and wildlife presence are all within optimal ranges. No immediate action required.'}
              {zone.ecological_status === 'moderate' && 'Some indicators show minor stress. Continuous monitoring is recommended. Management actions may include targeted vegetation management and water flow optimization.'}
              {zone.ecological_status === 'degraded' && 'Multiple indicators show decline. Active restoration measures should be implemented, including water quality treatment, invasive species removal, and replanting of native vegetation.'}
              {zone.ecological_status === 'critical' && 'Immediate intervention required. Water quality parameters are outside safe ranges. Coordinate with environmental officers for emergency restoration actions.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
