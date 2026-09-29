import React from 'react';
import { DEV_ACCOUNTS } from './devCredentials';

interface DevLoginDemoAccountsProps {
  onLogin: (email: string, pass: string, name: string, city: string) => void;
}

export const DevLoginDemoAccounts: React.FC<DevLoginDemoAccountsProps> = ({ onLogin }) => {
  if (DEV_ACCOUNTS.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-stone-100">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block mb-2 text-center">
        Phase 4 Test Accounts
      </span>
      <div className="grid grid-cols-2 gap-2">
        {DEV_ACCOUNTS.map((acc) => (
          <button
            key={acc.id}
            type="button"
            id={`demo-login-user-${acc.id === 'manish' ? 'a' : 'b'}`}
            onClick={() => onLogin(acc.email, acc.pass, acc.displayName, acc.city)}
            className={`p-2.5 rounded-lg text-left text-[11px] transition-colors cursor-pointer border ${
              acc.id === 'manish'
                ? 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200/80'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-200'
            }`}
          >
            <div className="font-bold text-stone-900 flex items-center gap-1">
              <span>{acc.name}</span>
            </div>
            <div className={`${acc.id === 'manish' ? 'text-amber-900' : 'text-stone-500'} text-[10px] mt-0.5`}>
              {acc.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
