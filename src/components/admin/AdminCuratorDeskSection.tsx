import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Tag, 
  MapPin, 
  User, 
  RefreshCw,
  Inbox
} from 'lucide-react';
import type { ListingWithDetails } from '../../types';
import { 
  getPendingReviewListings, 
  approveListingAsAdmin, 
  rejectListingAsAdmin 
} from '../../services/adminService';
import { formatPrice, formatDate } from '../../lib/formatters';

interface AdminCuratorDeskSectionProps {
  onInspectListing?: (id: string) => void;
  onQueueUpdated?: () => void;
}

export const AdminCuratorDeskSection: React.FC<AdminCuratorDeskSectionProps> = ({
  onInspectListing,
  onQueueUpdated,
}) => {
  const [pendingListings, setPendingListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Processing action state per listing to prevent double submission
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Confirmation modal for rejection
  const [confirmRejectItem, setConfirmRejectItem] = useState<ListingWithDetails | null>(null);

  const loadPendingQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingReviewListings();
      setPendingListings(data);
    } catch (err: any) {
      console.error('getPendingReviewListings error:', err);
      setError(err?.message || 'Failed to retrieve moderation queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingQueue();
  }, []);

  const handleApprove = async (listing: ListingWithDetails) => {
    if (processingId) return;
    try {
      setProcessingId(listing.id);
      setError(null);
      setActionSuccess(null);

      await approveListingAsAdmin(listing.id);

      setActionSuccess(`"${listing.title}" was approved and is now live on the public marketplace.`);
      setPendingListings((prev) => prev.filter((item) => item.id !== listing.id));
      if (onQueueUpdated) onQueueUpdated();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Approval failed:', err);
      setError(err?.message || 'Database rejected approval. Verify admin authorization.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!confirmRejectItem || processingId) return;
    const listing = confirmRejectItem;

    try {
      setProcessingId(listing.id);
      setError(null);
      setActionSuccess(null);

      await rejectListingAsAdmin(listing.id);

      setActionSuccess(`"${listing.title}" was rejected and will remain hidden from the marketplace.`);
      setPendingListings((prev) => prev.filter((item) => item.id !== listing.id));
      setConfirmRejectItem(null);
      if (onQueueUpdated) onQueueUpdated();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setError(err?.message || 'Database rejected action. Verify admin authorization.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-800" />
            <h2 className="font-serif font-bold text-lg text-stone-900">
              Curator Desk — Pending Review Queue
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {pendingListings.length} awaiting
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Carefully inspect seller submissions before publishing to the authentic vintage catalog.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPendingQueue}
          disabled={loading}
          className="p-2 border border-stone-300 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white p-12 rounded-xl border border-stone-200 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-800 mx-auto" />
          <p className="text-xs text-stone-500">Checking database for pending curator listings...</p>
        </div>
      )}

      {/* Empty Queue State */}
      {!loading && pendingListings.length === 0 && (
        <div className="bg-white p-12 rounded-xl border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-stone-900 text-base">
            Curator Queue is Clear
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            All submitted listings have been reviewed. When sellers create new pieces, they will queue here for moderation before appearing publicly.
          </p>
        </div>
      )}

      {/* Queue List Cards */}
      {!loading && pendingListings.length > 0 && (
        <div className="space-y-4">
          {pendingListings.map((item) => {
            const primaryImg =
              item.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800';
            const isProcessing = processingId === item.id;

            return (
              <div
                key={item.id}
                id={`curator-item-${item.id}`}
                className="bg-white border border-[#e7e2d9] rounded-2xl p-5 sm:p-6 shadow-xs hover:border-amber-700/40 transition-all flex flex-col md:flex-row gap-5"
              >
                {/* Left: Thumbnail & Gallery Preview */}
                <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
                  <div className="w-full h-44 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative group">
                    <img
                      src={primaryImg}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                        Under Review
                      </span>
                    </div>
                  </div>

                  {item.images && item.images.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {item.images.slice(1, 4).map((img, i) => (
                        <div
                          key={img.id || i}
                          className="w-12 h-12 rounded border border-stone-200 overflow-hidden shrink-0"
                        >
                          <img
                            src={img.image_url}
                            alt="Additional angle"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {item.images.length > 4 && (
                        <div className="w-12 h-12 rounded border border-stone-200 bg-stone-100 text-stone-500 flex items-center justify-center text-[10px] font-bold">
                          +{item.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Middle: Details & Meta */}
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
                          {item.condition}
                        </span>
                        {item.year && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono">
                            Circa {item.year}
                          </span>
                        )}
                        {item.brand && (
                          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                            {item.brand}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-lg font-bold text-stone-900 tracking-tight">
                        {item.title}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-serif text-xl font-bold text-stone-900 block">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>

                  {/* Seller info & location */}
                  <div className="flex items-center gap-4 text-xs text-stone-500 flex-wrap py-1.5 border-y border-stone-100">
                    <span className="flex items-center gap-1.5 font-medium text-stone-800">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      {item.seller?.full_name || 'Anonymous Collector'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400" />
                      {item.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Submitted {formatDate(item.created_at)}
                    </span>
                  </div>

                  {/* Description snippet */}
                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>

                  <div className="text-[10px] text-stone-400 font-mono">
                    Listing ID: {item.id}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex md:flex-col items-center justify-end md:justify-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                  {onInspectListing && (
                    <button
                      type="button"
                      onClick={() => onInspectListing(item.id)}
                      className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Inspect full details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleApprove(item)}
                    className="flex-1 md:flex-none py-2 px-4 bg-emerald-800 hover:bg-emerald-900 text-emerald-50 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setConfirmRejectItem(item)}
                    className="flex-1 md:flex-none py-2 px-4 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-800 border border-stone-200 hover:border-rose-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-stone-400 hover:text-rose-600" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Rejection */}
      {confirmRejectItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto border border-rose-200">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                Reject Listing?
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Are you sure you want to decline <strong>"{confirmRejectItem.title}"</strong>?
                The item will be marked as rejected and will not be displayed on the public marketplace.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={() => setConfirmRejectItem(null)}
                className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={Boolean(processingId)}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 px-4 bg-rose-800 hover:bg-rose-900 text-rose-50 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                {processingId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
