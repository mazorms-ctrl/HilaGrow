import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'assignee' | 'participant' | 'user';
  department: string | null;
  position: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isAssignee: boolean;
  isParticipant: boolean;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string,
    department?: string,
    position?: string
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, department, position')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Invalid / expired refresh token → clear session so the user is sent to login
        if (event === 'TOKEN_REFRESHED' && !session) {
          supabase.auth.signOut().catch(() => null);
          setUser(null);
          setProfile(null);
          return;
        }

        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);

          // Accept pending invitation stored before email confirmation
          if (event === 'SIGNED_IN') {
            const token = sessionStorage.getItem('pendingInviteToken');
            const email = sessionStorage.getItem('pendingInviteEmail');
            if (token && email) {
              sessionStorage.removeItem('pendingInviteToken');
              sessionStorage.removeItem('pendingInviteEmail');
              import('@/services/inviteService').then(({ acceptInvitation }) => {
                acceptInvitation(token, email, session.user.id).catch(console.error);
              });
            }
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUpWithEmail(
    email: string,
    password: string,
    fullName?: string,
    department?: string,
    position?: string
  ): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? '' } },
    });
    if (error) throw error;

    // Save department + position to the profile row the trigger just created
    if (data.user && (department || position)) {
      await supabase
        .from('profiles')
        .update({
          ...(department ? { department } : {}),
          ...(position   ? { position }   : {}),
        })
        .eq('id', data.user.id);
    }

    return data.user?.id ?? null;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  const isAdmin       = profile?.role === 'admin';
  const isAssignee    = profile?.role === 'assignee';
  const isParticipant = profile?.role === 'participant' || profile?.role === 'user';

  return (
    <AuthContext.Provider
      value={{ user, profile, isAdmin, isAssignee, isParticipant, loading, signInWithEmail, signUpWithEmail, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
