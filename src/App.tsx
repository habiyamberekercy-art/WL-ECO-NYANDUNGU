import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { AppProvider } from '@/lib/app-context';
import { DataProvider, useData } from '@/lib/data-context';
import { WifiOff, RotateCw } from 'lucide-react';

// Public
import PublicSite from '@/components/PublicSite';
import LoginPage from '@/components/LoginPage';

// Route guards
import { AdminGuard, PublicOnly, AuthGuard } from '@/components/RouteGuards';

// Admin layout + pages
import AdminLayout from '@/components/AdminLayout';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminReports from '@/components/admin/AdminReports';
import AdminAudit from '@/components/admin/AdminAudit';
import AdminAnalytics from '@/components/admin/AdminAnalytics';
import AdminMap from '@/components/admin/AdminMap';
import AdminTelemetry from '@/components/admin/AdminTelemetry';
import AdminSettings from '@/components/admin/AdminSettings';

// User layout + pages
import UserLayout from '@/components/UserLayout';
import UserExplore from '@/components/user/UserExplore';
import UserFavorites from '@/components/user/UserFavorites';
import UserProfile from '@/components/user/UserProfile';
import UserSettings from '@/components/user/UserSettings';

/**
 * After login, redirect admins to /admin-dashboard and everyone else to /user-portal.
 * Only fires when a user lands on "/" while authenticated.
 */
function RoleRedirect() {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!profile) return <PublicSite />;
  const dest = (profile.role === 'admin' || profile.role === 'manager') ? '/admin-dashboard' : '/user-portal';
  return <Navigate to={dest} replace state={{ from: location }} />;
}

function ConnectionBanner() {
  const { error, reload } = useData();
  if (!error) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-md bg-white border border-rose-200 shadow-xl rounded-xl p-4 flex items-start gap-3">
      <WifiOff className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-semibold text-slate-900">Connection problem</div>
        <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
      </div>
      <button onClick={() => reload()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors">
        <RotateCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public site — guests see the public portal, logged-in users get redirected */}
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />

      {/* Admin dashboard — guarded: admin role only */}
      <Route path="/admin-dashboard" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="map" element={<AdminMap />} />
        <Route path="telemetry" element={<AdminTelemetry />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* User portal — any authenticated user */}
      <Route path="/user-portal" element={<AuthGuard><UserLayout /></AuthGuard>}>
        <Route index element={<UserExplore />} />
        <Route path="favorites" element={<UserFavorites />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="settings" element={<UserSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <DataProvider>
          <BrowserRouter>
            <AppRoutes />
            <ConnectionBanner />
          </BrowserRouter>
        </DataProvider>
      </AppProvider>
    </AuthProvider>
  );
}
