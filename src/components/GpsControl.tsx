import { useEffect, useState } from 'react';
import { Crosshair, LocateFixed, LocateOff, Loader2, Navigation, X, MapPin, AlertTriangle, RotateCw } from 'lucide-react';
import type { GpsFix, GpsInsight, GpsStatus } from '@/lib/use-gps-tracking';
import { formatDistance } from '@/lib/geo';

interface GpsControlProps {
  status: GpsStatus;
  fix: GpsFix | null;
  error: string | null;
  insight: GpsInsight | null;
  following: boolean;
  onStart: () => void;
  onStop: () => void;
  onRecenter: () => void;
  position: string;
}

function useSecondsSince(timestamp: number | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timestamp) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  return timestamp ? Math.max(0, Math.round((now - timestamp) / 1000)) : 0;
}

function accuracyQuality(m: number) {
  if (m <= 15) return { label: 'Excellent', cls: 'text-emerald-600 bg-emerald-50' };
  if (m <= 40) return { label: 'Good', cls: 'text-teal-600 bg-teal-50' };
  if (m <= 100) return { label: 'Fair', cls: 'text-amber-600 bg-amber-50' };
  return { label: 'Low', cls: 'text-rose-600 bg-rose-50' };
}

export default function GpsControl({ status, fix, error, insight, following, onStart, onStop, onRecenter, position }: GpsControlProps) {
  const [cardOpen, setCardOpen] = useState(true);
  const age = useSecondsSince(fix?.timestamp);

  useEffect(() => {
    if (status === 'locating' || status === 'error') setCardOpen(true);
  }, [status]);

  const showCard = cardOpen && (status === 'active' || status === 'error');

  return (
    <div className={`absolute ${position} z-[401] flex flex-col items-end gap-2`}>
      {showCard && status === 'error' && error && (
        <div className="w-64 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-rose-100 p-3 animate-[mapPanelIn_0.2s_ease-out]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed flex-1">{error}</p>
            <button onClick={() => setCardOpen(false)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showCard && status === 'active' && fix && insight && (
        <div className="w-64 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-white/60 overflow-hidden animate-[mapPanelIn_0.2s_ease-out]">
          <div className="pl-3.5 pr-2 py-2.5 border-b border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-blue-500" />
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Location</span>
            </div>
            <button onClick={() => setCardOpen(false)} className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Hide location details">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3.5 space-y-2.5">
            {insight.insidePark ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">You're inside the park</div>
                  {insight.nearestZone && (
                    <div className="text-xs text-slate-500">
                      Nearest: {insight.nearestZone.name} · {formatDistance(insight.nearestZone.distance)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Outside the park</div>
                  <div className="text-xs text-slate-500">
                    Park edge is {formatDistance(insight.distanceToPark)} to the {insight.directionToPark}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                <div className="text-slate-400">Accuracy</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">±{Math.round(fix.accuracy)} m</span>
                  <span className={`px-1.5 rounded text-[9px] font-semibold ${accuracyQuality(fix.accuracy).cls}`}>{accuracyQuality(fix.accuracy).label}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                <div className="text-slate-400">Speed</div>
                <div className="font-semibold text-slate-800">{fix.speed !== null ? `${(fix.speed * 3.6).toFixed(1)} km/h` : 'Stationary'}</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {fix.lat.toFixed(6)}, {fix.lon.toFixed(6)}
            </div>
            <div className="text-[10px] text-slate-400">Updated {age < 3 ? 'just now' : `${age}s ago`}</div>
            {fix.accuracy > 100 && (
              <p className="text-[10px] text-amber-700 bg-amber-50 rounded-md px-2 py-1.5 leading-relaxed">
                Signal is weak, likely from Wi-Fi or mobile network. Step outside for a precise satellite fix.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {status === 'active' && !following && insight?.insidePark && (
          <button onClick={onRecenter} className="gps-btn gps-btn-idle" title="Center map on me">
            <Crosshair className="w-3.5 h-3.5" />
            Recenter
          </button>
        )}
        {status === 'active' && !cardOpen && (
          <button onClick={() => setCardOpen(true)} className="gps-btn gps-btn-idle" title="Show location details">
            <MapPin className="w-3.5 h-3.5" />
            ±{Math.round(fix?.accuracy ?? 0)} m
          </button>
        )}
        {status === 'idle' && (
          <button className="gps-btn gps-btn-idle" onClick={onStart}>
            <LocateFixed className="w-3.5 h-3.5" />
            Locate Me
          </button>
        )}
        {status === 'locating' && (
          <button className="gps-btn gps-btn-locating" onClick={onStop} title="Cancel">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Finding you...
          </button>
        )}
        {status === 'active' && (
          <button className="gps-btn gps-btn-active" onClick={onStop} title="Stop tracking">
            <LocateOff className="w-3.5 h-3.5" />
            Stop GPS
          </button>
        )}
        {status === 'error' && (
          <button className="gps-btn gps-btn-error" onClick={onStart}>
            <RotateCw className="w-3.5 h-3.5" />
            Retry GPS
          </button>
        )}
      </div>
    </div>
  );
}
