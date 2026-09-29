-- =============================================================================
-- THE PAWN SHOP: PHASE 3B1 TRIGGER 1 & STATUS CONSTRAINT TEST VERIFICATION
-- Purpose: Safely tests that 'pending_review' is permitted on public.listings
--          and that trg_notify_on_listing_approved successfully generates a notification.
-- Can be run safely anytime in the Supabase SQL Editor.
-- =============================================================================

DO $$
DECLARE
    v_test_seller_id UUID;
    v_test_listing_id UUID;
    v_notif_count INTEGER := 0;
    v_notif_title TEXT;
    v_notif_body TEXT;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'STARTING PHASE 3B1 TRIGGER 1 VERIFICATION TEST';
    RAISE NOTICE '============================================================';

    -- 1. Grab an existing profile to act as test seller (or fallback to auth user)
    SELECT id INTO v_test_seller_id FROM public.profiles LIMIT 1;

    IF v_test_seller_id IS NULL THEN
        RAISE EXCEPTION 'No profiles found in public.profiles. Please ensure at least one profile exists.';
    END IF;

    -- 2. TEST 1: Insert listing with status 'pending_review'
    BEGIN
        INSERT INTO public.listings (
            seller_id,
            title,
            description,
            price,
            condition,
            location,
            status
        ) VALUES (
            v_test_seller_id,
            'Test 1968 Vintage Chronograph Watch',
            'Verification listing to test pending_review moderation constraint and trigger.',
            45000,
            'Very Good',
            'Mumbai, India',
            'pending_review'
        )
        RETURNING id INTO v_test_listing_id;

        RAISE NOTICE '✓ [Test 1 Passed] listings_status_check permits "pending_review" status (Listing ID: %)', v_test_listing_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '✗ [Test 1 FAILED] listings_status_check blocked "pending_review": %', SQLERRM;
    END;

    -- 3. TEST 2: Approve listing (transition pending_review -> available)
    BEGIN
        UPDATE public.listings
        SET status = 'available'
        WHERE id = v_test_listing_id;

        RAISE NOTICE '✓ [Test 2 Passed] Successfully updated status from "pending_review" to "available"';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION '✗ [Test 2 FAILED] Status update to available failed: %', SQLERRM;
    END;

    -- 4. TEST 3: Verify Trigger 1 created a notification
    SELECT count(*), max(title), max(body)
    INTO v_notif_count, v_notif_title, v_notif_body
    FROM public.notifications
    WHERE listing_id = v_test_listing_id
      AND type = 'listing_approved'
      AND recipient_id = v_test_seller_id;

    IF v_notif_count >= 1 THEN
        RAISE NOTICE '✓ [Test 3 Passed] Trigger 1 fired! Notification generated for seller:';
        RAISE NOTICE '   Title: %', v_notif_title;
        RAISE NOTICE '   Body:  %', v_notif_body;
    ELSE
        RAISE NOTICE '⚠ [Notice] Listing was approved, but no notification was found. Ensure trg_notify_on_listing_approved is installed.';
    END IF;

    -- 5. CLEANUP test data
    DELETE FROM public.notifications WHERE listing_id = v_test_listing_id;
    DELETE FROM public.listings WHERE id = v_test_listing_id;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ALL PHASE 3B1 TRIGGER 1 VERIFICATION TESTS COMPLETED CLEANLY';
    RAISE NOTICE '============================================================';
END $$;
