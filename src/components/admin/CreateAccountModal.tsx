import { useState } from 'react';
import { X, UserPlus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ROLE_CONFIG } from '@/lib/types';
import { invokeAdmin } from '@/lib/admin-api';
import type { AccessRequest, UserRole } from '@/lib/supabase';
import CredentialsPanel, { type IssuedCredentials } from '@/components/admin/CredentialsPanel';

const inputClass = 'w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-shadow';
const labelClass = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

export default function CreateAccountModal({ request, onClose, onCreated }: {
  request: AccessRequest | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState(request?.full_name ?? '');
  const [email, setEmail] = useState(request?.email ?? '');
  const [organization, setOrganization] = useState(request?.organization ?? '');
  const [role, setRole] = useState<UserRole>('manager');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await invokeAdmin<IssuedCredentials & { ok: boolean }>('admin-users', {
      action: 'create_user',
      full_name: fullName.trim(),
      email: email.trim(),
      organization: organization.trim(),
      role,
      ...(request ? { request_id: request.id } : {}),
    });
    setBusy(false);
    if (err || !data) {
      setError(err);
      return;
    }
    setIssued({ email: data.email, full_name: data.full_name, role: data.role, password: data.password });
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="create-account-title" className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            {issued ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <UserPlus className="w-5 h-5 text-teal-400" />}
            <h2 id="create-account-title" className="font-bold text-white">
              {issued ? 'Account created' : request ? 'Approve access request' : 'Create account'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {issued ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-white">{issued.full_name}</span> can now sign in as{' '}
              <span className="font-semibold text-white">{ROLE_CONFIG[issued.role].label}</span>. Send them these details:
            </p>
            <CredentialsPanel credentials={issued} />
            <button onClick={onClose} className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium text-sm transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {request?.reason && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Reason given</div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">{request.reason}</p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ca-name" className={labelClass}>Full name</label>
                <input id="ca-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={120} className={inputClass} placeholder="Jane Uwase" />
              </div>
              <div>
                <label htmlFor="ca-email" className={labelClass}>Email</label>
                <input id="ca-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} className={inputClass} placeholder="name@example.com" />
              </div>
            </div>
            <div>
              <label htmlFor="ca-org" className={labelClass}>Organization / department <span className="normal-case font-normal text-slate-500">(optional)</span></label>
              <input id="ca-org" value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={160} className={inputClass} placeholder="e.g. Park Operations" />
            </div>
            <div>
              <div className={labelClass}>Role</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {(Object.entries(ROLE_CONFIG) as [UserRole, (typeof ROLE_CONFIG)[UserRole]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    aria-pressed={role === key}
                    className={`text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                      role === key ? 'border-teal-400 bg-teal-500/10 ring-2 ring-teal-500/20' : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${role === key ? 'text-teal-300' : 'text-slate-200'}`}>{cfg.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-snug">{cfg.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              A secure temporary password is generated for them automatically. You will see it on the next screen so you can email it.
            </p>
            {error && (
              <div role="alert" className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium text-sm transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><UserPlus className="w-4 h-4" /> Create account</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
