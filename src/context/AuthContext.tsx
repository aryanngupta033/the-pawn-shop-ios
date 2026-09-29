import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, getSupabaseConfig, reinitializeSupabaseClient } from '../lib/supabase';
import type { Profile } from '../types';
import { 
  getCurrentProfile, 
  signInWithGoogle as authSignInWithGoogle, 
  signInWithEmailPassword, 
  signUpWithEmailPassword, 
  signOut as authSignOut,
  updateProfile as authUpdateProfile 
} from '../services/authService';
import { verifyAdminStatus } from '../services/adminService';
import { Capacitor } from '@capacitor/core';
import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

import { getDevAuthCapabilities } from '@dev-credentials';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, location?: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchTestUser?: (target: 'manish' | 'buyer') => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'location'>>) => Promise<void>;
  recheckConfig: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(() => getSupabaseConfig().isConfigured);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const recheckConfig = useCallback(() => {
    reinitializeSupabaseClient();
    const config = getSupabaseConfig();
    setIsConfigured(config.isConfigured);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await getCurrentProfile();
      setProfile(p);
    } catch (err: any) {
      console.error('Error refreshing profile:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setIsLoading(true);
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            const [p, adminStatus] = await Promise.all([
              getCurrentProfile(),
              verifyAdminStatus(),
            ]);
            if (mounted) {
              setProfile(p);
              setIsAdmin(adminStatus);
            }
          } else {
            if (mounted) {
              setProfile(null);
              setIsAdmin(false);
            }
          }
        }
      } catch (err: any) {
        console.warn('Initial session check note:', err?.message || err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const [p, adminStatus] = await Promise.all([
            getCurrentProfile(),
            verifyAdminStatus(),
          ]);
          if (mounted) {
            setProfile(p);
            setIsAdmin(adminStatus);
          }
        } else {
          if (mounted) {
            setProfile(null);
            setIsAdmin(false);
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Native Deep Link Listener for OAuth Callbacks (Android & iOS)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isSubscribed = true;
    const listenerPromise = App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
      if (!isSubscribed) return;
      try {
        const rawUrl = event?.url;
        if (!rawUrl || !rawUrl.startsWith('in.thepawnshop.app://')) return;

        // Dismiss the external in-app browser tab
        try {
          await Browser.close();
        } catch {
          // In-app browser may have already been dismissed
        }

        const parsedUrl = new URL(rawUrl);

        // Check for OAuth error query params
        const errorParam = parsedUrl.searchParams.get('error');
        const errorDesc = parsedUrl.searchParams.get('error_description');
        if (errorParam) {
          console.error('OAuth error callback:', errorParam, errorDesc);
          setError(errorDesc || errorParam || 'Authentication failed');
          return;
        }

        // Handle PKCE code exchange (?code=...)
        const code = parsedUrl.searchParams.get('code');
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.error('PKCE exchangeCodeForSession failed:', exchangeErr);
            setError(exchangeErr.message || 'Failed to exchange authorization code');
          }
          return;
        }

        // Fallback: Check for hash fragment parameters (#access_token=...)
        if (parsedUrl.hash) {
          const hashString = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.substring(1) : parsedUrl.hash;
          const hashParams = new URLSearchParams(hashString);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error: sessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionErr) {
              console.error('OAuth hash token setSession failed:', sessionErr);
              setError(sessionErr.message || 'Failed to set session from OAuth callback');
            }
          }
        }
      } catch (err: any) {
        console.error('Native auth callback processing exception:', err);
      }
    });

    return () => {
      isSubscribed = false;
      listenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await authSignInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google Sign In');
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailPassword(email, pass);
      await refreshProfile();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, location?: string) => {
    try {
      setError(null);
      await signUpWithEmailPassword(email, pass, name, location);
      await refreshProfile();
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await authSignOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out');
      throw err;
    }
  };

  const devCapabilities = getDevAuthCapabilities({
    signIn: signInWithEmailPassword,
    signUp: signUpWithEmailPassword,
    onSuccess: async () => {
      const [p, adminStatus] = await Promise.all([
        getCurrentProfile(),
        verifyAdminStatus(),
      ]);
      setProfile(p);
      setIsAdmin(adminStatus);
    },
  });

  const updateProfileData = async (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'location'>>) => {
    if (!user) throw new Error('Not authenticated');
    try {
      setError(null);
      const updated = await authUpdateProfile(user.id, updates);
      setProfile(updated);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        isConfigured,
        error,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        ...devCapabilities,
        refreshProfile,
        updateProfileData,
        recheckConfig,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
