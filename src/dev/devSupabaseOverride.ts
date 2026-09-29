// Development-only Supabase localStorage configuration override.
// Excluded from production builds via build-time module resolution.

const OVERRIDE_URL_KEY = 'pawnshop_supabase_url';
const OVERRIDE_KEY_KEY = 'pawnshop_supabase_key';

export function getDevSupabaseOverrides(): { url: string | null; key: string | null } {
  if (typeof window === 'undefined') {
    return { url: null, key: null };
  }
  return {
    url: localStorage.getItem(OVERRIDE_URL_KEY),
    key: localStorage.getItem(OVERRIDE_KEY_KEY),
  };
}

export function saveDevSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(OVERRIDE_URL_KEY, url.trim());
    localStorage.setItem(OVERRIDE_KEY_KEY, key.trim());
  }
}

export function clearDevDevSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(OVERRIDE_URL_KEY);
    localStorage.removeItem(OVERRIDE_KEY_KEY);
  }
}
