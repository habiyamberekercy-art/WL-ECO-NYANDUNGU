import { useState } from 'react';
import { List } from 'lucide-react';
import ParkMap from '@/components/ParkMap';
import MapOverlayPanel from '@/components/MapOverlayPanel';
import { useData } from '@/lib/data-context';
import { STATUS_CONFIG } from '@/lib/types';
import type { ParkZone } from '@/lib/supabase';

export default function AdminMap() {
  const { zones, ponds } = useData();
  const [selectedZone, setSelectedZone] = useState<ParkZone | null>(null);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Park Map</h1>
        <p className="text-slate-400 text-sm mt-1">Zones, ponds, and infrastructure — GPS disabled for operator privacy</p>
      </div>
      <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-sm" style={{ height: '600px' }}>
        <ParkMap
          zones={zones}
          ponds={ponds}
          onSelectZone={setSelectedZone}
          height="100%"
          showLegend={true}
          showGps={false}
          variant="fullpage"
        />
        <MapOverlayPanel
          title="Park Zones"
          subtitle={`${zones.length} zones`}
          icon={List}
          position="top-3 right-3"
          tone="dark"
          maxHeightClass="max-h-[540px]"
        >
            <div className="p-2 space-y-1.5">
              {zones.map((zone) => {
                const cfg = STATUS_CONFIG[zone.ecological_status];
                return (
                  <button key={zone.id} onClick={() => setSelectedZone(zone)} className="w-full text-left p-2.5 rounded-lg hover:bg-slate-700/50 transition-all group">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-200 group-hover:text-teal-400 leading-tight">{zone.name}</span>
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
  );
}
