import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Heart, MapPin, Tag, ArrowUpDown, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import type { ListingWithDetails } from '../types';
import { fetchListings } from '../services/listingsService';
import { toggleFavorite, isListingFavorited } from '../services/favoritesService';
import { formatPrice, getConditionColor, getStatusBadge } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface BrowseScreenProps {
  onSelectListing: (listingId: string) => void;
  onRequireAuth: () => void;
}

export const BrowseScreen: React.FC<BrowseScreenProps> = ({ onSelectListing, onRequireAuth }) => {
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [togglingFav, setTogglingFav] = useState<Record<string, boolean>>({});
  const [sortBy, setSortBy] = useState<'recent' | 'price_low' | 'price_high'>('recent');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch listings
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchListings(debouncedQuery);
      setListings(items);

      // Check favorites if user is logged in
      if (user && items.length > 0) {
        const favs: Record<string, boolean> = {};
        await Promise.all(
          items.map(async (item) => {
            try {
              const isFav = await isListingFavorited(user.id, item.id);
              favs[item.id] = isFav;
            } catch (e) {
              // ignore fav check error
            }
          })
        );
        setFavoriteMap(favs);
      }
    } catch (err: any) {
      console.error('Failed to load browse items:', err);
      setError(err?.message || 'Unable to load marketplace items. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [debouncedQuery, user?.id]);

  const handleToggleFavorite = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      setTogglingFav((prev) => ({ ...prev, [listingId]: true }));
      const newState = await toggleFavorite(user.id, listingId);
      setFavoriteMap((prev) => ({ ...prev, [listingId]: newState }));
    } catch (err: any) {
      console.error('Favorite toggle error:', err);
    } finally {
      setTogglingFav((prev) => ({ ...prev, [listingId]: false }));
    }
  };

  // Sort listings
  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === 'price_low') return a.price - b.price;
    if (sortBy === 'price_high') return b.price - a.price;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Search & Utility Bar */}
      <div className="bg-white border border-[#e7e2d9] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="browse-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vintage timepieces, collectibles, instruments, art..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-stone-200 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium px-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
              <span>Sort:</span>
            </div>
            <select
              id="browse-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-700 focus:outline-hidden focus:border-amber-700 cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 font-semibold text-rose-900 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-6 h-6 text-amber-700 animate-spin" />
          <p className="text-xs text-stone-500 font-sans tracking-wide">
            Retrieving authenticated vintage archive...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedListings.length === 0 && (
        <div className="py-20 text-center bg-white border border-[#e7e2d9] rounded-xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">
            {debouncedQuery ? 'No matching collectibles found' : 'No listings currently available'}
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
            {debouncedQuery
              ? `No items found matching "${debouncedQuery}". Try refining your search terms.`
              : 'Be the first collector to publish a curated vintage listing.'}
          </p>
          {debouncedQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-stone-800 text-stone-100 text-xs font-semibold rounded-md hover:bg-stone-700 transition-colors cursor-pointer"
            >
              View All Collectibles
            </button>
          )}
        </div>
      )}

      {/* Grid of Listings */}
      {!loading && !error && sortedListings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedListings.map((listing) => {
            const isFav = Boolean(favoriteMap[listing.id]);
            const isSold = listing.status === 'sold';
            const condStyle = getConditionColor(listing.condition);
            const primaryImg =
              listing.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800';

            return (
              <div
                key={listing.id}
                id={`listing-card-${listing.id}`}
                onClick={() => onSelectListing(listing.id)}
                className="group bg-white border border-[#e7e2d9] hover:border-amber-700/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={primaryImg}
                    alt={listing.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Status Overlay if Sold */}
                  {isSold && (
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="font-serif font-bold text-xs tracking-widest text-white border-2 border-white px-3 py-1 rounded uppercase">
                        SOLD
                      </span>
                    </div>
                  )}

                  {/* Condition Tag */}
                  <div className="absolute bottom-2.5 left-2.5">
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-xs border ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}
                    >
                      {listing.condition}
                    </span>
                  </div>

                  {/* Year Tag if exists */}
                  {listing.year && (
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="text-[10px] font-mono bg-stone-900/80 text-stone-200 px-2 py-0.5 rounded backdrop-blur-xs">
                        {listing.year}
                      </span>
                    </div>
                  )}

                  {/* Favorite Button */}
                  <motion.button
                    id={`fav-btn-${listing.id}`}
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, listing.id)}
                    disabled={togglingFav[listing.id]}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 hover:bg-white text-stone-700 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                    title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                  >
                    <motion.div
                      animate={isFav ? { scale: [1, 1.22, 1] } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors duration-200 ${
                          isFav ? 'text-rose-600 fill-rose-600' : 'text-stone-600'
                        }`}
                      />
                    </motion.div>
                  </motion.button>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {listing.brand && (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 block mb-0.5">
                        {listing.brand}
                      </span>
                    )}
                    <h3 className="font-serif text-sm font-semibold text-stone-900 line-clamp-1 group-hover:text-amber-900 transition-colors">
                      {listing.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                        Asking Price
                      </span>
                      <span className="font-serif text-base font-bold text-stone-900">
                        {formatPrice(listing.price)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                        Location
                      </span>
                      <span className="text-xs text-stone-600 flex items-center gap-0.5 justify-end font-medium">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        <span className="truncate max-w-[110px]">{listing.location}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
