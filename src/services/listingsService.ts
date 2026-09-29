import { supabase } from '../lib/supabase';
import type { Listing, ListingImage, ListingWithDetails, Profile, ListingStatus } from '../types';
import { uploadListingImage } from './storageService';

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  condition: string;
  year?: number | null;
  brand?: string | null;
  location: string;
  imageFiles?: File[];
  imageUrls?: string[]; // in case pre-hosted URLs are provided
}

export interface UpdateListingInput {
  title?: string;
  description?: string;
  price?: number;
  condition?: string;
  year?: number | null;
  brand?: string | null;
  location?: string;
  status?: ListingStatus;
}

/**
 * Fetches all available (or active) listings for the marketplace browse feed.
 * Includes first image and seller profile.
 * Supports keyword search over title, description, brand, location.
 */
export async function fetchListings(searchQuery?: string): Promise<ListingWithDetails[]> {
  let query = supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(*),
      images:listing_images(*)
    `)
    .in('status', ['available', 'approved', 'reserved', 'sold'])
    .order('created_at', { ascending: false });

  if (searchQuery && searchQuery.trim() !== '') {
    const term = `%${searchQuery.trim()}%`;
    query = query.or(`title.ilike.${term},description.ilike.${term},brand.ilike.${term},location.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchListings error:', error);
    throw new Error(`Failed to load listings: ${error.message}`);
  }

  return (data as any[])?.map((item) => ({
    ...item,
    seller: item.seller as Profile,
    images: (item.images as ListingImage[])?.sort((a, b) => a.display_order - b.display_order) || [],
  })) || [];
}

/**
 * Fetches single listing by ID with full details (images + seller).
 */
export async function fetchListingById(id: string): Promise<ListingWithDetails | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(*),
      images:listing_images(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('fetchListingById error:', error);
    throw new Error(`Failed to load listing: ${error.message}`);
  }

  if (!data) return null;

  const raw: any = data;
  return {
    ...raw,
    seller: raw.seller as Profile,
    images: (raw.images as ListingImage[])?.sort((a, b) => a.display_order - b.display_order) || [],
  };
}

/**
 * Fetches listings authored by a specific user (My Listings).
 */
export async function fetchUserListings(userId: string): Promise<ListingWithDetails[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(*),
      images:listing_images(*)
    `)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchUserListings error:', error);
    throw new Error(`Failed to load user listings: ${error.message}`);
  }

  return (data as any[])?.map((item) => ({
    ...item,
    seller: item.seller as Profile,
    images: (item.images as ListingImage[])?.sort((a, b) => a.display_order - b.display_order) || [],
  })) || [];
}

/**
 * Creates a new listing.
 * Authenticated user's Supabase ID automatically becomes seller_id.
 * Validates fields, creates listing row, uploads images into storage, and writes listing_images.
 */
export async function createListing(input: CreateListingInput, sellerId: string): Promise<ListingWithDetails> {
  // 1. Validation
  if (!input.title || input.title.trim().length < 3) {
    throw new Error('Title must be at least 3 characters');
  }
  if (input.title.length > 150) {
    throw new Error('Title cannot exceed 150 characters');
  }
  if (!input.description || input.description.trim().length < 10) {
    throw new Error('Description must be at least 10 characters');
  }
  if (!input.price || Number(input.price) <= 0) {
    throw new Error('Price must be greater than zero');
  }
  if (!input.condition) {
    throw new Error('Please select an item condition');
  }
  if (!input.location || input.location.trim().length < 2) {
    throw new Error('Location is required for offline meetups');
  }

  const currentYear = new Date().getFullYear();
  if (input.year && (input.year < 1500 || input.year > currentYear + 1)) {
    throw new Error(`Year must be between 1500 and ${currentYear + 1}`);
  }

  // 2. Insert Listing
  const { data: newListing, error: insertError } = await supabase
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: input.title.trim(),
      description: input.description.trim(),
      price: Number(input.price),
      condition: input.condition,
      year: input.year ? Number(input.year) : null,
      brand: input.brand?.trim() || null,
      location: input.location.trim(),
      status: 'pending_review',
    })
    .select()
    .single();

  if (insertError || !newListing) {
    console.error('createListing insert error:', insertError);
    throw new Error(`Failed to create listing: ${insertError?.message || 'No record created'}`);
  }

  const createdItem: any = newListing;
  const listingId = createdItem.id;
  const imageRecords: { listing_id: string; image_url: string; display_order: number }[] = [];

  // 3. Upload and link image files if provided
  if (input.imageFiles && input.imageFiles.length > 0) {
    for (let i = 0; i < input.imageFiles.length; i++) {
      const file = input.imageFiles[i];
      try {
        const url = await uploadListingImage(listingId, file);
        imageRecords.push({
          listing_id: listingId,
          image_url: url,
          display_order: i,
        });
      } catch (uploadErr: any) {
        console.warn(`Image ${i + 1} upload failed:`, uploadErr?.message);
      }
    }
  }

  // 4. Link pre-existing image URLs if provided (e.g. curated vintage photos or camera uploads)
  if (input.imageUrls && input.imageUrls.length > 0) {
    const startIndex = imageRecords.length;
    input.imageUrls.forEach((url, idx) => {
      if (url && url.trim()) {
        imageRecords.push({
          listing_id: listingId,
          image_url: url.trim(),
          display_order: startIndex + idx,
        });
      }
    });
  }

  // Insert image rows
  if (imageRecords.length > 0) {
    const { error: imgInsertError } = await supabase
      .from('listing_images')
      .insert(imageRecords);

    if (imgInsertError) {
      console.warn('Listing images insert error:', imgInsertError.message);
    }
  }

  // Return hydrated listing
  const fullListing = await fetchListingById(listingId);
  if (!fullListing) throw new Error('Listing created but failed to reload');
  return fullListing;
}

/**
 * Updates an existing listing. RLS guarantees only the owner can update.
 */
export async function updateListing(id: string, updates: UpdateListingInput): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('updateListing error:', error);
    throw new Error(`Failed to update listing: ${error.message}`);
  }
}

/**
 * Marks listing as sold. Triggers automated negotiation closure and offer superseding.
 */
export async function markListingAsSold(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({
      status: 'sold',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('markListingAsSold error:', error);
    throw new Error(`Failed to mark listing as sold: ${error.message}`);
  }
}

/**
 * Marks listing as removed (soft delete or status update).
 */
export async function removeListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({
      status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('removeListing error:', error);
    throw new Error(`Failed to remove listing: ${error.message}`);
  }
}

/**
 * Deletes listing permanently if seller wishes.
 */
export async function deleteListingPermanently(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteListing error:', error);
    throw new Error(`Failed to delete listing: ${error.message}`);
  }
}
