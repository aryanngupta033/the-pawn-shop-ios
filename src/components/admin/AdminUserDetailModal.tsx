import React from 'react';
import { X, User, MapPin, Calendar, Package, ExternalLink } from 'lucide-react';
import type { AdminUserWithListings } from '../../types';

interface AdminUserDetailModalProps {
  user: AdminUserWithListings | null;
  onClose: () => void;
  onSelectListing?: (id: string) => void;
}

export const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({
  user,
  onClose,
  onSelectListing,
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-stone-100 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-200 border border-stone-300 overflow-hidden flex items-center justify-center font-bold text-stone-700">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-stone-600" />
              )}
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-stone-900 leading-none">
                {user.full_name}
              </h3>
              <p className="text-[11px] text-stone-500 font-mono mt-1">User ID: {user.id}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Details Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
              <span className="text-[10px] text-stone-500 uppercase font-semibold flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3" /> Location
              </span>
              <p className="font-medium text-stone-800">{user.location || 'Not provided'}</p>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
              <span className="text-[10px] text-stone-500 uppercase font-semibold flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" /> Registered On
              </span>
              <p className="font-medium text-stone-800">
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
              <span className="text-[10px] text-amber-800 uppercase font-semibold flex items-center gap-1 mb-1">
                <Package className="w-3 h-3" /> Total Listings
              </span>
              <p className="font-bold text-amber-900 text-sm">{user.listings_count}</p>
            </div>
          </div>

          {/* User's Listings Section */}
          <div>
            <h4 className="font-serif font-bold text-stone-900 text-base mb-3 flex items-center justify-between">
              <span>Catalog & Listings ({user.recent_listings?.length || 0})</span>
            </h4>

            {!user.recent_listings || user.recent_listings.length === 0 ? (
              <div className="py-8 text-center bg-stone-50 rounded-lg border border-stone-200">
                <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-500">This member has not posted any listings yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-lg overflow-hidden bg-white">
                {user.recent_listings.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-stone-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        ₹{item.price.toLocaleString()} • Created{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          item.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'reserved'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'sold'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>

                      {onSelectListing && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectListing(item.id);
                            onClose();
                          }}
                          className="p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded cursor-pointer"
                          title="View public listing page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 p-4 bg-stone-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
