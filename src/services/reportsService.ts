import { supabase } from '../lib/supabase';
import type { Report } from '../types';

export interface CreateReportInput {
  reporterId: string;
  reason: string;
  details?: string;
  listingId?: string;
  reportedUserId?: string;
}

/**
 * Creates a moderation report for a listing or user.
 * Verified by constraint chk_report_target_present (listing_id IS NOT NULL OR reported_user_id IS NOT NULL).
 */
export async function createReport(input: CreateReportInput): Promise<Report> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error('Please select or specify a reason for this report');
  }

  if (!input.listingId && !input.reportedUserId) {
    throw new Error('Report must target either a listing or a user');
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: input.reporterId,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      listing_id: input.listingId || null,
      reported_user_id: input.reportedUserId || null,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    console.error('createReport error:', error);
    throw new Error(`Failed to submit report: ${error.message}`);
  }

  return data;
}
