import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplets, LogIn, UserPlus, Loader2, AlertCircle, Compass } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { signIn, signUp, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile) {
      navigate((profile.role === 'admin' || profile.role === 'manager') ? '/admin-dashboard' : '/user-portal', { replace: true });
    }
  }, [profile, loading, navigate]);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === 'login') {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
        setBusy(false);
      }
      // On success, the useEffect above watches profile changes and navigates automatically.
    } else {
      const { error: err } = await signUp(email, password, fullName, 'public');
      if (err) {
        setError(err);
        setBusy(false);
      }
      // On success, the useEffect above watches profile changes and navigates automatically.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(16,185,129,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(13,148,136,0.3) 0%, transparent 50%)',
      }} />
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 via-teal-900 to-emerald-900 px-6 pt-6 pb-8">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                <Droplets className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-white font-bold text-lg">WL-ECO</span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Sign in to your account' : 'Create your explorer account'}
            </h2>
            <p className="text-slate-300 text-sm mt-1">Nyandungu Eco-Park Monitoring System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm text-slate-900" placeholder="Jane Doe" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm text-slate-900" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm text-slate-900" placeholder="At least 6 characters" />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-red-700 font-medium">{error}</span>
              </div>
            )}
            <button type="submit" disabled={busy} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Please wait...</> : mode === 'login' ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
            <div className="text-center pt-1">
              <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }} className="text-xs text-slate-500 hover:text-teal-600 transition-colors font-medium">
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>

        {/* Back to public site */}
        <div className="text-center mt-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors">
            <Compass className="w-4 h-4" /> Continue as Guest
          </Link>
        </div>
      </div>
    </div>
  );
}
