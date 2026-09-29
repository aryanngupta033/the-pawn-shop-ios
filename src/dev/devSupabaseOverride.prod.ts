// Production stub: strictly zero localStorage override logic or key references.

export function getDevSupabaseOverrides(): { url: string | null; key: string | null } {
  return { url: null, key: null };
}

export function saveDevSupabaseConfig(_url: string, _key: string): void {
  // Disabled in production
}

export function clearDevDevSupabaseConfig(): void {
  // Disabled in production
}
