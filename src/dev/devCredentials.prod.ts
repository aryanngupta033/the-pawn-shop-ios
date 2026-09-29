// Production stub: strictly zero test credentials or quick switch capabilities.

export interface DevAccount {
  id: 'manish' | 'buyer';
  name: string;
  label: string;
  email: string;
  pass: string;
  displayName: string;
  city: string;
  role: string;
}

export const DEV_ACCOUNTS: DevAccount[] = [];

export function getDevAuthCapabilities(_helpers: any) {
  return {};
}
