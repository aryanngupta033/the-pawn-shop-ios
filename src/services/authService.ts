import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'in.thepawnshop.app://auth/callback',
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Native Google Sign In error:', error);
      throw error;
    }

    if (data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' });
    }

    return data;
  }

  // Web flow remains identical to existing production logic:
  const redirectUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    console.error('Google Sign In error:', error);
    throw error;
  }

  return data;
}

export async function signInWithEmailPassword(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpWithEmailPassword(
  email: string,
  pass: string,
  fullName: string,
  location?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: fullName,
        location: location || null,
      },
    },
  });

  if (error) {
    throw error;
  }

  // Ensure profile is present in public.profiles
  if (data.user) {
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        location: location || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
      });
    } catch (err) {
      console.warn('Profile creation fallback:', err);
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    return null;
  }

  const user = session.user;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Fetch profile error:', error);
    return null;
  }

  if (!profile) {
    // If trigger did not run yet, create initial profile
    const newProfile: Profile = {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Marketplace Member',
      avatar_url: user.user_metadata?.avatar_url || null,
      location: user.user_metadata?.location || null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .maybeSingle();

    return inserted || newProfile;
  }

  return profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url' | 'location'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}
