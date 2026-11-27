import { useState, useEffect } from 'react';
import { Search, X, AlertTriangle, Ban, CheckCircle2, UserCog, Mail, Loader2, UserPlus, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Profile, type UserRole, type AccessRequest } from '@/lib/supabase';
import { timeAgo, ROLE_CONFIG } from '@/lib/types';
import { invokeAdmin } from '@/lib/admin-api';
import CreateAccountModal from '@/components/admin/CreateAccountModal';
import AccessRequestsPanel from '@/components/admin/AccessRequestsPanel';
import CredentialsPanel, { type IssuedCredentials } from '@/components/admin/CredentialsPanel';

export default function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'accounts' | 'requests'>('accounts');
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [createFor, setCreateFor] = useState<AccessRequest | 'new' | null>(null);

  useEffect(() => {
    loadUsers();
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setRequestsLoading(true);
    const { data, error: reqError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (reqError) setError('Unable to load access requests.');
    else setRequests((data as AccessRequest[]) || []);
    setRequestsLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      setError('Unable to load user directory.');
    } else {
      setUsers(data as Profile[]);
    }
    setLoading(false);
  };

  const handleUpdate = async (userId: string, newRole: UserRole, newSuspended: boolean) => {
    setBusy(userId);
    setError(null);
    const { error: rpcError } = await supabase.rpc('admin_update_profile', {
      target_id: userId,
      new_role: newRole,
      new_suspended: newSuspended,
    });
    if (rpcError) {
      setError('Could not update this user. You may lack permission.');
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole, suspended: newSuspended } : u));
      if (editingUser?.id === userId) setEditingUser({ ...editingUser, role: newRole, suspended: newSuspended });
      await supabase.from('audit_logs').insert({
        actor_id: profile?.id || null,
        event_type: 'user_management',
        message: `Updated user ${userId.slice(0, 8)}: role=${newRole}, suspended=${newSuspended}`,
      });
    }
    setBusy(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Directory</h1>
          <p className="text-slate-400 text-sm mt-1">Create staff accounts, review access requests, change roles or suspend access</p>
        </div>
        <button
          onClick={() => setCreateFor('new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-teal-900/30"
        >
          <UserPlus className="w-4 h-4" /> Create account
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300 font-medium">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700 rounded-xl w-fit" role="tablist">
        {([
          { id: 'accounts', label: 'Accounts', count: users.length },
          { id: 'requests', label: 'Access requests', count: requests.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
              t.id === 'requests' && t.count > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-900/60 text-slate-400'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'requests' && (
        <AccessRequestsPanel
          requests={requests}
          loading={requestsLoading}
          onApprove={(r) => setCreateFor(r)}
          onChanged={loadRequests}
          onError={setError}
        />
      )}

      {tab === 'accounts' && (<>
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading users...</div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Joined</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-400 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((user) => {
                const roleCfg = ROLE_CONFIG[user.role];
                const isSelf = user.id === profile?.id;
                return (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-200 flex items-center gap-2">
                        {user.full_name || 'Unnamed'}
                        {isSelf && <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded">YOU</span>}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleCfg.color}`}>
                        {roleCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.suspended ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                          <Ban className="w-3.5 h-3.5" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(user.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setEditingUser(user)}
                          disabled={isSelf || busy === user.id}
                          className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isSelf ? 'Cannot edit your own account' : 'Edit user'}
                        >
                          {busy === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-500">No users found.</div>
          )}
        </div>
      )}
      </>)}

      {createFor && (
        <CreateAccountModal
          request={createFor === 'new' ? null : createFor}
          onClose={() => setCreateFor(null)}
          onCreated={() => {
            loadUsers();
            loadRequests();
          }}
        />
      )}

      {/* Edit drawer */}
      {editingUser && (
        <UserEditDrawer
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={handleUpdate}
          busy={busy === editingUser.id}
        />
      )}
    </div>
  );
}

function UserEditDrawer({ user, onClose, onUpdate, busy }: {
  user: Profile;
  onClose: () => void;
  onUpdate: (userId: string, role: UserRole, suspended: boolean) => void;
  busy: boolean;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [suspended, setSuspended] = useState(user.suspended);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedCredentials | null>(null);
  const roleCfg = ROLE_CONFIG[user.role];

  const resetPassword = async () => {
    if (!confirm(`Issue a new temporary password for ${user.email}? Their current password will stop working.`)) return;
    setResetBusy(true);
    setResetError(null);
    const { data, error } = await invokeAdmin<IssuedCredentials & { ok: boolean }>('admin-users', { action: 'reset_password', user_id: user.id });
    setResetBusy(false);
    if (error || !data) {
      setResetError(error);
      return;
    }
    setIssued({ email: data.email, full_name: data.full_name, role: data.role, password: data.password });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-white">Edit User</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-lg">
              {(user.full_name || user.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-white truncate">{user.full_name || 'Unnamed'}</div>
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${roleCfg.color}`}>
                {roleCfg.label}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Role Assignment</div>
            <div className="space-y-2">
              {(Object.entries(ROLE_CONFIG) as [UserRole, { label: string; color: string }][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setRole(key)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                    role === key
                      ? `border-teal-400 ${cfg.color} ring-2 ring-teal-500/20`
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span>{cfg.label}</span>
                  {role === key && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Account Status</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSuspended(false)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  !suspended
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Active
              </button>
              <button
                onClick={() => setSuspended(true)}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                  suspended
                    ? 'border-red-400 bg-red-500/10 text-red-400 ring-2 ring-red-500/20'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Ban className="w-4 h-4" /> Suspend
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sign-in credentials</div>
            {issued ? (
              <CredentialsPanel credentials={issued} />
            ) : (
              <>
                <button
                  onClick={resetPassword}
                  disabled={resetBusy}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-slate-700 text-slate-300 hover:border-teal-500/50 hover:text-teal-300 hover:bg-teal-500/5 transition-colors disabled:opacity-50"
                >
                  {resetBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Issue new temporary password
                </button>
                {resetError && <p role="alert" className="text-xs text-red-300 mt-2">{resetError}</p>}
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onUpdate(user.id, role, suspended)}
              disabled={busy || (role === user.role && suspended === user.suspended)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-medium text-sm transition-colors"
            >
              {busy ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
