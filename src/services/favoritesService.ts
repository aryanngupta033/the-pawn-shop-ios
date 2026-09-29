import { supabase } from '../lib/supabase';
import type { ListingWithDetails, Profile, ListingImage } from '../types';

/**
 * Fetches all listings favorited by a user.
 */
export async function fetchUserFavorites(userId: string): Promise<ListingWithDetails[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      listing_id,
      created_at,
      listing:listings (
        *,
        seller:profiles!listings_seller_id_fkey(*),
        images:listing_images(*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchUserFavorites error:', error);
    throw new Error(`Failed to load favorites: ${error.message}`);
  }

  const results: ListingWithDetails[] = [];
  (data as any[])?.forEach((fav) => {
    if (fav.listing) {
      results.push({
        ...fav.listing,
        seller: fav.listing.seller as Profile,
        images: (fav.listing.images as ListingImage[])?.sort((a, b) => a.display_order - b.display_order) || [],
        is_favorited: true,
      });
    }
  });

  return results;
}

/**
 * Checks if a specific listing is favorited by the user.
 */
export async function isListingFavorited(userId: string, listingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();

  if (error) {
    console.warn('isListingFavorited check warning:', error.message);
    return false;
  }

  return Boolean(data);
}

/**
 * Toggles a favorite on/off for the given user and listing.
 * Returns new favorited state (true = now favorited, false = unfavorited).
 */
export async function toggleFavorite(userId: string, listingId: string): Promise<boolean> {
  // Check if already favorited
  const alreadyFav = await isListingFavorited(userId, listingId);

  if (alreadyFav) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    if (error) {
      console.error('Remove favorite error:', error);
      throw new Error(`Failed to remove favorite: ${error.message}`);
    }
    return false;
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        listing_id: listingId,
      });

    if (error) {
      // If unique violation occurred concurrently, treat as already favorited
      if (error.code === '23505') {
        return true;
      }
      console.error('Add favorite error:', error);
      throw new Error(`Failed to add favorite: ${error.message}`);
    }
    return true;
  }
}
