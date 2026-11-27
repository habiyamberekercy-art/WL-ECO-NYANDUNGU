import { useState } from 'react';
import { Copy, Check, Mail, KeyRound, AlertTriangle } from 'lucide-react';
import { ROLE_CONFIG } from '@/lib/types';
import type { UserRole } from '@/lib/supabase';

export interface IssuedCredentials {
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
}

function buildEmail({ email, full_name, role, password }: IssuedCredentials) {
  const loginUrl = `${window.location.origin}/login`;
  const subject = 'Your Nyandungu Eco-Park Monitoring System account';
  const body = [
    `Hello ${full_name},`,
    '',
    `An account has been created for you on the Nyandungu Eco-Park Monitoring System with the role: ${ROLE_CONFIG[role].label}.`,
    '',
    `Sign in here: ${loginUrl}`,
    `Email: ${email}`,
    `Temporary password: ${password}`,
    '',
    'You will be asked to choose your own password the first time you sign in.',
    'Please do not share these details with anyone.',
    '',
    'Regards,',
    'Nyandungu Eco-Park Administration',
  ].join('\n');
  return { subject, body };
}

export default function CredentialsPanel({ credentials }: { credentials: IssuedCredentials }) {
  const [copied, setCopied] = useState<'password' | 'all' | null>(null);
  const { subject, body } = buildEmail(credentials);
  const mailto = `mailto:${encodeURIComponent(credentials.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copy = async (text: string, which: 'password' | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-900 rounded-xl border border-slate-700 space-y-3">
        <Field label="Email" value={credentials.email} />
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Temporary password</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-teal-300 font-mono text-sm tracking-wider select-all break-all">
              {credentials.password}
            </code>
            <button
              type="button"
              onClick={() => copy(credentials.password, 'password')}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              aria-label="Copy password"
            >
              {copied === 'password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200 leading-relaxed">
          This password is shown only once. Send it now. The person must choose their own password when they first sign in.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={mailto}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Mail className="w-4 h-4" /> Send by email
        </a>
        <button
          type="button"
          onClick={() => copy(`${subject}\n\n${body}`, 'all')}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium text-sm transition-colors"
        >
          {copied === 'all' ? <><Check className="w-4 h-4 text-emerald-400" /> Copied</> : <><KeyRound className="w-4 h-4" /> Copy message</>}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm text-slate-200 break-all">{value}</div>
    </div>
  );
}
