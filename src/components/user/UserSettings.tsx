import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle2, Bell, Globe } from 'lucide-react';
import { Card } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { useApp } from '@/lib/app-context';
import { supabase } from '@/lib/supabase';
import { LANGUAGES } from '@/lib/types';
import type { Language } from '@/lib/supabase';

export default function UserSettings() {
  const { profile } = useAuth();
  const { language, setLanguage } = useApp();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Customize your explorer experience</p>
      </div>

      {/* Language */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Language Preference</h3>
            <p className="text-xs text-slate-400">Choose your preferred display language</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as Language)}
              className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                language === lang.code
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 text-slate-600 hover:border-stone-300'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Account info */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Account Information</h3>
            <p className="text-xs text-slate-400">Your registered details</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <span className="text-sm text-slate-500">Email</span>
            <span className="text-sm font-medium text-slate-800">{profile.email}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <span className="text-sm text-slate-500">Role</span>
            <span className="text-sm font-medium text-slate-800 capitalize">{profile.role}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
            <span className="text-sm text-slate-500">Status</span>
            <span className={`text-sm font-medium ${profile.suspended ? 'text-red-600' : 'text-emerald-600'}`}>
              {profile.suspended ? 'Suspended' : 'Active'}
            </span>
          </div>
        </div>
      </Card>

      {/* Link to profile edit */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-800 mb-2">Edit Your Details</h3>
        <p className="text-sm text-slate-500 mb-3">Update your name, organization, or avatar.</p>
        <a
          href="/user-portal/profile"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors"
        >
          <SettingsIcon className="w-4 h-4" /> Edit Profile
        </a>
      </Card>
    </div>
  );
}
