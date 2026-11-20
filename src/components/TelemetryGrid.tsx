import { useState } from 'react';
import { Waves, Gauge, Thermometer, AlertCircle, Droplets, MapPin, Activity } from 'lucide-react';
import { Card } from './Header';
import { useApp } from '@/lib/app-context';
import { STATUS_CONFIG, POND_TYPE_CONFIG, getPollutionStatus, getPhStatus, getOxygenStatus, timeAgo } from '@/lib/types';
import type { PondWithLatest } from '@/lib/supabase';

interface TelemetryGridProps {
  ponds: PondWithLatest[];
}

export default function TelemetryGrid({ ponds }: TelemetryGridProps) {
  const { t } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('telemetryTitle')}</h1>
        <p className="text-slate-500">{t('telemetrySubtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ponds.map((pond) => {
          const reading = pond.latest_reading;
          if (!reading) {
            return (
              <Card key={pond.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 text-sm">{pond.name}</h3>
                </div>
                <p className="text-sm text-slate-400">{t('noData')}</p>
              </Card>
            );
          }

          const pollutionStatus = getPollutionStatus(reading.pollution_index);
          const phStatus = getPhStatus(reading.ph_level);
          const o2Status = getOxygenStatus(reading.dissolved_oxygen_mgl);
          const overallStatus = [pollutionStatus, phStatus, o2Status].sort((a, b) => {
            const order = { critical: 0, degraded: 1, moderate: 2, healthy: 3 };
            return order[a] - order[b];
          })[0];

          const cfg = STATUS_CONFIG[overallStatus];
          const typeCfg = POND_TYPE_CONFIG[pond.pond_type];

          return (
            <Card key={pond.id} className="overflow-hidden">
              {/* Header strip */}
              <div className={`h-1.5 ${cfg.dotColor}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{pond.name}</h3>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeCfg.color} mt-1`}>
                      {typeCfg.label}
                    </span>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor} whitespace-nowrap flex-shrink-0`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                    {cfg.label}
                  </span>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <Metric icon={Waves} label={t('waterLevel')} value={`${reading.water_level_cm.toFixed(0)}`} unit="cm" status={reading.water_level_cm > 80 ? 'healthy' : 'moderate'} />
                  <Metric icon={Gauge} label={t('phBalance')} value={reading.ph_level.toFixed(1)} unit="pH" status={phStatus} />
                  <Metric icon={Thermometer} label={t('temperature')} value={reading.temperature_c.toFixed(1)} unit="°C" status={reading.temperature_c > 28 ? 'moderate' : 'healthy'} />
                  <Metric icon={AlertCircle} label={t('pollutionIndex')} value={reading.pollution_index.toFixed(0)} unit="PI" status={pollutionStatus} />
                  <Metric icon={Activity} label={t('dissolvedOxygen')} value={reading.dissolved_oxygen_mgl.toFixed(1)} unit="mg/L" status={o2Status} />
                  <Metric icon={Droplets} label={t('turbidity')} value={reading.turbidity_ntu.toFixed(1)} unit="NTU" status={reading.turbidity_ntu > 15 ? 'moderate' : 'healthy'} />
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <MapPin className="w-3 h-3" />
                  {pond.surface_area_m2.toLocaleString()} m² · Updated {timeAgo(reading.recorded_at)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, unit, status }: {
  icon: typeof Waves; label: string; value: string; unit: string; status: 'healthy' | 'moderate' | 'degraded' | 'critical';
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="p-2 rounded-lg bg-slate-50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-sm font-bold ${cfg.color}`}>{value}</span>
        <span className="text-[10px] text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
