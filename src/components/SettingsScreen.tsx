import React from 'react';
import { 
  LogOut, 
  ShieldCheck, 
  ExternalLink,
  Mail,
  UserX,
  FileText,
  Smartphone,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingsScreenProps {
  onOpenLegal: () => void;
  onOpenAdmin?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenLegal,
  onOpenAdmin,
}) => {
  const { user, signOut, isAdmin } = useAuth();

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Settings & Information
        </h1>
        <p className="text-xs text-stone-500">
          Account session, marketplace governance, contact desk, and application details.
        </p>
      </div>

      {/* Account Session Card */}
      {user ? (
        <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-900 block">Current Account</span>
              <span className="text-xs text-stone-600 font-mono truncate max-w-xs block mt-0.5">
                {user.email || user.id}
              </span>
            </div>

            <button
              id="settings-logout-btn"
              type="button"
              onClick={async () => {
                await signOut();
              }}
              className="py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {isAdmin && onOpenAdmin && (
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-medium text-stone-800">Admin Privileges Active</span>
              </div>
              <button
                id="open-admin-dashboard-btn"
                type="button"
                onClick={onOpenAdmin}
                className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline cursor-pointer"
              >
                Curator Console →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-900 block">Session Status</span>
            <span className="text-xs text-stone-500 block mt-0.5">
              Browsing as an anonymous guest.
            </span>
          </div>
        </div>
      )}

      {/* Trust & Governance Card */}
      <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center">
            <FileText className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-stone-900">
              Trust & Marketplace Governance
            </h3>
            <span className="text-[11px] text-stone-500">
              Intermediary guidelines, safe offline trading, and terms
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          The Pawn Shop is an offline-first vintage communication venue. We provide an authenticated platform for buyers and sellers to discover, discuss, and arrange secure face-to-face inspections.
        </p>

        <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={onOpenLegal}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Terms of Service & Offline Disclaimers</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <span className="hidden sm:inline text-stone-300">•</span>

          <a
            id="settings-official-website-link"
            href="https://thepawnshop.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-stone-500" />
            <span>Official Portal (thepawnshop.in)</span>
          </a>
        </div>
      </div>

      {/* Support & Account Management */}
      <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="font-serif text-sm font-bold text-stone-900">
            Support & Account Requests
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed mt-0.5">
            Need assistance, wish to report a listing, or request full profile and account deletion?
          </p>
        </div>

        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-800 block">Official Support Desk</span>
              <a
                href="mailto:thepawnshop09@gmail.com?subject=The%20Pawn%20Shop%20Support"
                className="text-amber-900 hover:text-amber-950 font-mono font-medium underline"
              >
                thepawnshop09@gmail.com
              </a>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-start gap-3">
            <UserX className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-800 block">Account & Data Deletion Requests</span>
              <p className="text-stone-500 leading-relaxed">
                To permanently delete your collector account and associated records, email us from your registered account address at{' '}
                <a
                  href="mailto:thepawnshop09@gmail.com?subject=Account%20Deletion%20Request"
                  className="text-stone-800 font-mono font-medium underline"
                >
                  thepawnshop09@gmail.com
                </a>{' '}
                with the subject line <span className="font-mono text-[11px] font-semibold text-stone-700">"Account Deletion Request"</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* App Version Info */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 rounded-full text-[11px] font-medium text-stone-500">
          <Smartphone className="w-3.5 h-3.5 text-stone-400" />
          <span>The Pawn Shop • v1.0.0 (Production)</span>
        </div>
      </div>
    </div>
  );
};
