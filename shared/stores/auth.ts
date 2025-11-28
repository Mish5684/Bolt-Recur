import { create } from 'zustand';
import { supabase } from '../api/supabase';
import type { User } from '@supabase/supabase-js';
import { registerForPushNotifications, unregisterPushNotifications } from '../utils/pushNotifications';

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (email: string, token: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  sendOTP: async (email: string) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) throw error;
      set({ loading: false });
      return true;
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
      return false;
    }
  },

  verifyOTP: async (email: string, token: string) => {
    try {
      set({ loading: true, error: null });
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      set({
        user: data.user,
        loading: false,
        error: null
      });

      // Register for push notifications after successful login
      if (data.user) {
        registerForPushNotifications().catch((error) => {
          console.error('Failed to register for push notifications:', error);
        });
      }

      return true;
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
      return false;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null });

      // Unregister push notifications before sign out
      await unregisterPushNotifications();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, loading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false
      });
    }
  },

  checkSession: async () => {
    try {
      set({ loading: true });
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) throw error;

      set({
        user: session?.user ?? null,
        loading: false,
        initialized: true
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null });

        // Register push notifications if user logs in
        if (session?.user) {
          registerForPushNotifications().catch((error) => {
            console.error('Failed to register for push notifications:', error);
          });
        }
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false,
        initialized: true
      });
    }
  },
}));
