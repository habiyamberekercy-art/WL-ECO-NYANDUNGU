import { useState, useEffect } from 'react';
import { ScrollText, Search, Users, FileText, Database, Shield } from 'lucide-react';
import { supabase, type AuditLog } from '@/lib/supabase';
import { formatDateTime } from '@/lib/types';

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  };

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return l.message.toLowerCase().includes(q) || l.event_type.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time log of all administrative and user actions across the platform</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by message or event type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading audit trail...</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="bg-slate-900/50 border-b border-slate-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-200">All Audit Entries</h2>
              <span className="text-xs text-slate-500 ml-1">({filtered.length})</span>
            </div>
          </div>
          <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
            {filtered.map((log) => (
              <div key={log.id} className="px-4 py-3 hover:bg-slate-700/20 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {log.event_type.startsWith('user') ? <Users className="w-4 h-4 text-slate-400" /> :
                     log.event_type.startsWith('report') ? <FileText className="w-4 h-4 text-slate-400" /> :
                     log.event_type.startsWith('settings') ? <Shield className="w-4 h-4 text-slate-400" /> :
                     <Database className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-300">{log.event_type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-slate-500">· {formatDateTime(log.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-400 break-words">{log.message}</p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                            {k}: {String(v).slice(0, 40)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-500">No audit entries found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
