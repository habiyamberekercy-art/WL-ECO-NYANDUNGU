import { useState, useMemo } from 'react';
import { Bird, TrendingDown, Activity, Download, CheckCircle, Loader2, Gauge, Thermometer, Droplets, AlertTriangle } from 'lucide-react';
import { Card, Toast } from './Header';
import { useApp } from '@/lib/app-context';
import { supabase, type SensorReading, type WildlifeObservation, type PondWithLatest } from '@/lib/supabase';

interface AnalyticsProps {
  sensorReadings: SensorReading[];
  wildlife: WildlifeObservation[];
  ponds: PondWithLatest[];
}

export default function Analytics({ sensorReadings, wildlife, ponds }: AnalyticsProps) {
  const { t } = useApp();
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(false);

  // Wildlife data: bird species recovery
  const birdData = useMemo(() => {
    return wildlife
      .filter((w) => w.species_category === 'birds')
      .sort((a, b) => new Date(a.observation_date).getTime() - new Date(b.observation_date).getTime());
  }, [wildlife]);

  // Mammal data
  const mammalData = useMemo(() => {
    return wildlife
      .filter((w) => w.species_category === 'mammals')
      .sort((a, b) => new Date(a.observation_date).getTime() - new Date(b.observation_date).getTime());
  }, [wildlife]);

  // Monthly pollution trend (average across all ponds per month)
  const pollutionTrend = useMemo(() => {
    const monthly: Record<string, { sum: number; count: number; date: string }> = {};
    sensorReadings.forEach((r) => {
      const d = new Date(r.recorded_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { sum: 0, count: 0, date: r.recorded_at };
      monthly[key].sum += r.pollution_index;
      monthly[key].count++;
    });
    return Object.entries(monthly)
      .map(([key, v]) => ({ key, avg: v.sum / v.count, date: v.date }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12);
  }, [sensorReadings]);

  // Recent 24h sensor trends (average across all ponds)
  const recentTrend = useMemo(() => {
    const hourly: Record<string, { ph: number; temp: number; do: number; turb: number; count: number; ts: string }> = {};
    sensorReadings.forEach((r) => {
      const key = r.recorded_at.slice(0, 13); // hour bucket
      if (!hourly[key]) hourly[key] = { ph: 0, temp: 0, do: 0, turb: 0, count: 0, ts: r.recorded_at };
      hourly[key].ph += r.ph_level;
      hourly[key].temp += r.temperature_c;
      hourly[key].do += r.dissolved_oxygen_mgl;
      hourly[key].turb += r.turbidity_ntu;
      hourly[key].count++;
    });
    return Object.values(hourly)
      .map((v) => ({
        ts: v.ts,
        ph: v.ph / v.count,
        temp: v.temp / v.count,
        do: v.do / v.count,
        turb: v.turb / v.count,
      }))
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .slice(-24);
  }, [sensorReadings]);

  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      // Generate CSV from sensor readings
      const headers = ['wetland_id', 'pond_id', 'water_level_cm', 'ph_level', 'temperature_c', 'pollution_index', 'dissolved_oxygen_mgl', 'turbidity_ntu', 'recorded_at'];
      const rows = sensorReadings.map((r) => [
        r.zone_id || '', r.pond_id || '',
        r.water_level_cm.toFixed(2), r.ph_level.toFixed(2),
        r.temperature_c.toFixed(2), r.pollution_index.toFixed(2),
        r.dissolved_oxygen_mgl.toFixed(2), r.turbidity_ntu.toFixed(2),
        r.recorded_at,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nyandungu_sensor_data_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    }, 1500);
  };

  const latestBirdCount = birdData.length > 0 ? birdData[birdData.length - 1].species_count : 0;
  const latestMammalCount = mammalData.length > 0 ? mammalData[mammalData.length - 1].species_count : 0;

  // Critical alerts
  const criticalPonds = ponds.filter((p) => {
    if (!p.latest_reading) return false;
    return p.latest_reading.pollution_index > 40 || p.latest_reading.ph_level < 6.0 || p.latest_reading.ph_level > 8.5;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('analyticsTitle')}</h1>
          <p className="text-slate-500">{t('analyticsSubtitle')}</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors flex-shrink-0"
        >
          {exporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t('exporting')}</>
          ) : (
            <><Download className="w-4 h-4" /> {t('exportData')}</>
          )}
        </button>
      </div>

      {/* Critical Alerts */}
      {criticalPonds.length > 0 && (
        <Card className="p-5 border-red-200 bg-red-50/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-bold text-red-700">{t('criticalAlerts')} ({criticalPonds.length})</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalPonds.map((pond) => {
              const r = pond.latest_reading!;
              return (
                <div key={pond.id} className="p-3 bg-white rounded-xl border border-red-100">
                  <div className="font-semibold text-sm text-slate-900 mb-1">{pond.name}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {r.pollution_index > 40 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">PI: {r.pollution_index.toFixed(0)}</span>}
                    {(r.ph_level < 6.0 || r.ph_level > 8.5) && <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">pH: {r.ph_level.toFixed(1)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Bird} label={t('birdSpecies')} value={latestBirdCount.toString()} color="emerald" suffix="+ target met" />
        <StatCard icon={Activity} label={t('mammalSpecies')} value={latestMammalCount.toString()} color="teal" />
        <StatCard icon={Gauge} label={t('totalReadings')} value={sensorReadings.length.toString()} color="blue" />
        <StatCard icon={TrendingDown} label={t('pollutionAbatement')} value={pollutionTrend.length > 0 ? `${((1 - pollutionTrend[pollutionTrend.length - 1].avg / pollutionTrend[0].avg) * 100).toFixed(0)}%` : '—'} color="emerald" />
      </div>

      {/* Wildlife Recovery Chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Bird className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">{t('wildlifeTrend')}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">Tracking recovery from 100 to 200+ species since restoration began in 2016</p>
        <LineChart
          data={birdData.map((d) => ({ x: new Date(d.observation_date).getFullYear(), y: d.species_count, label: d.notes }))}
          color="#10b981"
          yLabel="Species Count"
          height={240}
          areaFill
          target={200}
          targetLabel="200 species target"
        />
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400">Baseline (2016)</div>
            <div className="text-xl font-bold text-slate-900">102</div>
          </div>
          <div className="text-slate-300 text-2xl">→</div>
          <div>
            <div className="text-xs text-slate-400">Current (2025)</div>
            <div className="text-xl font-bold text-emerald-600">{latestBirdCount}</div>
          </div>
          <div className="text-slate-300 text-2xl">→</div>
          <div>
            <div className="text-xs text-slate-400">Growth</div>
            <div className="text-xl font-bold text-emerald-600">+{latestBirdCount - 102}</div>
          </div>
        </div>
      </Card>

      {/* Pollution Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">{t('pollutionTrend')}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">Monthly average pollution index across all catchment ponds (lower is better)</p>
        <BarChart
          data={pollutionTrend.map((d) => ({
            label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            value: d.avg,
          }))}
          color="#0ea5e9"
          height={220}
          yLabel="Pollution Index"
        />
      </Card>

      {/* Sensor Trends */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-900">{t('sensorTrend')}</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">24-hour average sensor readings across all ponds</p>
        <div className="grid lg:grid-cols-2 gap-6">
          <LineChart
            data={recentTrend.map((d) => ({ x: new Date(d.ts).getTime(), y: d.ph, label: '' }))}
            color="#14b8a6"
            yLabel="pH Level"
            height={180}
            timeAxis
          />
          <LineChart
            data={recentTrend.map((d) => ({ x: new Date(d.ts).getTime(), y: d.temp, label: '' }))}
            color="#f97316"
            yLabel="Temperature (°C)"
            height={180}
            timeAxis
          />
          <LineChart
            data={recentTrend.map((d) => ({ x: new Date(d.ts).getTime(), y: d.do, label: '' }))}
            color="#10b981"
            yLabel="Dissolved O₂ (mg/L)"
            height={180}
            timeAxis
          />
          <LineChart
            data={recentTrend.map((d) => ({ x: new Date(d.ts).getTime(), y: d.turb, label: '' }))}
            color="#f59e0b"
            yLabel="Turbidity (NTU)"
            height={180}
            timeAxis
          />
        </div>
      </Card>

      <Toast message={t('exportSuccess')} show={toast} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, suffix }: { icon: typeof Bird; label: string; value: string; color: string; suffix?: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}{suffix && <span className="text-emerald-600 text-xs ml-1">{suffix}</span>}</div>
    </Card>
  );
}

// SVG Line Chart Component
function LineChart({ data, color, yLabel, height = 200, areaFill, target, targetLabel, timeAxis }: {
  data: { x: number; y: number; label: string }[];
  color: string;
  yLabel: string;
  height?: number;
  areaFill?: boolean;
  target?: number;
  targetLabel?: string;
  timeAxis?: boolean;
}) {
  const width = 800;
  const padding = { top: 15, right: 15, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  if (data.length < 2) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Insufficient data</div>;

  const ys = data.map((d) => d.y);
  const min = target ? Math.min(Math.min(...ys), target) - 5 : Math.min(...ys) - 5;
  const max = target ? Math.max(Math.max(...ys), target) + 5 : Math.max(...ys) + 5;
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.y - min) / range) * chartH,
    val: d.y,
    label: d.label,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${padding.left + chartW} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padding.top + chartH - t * chartH,
    val: min + t * range,
  }));

  const xLabels = data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, idx) => {
    const i = data.indexOf(d);
    return {
      x: padding.left + (i / (data.length - 1)) * chartW,
      label: timeAxis ? new Date(d.x).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : String(d.x),
    };
  });

  const targetY = target ? padding.top + chartH - ((target - min) / range) * chartH : null;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} y1={g.y} x2={padding.left + chartW} y2={g.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
            <text x={padding.left - 6} y={g.y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{g.val.toFixed(0)}</text>
          </g>
        ))}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{xl.label}</text>
        ))}
        {targetY !== null && (
          <g>
            <line x1={padding.left} y1={targetY} x2={padding.left + chartW} y2={targetY} stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 4" />
            <text x={padding.left + chartW - 4} y={targetY - 4} textAnchor="end" fontSize="9" fill="#10b981" fontWeight="600">{targetLabel}</text>
          </g>
        )}
        {areaFill && <path d={areaPath} fill={`url(#grad-${color})`} />}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
        ))}
        <text x={padding.left - 35} y={padding.top + chartH / 2} fontSize="10" fill="#94a3b8" transform={`rotate(-90 ${padding.left - 35} ${padding.top + chartH / 2})`} textAnchor="middle">{yLabel}</text>
      </svg>
    </div>
  );
}

// SVG Bar Chart Component
function BarChart({ data, color, height = 200, yLabel }: {
  data: { label: string; value: number }[];
  color: string;
  height?: number;
  yLabel: string;
}) {
  const width = 800;
  const padding = { top: 15, right: 15, bottom: 35, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  if (data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>;

  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const barWidth = chartW / data.length;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padding.top + chartH - t * chartH,
    val: t * max,
  }));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} y1={g.y} x2={padding.left + chartW} y2={g.y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
            <text x={padding.left - 6} y={g.y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">{g.val.toFixed(0)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const barH = (d.value / max) * chartH;
          const x = padding.left + i * barWidth + barWidth * 0.15;
          const w = barWidth * 0.7;
          const y = padding.top + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={barH} fill={color} rx="3" opacity={0.85} />
              <text x={x + w / 2} y={height - 10} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
            </g>
          );
        })}
        <text x={padding.left - 35} y={padding.top + chartH / 2} fontSize="10" fill="#94a3b8" transform={`rotate(-90 ${padding.left - 35} ${padding.top + chartH / 2})`} textAnchor="middle">{yLabel}</text>
      </svg>
    </div>
  );
}
