import { supabase } from '../lib/supabase';
import type { Notification, NotificationWithDetails } from '../types';

/**
 * In-App Notification Hub Service (Phase 3A Foundation)
 *
 * Security architecture:
 * - All queries query notifications for the currently authenticated user (auth.uid()).
 * - Table-level RLS strictly rejects queries for any other recipient.
 * - Table-level RLS strictly blocks client-side direct INSERTs.
 * - Triggers enforce that only is_read can be updated by the client.
 */

/**
 * Retrieves notifications for the current authenticated user.
 * Server-enforced: notifications_select_policy restricts rows to recipient_id = auth.uid().
 */
export async function getNotifications(limit: number = 50): Promise<NotificationWithDetails[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return [];
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(*),
      listing:listings!notifications_listing_id_fkey(*)
    `)
    .eq('recipient_id', userData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getNotifications error:', error);
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  return (data || []) as NotificationWithDetails[];
}

/**
 * Retrieves the count of unread notifications for the current authenticated user.
 * Server-enforced via RLS and indexed with partial index idx_notifications_recipient_unread.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userData.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('getUnreadNotificationCount error:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Marks a single notification as read.
 * Server-enforced:
 * 1. Checks recipient_id = auth.uid()
 * 2. Trigger trg_protect_notification_update prevents altering any column other than is_read.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Authentication required to update notification.');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_id', userData.user.id);

  if (error) {
    console.error('markNotificationAsRead error:', error);
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
}

/**
 * Marks all unread notifications as read for the current authenticated user.
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error('Authentication required to update notifications.');
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', userData.user.id)
    .eq('is_read', false);

  if (error) {
    console.error('markAllNotificationsAsRead error:', error);
    throw new Error(`Failed to mark all notifications as read: ${error.message}`);
  }
}

/**
 * Subscribes to real-time notification INSERT and UPDATE events for a specific recipient.
 * Ensures the client only processes events where recipient_id === current user ID.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToUserNotifications(
  recipientId: string,
  onNotificationReceived: (notification: Notification) => void,
  onNotificationUpdated?: (notification: Notification) => void
): () => void {
  if (!recipientId) return () => {};

  const channelName = `user_notifications_${recipientId}_${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as any).recipient_id === recipientId) {
          onNotificationReceived(payload.new as Notification);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${recipientId}`,
      },
      (payload) => {
        if (payload.new && (payload.new as any).recipient_id === recipientId) {
          if (onNotificationUpdated) {
            onNotificationUpdated(payload.new as Notification);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Resolves the screen and target entity ID for a notification.
 * Handles:
 * - listing_approved, listing_favorited -> listing-detail (listing_id)
 * - new_offer, new_counter_offer -> negotiation-detail (negotiation_id looked up from offers by reference_id, or negotiations fallback)
 * - new_chat_message -> negotiation-detail (negotiation_id looked up from messages by reference_id, or negotiations fallback)
 */
export async function resolveNotificationNavigation(
  notification: Notification
): Promise<{ screen: 'listing-detail' | 'negotiation-detail' | 'negotiations' | 'browse'; id?: string }> {
  const { type, listing_id, reference_id, recipient_id } = notification;

  if (type === 'listing_approved' || type === 'listing_favorited') {
    if (listing_id) {
      return { screen: 'listing-detail', id: listing_id };
    }
    return { screen: 'browse' };
  }

  if (type === 'new_offer' || type === 'new_counter_offer') {
    if (reference_id) {
      const { data: offerData, error } = await supabase
        .from('offers')
        .select('negotiation_id')
        .eq('id', reference_id)
        .maybeSingle();

      if (!error && offerData?.negotiation_id) {
        return { screen: 'negotiation-detail', id: offerData.negotiation_id };
      }
    }
    // Fallback if reference lookup fails: find active negotiation by listing_id and user
    if (listing_id && recipient_id) {
      const { data: negData } = await supabase
        .from('negotiations')
        .select('id')
        .eq('listing_id', listing_id)
        .or(`buyer_id.eq.${recipient_id},seller_id.eq.${recipient_id}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (negData?.id) {
        return { screen: 'negotiation-detail', id: negData.id };
      }
    }
    return { screen: 'negotiations' };
  }

  if (type === 'new_chat_message') {
    if (reference_id) {
      const { data: msgData, error } = await supabase
        .from('messages')
        .select('negotiation_id')
        .eq('id', reference_id)
        .maybeSingle();

      if (!error && msgData?.negotiation_id) {
        return { screen: 'negotiation-detail', id: msgData.negotiation_id };
      }
    }
    // Fallback if reference lookup fails
    if (listing_id && recipient_id) {
      const { data: negData } = await supabase
        .from('negotiations')
        .select('id')
        .eq('listing_id', listing_id)
        .or(`buyer_id.eq.${recipient_id},seller_id.eq.${recipient_id}`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (negData?.id) {
        return { screen: 'negotiation-detail', id: negData.id };
      }
    }
    return { screen: 'negotiations' };
  }

  return { screen: 'browse' };
}
