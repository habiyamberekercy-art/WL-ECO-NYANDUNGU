import { supabase } from './supabase';

type AdminFunction = 'admin-users' | 'report-admin';

export async function invokeAdmin<T = Record<string, unknown>>(
  fn: AdminFunction,
  body: Record<string, string>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error || !data?.ok) {
    let message = 'The action could not be completed. Please try again.';
    const ctx = (error as { context?: Response } | null)?.context;
    if (ctx && typeof ctx.json === 'function') {
      const payload = await ctx.json().catch(() => null);
      if (typeof payload?.error === 'string') message = payload.error;
    }
    return { data: null, error: message };
  }
  return { data: data as T, error: null };
}
