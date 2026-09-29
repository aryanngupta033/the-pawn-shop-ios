-- =============================================================================
-- THE PAWN SHOP: COMPLETE PHASE 2 DATABASE MIGRATION & CONFIGURATION
-- Database: PostgreSQL 15+ (Supabase)
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. TABLES (8 CORE TABLES ONLY - NO CATEGORIES)
-- =============================================================================

-- 2.1 PROFILES TABLE
-- 1:1 linked with Supabase auth.users. Unified account model (no buyer/seller roles).
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.2 LISTINGS TABLE
-- seller_id represents immutable ownership. Enforces valid statuses.
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) >= 3 AND length(title) <= 150),
    description TEXT NOT NULL CHECK (length(trim(description)) >= 10 AND length(description) <= 5000),
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    condition TEXT NOT NULL CHECK (condition IN ('Mint / Pristine', 'Excellent', 'Very Good', 'Good', 'Fair / Restorable')),
    year INTEGER CHECK (year IS NULL OR (year >= 1500 AND year <= EXTRACT(YEAR FROM now()) + 1)),
    brand TEXT,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('pending_review', 'available', 'approved', 'reserved', 'sold', 'removed', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.3 LISTING IMAGES TABLE
-- Supports ordered multi-image galleries per listing.
CREATE TABLE IF NOT EXISTS public.listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.4 FAVORITES TABLE
-- Bookmarked listings per user with database-level uniqueness.
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_favorites_user_listing UNIQUE (user_id, listing_id)
);

-- 2.5 NEGOTIATIONS TABLE
-- Bargaining thread between prospective buyer and seller.
CREATE TABLE IF NOT EXISTS public.negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'agreed', 'rejected', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_negotiation_distinct_users CHECK (buyer_id <> seller_id),
    CONSTRAINT uq_negotiation_listing_buyer UNIQUE (listing_id, buyer_id)
);

-- 2.6 OFFERS TABLE
-- Immutable historical ledger of price proposals & counter-offers.
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.7 MESSAGES TABLE
-- In-negotiation direct communication for arranging offline meetup & cash handover.
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (length(trim(message)) > 0 AND length(message) <= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    read_at TIMESTAMPTZ
);

-- 2.8 REPORTS TABLE
-- Administrative moderation queue for flagging listings or users.
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_report_target_present CHECK (listing_id IS NOT NULL OR reported_user_id IS NOT NULL)
);

-- =============================================================================
-- 3. INDEXES FOR HIGH QUERY PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_location ON public.listings(location);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON public.listing_images(listing_id, display_order ASC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

CREATE INDEX IF NOT EXISTS idx_negotiations_listing_id ON public.negotiations(listing_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_buyer_id ON public.negotiations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_seller_id ON public.negotiations(seller_id);
CREATE INDEX IF NOT EXISTS idx_negotiations_status ON public.negotiations(status);

CREATE INDEX IF NOT EXISTS idx_offers_negotiation_id ON public.offers(negotiation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

CREATE INDEX IF NOT EXISTS idx_messages_negotiation_id ON public.messages(negotiation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- =============================================================================
-- 4. AUTOMATIC TRIGGERS & BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- 4.1 Updated_at Auto-Updater
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated_at ON public.listings;
CREATE TRIGGER trg_listings_updated_at
    BEFORE UPDATE ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_negotiations_updated_at ON public.negotiations;
CREATE TRIGGER trg_negotiations_updated_at
    BEFORE UPDATE ON public.negotiations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4.2 Auto-create profile upon Supabase auth sign-up (Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4.3 Validate Negotiation Seller & Participants
-- Guarantees seller_id in negotiations matches listings.seller_id exactly
CREATE OR REPLACE FUNCTION public.validate_negotiation_seller()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_status TEXT;
BEGIN
    SELECT seller_id, status INTO v_seller_id, v_status
    FROM public.listings
    WHERE id = NEW.listing_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing does not exist';
    END IF;

    IF v_status = 'sold' OR v_status = 'removed' THEN
        RAISE EXCEPTION 'Cannot initiate negotiations on sold or removed listings';
    END IF;

    -- Force seller_id to match listing seller_id
    NEW.seller_id := v_seller_id;

    IF NEW.buyer_id = v_seller_id THEN
        RAISE EXCEPTION 'Seller cannot start a negotiation on their own listing';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_negotiation ON public.negotiations;
CREATE TRIGGER trg_validate_negotiation
    BEFORE INSERT ON public.negotiations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_negotiation_seller();

-- 4.4 Offer Handling & History Preservation
-- Prevents offers on sold listings, validates participants, and supersedes previous offers
CREATE OR REPLACE FUNCTION public.handle_new_offer()
RETURNS TRIGGER AS $$
DECLARE
    v_listing_status TEXT;
    v_negotiation_status TEXT;
    v_buyer_id UUID;
    v_seller_id UUID;
BEGIN
    SELECT n.buyer_id, n.seller_id, n.status, l.status
    INTO v_buyer_id, v_seller_id, v_negotiation_status, v_listing_status
    FROM public.negotiations n
    JOIN public.listings l ON l.id = n.listing_id
    WHERE n.id = NEW.negotiation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Negotiation does not exist';
    END IF;

    IF v_listing_status = 'sold' THEN
        RAISE EXCEPTION 'Cannot make or counter offers on a sold listing';
    END IF;

    IF v_listing_status = 'removed' THEN
        RAISE EXCEPTION 'Cannot make offers on a removed listing';
    END IF;

    IF v_negotiation_status = 'closed' OR v_negotiation_status = 'rejected' THEN
        RAISE EXCEPTION 'Cannot make offers on a closed or rejected negotiation';
    END IF;

    IF NEW.sender_id <> v_buyer_id AND NEW.sender_id <> v_seller_id THEN
        RAISE EXCEPTION 'Sender must be an active participant in this negotiation';
    END IF;

    -- Supersede any existing pending offers in this negotiation
    UPDATE public.offers
    SET status = 'superseded'
    WHERE negotiation_id = NEW.negotiation_id
      AND status = 'pending'
      AND id <> NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_new_offer ON public.offers;
CREATE TRIGGER trg_handle_new_offer
    BEFORE INSERT ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_offer();

-- 4.5 Offer Status Change Trigger: Acceptance Logic
-- When an offer is accepted, transition negotiation to 'agreed'
CREATE OR REPLACE FUNCTION public.handle_offer_status_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        UPDATE public.negotiations
        SET status = 'agreed'
        WHERE id = NEW.negotiation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_offer_status_update ON public.offers;
CREATE TRIGGER trg_handle_offer_status_update
    AFTER UPDATE OF status ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_offer_status_update();

-- 4.6 Listing Sold Logic Trigger
-- When a listing is marked 'sold', close any other open/active negotiations
CREATE OR REPLACE FUNCTION public.handle_listing_sold()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sold' AND (OLD.status IS DISTINCT FROM 'sold') THEN
        -- Close all active negotiations for this listing (except already agreed ones)
        UPDATE public.negotiations
        SET status = 'closed'
        WHERE listing_id = NEW.id
          AND status = 'active';

        -- Supersede any remaining pending offers on this listing
        UPDATE public.offers
        SET status = 'superseded'
        WHERE negotiation_id IN (
            SELECT id FROM public.negotiations WHERE listing_id = NEW.id
        ) AND status = 'pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_listing_sold ON public.listings;
CREATE TRIGGER trg_handle_listing_sold
    AFTER UPDATE OF status ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_listing_sold();

-- 4.7 Offers Update Integrity Trigger (Phase 6B Finding 04)
CREATE OR REPLACE FUNCTION public.protect_offer_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

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

-- 4.8 Message Update Integrity Trigger (Phase 6B Finding 05)
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

-- 4.9 Sold Listing Integrity Trigger (Phase 6B Finding 01)
CREATE OR REPLACE FUNCTION public.protect_sold_listing_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

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

-- 4.10 Negotiation Status & Ownership Integrity Trigger (Phase 6B Finding 03)
CREATE OR REPLACE FUNCTION public.protect_negotiation_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.buyer_id <> OLD.buyer_id THEN
        RAISE EXCEPTION 'Cannot modify negotiation buyer_id';
    END IF;
    IF NEW.seller_id <> OLD.seller_id THEN
        RAISE EXCEPTION 'Cannot modify negotiation seller_id';
    END IF;
    IF NEW.listing_id <> OLD.listing_id THEN
        RAISE EXCEPTION 'Cannot modify negotiation listing_id';
    END IF;

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

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Helper for Admin Check via Supabase JWT claim (Phase 6B Finding 06: safe search_path)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', '') = 'admin'
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5.1 PROFILES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 5.2 LISTINGS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "listings_select_policy" ON public.listings;
CREATE POLICY "listings_select_policy"
    ON public.listings FOR SELECT
    TO anon, authenticated
    USING (
        status IN ('available', 'reserved', 'sold')
        OR seller_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "listings_insert_policy" ON public.listings;
CREATE POLICY "listings_insert_policy"
    ON public.listings FOR INSERT
    TO authenticated
    WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "listings_update_policy" ON public.listings;
CREATE POLICY "listings_update_policy"
    ON public.listings FOR UPDATE
    TO authenticated
    USING (seller_id = auth.uid() OR public.is_admin())
    WITH CHECK (seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "listings_delete_policy" ON public.listings;
CREATE POLICY "listings_delete_policy"
    ON public.listings FOR DELETE
    TO authenticated
    USING (seller_id = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 5.3 LISTING IMAGES POLICIES
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

DROP POLICY IF EXISTS "listing_images_insert_policy" ON public.listing_images;
CREATE POLICY "listing_images_insert_policy"
    ON public.listing_images FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "listing_images_update_policy" ON public.listing_images;
CREATE POLICY "listing_images_update_policy"
    ON public.listing_images FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "listing_images_delete_policy" ON public.listing_images;
CREATE POLICY "listing_images_delete_policy"
    ON public.listing_images FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = listing_images.listing_id
              AND listings.seller_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 5.4 FAVORITES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "favorites_select_policy" ON public.favorites;
CREATE POLICY "favorites_select_policy"
    ON public.favorites FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_policy" ON public.favorites;
CREATE POLICY "favorites_insert_policy"
    ON public.favorites FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_policy" ON public.favorites;
CREATE POLICY "favorites_delete_policy"
    ON public.favorites FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5.5 NEGOTIATIONS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "negotiations_select_policy" ON public.negotiations;
CREATE POLICY "negotiations_select_policy"
    ON public.negotiations FOR SELECT
    TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "negotiations_insert_policy" ON public.negotiations;
CREATE POLICY "negotiations_insert_policy"
    ON public.negotiations FOR INSERT
    TO authenticated
    WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "negotiations_update_policy" ON public.negotiations;
CREATE POLICY "negotiations_update_policy"
    ON public.negotiations FOR UPDATE
    TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin())
    WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 5.6 OFFERS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "offers_select_policy" ON public.offers;
CREATE POLICY "offers_select_policy"
    ON public.offers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = offers.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "offers_insert_policy" ON public.offers;
CREATE POLICY "offers_insert_policy"
    ON public.offers FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = offers.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
        )
    );

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
-- 5.7 MESSAGES POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = messages.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = messages.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
        )
    );

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
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.negotiations n
            WHERE n.id = messages.negotiation_id
              AND (n.buyer_id = auth.uid() OR n.seller_id = auth.uid())
              AND messages.sender_id <> auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 5.8 REPORTS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
CREATE POLICY "reports_select_policy"
    ON public.reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "reports_insert_policy" ON public.reports;
CREATE POLICY "reports_insert_policy"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_update_policy" ON public.reports;
CREATE POLICY "reports_update_policy"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reports_delete_policy" ON public.reports;
CREATE POLICY "reports_delete_policy"
    ON public.reports FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- =============================================================================
-- 6. STORAGE BUCKET & STORAGE RLS POLICIES
-- =============================================================================

-- Create storage bucket if not already present (with MIME type and 5MB size restrictions)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
    'listing-images',
    'listing-images',
    true,
    ARRAY['image/jpeg', 'image/png', 'image/webp'],
    5242880
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'],
    file_size_limit = 5242880;

-- Public read for listing images
DROP POLICY IF EXISTS "listing_images_public_read" ON storage.objects;
CREATE POLICY "listing_images_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'listing-images');

-- Only seller of the listing can upload to listings/{listing_id}/*
DROP POLICY IF EXISTS "listing_images_seller_upload" ON storage.objects;
CREATE POLICY "listing_images_seller_upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = (storage.foldername(name))[2]::uuid
              AND listings.seller_id = auth.uid()
        )
    );

-- Only seller can update files
DROP POLICY IF EXISTS "listing_images_seller_update" ON storage.objects;
CREATE POLICY "listing_images_seller_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = (storage.foldername(name))[2]::uuid
              AND listings.seller_id = auth.uid()
        )
    );

-- Only seller can delete files
DROP POLICY IF EXISTS "listing_images_seller_delete" ON storage.objects;
CREATE POLICY "listing_images_seller_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'listing-images'
        AND EXISTS (
            SELECT 1 FROM public.listings
            WHERE listings.id = (storage.foldername(name))[2]::uuid
              AND listings.seller_id = auth.uid()
        )
    );

-- =============================================================================
-- 7. DATABASE VIEW: marketplace_overview
-- =============================================================================
CREATE OR REPLACE VIEW public.marketplace_overview
WITH (security_invoker = true)
AS
SELECT
    p.id AS "User ID",
    p.full_name AS "User Name",
    u.email AS "User Email",
    p.location AS "User Location",
    l.id AS "Listing ID",
    l.title AS "Listing Title",
    l.price AS "Price",
    l.condition AS "Condition",
    l.location AS "Listing Location",
    l.status AS "Listing Status",
    l.created_at AS "Created At"
FROM public.listings l
JOIN public.profiles p ON p.id = l.seller_id
LEFT JOIN auth.users u ON u.id = p.id;

-- =============================================================================
-- 8. SECURE ADMIN MARKETPLACE EXPORT RPC (Phase 5)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_marketplace_overview()
RETURNS TABLE (
    "User ID" UUID,
    "User Name" TEXT,
    "User Email" TEXT,
    "User Location" TEXT,
    "Listing ID" UUID,
    "Listing Title" TEXT,
    "Price" NUMERIC(12, 2),
    "Condition" TEXT,
    "Listing Location" TEXT,
    "Listing Status" TEXT,
    "Created At" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required to export marketplace data.'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS "User ID",
        p.full_name AS "User Name",
        u.email::TEXT AS "User Email",
        p.location AS "User Location",
        l.id AS "Listing ID",
        l.title AS "Listing Title",
        l.price AS "Price",
        l.condition AS "Condition",
        l.location AS "Listing Location",
        l.status AS "Listing Status",
        l.created_at AS "Created At"
    FROM public.listings l
    JOIN public.profiles p ON p.id = l.seller_id
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY l.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_marketplace_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.get_marketplace_overview() TO authenticated;

-- =============================================================================
-- 9. NOTIFICATION HUB & AUTOMATED DATABASE TRIGGERS (PHASE 3A & PHASE 3B1)
-- =============================================================================
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

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON public.notifications (recipient_id, is_read)
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_listing_id
    ON public.notifications (listing_id)
    WHERE listing_id IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (false);

DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

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

-- Phase 3B1 Trigger 1: Listing Approved
CREATE OR REPLACE FUNCTION public.fn_notify_on_listing_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
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

-- Phase 3B1 Trigger 2: Listing Favorited
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
    SELECT seller_id, title INTO v_seller_id, v_listing_title
    FROM public.listings
    WHERE id = NEW.listing_id;

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

-- Phase 3B1 Trigger 3 & 4: New Offer & Counter-Offer
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
    SELECT n.buyer_id, n.seller_id, n.listing_id, l.title
    INTO v_buyer_id, v_seller_id, v_listing_id, v_listing_title
    FROM public.negotiations n
    JOIN public.listings l ON l.id = n.listing_id
    WHERE n.id = NEW.negotiation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF NEW.sender_id = v_buyer_id THEN
        v_recipient_id := v_seller_id;
    ELSE
        v_recipient_id := v_buyer_id;
    END IF;

    SELECT full_name INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    SELECT COUNT(*) INTO v_prior_offers_count
    FROM public.offers
    WHERE negotiation_id = NEW.negotiation_id
      AND id <> NEW.id;

    v_formatted_amount := '₹' || to_char(NEW.amount, 'FM99,99,99,999.00');

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

-- Phase 3B1 Trigger 5: New Chat Message
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
    SELECT n.buyer_id, n.seller_id, n.listing_id, l.title
    INTO v_buyer_id, v_seller_id, v_listing_id, v_listing_title
    FROM public.negotiations n
    JOIN public.listings l ON l.id = n.listing_id
    WHERE n.id = NEW.negotiation_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    IF NEW.sender_id = v_buyer_id THEN
        v_recipient_id := v_seller_id;
    ELSE
        v_recipient_id := v_buyer_id;
    END IF;

    SELECT full_name INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

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


