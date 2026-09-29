import React from 'react';
import { useAuth } from '../context/AuthContext';

export const DevQuickSwitch: React.FC = () => {
  const { user, profile, switchTestUser } = useAuth();
  const [switching, setSwitching] = React.useState(false);

  if (!switchTestUser) return null;

  const isManish = profile?.full_name?.toLowerCase().includes('manish') || user?.email?.includes('manish');
  const isBuyer = profile?.full_name?.toLowerCase().includes('buyer') || user?.email?.includes('buyer');

  const handleQuickSwitch = async (target: 'manish' | 'buyer') => {
    try {
      setSwitching(true);
      await switchTestUser(target);
    } catch (e) {
      console.error(e);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="hidden sm:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[10px]">
      <button
        type="button"
        disabled={switching}
        onClick={() => handleQuickSwitch('manish')}
        className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
          isManish
            ? 'bg-amber-900 text-amber-100 shadow-2xs'
            : 'text-stone-600 hover:text-stone-900'
        }`}
        title="Switch to User A: Manish (Seller)"
      >
        User A
      </button>
      <button
        type="button"
        disabled={switching}
        onClick={() => handleQuickSwitch('buyer')}
        className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
          isBuyer
            ? 'bg-stone-900 text-stone-100 shadow-2xs'
            : 'text-stone-600 hover:text-stone-900'
        }`}
        title="Switch to User B: Test Buyer"
      >
        User B
      </button>
    </div>
  );
};
