import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Persona, Language } from './supabase';
import { translations, type TranslationKey } from './i18n';

// Map database roles to app personas
const roleToPersona: Record<string, Persona> = {
  admin: 'admin',
  manager: 'officer',
  public: 'citizen',
};

const personaToRole: Record<Persona, string> = {
  citizen: 'public',
  officer: 'manager',
  admin: 'admin',
};

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: 'not implemented' }),
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile((data as Profile) || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => mounted && setLoading(false));

    supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        setLoading(true);
        (async () => {
          await fetchProfile(s.user.id);
          if (mounted) setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const banned = (error as { code?: string }).code === 'user_banned' || /banned/i.test(error.message);
      return { error: banned ? 'Your account has been suspended. Please contact the park administrator.' : error.message };
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetchProfile(user.id);
    }
    setLoading(false);
    return { error: null };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await fetchProfile(user.id);
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Helper to determine which persona a logged-in user should have
export function getPersonaFromProfile(profile: Profile | null): Persona {
  if (!profile) return 'citizen';
  return roleToPersona[profile.role] || 'citizen';
}

// Helper to get the role needed for a persona
export function getRoleForPersona(persona: Persona): string {
  return personaToRole[persona] || 'public';
}
