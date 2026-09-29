-- =============================================================================
-- THE PAWN SHOP: PHASE 5 SECURE ADMIN MARKETPLACE EXPORT RPC
-- =============================================================================
-- This function allows authorized administrators to securely export the
-- flattened marketplace overview dataset (including user email addresses).
--
-- Security Enforcement:
-- 1. SECURITY DEFINER allows querying auth.users to retrieve user email.
-- 2. Strictly enforces `IF NOT public.is_admin()` check inside the function body.
-- 3. Any non-admin or unauthenticated invocation immediately throws a 42501
--    (insufficient_privilege) exception, ensuring zero data leakage.
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
    -- 1. Server-side admin verification via JWT claim
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin privileges required to export marketplace data.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Return data rows only for verified admins
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

-- Revoke public execution and grant to authenticated role
REVOKE EXECUTE ON FUNCTION public.get_marketplace_overview() FROM public;
GRANT EXECUTE ON FUNCTION public.get_marketplace_overview() TO authenticated;
