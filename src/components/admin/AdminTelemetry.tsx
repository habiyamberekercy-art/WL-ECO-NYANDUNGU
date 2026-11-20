import TelemetryGrid from '@/components/TelemetryGrid';
import { useData } from '@/lib/data-context';

export default function AdminTelemetry() {
  const { ponds } = useData();
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pond Telemetry Grid</h1>
        <p className="text-slate-400 text-sm mt-1">Live sensor data from all catchment and recreational ponds</p>
      </div>
      <TelemetryGrid ponds={ponds} />
    </div>
  );
}
