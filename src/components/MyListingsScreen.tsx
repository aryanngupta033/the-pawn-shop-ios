import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  MapPin, 
  Loader2, 
  AlertCircle, 
  Tag, 
  Clock 
} from 'lucide-react';
import { fetchUserListings, markListingAsSold, removeListing } from '../services/listingsService';
import type { ListingWithDetails, ListingStatus } from '../types';
import { formatPrice, formatDate, getStatusBadge, getConditionColor } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface MyListingsScreenProps {
  onSelectListing: (id: string) => void;
  onEditListing: (id: string) => void;
  onCreateListing: () => void;
  onRequireAuth: () => void;
}

export const MyListingsScreen: React.FC<MyListingsScreenProps> = ({
  onSelectListing,
  onEditListing,
  onCreateListing,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const loadListings = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserListings(user.id);
      setListings(data);
    } catch (err: any) {
      console.error('Error loading my listings:', err);
      setError(err?.message || 'Failed to load your catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xs">
          <Tag className="w-10 h-10 text-amber-700 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Sign in to View Listings</h2>
          <p className="text-xs text-stone-600 mb-6">
            Log in to manage your collection, active negotiations, and sold vintage items.
          </p>
          <button
            onClick={onRequireAuth}
            className="w-full py-2.5 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleMarkSold = async (id: string) => {
    try {
      setActionError(null);
      setActionLoading((prev) => ({ ...prev, [id]: true }));
      await markListingAsSold(id);
      await loadListings();
    } catch (err: any) {
      setActionError(`Could not mark sold: ${err?.message || 'Update failed'}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      setActionError(null);
      setActionLoading((prev) => ({ ...prev, [id]: true }));
      await removeListing(id);
      setConfirmRemoveId(null);
      await loadListings();
    } catch (err: any) {
      setActionError(`Could not remove listing: ${err?.message || 'Update failed'}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filtered = listings.filter((l) => {
    if (filterStatus === 'all') return true;
    return l.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            My Collector Archive
          </h1>
          <p className="text-xs text-stone-500">
            Manage your vintage listings, offline handoffs, and sales.
          </p>
        </div>

        <button
          id="my-listings-create-btn"
          type="button"
          onClick={onCreateListing}
          className="py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>New Listing</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {['all', 'pending_review', 'available', 'reserved', 'sold', 'rejected', 'removed'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
              filterStatus === st
                ? 'bg-stone-900 text-stone-100'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {st === 'pending_review'
              ? 'Under Review'
              : st === 'rejected'
              ? 'Rejected'
              : st} {st === 'all' ? `(${listings.length})` : `(${listings.filter(l => l.status === st).length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold text-rose-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
          <p className="text-xs text-stone-500">Retrieving your listings...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 max-w-md mx-auto">
          <Tag className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">
            {filterStatus === 'all' ? 'No Listings Yet' : `No ${filterStatus} listings`}
          </h3>
          <p className="text-xs text-stone-500 mb-6 leading-relaxed">
            {filterStatus === 'all'
              ? 'You have not published any vintage pieces yet. List an antique, watch, or collectible to connect with collectors.'
              : `You do not have any listings currently marked as "${filterStatus}".`}
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={onCreateListing}
              className="px-4 py-2.5 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 cursor-pointer"
            >
              Create Your First Listing
            </button>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const condStyle = getConditionColor(item.condition);
            const primaryImg =
              item.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800';
            const isProcessing = Boolean(actionLoading[item.id]);

            return (
              <div
                key={item.id}
                id={`my-listing-${item.id}`}
                className="bg-white border border-[#e7e2d9] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail & Details */}
                <div
                  className="flex items-start sm:items-center gap-4 cursor-pointer flex-1"
                  onClick={() => onSelectListing(item.id)}
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200 relative">
                    <img
                      src={primaryImg}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {item.status === 'sold' && (
                      <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-[10px] font-bold text-white tracking-widest uppercase">
                        SOLD
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}
                      >
                        {item.condition}
                      </span>
                      {item.brand && (
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                          {item.brand}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-sm font-bold text-stone-900 hover:text-amber-900 transition-colors">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
                      <span className="font-serif font-bold text-stone-900 text-sm">
                        {formatPrice(item.price)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {item.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                  <button
                    type="button"
                    onClick={() => onSelectListing(item.id)}
                    className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="View public page"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="sm:hidden">View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditListing(item.id)}
                    className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    title="Edit listing details"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span className="sm:hidden">Edit</span>
                  </button>

                  {item.status !== 'sold' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleMarkSold(item.id)}
                      className="py-1.5 px-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Mark as Sold offline"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Sold</span>
                    </button>
                  )}

                  {item.status !== 'removed' && (
                    confirmRemoveId === item.id ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-1">
                        <span className="text-[10px] text-rose-800 font-medium px-1">Remove?</span>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRemove(item.id)}
                          className="px-2 py-0.5 bg-rose-700 text-white rounded text-[10px] font-bold hover:bg-rose-800 cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="px-1.5 py-0.5 text-stone-600 hover:text-stone-800 rounded text-[10px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => setConfirmRemoveId(item.id)}
                        className="p-2 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg text-xs cursor-pointer disabled:opacity-50"
                        title="Remove listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
