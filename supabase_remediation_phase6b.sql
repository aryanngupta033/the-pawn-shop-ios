-- =============================================================================
-- THE PAWN SHOP: PHASE 6B SECURITY REMEDIATION MIGRATION
-- Database: PostgreSQL 15+ (Supabase)
-- Resolves Findings: 01, 02, 03, 04, 05, 06, 07, 10
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FINDING 06 — SECURITY DEFINER SEARCH PATH HARDENING
-- Prevent search_path hijacking on SECURITY DEFINER functions.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    claims jsonb;
    user_role text;
BEGIN
    claims := current_setting('request.jwt.claims', true)::jsonb;
    IF claims IS NULL THEN
        RETURN false;
    END IF;
    user_role := claims #>> '{app_metadata,role}';
    RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, location)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Anonymous User'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
        COALESCE(NEW.raw_user_meta_data->>'location', 'Kolkata, WB')
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. FINDING 04 — OFFERS UPDATE INTEGRITY
-- Protect historical transaction data: amount, sender_id, negotiation_id,
-- created_at, message cannot be mutated by users.
-- Only recipient can accept/reject pending offers.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_offer_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow administrative actions if required
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Non-admins cannot alter immutable transaction fields:
    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Cannot modify offer id';
    END IF;
    IF NEW.negotiation_id <> OLD.negotiation_id THEN
        RAISE EXCEPTION 'Cannot modify offer negotiation_id';
    END IF;
    IF NEW.sender_id <> OLD.sender_id THEN
        RAISE EXCEPTION 'Cannot modify offer sender_id';
    END IF;
    IF NEW.amount <> OLD.amount THEN
        RAISE EXCEPTION 'Cannot modify offer amount';
    END IF;
    IF NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Cannot modify offer created_at';
    END IF;
    IF (NEW.message IS DISTINCT FROM OLD.message) THEN
        RAISE EXCEPTION 'Cannot modify offer message';
    END IF;

    -- Finalized offers (accepted, rejected, superseded) cannot be reopened or changed
    IF OLD.status IN ('accepted', 'rejected', 'superseded') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Cannot change status of an already finalized offer';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_offer_integrity ON public.offers;
CREATE TRIGGER trg_protect_offer_integrity
    BEFORE UPDATE ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_offer_integrity();

-- Strengthen RLS policy WITH CHECK for offers
DROP POLICY IF EXISTS "offers_update_policy" ON public.offers;
CREATE POLICY "offers_update_policy"
    ON public.offers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = offers.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
              AND offers.sender_id <> auth.uid()
        )
        OR public.is_admin()
    )
    WITH CHECK (
        (
            EXISTS (
                SELECT 1 FROM public.negotiations n
                WHERE n.id = offers.negotiation_id
                  AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
                  AND offers.sender_id <> auth.uid()
            )
            AND amount = offers.amount
            AND sender_id = offers.sender_id
            AND negotiation_id = offers.negotiation_id
            AND created_at = offers.created_at
        )
        OR public.is_admin()
    );

-- -----------------------------------------------------------------------------
-- 3. FINDING 05 — MESSAGE UPDATE INTEGRITY
-- Messages are historical communication records.
-- Participants can only mark messages read (read_at); text, sender,
-- negotiation, and created_at are immutable.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_message_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Cannot modify message id';
    END IF;
    IF NEW.negotiation_id <> OLD.negotiation_id THEN
        RAISE EXCEPTION 'Cannot modify message negotiation_id';
    END IF;
    IF NEW.sender_id <> OLD.sender_id THEN
        RAISE EXCEPTION 'Cannot modify message sender_id';
    END IF;
    IF NEW.message <> OLD.message THEN
        RAISE EXCEPTION 'Cannot modify message text';
    END IF;
    IF NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Cannot modify message created_at';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_message_integrity ON public.messages;
CREATE TRIGGER trg_protect_message_integrity
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_message_integrity();

-- Strengthen RLS policy WITH CHECK for messages
DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = messages.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
              AND messages.sender_id <> auth.uid()
        )
        OR public.is_admin()
    )
    WITH CHECK (
        (
            EXISTS (
                SELECT 1 FROM public.negotiations n
                WHERE n.id = messages.negotiation_id
                  AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
                  AND messages.sender_id <> auth.uid()
            )
            AND message = messages.message
            AND sender_id = messages.sender_id
            AND negotiation_id = messages.negotiation_id
            AND created_at = messages.created_at
        )
        OR public.is_admin()
    );

-- -----------------------------------------------------------------------------
-- 4. FINDING 01 — SOLD LISTING INTEGRITY
-- Once a listing is marked 'sold', seller cannot rewrite historical fields
-- (title, description, price, condition, year, brand, location, seller_id, status).
-- Admin moderation remains possible.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_sold_listing_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- If the listing was already sold, prevent tampering with historical fields or status reopening
    IF OLD.status = 'sold' THEN
        IF NEW.title <> OLD.title
           OR NEW.description <> OLD.description
           OR NEW.price <> OLD.price
           OR NEW.condition <> OLD.condition
           OR (NEW.year IS DISTINCT FROM OLD.year)
           OR (NEW.brand IS DISTINCT FROM OLD.brand)
           OR NEW.location <> OLD.location
           OR NEW.seller_id <> OLD.seller_id
           OR NEW.status <> OLD.status THEN
            RAISE EXCEPTION 'Cannot modify historical fields of a sold listing';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_sold_listing ON public.listings;
CREATE TRIGGER trg_protect_sold_listing
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_sold_listing_integrity();

-- -----------------------------------------------------------------------------
-- 5. FINDING 03 — NEGOTIATION STATUS / OWNERSHIP INTEGRITY
-- Protect buyer_id, seller_id, and listing_id against tampering.
-- Prevent arbitrary transition to 'agreed' without an accepted offer.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_negotiation_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Protect immutable relational identities
    IF NEW.buyer_id <> OLD.buyer_id THEN
        RAISE EXCEPTION 'Cannot modify negotiation buyer_id';
    END IF;
    IF NEW.seller_id <> OLD.seller_id THEN
        RAISE EXCEPTION 'Cannot modify negotiation seller_id';
    END IF;
    IF NEW.listing_id <> OLD.listing_id THEN
        RAISE EXCEPTION 'Cannot modify negotiation listing_id';
    END IF;

    -- Prevent direct transition to 'agreed' unless an accepted offer exists
    IF NEW.status = 'agreed' AND OLD.status <> 'agreed' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.offers
            WHERE negotiation_id = NEW.id AND status = 'accepted'
        ) THEN
            RAISE EXCEPTION 'Negotiation status can only be set to agreed upon accepted offer';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_negotiation_integrity ON public.negotiations;
CREATE TRIGGER trg_protect_negotiation_integrity
    BEFORE UPDATE ON public.negotiations
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_negotiation_integrity();

-- -----------------------------------------------------------------------------
-- 6. FINDING 07 — STORAGE BUCKET-LEVEL RESTRICTIONS
-- Enforce MIME types (image/jpeg, image/png, image/webp) and max file size (5MB).
-- -----------------------------------------------------------------------------
UPDATE storage.buckets
SET 
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880
WHERE id = 'listing-images';

-- -----------------------------------------------------------------------------
-- 7. FINDING 10 — DATABASE INPUT CONSTRAINTS
-- Listings:
--   title: NOT NULL, 3-150 chars (trimmed)
--   description: NOT NULL, 10-5000 chars (trimmed)
--   condition: Valid app conditions
-- Messages:
--   message: non-whitespace, max 2000 chars
-- -----------------------------------------------------------------------------
ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_title_length,
    ADD CONSTRAINT chk_listings_title_length
        CHECK (length(trim(title)) >= 3 AND length(title) <= 150);

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_description_length,
    ADD CONSTRAINT chk_listings_description_length
        CHECK (length(trim(description)) >= 10 AND length(description) <= 5000);

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS chk_listings_condition_valid,
    ADD CONSTRAINT chk_listings_condition_valid
        CHECK (condition IN ('Mint / Pristine', 'Excellent', 'Very Good', 'Good', 'Fair / Restorable'));

ALTER TABLE public.messages
    DROP CONSTRAINT IF EXISTS chk_messages_content,
    ADD CONSTRAINT chk_messages_content
        CHECK (length(trim(message)) > 0 AND length(message) <= 2000);

-- -----------------------------------------------------------------------------
-- 8. FINDING 02 — REMOVED LISTING IMAGES ACCESS CONTROL
-- Ensure image records of removed listings cannot be discovered by public users.
-- Accessible only by the listing seller or admins.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "listing_images_select_policy" ON public.listing_images;
CREATE POLICY "listing_images_select_policy"
    ON public.listing_images FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND (
                  listings.status IN ('available', 'reserved', 'sold')
                  OR listings.seller_id = auth.uid()
                  OR public.is_admin()
              )
        )
    );
