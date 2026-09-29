import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { 
  Profile, 
  Listing, 
  ListingImage, 
  Favorite, 
  Negotiation, 
  Offer, 
  Message, 
  Report,
  MarketplaceOverviewRow 
} from '../types';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: any;
        Update: any;
      };
      listings: {
        Row: Listing;
        Insert: any;
        Update: any;
      };
      listing_images: {
        Row: ListingImage;
        Insert: any;
        Update: any;
      };
      favorites: {
        Row: Favorite;
        Insert: any;
        Update: any;
      };
      negotiations: {
        Row: Negotiation;
        Insert: any;
        Update: any;
      };
      offers: {
        Row: Offer;
        Insert: any;
        Update: any;
      };
      messages: {
        Row: Message;
        Insert: any;
        Update: any;
      };
      reports: {
        Row: Report;
        Insert: any;
        Update: any;
      };
    };
    Views: {
      marketplace_overview: {
        Row: MarketplaceOverviewRow;
      };
    };
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
}

import {
  getDevSupabaseOverrides,
  saveDevSupabaseConfig,
  clearDevDevSupabaseConfig,
} from '@dev-supabase';

export const DEFAULT_SUPABASE_URL = 'https://gmmnvqmrkytnwpvkfdqk.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_GcYOPh6Kf_dShSSthy5J3A_f42FY1TT';

// Retrieve config from env, dev override (DEV only), or defaults
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const devOverrides = getDevSupabaseOverrides();
  const localUrl = devOverrides.url;
  const localKey = devOverrides.key;

  const url = (localUrl && localUrl.trim() !== '') ? localUrl : (envUrl || DEFAULT_SUPABASE_URL);
  const anonKey = (localKey && localKey.trim() !== '') ? localKey : (envKey || DEFAULT_SUPABASE_ANON_KEY);

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url !== 'https://your-project.supabase.co' &&
    anonKey !== 'your-anon-key' &&
    url.startsWith('https://')
  );

  const effectiveUrl = isConfigured ? url : DEFAULT_SUPABASE_URL;
  const effectiveKey = isConfigured ? anonKey : DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: effectiveUrl,
    anonKey: effectiveKey,
    supabaseUrl: effectiveUrl,
    supabaseAnonKey: effectiveKey,
    isConfigured
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  saveDevSupabaseConfig(url, key);
  reinitializeSupabaseClient();
}

export function clearSupabaseConfig() {
  clearDevDevSupabaseConfig();
  reinitializeSupabaseClient();
}

export const resetSupabaseConfig = clearSupabaseConfig;

const initialConfig = getSupabaseConfig();
export let supabase: SupabaseClient<any, 'public', any> = createClient(initialConfig.url, initialConfig.anonKey);

export function reinitializeSupabaseClient(): SupabaseClient<any, 'public', any> {
  const config = getSupabaseConfig();
  supabase = createClient(config.url, config.anonKey);
  return supabase;
}
