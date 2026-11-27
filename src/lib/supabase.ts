import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type EcoStatus = 'healthy' | 'moderate' | 'degraded' | 'critical';
export type ZoneType = 'savannah' | 'woodland' | 'garden' | 'wetland' | 'recreational';
export type PondType = 'catchment' | 'recreational' | 'retention' | 'filtration';
export type ReportType = 'sewage_inflow' | 'infrastructure_damage' | 'illegal_grazing' | 'pollution' | 'wildlife_threat' | 'other';
export type ReportSeverity = 'low' | 'medium' | 'high';
export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';
export type UserRole = 'admin' | 'manager' | 'public' | 'researcher' | 'government';
export type AlertStatus = 'active' | 'resolved';

export interface AccessRequest {
  id: string;
  full_name: string;
  email: string;
  organization: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  reviewed_at: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  source: 'sensor' | 'report';
  metric: string | null;
  value: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  reading_id: string | null;
  pond_id: string | null;
  zone_id: string | null;
  report_id: string | null;
  severity: string;
  message: string;
  status: AlertStatus;
  resolved_at: string | null;
  created_at: string;
}
export type Persona = 'citizen' | 'officer' | 'admin';
export type Language = 'en' | 'rw';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization: string | null;
  created_at: string;
  suspended: boolean;
  must_change_password: boolean;
  avatar_url: string | null;
}

export interface ParkZone {
  id: string;
  name: string;
  zone_type: ZoneType;
  description: string;
  latitude: number;
  longitude: number;
  ecological_status: EcoStatus;
  image_url: string | null;
  area_hectares: number;
  created_at: string;
}

export interface Pond {
  id: string;
  name: string;
  zone_id: string | null;
  latitude: number;
  longitude: number;
  pond_type: PondType;
  surface_area_m2: number;
  created_at: string;
}

export interface SensorReading {
  id: string;
  pond_id: string | null;
  zone_id: string | null;
  water_level_cm: number;
  ph_level: number;
  temperature_c: number;
  pollution_index: number;
  dissolved_oxygen_mgl: number;
  turbidity_ntu: number;
  recorded_at: string;
}

export interface WildlifeObservation {
  id: string;
  observation_date: string;
  species_category: string;
  species_count: number;
  notes: string;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  reporter_name: string;
  reporter_email: string;
  report_type: ReportType;
  description: string;
  location_zone_id: string | null;
  location_description: string;
  severity: ReportSeverity;
  status: ReportStatus;
  image_url: string | null;
  created_at: string;
  zone?: ParkZone | null;
}

export interface ActivityLog {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserFavorite {
  id: string;
  user_id: string;
  species_category: string;
  species_name: string;
  notes: string;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  name: string;
  value: boolean | string | string[];
  description: string;
  updated_by: string | null;
  updated_at: string;
}

export interface PondWithLatest extends Pond {
  latest_reading?: SensorReading | null;
  zone?: ParkZone | null;
}
