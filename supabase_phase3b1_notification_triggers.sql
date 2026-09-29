-- =============================================================================
-- THE PAWN SHOP: PHASE 3B1 DATABASE NOTIFICATION TRIGGERS
-- Database: PostgreSQL 15+ (Supabase)
-- Scope: Fully automated server-side notification generation triggers
-- Security: SECURITY DEFINER with hardened search_path = public, pg_temp
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. IDEMPOTENT NOTIFICATION HUB FOUNDATION (PHASE 3A PREREQUISITE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    listing_id UUID NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    actor_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    reference_id UUID NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_notification_type CHECK (
        type IN (
            'listing_approved',
            'listing_favorited',
            'new_offer',
            'new_counter_offer',
            'new_chat_message'
        )
    )
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON public.notifications (recipient_id, is_read)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_listing_id
    ON public.notifications (listing_id)
    WHERE listing_id IS NOT NULL;

-- Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

-- INSERT Policy: Block direct client INSERTs (only server triggers insert)
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (false);

-- UPDATE Policy: User can update their own notification (mark as read)
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- DELETE Policy
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE TO authenticated
    USING (false);

-- Protect notification integrity on client updates
CREATE OR REPLACE FUNCTION public.protect_notification_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.recipient_id <> OLD.recipient_id
       OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
       OR NEW.type <> OLD.type
       OR NEW.title <> OLD.title
       OR NEW.body <> OLD.body
       OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
       OR NEW.reference_id IS DISTINCT FROM OLD.reference_id
       OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Only the is_read status of a notification may be updated.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_notification_update ON public.notifications;
CREATE TRIGGER trg_protect_notification_update
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_notification_update();

-- -----------------------------------------------------------------------------
-- 0.2 RECONCILE LISTINGS STATUS CHECK CONSTRAINT FOR MODERATION WORKFLOW
-- Allows 'pending_review' and 'rejected' while preserving all existing statuses:
-- 'available', 'approved', 'reserved', 'sold', 'removed'.
-- -----------------------------------------------------------------------------
ALTER TABLE public.listings 
    DROP CONSTRAINT IF EXISTS listings_status_check;

ALTER TABLE public.listings 
    DROP CONSTRAINT IF EXISTS chk_listings_status;

ALTER TABLE public.listings 
    ADD CONSTRAINT listings_status_check 
    CHECK (status IN ('pending_review', 'available', 'approved', 'reserved', 'sold', 'removed', 'rejected'));

-- =============================================================================
-- 1. TRIGGER 1: LISTING APPROVED NOTIFICATION
-- When a curator / admin approves a listing from pending_review to approved/available.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_notify_on_listing_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Check if listing transitioned from pending_review or rejected into available or approved
    IF NEW.status IN ('available', 'approved') 
       AND (OLD.status IN ('pending_review', 'rejected') OR OLD.status IS NULL) THEN
        
        INSERT INTO public.notifications (
            recipient_id,
            type,
            title,
            body,
            listing_id,
            actor_id,
            reference_id
        ) VALUES (
            NEW.seller_id,
            'listing_approved',
            'Listing Approved',
            'Your vintage listing "' || NEW.title || '" has been approved and is now live on the marketplace.',
            NEW.id,
            auth.uid(),
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_listing_approved ON public.listings;
CREATE TRIGGER trg_notify_on_listing_approved
    AFTER UPDATE OF status ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_on_listing_approved();

-- =============================================================================
-- 2. TRIGGER 2: LISTING FAVORITED NOTIFICATION
-- When a collector bookmarks / favorites a listing, notify the listing seller.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_notify_on_listing_favorited()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_seller_id UUID;
    v_listing_title TEXT;
    v_actor_name TEXT;
BEGIN
    -- Look up seller ID and listing title
    SELECT seller_id, title INTO v_seller_id, v_listing_title
    FROM public.listings
    WHERE id = NEW.listing_id;

    -- Suppress notification if seller bookmarks their own listing
    IF v_seller_id IS NOT NULL AND v_seller_id <> NEW.user_id THEN
        SELECT full_name INTO v_actor_name
        FROM public.profiles
        WHERE id = NEW.user_id;

        INSERT INTO public.notifications (
            recipient_id,
            type,
            title,
            body,
            listing_id,
            actor_id,
            reference_id
        ) VALUES (
            v_seller_id,
            'listing_favorited',
            'Listing Favorited',
            COALESCE(v_actor_name, 'A collector') || ' saved "' || v_listing_title || '" to their favorites.',
            NEW.listing_id,
            NEW.user_id,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_listing_favorited ON public.favorites;
CREATE TRIGGER trg_notify_on_listing_favorited
    AFTER INSERT ON public.favorites
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_on_listing_favorited();

-- =============================================================================
-- 3. TRIGGER 3 & 4: NEW OFFER & COUNTER-OFFER NOTIFICATIONS
-- When an offer is submitted, notify the negotiation counterparty.
-- Identifies initial offers as 'new_offer' and subsequent/seller bids as 'new_counter_offer'.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_listing_id UUID;
    v_listing_title TEXT;
    v_recipient_id UUID;
    v_sender_name TEXT;
    v_prior_offers_count INTEGER;
    v_notif_type TEXT;
    v_notif_title TEXT;
    v_notif_body TEXT;
    v_formatted_amount TEXT;
BEGIN
    -- Retrieve negotiation participants and listing title
    SELECT n.buyer_id, n.seller_id, n.listing_id, l.title
    INTO v_buyer_id, v_seller_id, v_listing_id, v_listing_title
    FROM public.negotiations n
    JOIN public.listings l ON l.id = n.listing_id
    WHERE n.id = NEW.negotiation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Route recipient to the opposite party
    IF NEW.sender_id = v_buyer_id THEN
        v_recipient_id := v_seller_id;
    ELSE
        v_recipient_id := v_buyer_id;
    END IF;

    -- Fetch sender display name
    SELECT full_name INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Check if any prior offers exist in this negotiation
    SELECT COUNT(*) INTO v_prior_offers_count
    FROM public.offers
    WHERE negotiation_id = NEW.negotiation_id
      AND id <> NEW.id;

    v_formatted_amount := '₹' || to_char(NEW.amount, 'FM99,99,99,999.00');

    -- An offer from the seller is always a counter-offer.
    -- An offer from buyer after previous offers is also a counter-offer.
    IF NEW.sender_id = v_seller_id OR v_prior_offers_count > 0 THEN
        v_notif_type := 'new_counter_offer';
        v_notif_title := 'Counter Offer Received';
        v_notif_body := COALESCE(v_sender_name, 'Seller') || ' proposed a counter-offer of ' || v_formatted_amount || ' on "' || v_listing_title || '".';
    ELSE
        v_notif_type := 'new_offer';
        v_notif_title := 'New Offer Received';
        v_notif_body := COALESCE(v_sender_name, 'A collector') || ' placed an offer of ' || v_formatted_amount || ' on "' || v_listing_title || '".';
    END IF;

    INSERT INTO public.notifications (
        recipient_id,
        type,
        title,
        body,
        listing_id,
        actor_id,
        reference_id
    ) VALUES (
        v_recipient_id,
        v_notif_type,
        v_notif_title,
        v_notif_body,
        v_listing_id,
        NEW.sender_id,
        NEW.id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_offer ON public.offers;
CREATE TRIGGER trg_notify_on_new_offer
    AFTER INSERT ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_on_new_offer();

-- =============================================================================
-- 4. TRIGGER 5: NEW CHAT MESSAGE NOTIFICATION
-- When a chat message is sent inside a negotiation thread, notify the recipient.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_listing_id UUID;
    v_listing_title TEXT;
    v_recipient_id UUID;
    v_sender_name TEXT;
    v_snippet TEXT;
BEGIN
    -- Retrieve negotiation participants and listing title
    SELECT n.buyer_id, n.seller_id, n.listing_id, l.title
    INTO v_buyer_id, v_seller_id, v_listing_id, v_listing_title
    FROM public.negotiations n
    JOIN public.listings l ON l.id = n.listing_id
    WHERE n.id = NEW.negotiation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- Route recipient to opposite party
    IF NEW.sender_id = v_buyer_id THEN
        v_recipient_id := v_seller_id;
    ELSE
        v_recipient_id := v_buyer_id;
    END IF;

    -- Fetch sender display name
    SELECT full_name INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Format a brief preview snippet
    IF length(NEW.message) > 60 THEN
        v_snippet := substring(NEW.message FROM 1 FOR 57) || '...';
    ELSE
        v_snippet := NEW.message;
    END IF;

    INSERT INTO public.notifications (
        recipient_id,
        type,
        title,
        body,
        listing_id,
        actor_id,
        reference_id
    ) VALUES (
        v_recipient_id,
        'new_chat_message',
        'New Message',
        COALESCE(v_sender_name, 'Partner') || ' on "' || v_listing_title || '": "' || v_snippet || '"',
        v_listing_id,
        NEW.sender_id,
        NEW.id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_on_new_message();
