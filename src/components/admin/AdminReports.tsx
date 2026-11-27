import { useState, useEffect, useRef } from 'react';
import { FileText, Search, Trash2, X, Eye, AlertTriangle, Clock, Activity as ActivityIcon, Terminal, Database, Shield } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { supabase, type IncidentReport, type ParkZone, type ActivityLog, type ReportStatus } from '@/lib/supabase';
import { REPORT_TYPE_CONFIG, REPORT_STATUS_CONFIG, SEVERITY_CONFIG, timeAgo, formatDateTime } from '@/lib/types';
import { invokeAdmin } from '@/lib/admin-api';

export default function AdminReports() {
  const { reports, zones, reload } = useData();
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<IncidentReport | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setLogs(data as ActivityLog[]);
  };

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = 0;
  }, [logs]);

  const filtered = reports.filter((r) => {
    const matchesSearch = r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.reporter_name.toLowerCase().includes(search.toLowerCase()) ||
      r.location_description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || r.report_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const runReportAction = async (body: Record<string, string>) => {
    setActionError(null);
    const { error } = await invokeAdmin('report-admin', body);
    if (error) {
      setActionError(error);
      return false;
    }
    return true;
  };

  const handleUpdateStatus = async (reportId: string, status: ReportStatus) => {
    const ok = await runReportAction({ action: 'update_status', report_id: reportId, status });
    if (!ok) return;
    await supabase.from('activity_logs').insert({ event_type: 'admin', message: `Report ${reportId.slice(0, 8)} status → ${status}` });
    reload();
    loadLogs();
    if (selectedReport?.id === reportId) setSelectedReport({ ...selectedReport, status });
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Remove this report? It will be hidden from public view and any linked alerts will be resolved.')) return;
    const ok = await runReportAction({ action: 'delete', report_id: reportId });
    if (!ok) return;
    await supabase.from('activity_logs').insert({ event_type: 'admin', message: `Report ${reportId.slice(0, 8)} removed` });
    reload();
    loadLogs();
    setSelectedReport(null);
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;
  const highSeverityCount = reports.filter((r) => r.severity === 'high' && r.status !== 'resolved' && r.status !== 'dismissed').length;

  const eventIcons: Record<string, typeof Database> = {
    system: Database,
    sensor: ActivityIcon,
    gis: Terminal,
    analytics: FileText,
    admin: Shield,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Intake Inbox</h1>
        <p className="text-slate-400 text-sm mt-1">All incoming reports, submissions, and contact forms from users</p>
      </div>

      {actionError && (
        <div role="alert" className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-200">{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-auto text-red-300 hover:text-red-100 transition-colors" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {highSeverityCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-semibold text-red-300 text-sm">{highSeverityCount} high-severity report{highSeverityCount > 1 ? 's' : ''} awaiting action</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Total Reports" value={reports.length.toString()} color="slate" />
        <StatCard icon={Clock} label="Pending" value={pendingCount.toString()} color="amber" />
        <StatCard icon={AlertTriangle} label="High Severity" value={highSeverityCount.toString()} color="red" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Reports */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
                />
              </div>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40">
                <option value="all">All Types</option>
                {Object.entries(REPORT_TYPE_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40">
                <option value="all">All Statuses</option>
                {Object.entries(REPORT_STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Report</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Severity</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((report) => {
                  const typeCfg = REPORT_TYPE_CONFIG[report.report_type];
                  const sevCfg = SEVERITY_CONFIG[report.severity];
                  const statusCfg = REPORT_STATUS_CONFIG[report.status];
                  return (
                    <tr key={report.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200 truncate max-w-[180px]">{report.reporter_name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[180px]">{report.description}</div>
                      </td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeCfg.color}`}>{typeCfg.label}</span></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${sevCfg.color}`}>{sevCfg.label}</span></td>
                      <td className="px-4 py-3">
                        <select value={report.status} onChange={(e) => handleUpdateStatus(report.id, e.target.value as ReportStatus)} className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${statusCfg.color}`}>
                          {Object.entries(REPORT_STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedReport(report)} className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(report.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="p-12 text-center text-slate-500">No reports found.</div>}
          </div>
        </div>

        {/* Activity terminal */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-200">Live Activity</h2>
            </div>
            <button onClick={() => setTerminalExpanded(!terminalExpanded)} className="text-xs text-slate-500 hover:text-slate-300">{terminalExpanded ? 'Collapse' : 'Expand'}</button>
          </div>
          <div ref={terminalRef} className={`bg-slate-950 font-mono text-xs overflow-y-auto transition-all ${terminalExpanded ? 'h-[500px]' : 'h-[60px]'}`}>
            <div className="p-3 space-y-1.5">
              {logs.map((log) => {
                const Icon = eventIcons[log.event_type] || Database;
                const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false });
                return (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <span className="text-emerald-500 flex-shrink-0">{time}</span>
                    <Icon className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-500" />
                    <span className="text-slate-400 break-all">{log.message}</span>
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-800"><span className="text-emerald-500">$</span><span className="text-slate-600 ml-2 animate-pulse">_</span></div>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDrawer
          report={selectedReport}
          zone={zones.find((z) => z.id === selectedReport.location_zone_id) || null}
          onClose={() => setSelectedReport(null)}
          onUpdateStatus={handleUpdateStatus}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof FileText; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-700 text-slate-300',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${colors[color]}`}><Icon className="w-4.5 h-4.5" /></div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function ReportDrawer({ report, zone, onClose, onUpdateStatus, onDelete }: {
  report: IncidentReport; zone: ParkZone | null; onClose: () => void;
  onUpdateStatus: (id: string, status: ReportStatus) => void; onDelete: (id: string) => void;
}) {
  const typeCfg = REPORT_TYPE_CONFIG[report.report_type];
  const sevCfg = SEVERITY_CONFIG[report.severity];
  const statusCfg = REPORT_STATUS_CONFIG[report.status];

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-teal-400" /><h2 className="font-bold text-white">Report Details</h2></div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${typeCfg.color}`}>{typeCfg.label}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${sevCfg.color}`}>Severity: {sevCfg.label}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.color}`}>{statusCfg.label}</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Description</div>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-xl">{report.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900 rounded-xl"><div className="text-xs text-slate-500 mb-0.5">Reporter</div><div className="text-sm font-semibold text-slate-200">{report.reporter_name}</div><div className="text-xs text-slate-400">{report.reporter_email}</div></div>
            <div className="p-3 bg-slate-900 rounded-xl"><div className="text-xs text-slate-500 mb-0.5">Submitted</div><div className="text-sm font-semibold text-slate-200">{timeAgo(report.created_at)}</div><div className="text-xs text-slate-400">{formatDateTime(report.created_at)}</div></div>
            {zone && <div className="p-3 bg-slate-900 rounded-xl col-span-2"><div className="text-xs text-slate-500 mb-0.5">Related Zone</div><div className="text-sm font-semibold text-slate-200">{zone.name}</div></div>}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Workflow Status</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(REPORT_STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => onUpdateStatus(report.id, key as ReportStatus)} className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${report.status === key ? `border-current ${cfg.color} ring-2` : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>{cfg.label}</button>
              ))}
            </div>
          </div>
          <button onClick={() => onDelete(report.id)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium text-sm transition-colors border border-red-500/30"><Trash2 className="w-4 h-4" /> Delete Report</button>
        </div>
      </div>
    </div>
  );
}
