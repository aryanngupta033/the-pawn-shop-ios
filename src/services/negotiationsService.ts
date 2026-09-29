import { supabase } from '../lib/supabase';
import type { NegotiationWithContext, Negotiation, Offer, Profile, Listing, ListingImage } from '../types';

/**
 * Fetches all negotiations where current user is either buyer or seller.
 * Returns hydrated negotiation list with listing, buyer, seller, and offers.
 */
export async function fetchUserNegotiations(userId: string): Promise<NegotiationWithContext[]> {
  const { data, error } = await supabase
    .from('negotiations')
    .select(`
      *,
      listing:listings (
        *,
        images:listing_images(*)
      ),
      buyer:profiles!negotiations_buyer_id_fkey(*),
      seller:profiles!negotiations_seller_id_fkey(*),
      offers:offers(*)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('fetchUserNegotiations error:', error);
    throw new Error(`Failed to load negotiations: ${error.message}`);
  }

  return (data as any[])?.map((neg) => {
    const sortedOffers = (neg.offers as Offer[])?.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) || [];

    const latestOffer = sortedOffers.length > 0 ? sortedOffers[sortedOffers.length - 1] : undefined;

    return {
      ...neg,
      listing: {
        ...neg.listing,
        images: (neg.listing?.images as ListingImage[])?.sort((a, b) => a.display_order - b.display_order) || [],
      },
      buyer: neg.buyer as Profile,
      seller: neg.seller as Profile,
      offers: sortedOffers,
      latest_offer: latestOffer,
    };
  }) || [];
}

/**
 * Fetches a single negotiation by ID with full context (listing, buyer, seller, ordered offers).
 */
export async function fetchNegotiationById(negotiationId: string): Promise<NegotiationWithContext | null> {
  const { data, error } = await supabase
    .from('negotiations')
    .select(`
      *,
      listing:listings (
        *,
        images:listing_images(*)
      ),
      buyer:profiles!negotiations_buyer_id_fkey(*),
      seller:profiles!negotiations_seller_id_fkey(*),
      offers:offers(*)
    `)
    .eq('id', negotiationId)
    .maybeSingle();

  if (error) {
    console.error('fetchNegotiationById error:', error);
    throw new Error(`Failed to load negotiation details: ${error.message}`);
  }

  if (!data) return null;

  const raw: any = data;
  const sortedOffers = (raw.offers as Offer[])?.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || [];

  return {
    ...raw,
    listing: {
      ...raw.listing,
      images: (raw.listing?.images as ListingImage[])?.sort((a, b) => a.display_order - b.display_order) || [],
    },
    buyer: raw.buyer as Profile,
    seller: raw.seller as Profile,
    offers: sortedOffers,
    latest_offer: sortedOffers[sortedOffers.length - 1],
  };
}

/**
 * Finds an existing negotiation between buyer and listing, or creates a new one.
 * Prevents multiple duplicate negotiations.
 */
export async function getOrCreateNegotiation(
  listingId: string,
  buyerId: string,
  sellerId: string
): Promise<Negotiation> {
  if (buyerId === sellerId) {
    throw new Error('You cannot negotiate with yourself on your own listing');
  }

  // Check if negotiation already exists
  const { data: existing, error: findError } = await supabase
    .from('negotiations')
    .select('*')
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (findError) {
    console.warn('find negotiation check:', findError.message);
  }

  if (existing) {
    return existing;
  }

  // Create new negotiation
  const { data: created, error: insertError } = await supabase
    .from('negotiations')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: sellerId,
      status: 'active',
    })
    .select()
    .single();

  if (insertError) {
    // If concurrent creation happened, fetch existing
    if (insertError.code === '23505') {
      const { data: retry } = await supabase
        .from('negotiations')
        .select('*')
        .eq('listing_id', listingId)
        .eq('buyer_id', buyerId)
        .single();
      if (retry) return retry;
    }
    console.error('Create negotiation error:', insertError);
    throw new Error(`Could not initiate negotiation: ${insertError.message}`);
  }

  return created;
}

/**
 * Submits an offer or counter-offer within a negotiation.
 * Trigger automatically supersedes previous pending offers.
 */
export async function submitOffer(
  negotiationId: string,
  senderId: string,
  amount: number,
  message?: string
): Promise<Offer> {
  if (!amount || amount <= 0) {
    throw new Error('Offer amount must be a positive number');
  }

  const { data, error } = await supabase
    .from('offers')
    .insert({
      negotiation_id: negotiationId,
      sender_id: senderId,
      amount: Number(amount),
      message: message?.trim() || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('submitOffer error:', error);
    throw new Error(`Failed to submit offer: ${error.message}`);
  }

  // Update negotiation updated_at
  await supabase
    .from('negotiations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', negotiationId);

  return data;
}

/**
 * Accepts a pending offer.
 * Automatically triggers negotiation status update to 'agreed'.
 */
export async function acceptOffer(offerId: string, negotiationId: string): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .update({ status: 'accepted' })
    .eq('id', offerId);

  if (error) {
    console.error('acceptOffer error:', error);
    throw new Error(`Failed to accept offer: ${error.message}`);
  }

  // Update negotiation status to 'agreed' (backup guarantee for trigger)
  await supabase
    .from('negotiations')
    .update({ status: 'agreed', updated_at: new Date().toISOString() })
    .eq('id', negotiationId);
}

/**
 * Rejects a pending offer.
 */
export async function rejectOffer(offerId: string, negotiationId: string): Promise<void> {
  const { error } = await supabase
    .from('offers')
    .update({ status: 'rejected' })
    .eq('id', offerId);

  if (error) {
    console.error('rejectOffer error:', error);
    throw new Error(`Failed to reject offer: ${error.message}`);
  }

  await supabase
    .from('negotiations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', negotiationId);
}
