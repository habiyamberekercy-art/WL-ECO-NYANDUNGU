import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, LogIn, Send, Loader2, AlertCircle, Compass, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm text-slate-900 transition-shadow';
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

export default function LoginPage() {
  const { signIn, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      navigate((profile.role === 'admin' || profile.role === 'manager') ? '/admin-dashboard' : '/user-portal', { replace: true });
    }
  }, [profile, loading, navigate]);

  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [requestSent, setRequestSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: 'login' | 'request') => {
    setMode(next);
    setError(null);
    setRequestSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(/invalid login credentials/i.test(err) ? 'Incorrect email or password.' : err);
      setBusy(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.from('access_requests').insert({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      organization: organization.trim(),
      reason: reason.trim(),
    });
    setBusy(false);
    if (err) {
      setError('We could not send your request. Please check your details and try again.');
      return;
    }
    setRequestSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(16,185,129,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(13,148,136,0.3) 0%, transparent 50%)',
      }} />
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 px-6 pt-6 pb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-lg">WL-ECO</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Sign in to your account' : 'Request access'}
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              {mode === 'login'
                ? 'Nyandungu Eco-Park Monitoring System'
                : 'Accounts are created by the park administrator after review.'}
            </p>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="login-email" className={labelClass}>Email</label>
                <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="login-password" className={labelClass}>Password</label>
                <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="Your password" />
              </div>
              {error && <ErrorNote message={error} />}
              <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</> : <><LogIn className="w-4 h-4" /> Sign In</>}
              </button>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  New staff and partners receive their sign-in details by email from the administrator.
                </p>
              </div>
              <div className="text-center">
                <button type="button" onClick={() => switchMode('request')} className="text-xs text-slate-500 hover:text-teal-600 transition-colors font-medium">
                  Don't have an account? Request access
                </button>
              </div>
            </form>
          )}

          {mode === 'request' && requestSent && (
            <div className="px-6 py-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Request received</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                The administrator will review your request. If approved, you will receive your sign-in details at <span className="font-medium text-slate-900">{email}</span>.
              </p>
              <button type="button" onClick={() => switchMode('login')} className="mt-2 text-sm text-teal-700 hover:text-teal-600 font-semibold transition-colors">
                Back to sign in
              </button>
            </div>
          )}

          {mode === 'request' && !requestSent && (
            <form onSubmit={handleRequest} className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="req-name" className={labelClass}>Full name</label>
                <input id="req-name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={120} className={inputClass} placeholder="Jane Uwase" />
              </div>
              <div>
                <label htmlFor="req-email" className={labelClass}>Work email</label>
                <input id="req-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} className={inputClass} placeholder="you@example.com" />
              </div>
              <div>
                <label htmlFor="req-org" className={labelClass}>Organization <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <input id="req-org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={160} className={inputClass} placeholder="e.g. REMA, City of Kigali, University" />
              </div>
              <div>
                <label htmlFor="req-reason" className={labelClass}>Why do you need access?</label>
                <textarea id="req-reason" value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={1000} rows={3} className={`${inputClass} resize-none`} placeholder="Your role and what you will use the system for" />
              </div>
              {error && <ErrorNote message={error} />}
              <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Request</>}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => switchMode('login')} className="text-xs text-slate-500 hover:text-teal-600 transition-colors font-medium">
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors">
            <Compass className="w-4 h-4" /> Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <span className="text-xs text-red-700 font-medium">{message}</span>
    </div>
  );
}
