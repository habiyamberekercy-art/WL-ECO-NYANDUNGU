import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, type ParkZone, type PondWithLatest, type SensorReading, type WildlifeObservation, type IncidentReport, type SystemSetting, type Alert } from './supabase';

interface DataContextValue {
  zones: ParkZone[];
  ponds: PondWithLatest[];
  sensorReadings: SensorReading[];
  wildlife: WildlifeObservation[];
  reports: IncidentReport[];
  settings: SystemSetting[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const DataContext = createContext<DataContextValue>({
  zones: [],
  ponds: [],
  sensorReadings: [],
  wildlife: [],
  reports: [],
  settings: [],
  alerts: [],
  loading: true,
  error: null,
  reload: async () => {},
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<ParkZone[]>([]);
  const [ponds, setPonds] = useState<PondWithLatest[]>([]);
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [wildlife, setWildlife] = useState<WildlifeObservation[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      await loadAll();
      setError(null);
    } catch {
      setError('We could not reach the park database. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = async () => {
    const [zonesRes, pondsRes, wildlifeRes, reportsRes, settingsRes, alertsRes] = await Promise.all([
      supabase.from('park_zones').select('*').order('name'),
      supabase.from('ponds').select('*, zone:park_zones(*)').order('name'),
      supabase.from('wildlife_observations').select('*').order('observation_date', { ascending: true }),
      supabase.from('incident_reports').select('*, zone:park_zones(*)').order('created_at', { ascending: false }),
      supabase.from('system_settings').select('*').order('name'),
      supabase.from('alerts').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(100),
    ]);

    if (zonesRes.error && !zonesRes.data) throw zonesRes.error;

    const zonesData = (zonesRes.data || []) as ParkZone[];
    const pondsData = (pondsRes.data || []) as (PondWithLatest & { zone: ParkZone | null })[];
    const wildlifeData = (wildlifeRes.data || []) as WildlifeObservation[];
    const reportsData = (reportsRes.data || []) as IncidentReport[];
    const settingsData = (settingsRes.data || []) as SystemSetting[];

    setZones(zonesData);
    setWildlife(wildlifeData);
    setReports(reportsData);
    setSettings(settingsData);
    setAlerts((alertsRes.data || []) as Alert[]);

    const { data: readingsData } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(500);

    const readings = (readingsData || []) as SensorReading[];
    setSensorReadings(readings);

    const latestByPond: Record<string, SensorReading> = {};
    readings.forEach((r) => {
      if (r.pond_id && !latestByPond[r.pond_id]) {
        latestByPond[r.pond_id] = r;
      }
    });

    const enrichedPonds: PondWithLatest[] = pondsData.map((p) => ({
      ...p,
      latest_reading: latestByPond[p.id] || null,
    }));
    setPonds(enrichedPonds);
  };

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const channel = supabase
      .channel('alerts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        reload();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return (
    <DataContext.Provider value={{ zones, ponds, sensorReadings, wildlife, reports, settings, alerts, loading, error, reload }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
