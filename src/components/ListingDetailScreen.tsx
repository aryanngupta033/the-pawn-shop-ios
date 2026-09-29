import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Flag, 
  MapPin, 
  Calendar, 
  Award, 
  ShieldCheck, 
  Tag, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  MessageSquare, 
  DollarSign, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import type { ListingWithDetails } from '../types';
import { fetchListingById, markListingAsSold } from '../services/listingsService';
import { toggleFavorite, isListingFavorited } from '../services/favoritesService';
import { getOrCreateNegotiation, submitOffer } from '../services/negotiationsService';
import { formatPrice, formatDate, getConditionColor, getStatusBadge } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface ListingDetailScreenProps {
  listingId: string;
  onBack: () => void;
  onEditListing: (id: string) => void;
  onOpenNegotiation: (negotiationId: string) => void;
  onOpenReport: (listingId: string, reportedUserId?: string) => void;
  onRequireAuth: () => void;
}

export const ListingDetailScreen: React.FC<ListingDetailScreenProps> = ({
  listingId,
  onBack,
  onEditListing,
  onOpenNegotiation,
  onOpenReport,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [listing, setListing] = useState<ListingWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [togglingFav, setTogglingFav] = useState<boolean>(false);

  // Make Offer Modal State
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [offerAmount, setOfferAmount] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>('');
  const [submittingOffer, setSubmittingOffer] = useState<boolean>(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Mark Sold Confirmation
  const [showSoldConfirm, setShowSoldConfirm] = useState<boolean>(false);
  const [markingSold, setMarkingSold] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchListingById(listingId);
      if (!data) {
        setError('Listing not found or has been removed.');
        return;
      }
      setListing(data);

      if (user) {
        const fav = await isListingFavorited(user.id, data.id);
        setIsFavorited(fav);
      }
    } catch (err: any) {
      console.error('Error fetching listing:', err);
      setError(err?.message || 'Failed to load listing details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListing();
  }, [listingId, user?.id]);

  const handleToggleFav = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    try {
      setTogglingFav(true);
      const newState = await toggleFavorite(user.id, listingId);
      setIsFavorited(newState);
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    } finally {
      setTogglingFav(false);
    }
  };

  const handleMakeOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }
    if (!listing) return;

    const amountNum = parseFloat(offerAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setOfferError('Please enter a valid positive offer amount.');
      return;
    }

    try {
      setSubmittingOffer(true);
      setOfferError(null);

      // 1. Find or create negotiation
      const negotiation = await getOrCreateNegotiation(listing.id, user.id, listing.seller_id);

      // 2. Submit initial offer
      await submitOffer(negotiation.id, user.id, amountNum, offerMessage);

      // 3. Open negotiation detail screen
      setShowOfferModal(false);
      onOpenNegotiation(negotiation.id);
    } catch (err: any) {
      console.error('Offer submission error:', err);
      setOfferError(err?.message || 'Failed to submit offer.');
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleConfirmSold = async () => {
    try {
      setMarkingSold(true);
      setActionError(null);
      await markListingAsSold(listingId);
      setShowSoldConfirm(false);
      await loadListing();
    } catch (err: any) {
      console.error('Mark sold error:', err);
      setActionError(`Could not mark listing as sold: ${err?.message || 'Permission denied or update failed'}`);
    } finally {
      setMarkingSold(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
        <p className="text-xs text-stone-500">Loading authenticated listing record...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="p-6 bg-white border border-stone-200 rounded-xl">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Item Unavailable</h2>
          <p className="text-xs text-stone-600 mb-6">{error || 'This listing could not be found.'}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-stone-900 text-stone-100 rounded-md text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Return to Browse
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === listing.seller_id;
  const isSold = listing.status === 'sold';
  const condStyle = getConditionColor(listing.condition);
  const statusBadge = getStatusBadge(listing.status);
  const images = listing.images && listing.images.length > 0 ? listing.images : [{
    id: 'placeholder',
    listing_id: listing.id,
    image_url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800',
    display_order: 0,
    created_at: '',
  }];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          id="back-to-browse-btn"
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse</span>
        </button>

        <div className="flex items-center gap-2">
          <motion.button
            id="detail-fav-btn"
            type="button"
            onClick={handleToggleFav}
            disabled={togglingFav}
            whileTap={{ scale: 0.94 }}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isFavorited
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <motion.div
              animate={isFavorited ? { scale: [1, 1.22, 1] } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Heart
                className={`w-4 h-4 transition-colors duration-200 ${
                  isFavorited ? 'fill-rose-600 text-rose-600' : ''
                }`}
              />
            </motion.div>
            <span className="hidden sm:inline">{isFavorited ? 'Saved' : 'Save'}</span>
          </motion.button>

          <button
            id="detail-report-btn"
            type="button"
            onClick={() => onOpenReport(listing.id, listing.seller_id)}
            className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs transition-colors cursor-pointer"
            title="Report this listing"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery on left, Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
        {/* Left Column: Image Gallery (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          {/* Main Selected Image */}
          <div className="relative aspect-4/3 bg-stone-900 rounded-2xl overflow-hidden border border-[#e7e2d9] shadow-xs">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImageIndex}
                src={images[selectedImageIndex]?.image_url}
                alt={listing.title}
                referrerPolicy="no-referrer"
                initial={{ opacity: 0.7, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.7, scale: 0.99 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="w-full h-full object-contain"
              />
            </AnimatePresence>

            {/* Sold Banner Overlay - clearly visible yet less visually obstructive */}
            {isSold && (
              <div className="absolute inset-0 bg-stone-950/45 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 pointer-events-none text-center">
                <div className="bg-stone-900/90 border border-amber-500/60 text-amber-200 px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5">
                  <span className="font-serif text-lg sm:text-xl font-bold tracking-widest uppercase text-amber-300">
                    SOLD
                  </span>
                  <span className="text-stone-500 text-xs">•</span>
                  <span className="text-xs text-stone-200 font-medium">Purchased Offline</span>
                </div>
              </div>
            )}

            {/* Carousel navigation arrows if multiple images */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-stone-800 flex items-center justify-center shadow-md cursor-pointer transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-stone-800 flex items-center justify-center shadow-md cursor-pointer transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-stone-900/80 text-stone-200 text-[11px] px-2.5 py-1 rounded font-mono backdrop-blur-xs z-10">
                {selectedImageIndex + 1} / {images.length}
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative w-20 aspect-4/3 rounded-lg overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                    selectedImageIndex === idx
                      ? 'border-amber-700 shadow-xs'
                      : 'border-stone-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt={`Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Listing Spec & Action Card (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <div className="bg-white border border-[#e7e2d9] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
            {/* Header: Brand, Title, Status */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                {listing.brand ? (
                  <span className="text-xs uppercase font-bold tracking-widest text-amber-800">
                    {listing.brand}
                  </span>
                ) : (
                  <span className="text-xs uppercase font-semibold tracking-wider text-stone-400">
                    Authentic Vintage
                  </span>
                )}
                <span className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded ${statusBadge.bg}`}>
                  {statusBadge.label}
                </span>
              </div>

              {/* 1. Title */}
              <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-stone-900 leading-tight">
                {listing.title}
              </h1>
            </div>

            {/* 2. Price Box */}
            <div className="p-3.5 sm:p-4 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] sm:text-[11px] text-stone-400 uppercase tracking-widest font-semibold block mb-0.5">
                Asking Price
              </span>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                  {formatPrice(listing.price)}
                </span>
                <span className="text-xs text-stone-500 font-sans">
                  • In-person peer-to-peer settlement
                </span>
              </div>
            </div>

            {/* 3. Condition & 4. Location Matrix */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 sm:p-3 bg-stone-50/70 border border-stone-200 rounded-lg">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                  Condition
                </span>
                <span
                  className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}
                >
                  {listing.condition}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 bg-stone-50/70 border border-stone-200 rounded-lg">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                  Era / Year
                </span>
                <span className="font-mono text-stone-800 font-semibold">
                  {listing.year || 'Not specified'}
                </span>
              </div>

              <div className="p-2.5 sm:p-3 bg-stone-50/70 border border-stone-200 rounded-lg col-span-2">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                  Inspection Location
                </span>
                <span className="text-stone-800 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <span>{listing.location}</span>
                </span>
              </div>
            </div>

            {/* 5. Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Collector Description
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* 6. Seller Information */}
            <div className="pt-3 sm:pt-4 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center overflow-hidden shrink-0">
                  {listing.seller?.avatar_url ? (
                    <img
                      src={listing.seller.avatar_url}
                      alt={listing.seller.full_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-stone-500" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                    Listed By
                  </span>
                  <span className="text-xs font-bold text-stone-900">
                    {listing.seller?.full_name || 'Marketplace Member'}
                  </span>
                  {listing.seller?.location && (
                    <span className="text-[11px] text-stone-500 block">
                      {listing.seller.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-[10px] sm:text-[11px] text-stone-400 font-mono text-right">
                {formatDate(listing.created_at)}
              </div>
            </div>

            {/* 7. Contextual Action Buttons */}
            <div className="pt-1 sm:pt-2">
              {isOwner ? (
                /* Owner Actions: Edit, Mark as Sold */
                <div className="space-y-2.5">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>You own this listing. Manage or mark sold upon offline payment.</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="owner-edit-listing-btn"
                      type="button"
                      onClick={() => onEditListing(listing.id)}
                      className="flex-1 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Listing</span>
                    </button>

                    {!isSold && (
                      <button
                        id="owner-mark-sold-btn"
                        type="button"
                        onClick={() => setShowSoldConfirm(true)}
                        className="flex-1 py-2.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-emerald-50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark as Sold</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : isSold ? (
                /* Sold state for buyers */
                <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl text-center">
                  <span className="font-serif font-bold text-stone-800 block mb-1">
                    Item Marked as Sold
                  </span>
                  <p className="text-xs text-stone-500">
                    This collectible is no longer accepting offers.
                  </p>
                </div>
              ) : (
                /* Prospective Buyer Actions: Make Offer */
                <button
                  id="buyer-make-offer-btn"
                  type="button"
                  onClick={() => {
                    if (!user) {
                      onRequireAuth();
                    } else {
                      setShowOfferModal(true);
                      setOfferAmount(listing.price.toString());
                    }
                  }}
                  className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <span>Make an Offer</span>
                </button>
              )}
            </div>

            {/* Offline Safety Guidance */}
            <p className="text-[11px] text-stone-400 leading-normal border-t border-stone-100 pt-3">
              Offline peer-to-peer transaction. Inspect in person, verify authenticity, and settle securely with the seller.
            </p>
          </div>
        </div>
      </div>

      {/* MAKE OFFER MODAL */}
      <AnimatePresence>
        {showOfferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowOfferModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-xl p-5 sm:p-7 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">Make an Offer</h3>
                  <p className="text-xs text-stone-500">
                    Asking: <span className="font-bold text-stone-800">{formatPrice(listing.price)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-semibold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {offerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{offerError}</span>
                </div>
              )}

              <form onSubmit={handleMakeOfferSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Your Offer Amount (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-serif font-bold text-stone-500">₹</span>
                    <input
                      id="offer-amount-input"
                      type="number"
                      min="1"
                      step="1"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      required
                      className="w-full pl-8 pr-3 py-2.5 text-sm font-serif font-bold border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Enter realistic counter-offer for seller review.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Message to Seller (Optional)
                  </label>
                  <textarea
                    id="offer-message-input"
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="e.g. Interested in picking this up tomorrow in Bandra. Cash ready."
                    rows={3}
                    className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOfferModal(false)}
                    disabled={submittingOffer}
                    className="flex-1 py-2.5 px-4 border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-offer-btn"
                    type="submit"
                    disabled={submittingOffer}
                    className="flex-1 py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {submittingOffer ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <span>Submit Offer</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM MARK AS SOLD MODAL */}
      <AnimatePresence>
        {showSoldConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowSoldConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="font-serif text-lg font-bold text-stone-900">
                  Confirm Offline Transaction?
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  Marking this collectible as <strong>SOLD</strong> will close open negotiations and block any future offers.
                </p>
              </div>

              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSoldConfirm(false)}
                  disabled={markingSold}
                  className="flex-1 py-2.5 border border-stone-300 text-stone-700 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-sold-btn"
                  type="button"
                  onClick={handleConfirmSold}
                  disabled={markingSold}
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center"
                >
                  {markingSold ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <span>Yes, Mark Sold</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
