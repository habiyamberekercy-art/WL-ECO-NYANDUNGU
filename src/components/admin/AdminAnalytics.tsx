import Analytics from '@/components/Analytics';
import { useData } from '@/lib/data-context';

export default function AdminAnalytics() {
  const { sensorReadings, wildlife, ponds } = useData();
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics Suite</h1>
        <p className="text-slate-400 text-sm mt-1">Historical trends, pollution abatement, and wildlife recovery data</p>
      </div>
      <Analytics sensorReadings={sensorReadings} wildlife={wildlife} ponds={ponds} />
    </div>
  );
}
