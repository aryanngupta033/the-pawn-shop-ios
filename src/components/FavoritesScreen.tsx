import React, { useState, useEffect } from 'react';
import { Heart, Trash2, MapPin, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';
import { fetchUserFavorites, toggleFavorite } from '../services/favoritesService';
import type { ListingWithDetails } from '../types';
import { formatPrice, getConditionColor, getStatusBadge } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface FavoritesScreenProps {
  onSelectListing: (id: string) => void;
  onBrowse: () => void;
  onRequireAuth: () => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onSelectListing,
  onBrowse,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<ListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadFavorites = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserFavorites(user.id);
      setFavorites(data);
    } catch (err: any) {
      console.error('Error loading favorites:', err);
      setError(err?.message || 'Failed to load your saved collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xs">
          <Heart className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Saved Collectibles</h2>
          <p className="text-xs text-stone-600 mb-6">
            Sign in to access your curated watchlist and saved vintage items.
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

  const handleRemove = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    try {
      setRemovingId(listingId);
      await toggleFavorite(user.id, listingId);
      setFavorites((prev) => prev.filter((item) => item.id !== listingId));
    } catch (err: any) {
      console.error('Failed to remove favorite:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Saved Vintage Pieces
        </h1>
        <p className="text-xs text-stone-500">
          Items you are monitoring for potential offers and offline acquisition.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
          <p className="text-xs text-stone-500">Loading saved archive...</p>
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 max-w-md mx-auto">
          <Heart className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">
            No Saved Collectibles
          </h3>
          <p className="text-xs text-stone-500 mb-6 leading-relaxed">
            Browse the catalog and tap the heart icon on any piece to save it to your personal watchlist.
          </p>
          <button
            onClick={onBrowse}
            className="px-5 py-2.5 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Explore Market Archive
          </button>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {favorites.map((listing) => {
            const isSold = listing.status === 'sold';
            const condStyle = getConditionColor(listing.condition);
            const primaryImg =
              listing.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800';

            return (
              <div
                key={listing.id}
                id={`favorite-card-${listing.id}`}
                onClick={() => onSelectListing(listing.id)}
                className="group bg-white border border-[#e7e2d9] hover:border-amber-700/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                  <img
                    src={primaryImg}
                    alt={listing.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />

                  {isSold && (
                    <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="font-serif font-bold text-xs tracking-widest text-white border-2 border-white px-3 py-1 rounded uppercase">
                        SOLD
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-2.5">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded backdrop-blur-xs border ${condStyle.bg} ${condStyle.text} ${condStyle.border}`}
                    >
                      {listing.condition}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, listing.id)}
                    disabled={removingId === listing.id}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                    title="Remove from saved"
                  >
                    <Heart className="w-4 h-4 fill-rose-600" />
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {listing.brand && (
                      <span className="text-[10px] uppercase font-bold tracking-widest text-amber-800 block mb-0.5">
                        {listing.brand}
                      </span>
                    )}
                    <h3 className="font-serif text-sm font-semibold text-stone-900 line-clamp-1">
                      {listing.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
                        Price
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
                        <span className="truncate max-w-[100px]">{listing.location}</span>
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
