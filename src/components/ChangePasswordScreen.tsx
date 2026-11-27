import { useState } from 'react';
import { KeyRound, Loader2, AlertCircle, LogOut, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm text-slate-900';

export default function ChangePasswordScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rules = [
    { ok: password.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), label: 'Letters and numbers' },
    { ok: password.length > 0 && password === confirm, label: 'Both entries match' },
  ];
  const valid = rules.every((r) => r.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error: updError } = await supabase.auth.updateUser({ password });
    if (updError) {
      setError(/different from the old/i.test(updError.message)
        ? 'Please choose a password different from the temporary one.'
        : 'We could not save your new password. Please try again.');
      setBusy(false);
      return;
    }
    const { error: rpcError } = await supabase.rpc('complete_password_change');
    if (rpcError) {
      setError('Your password was saved, but we could not finish setup. Please try again.');
      setBusy(false);
      return;
    }
    await refreshProfile();
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 px-6 pt-6 pb-8">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center mb-4">
            <KeyRound className="w-5 h-5 text-teal-300" />
          </div>
          <h2 className="text-xl font-bold text-white">Set your own password</h2>
          <p className="text-slate-300 text-sm mt-1 leading-relaxed">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}. You signed in with a temporary password from the administrator. Choose a new one to continue.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="new-pw" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">New password</label>
            <input id="new-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Confirm password</label>
            <input id="confirm-pw" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
          <ul className="space-y-1.5">
            {rules.map((r) => (
              <li key={r.label} className={`flex items-center gap-2 text-xs transition-colors ${r.ok ? 'text-emerald-700' : 'text-slate-500'}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${r.ok ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {r.ok && <Check className="w-3 h-3" />}
                </span>
                {r.label}
              </li>
            ))}
          </ul>
          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-700 font-medium">{error}</span>
            </div>
          )}
          <button type="submit" disabled={!valid || busy} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save password and continue'}
          </button>
          <button type="button" onClick={() => signOut()} className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
