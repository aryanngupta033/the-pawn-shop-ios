import { supabase } from '../lib/supabase';
import type { Message, Profile } from '../types';

export interface MessageWithSender extends Message {
  sender?: Profile;
}

/**
 * Fetches all messages in chronological order for a specific negotiation.
 */
export async function fetchNegotiationMessages(negotiationId: string): Promise<MessageWithSender[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(*)
    `)
    .eq('negotiation_id', negotiationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('fetchNegotiationMessages error:', error);
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (data as any[])?.map((item) => ({
    ...item,
    sender: item.sender as Profile,
  })) || [];
}

/**
 * Sends a new message in a negotiation thread.
 * RLS ensures only active participants (buyer or seller) can insert.
 */
export async function sendNegotiationMessage(
  negotiationId: string,
  senderId: string,
  text: string
): Promise<Message> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Message cannot be empty');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      negotiation_id: negotiationId,
      sender_id: senderId,
      message: cleanText,
    })
    .select()
    .single();

  if (error) {
    console.error('sendNegotiationMessage error:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }

  // Touch negotiation updated_at
  await supabase
    .from('negotiations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', negotiationId);

  return data;
}

/**
 * Marks unread messages sent by the counterparty as read.
 */
export async function markNegotiationMessagesAsRead(
  negotiationId: string,
  currentUserId: string
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('negotiation_id', negotiationId)
    .neq('sender_id', currentUserId)
    .is('read_at', null);
}

/**
 * Subscribes to realtime messages in a negotiation via Supabase postgres_changes channel.
 */
export function subscribeToNegotiationMessages(
  negotiationId: string,
  onMessageReceived: (message: Message) => void
) {
  const channel = supabase
    .channel(`negotiation_chat_${negotiationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `negotiation_id=eq.${negotiationId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessageReceived(payload.new as Message);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
