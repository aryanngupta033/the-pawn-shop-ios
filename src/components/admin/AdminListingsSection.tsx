import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ArchiveX, 
  RotateCcw, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  AlertTriangle 
} from 'lucide-react';
import type { ListingWithDetails, ListingStatus } from '../../types';
import { getAdminListings, removeListingAsAdmin, restoreListing } from '../../services/adminService';

interface AdminListingsSectionProps {
  onSelectListing?: (id: string) => void;
}

export const AdminListingsSection: React.FC<AdminListingsSectionProps> = ({ onSelectListing }) => {
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ListingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<{
    type: 'remove' | 'restore';
    listing: ListingWithDetails;
  } | null>(null);
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminListings(statusFilter, searchQuery);
      setListings(data);
    } catch (err: any) {
      console.error('getAdminListings error:', err);
      setError(err?.message || 'Failed to retrieve listings from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadListings();
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    try {
      setProcessingAction(true);
      setError(null);
      setActionSuccess(null);

      if (pendingAction.type === 'remove') {
        await removeListingAsAdmin(pendingAction.listing.id);
        setActionSuccess(`"${pendingAction.listing.title}" was safely marked as removed.`);
      } else {
        await restoreListing(pendingAction.listing.id);
        setActionSuccess(`"${pendingAction.listing.title}" was restored back to available.`);
      }

      setPendingAction(null);
      await loadListings();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Moderation action failed:', err);
      setError(err?.message || 'Action failed due to database policy rejection.');
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
        <div>
          <h2 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-800" />
            <span>Marketplace Listings Moderation</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Audit catalog inventory, search vintage records, or soft-remove non-compliant items.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
          {(['all', 'pending_review', 'available', 'reserved', 'sold', 'rejected', 'removed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {st === 'pending_review' ? 'Pending Review' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by title, brand, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 shadow-2xs"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-stone-900 text-stone-100 text-xs font-semibold rounded-lg hover:bg-stone-800 cursor-pointer transition-colors shadow-2xs"
        >
          Filter
        </button>
      </form>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Listings Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-700 mb-2" />
            <span>Loading catalog listings...</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-700">No matching listings found</p>
            <p className="mt-1">Try switching status filters or clearing the search text.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Item & Gallery</th>
                  <th className="py-3 px-4">Asking Price</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Seller</th>
                  <th className="py-3 px-4 hidden md:table-cell">Condition / Year</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {listings.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                          {item.images && item.images[0] ? (
                            <img
                              src={item.images[0].image_url}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
                              No Pic
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate" title={item.title}>
                            {item.title}
                          </p>
                          <p className="text-[10px] text-stone-400 font-mono truncate">
                            ID: {item.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900 whitespace-nowrap">
                      ₹{item.price.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-stone-600">
                      <span className="font-medium text-stone-800">{item.seller?.full_name}</span>
                      <span className="block text-[10px] text-stone-400 truncate">{item.location}</span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-stone-600">
                      <span>{item.condition}</span>
                      {item.year && (
                        <span className="text-stone-400 text-[11px] block">Circa {item.year}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          item.status === 'pending_review'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : item.status === 'available' || item.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'reserved'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'sold'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status === 'pending_review' ? 'under review' : item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onSelectListing && (
                          <button
                            type="button"
                            onClick={() => onSelectListing(item.id)}
                            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded cursor-pointer"
                            title="Inspect public detail page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status !== 'removed' ? (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'remove', listing: item })}
                            className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
                            title="Remove listing from marketplace visibility"
                          >
                            <ArchiveX className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'restore', listing: item })}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200"
                            title="Restore listing back to available status"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  pendingAction.type === 'remove'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {pendingAction.type === 'remove' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {pendingAction.type === 'remove' ? 'Confirm Removal' : 'Confirm Restoration'}
                </h3>
                <p className="text-xs text-stone-500">
                  Listing: &ldquo;{pendingAction.listing.title}&rdquo;
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {pendingAction.type === 'remove'
                ? 'Soft-removal hides this item from marketplace discovery while preserving historical negotiation ledgers and relational database integrity.'
                : 'Restoration returns this item to "available" status, re-enabling active discovery and offer placement.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={processingAction}
                onClick={() => setPendingAction(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={processingAction}
                onClick={handleConfirmAction}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 ${
                  pendingAction.type === 'remove'
                    ? 'bg-rose-700 hover:bg-rose-800 text-rose-50'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-emerald-50'
                }`}
              >
                {processingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {pendingAction.type === 'remove' ? 'Yes, Remove Listing' : 'Yes, Restore Listing'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
