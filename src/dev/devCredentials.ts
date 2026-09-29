// Development-only credentials and quick switch logic.
// Excluded from production builds via build-time module resolution.

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

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    id: 'manish',
    name: 'User A: Manish',
    label: 'Seller • Mumbai',
    email: 'manish.seller@thepawnshop.test',
    pass: 'ManishWatch1964!',
    displayName: 'Manish',
    city: 'Mumbai, Maharashtra',
    role: 'seller',
  },
  {
    id: 'buyer',
    name: 'User B: Test Buyer',
    label: 'Buyer • Mumbai',
    email: 'testbuyer@thepawnshop.test',
    pass: 'TestBuyer2025!',
    displayName: 'Test Buyer',
    city: 'Colaba, Mumbai',
    role: 'buyer',
  },
];

export function getDevAuthCapabilities(helpers: {
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string, loc: string) => Promise<any>;
  onSuccess: () => Promise<void>;
}) {
  return {
    switchTestUser: async (target: 'manish' | 'buyer') => {
      const email = target === 'manish' ? 'manish.seller@thepawnshop.test' : 'testbuyer@thepawnshop.test';
      const pass = target === 'manish' ? 'ManishWatch1964!' : 'TestBuyer2025!';
      const name = target === 'manish' ? 'Manish' : 'Test Buyer';
      const loc = target === 'manish' ? 'Mumbai, Maharashtra' : 'Colaba, Mumbai';

      try {
        await helpers.signIn(email, pass);
      } catch (err) {
        await helpers.signUp(email, pass, name, loc);
      }
      await helpers.onSuccess();
    },
  };
}
