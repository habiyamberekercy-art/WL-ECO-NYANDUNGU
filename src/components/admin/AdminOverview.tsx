import { FileText, Users, AlertTriangle, Clock, Activity, ScrollText, Settings as SettingsIcon, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { supabase, type AuditLog, type Profile } from '@/lib/supabase';
import { timeAgo, formatDateTime } from '@/lib/types';
import { useEffect, useState } from 'react';
import ActiveAlertsPanel from '@/components/admin/ActiveAlertsPanel';

export default function AdminOverview() {
  const { reports, settings, reload } = useData();
  const { profile } = useAuth();
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8).then(({ data }) => {
      setRecentAudit((data as AuditLog[]) || []);
    });
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) => {
      setUserCount(count || 0);
    });
  }, []);

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const investigatingCount = reports.filter((r) => r.status === 'investigating').length;
  const highSeverityCount = reports.filter((r) => r.severity === 'high' && r.status !== 'resolved' && r.status !== 'dismissed').length;
  const maintenanceMode = settings.find((s) => s.name === 'maintenance_mode')?.value === true;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center Overview</h1>
          <p className="text-slate-400 text-sm mt-1">System-wide status and operational intelligence</p>
        </div>
        {maintenanceMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Maintenance Mode Active</span>
          </div>
        )}
      </div>

      {/* Alert banner */}
      {highSeverityCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-semibold text-red-300 text-sm">{highSeverityCount} high-severity report{highSeverityCount > 1 ? 's' : ''} awaiting action</span>
          <Link to="/admin-dashboard/reports" className="ml-auto text-xs text-red-300 hover:text-red-200 font-medium underline">Review now</Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Reports" value={reports.length.toString()} color="slate" link="/admin-dashboard/reports" />
        <StatCard icon={Clock} label="Pending" value={pendingCount.toString()} color="amber" link="/admin-dashboard/reports" />
        <StatCard icon={Activity} label="Investigating" value={investigatingCount.toString()} color="blue" link="/admin-dashboard/reports" />
        <StatCard icon={Users} label="Registered Users" value={userCount.toString()} color="teal" link="/admin-dashboard/users" />
      </div>

      <ActiveAlertsPanel />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent audit trail */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-200">Recent Audit Activity</h2>
            </div>
            <Link to="/admin-dashboard/audit" className="text-xs text-teal-400 hover:text-teal-300 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-slate-700/50 max-h-[300px] overflow-y-auto">
            {recentAudit.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-300">{log.event_type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-500">· {timeAgo(log.created_at)}</span>
                </div>
                <p className="text-sm text-slate-400 break-words">{log.message}</p>
              </div>
            ))}
            {recentAudit.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">No audit activity yet.</div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-200 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickLink to="/admin-dashboard/users" icon={Users} label="Manage Users" desc="Change roles, suspend accounts" />
            <QuickLink to="/admin-dashboard/reports" icon={FileText} label="Review Reports" desc="Approve, investigate, or dismiss" />
            <QuickLink to="/admin-dashboard/settings" icon={SettingsIcon} label="System Settings" desc="Maintenance mode, categories, toggles" />
            <QuickLink to="/admin-dashboard/audit" icon={ScrollText} label="Audit Trail" desc="Full action history with timestamps" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, link }: { icon: typeof FileText; label: string; value: string; color: string; link: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-700 text-slate-300',
    amber: 'bg-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/20 text-blue-400',
    teal: 'bg-teal-500/20 text-teal-400',
  };
  return (
    <Link to={link} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors block">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${colors[color]}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </Link>
  );
}

function QuickLink({ to, icon: Icon, label, desc }: { to: string; icon: typeof FileText; label: string; desc: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors group">
      <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4.5 h-4.5 text-slate-400 group-hover:text-teal-400 transition-colors" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
    </Link>
  );
}
