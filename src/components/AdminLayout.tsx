import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Users, ScrollText, FileText, Settings,
  ChevronLeft, LogOut, Droplets, Activity, Map as MapIcon, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navItems = [
  { to: '/admin-dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin-dashboard/users', label: 'User Directory', icon: Users },
  { to: '/admin-dashboard/reports', label: 'Intake Inbox', icon: FileText },
  { to: '/admin-dashboard/audit', label: 'Audit Trail', icon: ScrollText },
  { to: '/admin-dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin-dashboard/map', label: 'Park Map', icon: MapIcon },
  { to: '/admin-dashboard/telemetry', label: 'Telemetry', icon: Activity },
  { to: '/admin-dashboard/settings', label: 'System Settings', icon: Settings },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-screen bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-200 z-40 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-4.5 h-4.5 text-teal-400" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-white leading-none">WL<span className="text-teal-400">-ECO</span></div>
              <div className="text-[9px] text-slate-500 leading-none mt-0.5 uppercase tracking-wider">Command Center</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-slate-800 p-2 flex-shrink-0 space-y-1">
          <div className={`flex items-center gap-2.5 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-teal-400" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{profile?.full_name || 'Admin'}</div>
                <div className="text-[10px] text-slate-500 truncate">{profile?.email}</div>
              </div>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <ChevronLeft className={`w-4.5 h-4.5 flex-shrink-0 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-200 ${collapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="min-h-screen bg-slate-900">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
