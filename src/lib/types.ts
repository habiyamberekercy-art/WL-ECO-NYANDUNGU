import type { EcoStatus, ReportType, ReportSeverity, ReportStatus, ZoneType, PondType, Language, Persona, UserRole } from './supabase';

export const STATUS_CONFIG: Record<EcoStatus, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string; hex: string; description: string }> = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    hex: '#10b981',
    description: 'Ecosystem functioning well with good water quality',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
    hex: '#f59e0b',
    description: 'Some indicators show stress, monitoring needed',
  },
  degraded: {
    label: 'Degraded',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    dotColor: 'bg-orange-500',
    hex: '#f97316',
    description: 'Multiple indicators show significant decline',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
    hex: '#ef4444',
    description: 'Immediate intervention required',
  },
};

export const ZONE_TYPE_CONFIG: Record<ZoneType, { label: string; icon: string; color: string }> = {
  savannah: { label: 'Savannah', icon: 'TreePalm', color: 'text-amber-600 bg-amber-50' },
  woodland: { label: 'Woodland', icon: 'Trees', color: 'text-emerald-600 bg-emerald-50' },
  garden: { label: 'Garden', icon: 'Flower2', color: 'text-pink-600 bg-pink-50' },
  wetland: { label: 'Wetland', icon: 'Droplets', color: 'text-teal-600 bg-teal-50' },
  recreational: { label: 'Recreational', icon: 'Footprints', color: 'text-blue-600 bg-blue-50' },
};

export const POND_TYPE_CONFIG: Record<PondType, { label: string; color: string }> = {
  catchment: { label: 'Catchment', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  recreational: { label: 'Recreational', color: 'text-teal-700 bg-teal-50 border-teal-200' },
  retention: { label: 'Retention', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  filtration: { label: 'Filtration', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> = {
  sewage_inflow: { label: 'Sewage Inflow', icon: 'Pipe', color: 'text-red-600 bg-red-50 border-red-200' },
  infrastructure_damage: { label: 'Infrastructure Damage', icon: 'Construction', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  illegal_grazing: { label: 'Illegal Grazing', icon: 'Cow', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  pollution: { label: 'Pollution', icon: 'Trash2', color: 'text-purple-600 bg-purple-50 border-purple-200' },
  wildlife_threat: { label: 'Wildlife Threat', icon: 'Bird', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  other: { label: 'Other', icon: 'FileText', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

export const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  medium: { label: 'Medium', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  high: { label: 'High', color: 'text-red-700 bg-red-50 border-red-200' },
};

export const REPORT_STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  investigating: { label: 'Under Investigation', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  resolved: { label: 'Resolved', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  dismissed: { label: 'Dismissed', color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; description: string }> = {
  admin: { label: 'Administrator', color: 'text-slate-300 bg-slate-700 border-slate-600', description: 'Full control, including accounts and settings' },
  manager: { label: 'Officer', color: 'text-blue-300 bg-blue-500/20 border-blue-500/30', description: 'Park staff: monitoring dashboard and telemetry' },
  researcher: { label: 'Researcher', color: 'text-sky-300 bg-sky-500/20 border-sky-500/30', description: 'Research partners: portal and data access' },
  government: { label: 'Government', color: 'text-amber-300 bg-amber-500/20 border-amber-500/30', description: 'Government partners: portal and data access' },
  public: { label: 'Citizen', color: 'text-teal-300 bg-teal-500/20 border-teal-500/30', description: 'Community member: portal access' },
};

// Pollution index health thresholds
export function getPollutionStatus(index: number): EcoStatus {
  if (index <= 20) return 'healthy';
  if (index <= 40) return 'moderate';
  if (index <= 60) return 'degraded';
  return 'critical';
}

export function getPhStatus(ph: number): EcoStatus {
  if (ph >= 6.5 && ph <= 8.5) return 'healthy';
  if ((ph >= 6.0 && ph < 6.5) || (ph > 8.5 && ph <= 9.0)) return 'moderate';
  if ((ph >= 5.5 && ph < 6.0) || (ph > 9.0 && ph <= 9.5)) return 'degraded';
  return 'critical';
}

export function getOxygenStatus(do_mgl: number): EcoStatus {
  if (do_mgl >= 7) return 'healthy';
  if (do_mgl >= 5) return 'moderate';
  if (do_mgl >= 3) return 'degraded';
  return 'critical';
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
}

// Language translations
export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: 'GB' },
  { code: 'rw', label: 'Kinyarwanda', flag: 'RW' },
];

export const PERSONAS: { id: Persona; label: string; icon: string; description: string }[] = [
  { id: 'citizen', label: 'Citizen / Ecotourist', icon: 'Footprints', description: 'Public Web Portal' },
  { id: 'officer', label: 'Environmental Officer', icon: 'Microscope', description: 'Technical Analytics Portal' },
  { id: 'admin', label: 'Administrator', icon: 'Shield', description: 'System Management Portal' },
];
