-- =============================================================================
-- THE PAWN SHOP: RECONCILE LISTINGS STATUS CHECK CONSTRAINT
-- Purpose: Allow 'pending_review' and 'rejected' for moderation workflow
--          while preserving all existing production status values.
-- Idempotent & Non-destructive migration
-- =============================================================================

-- Drop existing constraint (default PostgreSQL name for inline check on status)
ALTER TABLE public.listings 
    DROP CONSTRAINT IF EXISTS listings_status_check;

-- Also drop named constraint if it exists from other migrations
ALTER TABLE public.listings 
    DROP CONSTRAINT IF EXISTS chk_listings_status;

-- Add reconciled CHECK constraint preserving all existing statuses:
-- 'pending_review' : initial state for user-created listings awaiting moderation
-- 'available'      : approved & visible in marketplace browse
-- 'approved'       : synonym used in curation tracking
-- 'reserved'       : item currently in agreed negotiation
-- 'sold'           : transaction completed (offline cash handover)
-- 'removed'        : admin/curator delisted
-- 'rejected'       : admin/curator rejected from pending review
ALTER TABLE public.listings 
    ADD CONSTRAINT listings_status_check 
    CHECK (status IN ('pending_review', 'available', 'approved', 'reserved', 'sold', 'removed', 'rejected'));
