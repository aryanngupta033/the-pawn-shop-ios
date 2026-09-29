/**
 * The Pawn Shop - Core Type Definitions & Database Contracts
 * Corresponds to PostgreSQL / Supabase Schema V1
 */

// ============================================================================
// STATUS LITERALS & UNIONS
// ============================================================================

export type ListingStatus = 'pending_review' | 'available' | 'approved' | 'reserved' | 'sold' | 'removed' | 'rejected';

export type NegotiationStatus = 'active' | 'agreed' | 'rejected' | 'closed';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'superseded';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type NotificationType = 
  | 'listing_approved' 
  | 'listing_favorited' 
  | 'new_offer' 
  | 'new_counter_offer' 
  | 'new_chat_message';

// ============================================================================
// CORE ENTITY SCHEMAS (Database Tables)
// ============================================================================

/**
 * 1. profiles
 * Public profile information linked to Supabase auth.users.
 * Unified account model: no distinct buyer/seller roles.
 */
export interface Profile {
  id: string; // UUID references auth.users.id
  full_name: string;
  avatar_url: string | null;
  location: string | null;
  created_at: string; // ISO 8601 timestamptz
}

/**
 * 2. listings
 * Vintage / collectible items listed by users.
 * seller_id represents immutable ownership.
 */
export interface Listing {
  id: string; // UUID PK
  seller_id: string; // UUID FK -> profiles.id
  title: string;
  description: string;
  price: number; // numeric(12,2)
  condition: string;
  year: number | null;
  brand: string | null;
  location: string;
  status: ListingStatus;
  created_at: string; // ISO 8601 timestamptz
  updated_at: string; // ISO 8601 timestamptz
}

/**
 * 3. listing_images
 * Visual assets associated with a listing.
 * Supports multiple ordered images per listing.
 */
export interface ListingImage {
  id: string; // UUID PK
  listing_id: string; // UUID FK -> listings.id
  image_url: string;
  display_order: number;
  created_at: string; // ISO 8601 timestamptz
}

/**
 * 4. favorites
 * Saved listings per user.
 * Unique constraint on (user_id, listing_id).
 */
export interface Favorite {
  id: string; // UUID PK
  user_id: string; // UUID FK -> profiles.id
  listing_id: string; // UUID FK -> listings.id
  created_at: string; // ISO 8601 timestamptz
}

/**
 * 5. negotiations
 * The bargaining context between a prospective buyer and the listing seller.
 * buyer_id and seller_id are contextual to this negotiation, not permanent user roles.
 */
export interface Negotiation {
  id: string; // UUID PK
  listing_id: string; // UUID FK -> listings.id
  buyer_id: string; // UUID FK -> profiles.id
  seller_id: string; // UUID FK -> profiles.id
  status: NegotiationStatus;
  created_at: string; // ISO 8601 timestamptz
  updated_at: string; // ISO 8601 timestamptz
}

/**
 * 6. offers
 * Price proposals and counter-offers within a negotiation.
 * Every offer is preserved to maintain an immutable history.
 */
export interface Offer {
  id: string; // UUID PK
  negotiation_id: string; // UUID FK -> negotiations.id
  sender_id: string; // UUID FK -> profiles.id
  amount: number; // numeric(12,2)
  message: string | null;
  status: OfferStatus;
  created_at: string; // ISO 8601 timestamptz
}

/**
 * 7. messages
 * Direct in-negotiation communication between buyer and seller.
 * Context is bound to negotiation_id (no separate conversations table in V1).
 */
export interface Message {
  id: string; // UUID PK
  negotiation_id: string; // UUID FK -> negotiations.id
  sender_id: string; // UUID FK -> profiles.id
  message: string;
  created_at: string; // ISO 8601 timestamptz
  read_at: string | null; // ISO 8601 timestamptz
}

/**
 * 8. reports
 * User or listing flags for administrative review.
 */
export interface Report {
  id: string; // UUID PK
  reporter_id: string; // UUID FK -> profiles.id
  listing_id: string | null; // UUID FK -> listings.id
  reported_user_id: string | null; // UUID FK -> profiles.id
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string; // ISO 8601 timestamptz
}

/**
 * 9. notifications
 * Real-time and persistent in-app notifications for collectors & sellers.
 */
export interface Notification {
  id: string; // UUID PK
  recipient_id: string; // UUID FK -> profiles.id
  type: NotificationType;
  title: string;
  body: string;
  listing_id: string | null; // UUID FK -> listings.id
  actor_id: string | null; // UUID FK -> profiles.id
  reference_id: string | null; // UUID reference (offer, message, negotiation)
  is_read: boolean;
  created_at: string; // ISO 8601 timestamptz
}

/**
 * Notification enriched with related actor profile and listing info for display.
 */
export interface NotificationWithDetails extends Notification {
  actor?: Profile | null;
  listing?: Listing | null;
}

// ============================================================================
// DATABASE VIEW DEFINITION
// ============================================================================

/**
 * marketplace_overview
 * Flattened reporting view for administrative oversight and export.
 */
export interface MarketplaceOverviewRow {
  'User ID': string;
  'User Name': string;
  'User Email': string | null;
  'User Location': string | null;
  'Listing ID': string;
  'Listing Title': string;
  Price: number;
  Condition: string;
  'Listing Location': string;
  'Listing Status': ListingStatus;
  'Created At': string;
}

// ============================================================================
// ADMIN / MODERATION TYPES (Phase 5)
// ============================================================================

export interface AdminDashboardMetrics {
  totalUsers: number;
  totalListings: number;
  pendingListings: number;
  availableListings: number;
  reservedListings: number;
  soldListings: number;
  removedListings: number;
  openReports: number;
}

export interface AdminUserWithListings extends Profile {
  email?: string | null;
  listings_count: number;
  recent_listings?: Listing[];
}

export interface AdminReportWithDetails extends Report {
  reporter: Profile;
  listing?: Listing | null;
  reported_user?: Profile | null;
}

// ============================================================================
// HYDRATED / COMPOSITE TYPES (Used in UI & API layers)
// ============================================================================

export interface ListingWithDetails extends Listing {
  seller: Profile;
  images: ListingImage[];
  is_favorited?: boolean;
}

export interface NegotiationWithContext extends Negotiation {
  listing: Listing & { images: ListingImage[] };
  buyer: Profile;
  seller: Profile;
  latest_offer?: Offer;
  offers: Offer[];
  unread_count?: number;
}
