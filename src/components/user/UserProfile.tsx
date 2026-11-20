import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, MapPin, Calendar, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/Header';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/types';

export default function UserProfile() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOrganization(profile.organization || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  if (!profile) return null;

  const initials = (profile.full_name || profile.email)[0].toUpperCase();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), organization: organization.trim(), avatar_url: avatarUrl.trim() || null })
      .eq('id', profile.id);

    await supabase.from('audit_logs').insert({
      actor_id: profile.id,
      event_type: 'profile_edit',
      message: `Updated profile: name="${fullName.trim()}"`,
    });

    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your explorer identity and account details</p>
      </div>

      {/* Profile overview card */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-800 truncate">{profile.full_name || 'Unnamed Explorer'}</h2>
            <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
              <Mail className="w-3.5 h-3.5" /> {profile.email}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <Calendar className="w-3 h-3" /> Joined {formatDateTime(profile.created_at)}
            </div>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Account Details</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-stone-50 text-slate-400"
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed here. Contact an administrator if needed.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Organization (optional)</label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              placeholder="e.g., Rwanda Environment Management Authority"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Avatar URL (optional)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
