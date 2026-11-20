import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle2, ToggleLeft, ToggleRight, AlertTriangle, MessageSquare, Tag, Sliders } from 'lucide-react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth-context';
import { supabase, type SystemSetting } from '@/lib/supabase';

export default function AdminSettings() {
  const { settings, reload } = useData();
  const { profile } = useAuth();
  const [localSettings, setLocalSettings] = useState<SystemSetting[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateSetting = async (id: string, name: string, newValue: boolean | string | string[]) => {
    setBusy(id);
    setSaved(false);
    await supabase
      .from('system_settings')
      .update({ value: newValue, updated_by: profile?.id || null })
      .eq('id', id);

    await supabase.from('audit_logs').insert({
      actor_id: profile?.id || null,
      event_type: 'settings_change',
      message: `Setting "${name}" updated to: ${Array.isArray(newValue) ? newValue.join(', ') : newValue}`,
      metadata: { setting: name, new_value: newValue },
    });

    setLocalSettings((prev) => prev.map((s) => s.id === id ? { ...s, value: newValue } : s));
    setBusy(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    reload();
  };

  const getSetting = (name: string) => localSettings.find((s) => s.name === name);

  const maintenanceMode = getSetting('maintenance_mode');
  const allowSubmissions = getSetting('allow_submissions');
  const featureAdminPortal = getSetting('feature_admin_portal');
  const featureUserPortal = getSetting('feature_user_portal');
  const welcomeMessage = getSetting('welcome_message');
  const submissionCategories = getSetting('submission_categories');

  const allCategories = ['birds', 'fish', 'reptiles', 'mammals', 'insects', 'plants', 'amphibians'];
  const activeCategories = (submissionCategories?.value as string[]) || [];

  const toggleCategory = (cat: string) => {
    if (!submissionCategories) return;
    const current = (submissionCategories.value as string[]) || [];
    const newVal = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    updateSetting(submissionCategories.id, 'submission_categories', newVal);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Platform-wide controls — admin exclusive</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" /> Settings saved
          </div>
        )}
      </div>

      {/* Maintenance Mode */}
      {maintenanceMode && (
        <SettingsCard
          icon={AlertTriangle}
          title="Maintenance Mode"
          description="When enabled, the user portal shows a maintenance notice and blocks new submissions."
          accent="amber"
        >
          <ToggleRow
            label="Enable maintenance mode"
            value={maintenanceMode.value as boolean}
            busy={busy === maintenanceMode.id}
            onChange={(v) => updateSetting(maintenanceMode.id, 'maintenance_mode', v)}
          />
        </SettingsCard>
      )}

      {/* Submission rules */}
      {allowSubmissions && (
        <SettingsCard
          icon={Sliders}
          title="Creature Submission Rules"
          description="Control whether users can submit new favorites and incident reports."
          accent="teal"
        >
          <ToggleRow
            label="Allow user submissions"
            value={allowSubmissions.value as boolean}
            busy={busy === allowSubmissions.id}
            onChange={(v) => updateSetting(allowSubmissions.id, 'allow_submissions', v)}
          />
        </SettingsCard>
      )}

      {/* Categories */}
      {submissionCategories && (
        <SettingsCard
          icon={Tag}
          title="Submission Categories"
          description="Select which species categories users can choose from when adding favorites."
          accent="blue"
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allCategories.map((cat) => {
              const active = activeCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  disabled={busy === submissionCategories.id}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border capitalize transition-all ${
                    active
                      ? 'border-teal-400 bg-teal-500/10 text-teal-400'
                      : 'border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </SettingsCard>
      )}

      {/* Welcome message */}
      {welcomeMessage && (
        <SettingsCard
          icon={MessageSquare}
          title="User Portal Welcome Message"
          description="The header message shown to logged-in users on the User Portal."
          accent="slate"
        >
          <WelcomeEditor
            setting={welcomeMessage}
            busy={busy === welcomeMessage.id}
            onSave={(v) => updateSetting(welcomeMessage.id, 'welcome_message', v)}
          />
        </SettingsCard>
      )}

      {/* Feature toggles */}
      <SettingsCard
        icon={ToggleLeft}
        title="Feature Visibility"
        description="Toggle entire portal sections on or off platform-wide."
        accent="slate"
      >
        {featureAdminPortal && (
          <ToggleRow
            label="Admin Portal visible"
            value={featureAdminPortal.value as boolean}
            busy={busy === featureAdminPortal.id}
            onChange={(v) => updateSetting(featureAdminPortal.id, 'feature_admin_portal', v)}
          />
        )}
        {featureUserPortal && (
          <ToggleRow
            label="User Portal visible"
            value={featureUserPortal.value as boolean}
            busy={busy === featureUserPortal.id}
            onChange={(v) => updateSetting(featureUserPortal.id, 'feature_user_portal', v)}
          />
        )}
      </SettingsCard>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, description, accent, children }: {
  icon: typeof SettingsIcon;
  title: string;
  description: string;
  accent: string;
  children: React.ReactNode;
}) {
  const accents: Record<string, string> = {
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    slate: 'bg-slate-700 text-slate-300 border-slate-600',
  };
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${accents[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-200">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, busy, onChange }: {
  label: string;
  value: boolean;
  busy: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        onClick={() => onChange(!value)}
        disabled={busy}
        className="flex items-center gap-2 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        ) : value ? (
          <ToggleRight className="w-8 h-8 text-teal-400" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-slate-600" />
        )}
        <span className={`text-xs font-medium ${value ? 'text-teal-400' : 'text-slate-500'}`}>
          {value ? 'ON' : 'OFF'}
        </span>
      </button>
    </div>
  );
}

function WelcomeEditor({ setting, busy, onSave }: {
  setting: SystemSetting;
  busy: boolean;
  onSave: (v: string) => void;
}) {
  const [text, setText] = useState(setting.value as string);

  useEffect(() => {
    setText(setting.value as string);
  }, [setting.value]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
      />
      <button
        onClick={() => onSave(text)}
        disabled={busy || text === (setting.value as string)}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Message
      </button>
    </div>
  );
}
