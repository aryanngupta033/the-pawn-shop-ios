import { supabase } from '../lib/supabase';
import type { 
  AdminDashboardMetrics, 
  AdminUserWithListings, 
  AdminReportWithDetails, 
  ListingWithDetails, 
  ListingStatus, 
  ReportStatus, 
  MarketplaceOverviewRow,
  Profile
} from '../types';

/**
 * Checks server-side if the currently active authenticated session has admin privileges.
 * Directly evaluates public.is_admin() via PostgreSQL RPC.
 */
export async function verifyAdminStatus(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) {
      console.warn('verifyAdminStatus RPC note:', error.message);
      return false;
    }
    return Boolean(data);
  } catch (err) {
    console.warn('verifyAdminStatus catch:', err);
    return false;
  }
}

/**
 * Aggregates high-level marketplace operational metrics for the Admin Dashboard.
 */
export async function getAdminDashboardMetrics(): Promise<{
  metrics: AdminDashboardMetrics;
  recentUsers: Profile[];
  recentListings: ListingWithDetails[];
}> {
  // Query aggregate metrics in parallel
  const [
    totalUsersRes,
    totalListingsRes,
    pendingListingsRes,
    availListingsRes,
    resListingsRes,
    soldListingsRes,
    remListingsRes,
    openReportsRes,
    recentUsersRes,
    recentListingsRes
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).in('status', ['available', 'approved']),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'reserved'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'removed'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5),
    supabase
      .from('listings')
      .select(`
        *,
        seller:profiles!listings_seller_id_fkey(*),
        images:listing_images(*)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const metrics: AdminDashboardMetrics = {
    totalUsers: totalUsersRes.count || 0,
    totalListings: totalListingsRes.count || 0,
    pendingListings: pendingListingsRes.count || 0,
    availableListings: availListingsRes.count || 0,
    reservedListings: resListingsRes.count || 0,
    soldListings: soldListingsRes.count || 0,
    removedListings: remListingsRes.count || 0,
    openReports: openReportsRes.count || 0,
  };

  return {
    metrics,
    recentUsers: (recentUsersRes.data || []) as Profile[],
    recentListings: (recentListingsRes.data || []) as ListingWithDetails[],
  };
}

/**
 * Retrieves all registered users with their associated listing records for user inspection.
 */
export async function getAdminUsers(searchQuery?: string): Promise<AdminUserWithListings[]> {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      listings (
        id,
        title,
        price,
        status,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.trim();
    query = query.or(`full_name.ilike.%${q}%,location.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getAdminUsers error:', error);
    throw new Error(`Failed to load users: ${error.message}`);
  }

  return (data || []).map((p: any) => ({
    ...p,
    listings_count: p.listings?.length || 0,
    recent_listings: p.listings || [],
  }));
}

/**
 * Retrieves listings with status filtering (including 'removed' items) and search capabilities.
 */
export async function getAdminListings(
  statusFilter: ListingStatus | 'all' = 'all',
  searchQuery?: string
): Promise<ListingWithDetails[]> {
  let query = supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(*),
      images:listing_images(*)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.trim();
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%,brand.ilike.%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getAdminListings error:', error);
    throw new Error(`Failed to load admin listings: ${error.message}`);
  }

  return (data || []) as ListingWithDetails[];
}

/**
 * Retrieves the moderation queue reports with full relational contexts.
 * Protected server-side by public.reports RLS (reports_select_policy).
 */
export async function getAdminReports(
  statusFilter: ReportStatus | 'all' = 'all'
): Promise<AdminReportWithDetails[]> {
  let query = supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(*),
      listing:listings(*),
      reported_user:profiles!reports_reported_user_id_fkey(*)
    `)
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getAdminReports error:', error);
    throw new Error(`Failed to load reports: ${error.message}`);
  }

  return (data || []) as AdminReportWithDetails[];
}

/**
 * Updates a moderation report status (open -> reviewing -> resolved / dismissed).
 * Protected database-side: reports_update_policy requires public.is_admin().
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus
): Promise<void> {
  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)
    .select('id, status');

  if (error) {
    console.error('updateReportStatus error:', error);
    throw new Error(`Failed to update report status: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Access denied or report not found. Only administrators can modify report statuses.');
  }
}

/**
 * Restores a previously removed listing back to 'available'.
 * Protected database-side: listings_update_policy requires seller_id = auth.uid() OR public.is_admin().
 */
export async function restoreListing(listingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'available',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('id, status');

  if (error) {
    console.error('restoreListing error:', error);
    throw new Error(`Failed to restore listing: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Access denied or listing not found. Modification blocked by database policies.');
  }
}

/**
 * Retrieves listings currently awaiting curator evaluation ('pending_review').
 * Server-side protected by RLS (only public.is_admin() or the seller can read pending listings).
 */
export async function getPendingReviewListings(): Promise<ListingWithDetails[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller:profiles!listings_seller_id_fkey(*),
      images:listing_images(*)
    `)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getPendingReviewListings error:', error);
    throw new Error(`Failed to load pending listings: ${error.message}`);
  }

  return (data || []) as ListingWithDetails[];
}

/**
 * Approves a pending listing, moving its status to 'available'.
 * Protected database-side by RLS policy & trg_protect_listing_status: requires public.is_admin().
 */
export async function approveListingAsAdmin(listingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'available',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('id, status');

  if (error) {
    console.error('approveListingAsAdmin error:', error);
    throw new Error(`Failed to approve listing: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Access denied or listing not found. Only administrators can approve listings.');
  }
}

/**
 * Rejects a listing, moving its status to 'rejected' so it does not appear on the public marketplace.
 * Protected database-side by RLS policy & trg_protect_listing_status: requires public.is_admin().
 */
export async function rejectListingAsAdmin(listingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('id, status');

  if (error) {
    console.error('rejectListingAsAdmin error:', error);
    throw new Error(`Failed to reject listing: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Access denied or listing not found. Only administrators can reject listings.');
  }
}

/**
 * Removes a listing via status transition ('removed').
 * Avoids destructive hard-deletion.
 * Protected database-side: listings_update_policy requires seller_id = auth.uid() OR public.is_admin().
 */
export async function removeListingAsAdmin(listingId: string): Promise<void> {
  const { data, error } = await supabase
    .from('listings')
    .update({
      status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', listingId)
    .select('id, status');

  if (error) {
    console.error('removeListingAsAdmin error:', error);
    throw new Error(`Failed to remove listing: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('Access denied or listing not found. Modification blocked by database policies.');
  }
}

/**
 * Calls the secure database RPC to retrieve the flattened marketplace overview dataset.
 * Server-side verified: returns data ONLY if session satisfies public.is_admin().
 */
export async function getMarketplaceExportData(): Promise<MarketplaceOverviewRow[]> {
  const { data, error } = await supabase.rpc('get_marketplace_overview');

  if (error) {
    console.error('getMarketplaceExportData error:', error);
    throw new Error(error.message || 'Access denied: Admin privileges required for export.');
  }

  return (data || []) as MarketplaceOverviewRow[];
}

/**
 * Formats marketplace rows into an RFC-4180 compliant CSV string for administrative download.
 */
export function formatMarketplaceCsv(rows: MarketplaceOverviewRow[]): string {
  const headers: (keyof MarketplaceOverviewRow)[] = [
    'User ID',
    'User Name',
    'User Email',
    'User Location',
    'Listing ID',
    'Listing Title',
    'Price',
    'Condition',
    'Listing Location',
    'Listing Status',
    'Created At'
  ];

  const escapeCsvField = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(h => escapeCsvField(h)).join(',');
  const rowLines = rows.map(row => 
    headers.map(header => escapeCsvField(row[header])).join(',')
  );

  return [headerLine, ...rowLines].join('\r\n');
}
