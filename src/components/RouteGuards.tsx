import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert } from 'lucide-react';

/** Redirect unauthenticated users to the public site, non-admins to an Access Denied page. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  const [showDenied, setShowDenied] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
        setShowDenied(true);
      } else {
        setShowDenied(false);
      }
    }
  }, [profile, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">W</span>
        </div>
      </div>
    );
  }

  if (showDenied) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

/** Redirect logged-in users to their portal, allow guests through to public pages. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">W</span>
        </div>
      </div>
    );
  }

  if (profile) {
    const dest = (profile.role === 'admin' || profile.role === 'manager') ? '/admin-dashboard' : '/user-portal';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}

/** Require any authenticated user; redirect guests to the public site. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-lg">W</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm mb-6">
            You do not have permission to access the Admin Dashboard. This area is restricted to authorized administrators only.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Return to Main Website
          </a>
        </div>
      </div>
    </div>
  );
}
