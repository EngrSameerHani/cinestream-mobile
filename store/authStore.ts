// ============================================================
// Auth Store — Zustand
// Works with Supabase auth directly.
// When EXPO_PUBLIC_USE_MOCK=true, also allows demo login.
// ============================================================

import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { User } from '../types';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

// Demo user for mock mode
const MOCK_USER: User = {
  id:         'mock-user-id',
  email:      'demo@cinestream.com',
  full_name:  'Demo User',
  avatar_url: null,
  role:       'admin',   // admin so all screens are accessible in demo
  created_at: new Date().toISOString(),
};

interface AuthState {
  user:          User | null;
  session:       any | null;
  isLoading:     boolean;
  isInitialised: boolean;

  initialise:  () => Promise<void>;
  signIn:      (email: string, password: string) => Promise<void>;
  signUp:      (email: string, password: string, fullName: string) => Promise<void>;
  signOut:     () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser:  (data: Partial<Pick<User, 'full_name' | 'avatar_url'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:          null,
  session:       null,
  isLoading:     false,
  isInitialised: false,

  // ── Initialise ──────────────────────────────────────────────
  initialise: async () => {
    set({ isLoading: true });

    if (USE_MOCK) {
      // In mock mode skip Supabase entirely — auto-login as demo user
      set({
        user:          MOCK_USER,
        session:       { access_token: 'mock-token', user: MOCK_USER },
        isInitialised: true,
        isLoading:     false,
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Build user from Supabase session directly (no backend call needed)
        const supabaseUser = session.user;
        const user: User = {
          id:         supabaseUser.id,
          email:      supabaseUser.email ?? '',
          full_name:  supabaseUser.user_metadata?.full_name ?? null,
          avatar_url: supabaseUser.user_metadata?.avatar_url ?? null,
          role:       'user',
          created_at: supabaseUser.created_at ?? new Date().toISOString(),
        };

        // Try to get role from profiles table (optional — won't block if fails)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name, avatar_url')
            .eq('id', supabaseUser.id)
            .single();

          if (profile) {
            user.role       = profile.role ?? 'user';
            user.full_name  = profile.full_name ?? user.full_name;
            user.avatar_url = profile.avatar_url ?? user.avatar_url;
          }
        } catch {
          // ignore — use defaults from session
        }

        set({ session, user, isInitialised: true, isLoading: false });
      } else {
        set({ session: null, user: null, isInitialised: true, isLoading: false });
      }
    } catch {
      set({ session: null, user: null, isInitialised: true, isLoading: false });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const supabaseUser = session.user;
        const user: User = {
          id:         supabaseUser.id,
          email:      supabaseUser.email ?? '',
          full_name:  supabaseUser.user_metadata?.full_name ?? null,
          avatar_url: null,
          role:       'user',
          created_at: supabaseUser.created_at ?? new Date().toISOString(),
        };
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name, avatar_url')
            .eq('id', supabaseUser.id)
            .single();
          if (profile) {
            user.role       = profile.role ?? 'user';
            user.full_name  = profile.full_name ?? user.full_name;
            user.avatar_url = profile.avatar_url ?? null;
          }
        } catch { /* ignore */ }
        set({ session, user });
      } else if (event === 'SIGNED_OUT') {
        set({ session: null, user: null });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ session });
      }
    });
  },

  // ── Sign In ─────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ isLoading: true });

    if (USE_MOCK) {
      // Accept any credentials in mock mode
      await new Promise(r => setTimeout(r, 800)); // fake loading
      set({
        user:      { ...MOCK_USER, email },
        session:   { access_token: 'mock-token' },
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const supabaseUser = data.user;
      const user: User = {
        id:         supabaseUser.id,
        email:      supabaseUser.email ?? '',
        full_name:  supabaseUser.user_metadata?.full_name ?? null,
        avatar_url: null,
        role:       'user',
        created_at: supabaseUser.created_at ?? new Date().toISOString(),
      };

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url')
          .eq('id', supabaseUser.id)
          .single();
        if (profile) {
          user.role       = profile.role ?? 'user';
          user.full_name  = profile.full_name ?? user.full_name;
          user.avatar_url = profile.avatar_url ?? null;
        }
      } catch { /* ignore */ }

      set({ session: data.session, user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── Sign Up ─────────────────────────────────────────────────
  signUp: async (email, password, fullName) => {
    set({ isLoading: true });

    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 1000));
      set({
        user:      { ...MOCK_USER, email, full_name: fullName },
        session:   { access_token: 'mock-token' },
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);

      if (data.session) {
        const user: User = {
          id:         data.user!.id,
          email:      data.user!.email ?? '',
          full_name:  fullName,
          avatar_url: null,
          role:       'user',
          created_at: new Date().toISOString(),
        };
        set({ session: data.session, user, isLoading: false });
      } else {
        // Email confirmation required
        set({ isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── Sign Out ─────────────────────────────────────────────────
  signOut: async () => {
    set({ isLoading: true });
    if (!USE_MOCK) {
      await supabase.auth.signOut().catch(() => {});
    }
    set({ session: null, user: null, isLoading: false });
  },

  // ── Refresh user ─────────────────────────────────────────────
  refreshUser: async () => {
    if (USE_MOCK) return;
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', supabaseUser.id)
        .single();
      if (profile) {
        set(state => ({
          user: state.user ? {
            ...state.user,
            role:       profile.role ?? state.user.role,
            full_name:  profile.full_name ?? state.user.full_name,
            avatar_url: profile.avatar_url ?? state.user.avatar_url,
          } : null,
        }));
      }
    } catch { /* ignore */ }
  },

  // ── Update user ──────────────────────────────────────────────
  updateUser: async (data) => {
    if (USE_MOCK) {
      set(state => ({
        user: state.user ? { ...state.user, ...data } : null,
      }));
      return;
    }
    try {
      const { user } = get();
      if (!user) return;
      await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
      set(state => ({
        user: state.user ? { ...state.user, ...data } : null,
      }));
    } catch { /* ignore */ }
  },
}));
