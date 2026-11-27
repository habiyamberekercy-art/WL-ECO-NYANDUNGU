import { useState } from 'react';
import { Inbox, Mail, Building2, Check, X, Loader2 } from 'lucide-react';
import type { AccessRequest } from '@/lib/supabase';
import { timeAgo } from '@/lib/types';
import { invokeAdmin } from '@/lib/admin-api';

export default function AccessRequestsPanel({ requests, loading, onApprove, onChanged, onError }: {
  requests: AccessRequest[];
  loading: boolean;
  onApprove: (request: AccessRequest) => void;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const decline = async (request: AccessRequest) => {
    if (!confirm(`Decline the access request from ${request.full_name}?`)) return;
    setBusyId(request.id);
    const { error } = await invokeAdmin('admin-users', { action: 'decline_request', request_id: request.id });
    setBusyId(null);
    if (error) onError(error);
    onChanged();
  };

  if (loading) return <div className="text-center py-16 text-slate-500">Loading requests...</div>;

  if (requests.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
        <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <div className="text-sm font-semibold text-slate-300">No pending requests</div>
        <p className="text-xs text-slate-500 mt-1">Requests submitted from the sign-in page will appear here for review.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {requests.map((r) => (
        <div key={r.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-100">{r.full_name}</span>
                <span className="text-xs text-slate-500">· {timeAgo(r.created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 break-all"><Mail className="w-3 h-3" /> {r.email}</span>
                {r.organization && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {r.organization}</span>}
              </div>
              {r.reason && <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap break-words">{r.reason}</p>}
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <button
                onClick={() => decline(r)}
                disabled={busyId === r.id}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-red-500/50 hover:text-red-300 hover:bg-red-500/10 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Decline
              </button>
              <button
                onClick={() => onApprove(r)}
                disabled={busyId === r.id}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
