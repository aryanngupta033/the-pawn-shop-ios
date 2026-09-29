import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Check, 
  X, 
  Send, 
  MessageSquare, 
  Clock, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  DollarSign, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck,
  Tag,
  ChevronDown
} from 'lucide-react';
import { 
  fetchNegotiationById, 
  submitOffer, 
  acceptOffer, 
  rejectOffer 
} from '../services/negotiationsService';
import { 
  fetchNegotiationMessages, 
  sendNegotiationMessage, 
  markNegotiationMessagesAsRead, 
  subscribeToNegotiationMessages, 
  MessageWithSender 
} from '../services/messagesService';
import type { NegotiationWithContext, Offer, Profile } from '../types';
import { formatPrice, formatDate, formatTime, getStatusBadge } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface NegotiationDetailScreenProps {
  negotiationId: string;
  onBack: () => void;
  onViewListing: (listingId: string) => void;
}

export const NegotiationDetailScreen: React.FC<NegotiationDetailScreenProps> = ({
  negotiationId,
  onBack,
  onViewListing,
}) => {
  const { user } = useAuth();
  const [negotiation, setNegotiation] = useState<NegotiationWithContext | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab on mobile: 'offers' or 'chat'
  const [activeTab, setActiveTab] = useState<'offers' | 'chat'>('offers');

  // Counter offer input state
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [counterMessage, setCounterMessage] = useState<string>('');
  const [isCountering, setIsCountering] = useState<boolean>(false);
  const [counterSubmitting, setCounterSubmitting] = useState<boolean>(false);

  // Chat input state
  const [chatText, setChatText] = useState<string>('');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const neg = await fetchNegotiationById(negotiationId);
      if (!neg) {
        setError('Negotiation not found or access denied.');
        return;
      }
      setNegotiation(neg);

      const msgs = await fetchNegotiationMessages(negotiationId);
      setMessages(msgs);

      if (user) {
        await markNegotiationMessagesAsRead(negotiationId, user.id);
      }
    } catch (err: any) {
      console.error('Failed to load negotiation:', err);
      setError(err?.message || 'Failed to load negotiation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime messages
    const unsubscribe = subscribeToNegotiationMessages(negotiationId, (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg as MessageWithSender];
      });
      // Scroll chat down
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [negotiationId, user?.id]);

  useEffect(() => {
    if (activeTab === 'chat') {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [activeTab, messages.length]);

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
        <p className="text-xs text-stone-500">Retrieving negotiation thread...</p>
      </div>
    );
  }

  if (error || !negotiation) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-stone-200">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
          <h2 className="font-serif text-lg font-bold text-stone-900 mb-2">Error</h2>
          <p className="text-xs text-stone-600 mb-6">{error || 'Negotiation could not be loaded.'}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-stone-900 text-stone-100 text-xs font-semibold rounded-lg"
          >
            Back to Negotiations
          </button>
        </div>
      </div>
    );
  }

  const isSeller = user?.id === negotiation.seller_id;
  const isBuyer = user?.id === negotiation.buyer_id;
  const counterparty = isSeller ? negotiation.buyer : negotiation.seller;
  const latestOffer = negotiation.latest_offer;
  const isLatestOfferFromMe = latestOffer?.sender_id === user?.id;
  const isOfferPending = latestOffer?.status === 'pending';
  const statusBadge = getStatusBadge(negotiation.status);

  // Handle Accept Offer
  const handleAccept = async () => {
    if (!latestOffer) return;
    try {
      setActionError(null);
      setActionLoading(true);
      await acceptOffer(latestOffer.id, negotiation.id);
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to accept offer: ${err?.message || 'Update failed'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Offer
  const handleReject = async () => {
    if (!latestOffer) return;
    try {
      setActionError(null);
      setActionLoading(true);
      await rejectOffer(latestOffer.id, negotiation.id);
      await loadData();
    } catch (err: any) {
      setActionError(`Failed to reject offer: ${err?.message || 'Update failed'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submit Counter Offer
  const handleCounterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amountNum = parseFloat(counterAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Please enter a valid counter offer amount greater than zero.');
      return;
    }

    try {
      setActionError(null);
      setCounterSubmitting(true);
      await submitOffer(negotiation.id, user.id, amountNum, counterMessage);
      setIsCountering(false);
      setCounterAmount('');
      setCounterMessage('');
      await loadData();
    } catch (err: any) {
      setActionError(`Counter offer error: ${err?.message || 'Submission failed'}`);
    } finally {
      setCounterSubmitting(false);
    }
  };

  // Handle Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatText.trim()) return;

    try {
      setActionError(null);
      setSendingMsg(true);
      const textToSend = chatText.trim();
      if (!textToSend) return;
      if (textToSend.length > 2000) {
        setActionError('Message cannot exceed 2,000 characters.');
        setSendingMsg(false);
        return;
      }
      setChatText('');
      await sendNegotiationMessage(negotiation.id, user.id, textToSend);
      // Reload messages to ensure local consistency
      const updated = await fetchNegotiationMessages(negotiation.id);
      setMessages(updated);
    } catch (err: any) {
      setActionError(`Could not send message: ${err?.message || 'Send failed'}`);
    } finally {
      setSendingMsg(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Offers</span>
        </button>

        <span className={`text-[10px] font-bold px-3 py-1 rounded ${statusBadge.bg}`}>
          {statusBadge.label}
        </span>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-semibold text-rose-800 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Item Summary Header Card */}
      <div className="bg-white border border-[#e7e2d9] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => onViewListing(negotiation.listing.id)}
        >
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
            <img
              src={
                negotiation.listing?.images?.[0]?.image_url ||
                'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800'
              }
              alt={negotiation.listing.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold block">
              Negotiation Thread
            </span>
            <h2 className="font-serif text-base font-bold text-stone-900 hover:text-amber-900 transition-colors">
              {negotiation.listing.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
              <span>
                Asking Price:{' '}
                <strong className="text-stone-900 font-serif">
                  {formatPrice(negotiation.listing.price)}
                </strong>
              </span>
              <span>•</span>
              <span>Meetup: {negotiation.listing.location}</span>
            </div>
          </div>
        </div>

        {/* Counterparty Identity */}
        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100 w-full sm:w-auto">
          <span className="text-[10px] text-stone-400 uppercase tracking-wider block">
            {isSeller ? 'Prospective Buyer' : 'Collector Seller'}
          </span>
          <span className="text-xs font-bold text-stone-900">
            {counterparty?.full_name || 'Marketplace Member'}
          </span>
          {counterparty?.location && (
            <span className="text-[11px] text-stone-500 block">{counterparty.location}</span>
          )}
        </div>
      </div>

      {/* Tabs (Mobile view switcher) */}
      <div className="flex lg:hidden border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('offers')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'offers'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Offer History ({negotiation.offers?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'border-stone-900 text-stone-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          Meetup & Chat ({messages.length})
        </button>
      </div>

      {/* Split Grid: Offer History & Action on Left (7 cols), Direct Chat on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Offers & Current Offer Action */}
        <div
          className={`lg:col-span-7 space-y-6 ${
            activeTab === 'offers' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Active Offer Decision Box */}
          {negotiation.status === 'agreed' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-emerald-900">
                Price Agreed at {formatPrice(latestOffer?.amount || 0)}
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                Both parties have accepted this valuation. Please arrange in-person inspection and settlement details via the chat.
              </p>
            </div>
          ) : negotiation.status === 'closed' ? (
            <div className="bg-stone-100 border border-stone-200 rounded-2xl p-6 text-center text-xs text-stone-600">
              This negotiation was closed or the listing was marked sold.
            </div>
          ) : isOfferPending ? (
            <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  Current Pending Offer
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  {latestOffer && formatTime(latestOffer.created_at)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-stone-400 uppercase tracking-widest font-semibold block">
                    Offer Amount
                  </span>
                  <span className="font-serif text-3xl font-bold text-stone-900">
                    {formatPrice(latestOffer?.amount || 0)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-stone-500 font-medium">
                    {isLatestOfferFromMe ? 'Submitted by You' : `Submitted by ${counterparty?.full_name}`}
                  </span>
                </div>
              </div>

              {latestOffer?.message && (
                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-700 italic border border-stone-200">
                  "{latestOffer.message}"
                </div>
              )}

              {/* Action buttons if counterparty submitted */}
              {!isLatestOfferFromMe ? (
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      id="accept-offer-btn"
                      type="button"
                      disabled={actionLoading}
                      onClick={handleAccept}
                      className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accept</span>
                    </button>

                    <button
                      id="counter-offer-toggle-btn"
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setIsCountering(!isCountering)}
                      className="py-2.5 px-3 bg-amber-800 hover:bg-amber-700 text-amber-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Counter</span>
                    </button>

                    <button
                      id="reject-offer-btn"
                      type="button"
                      disabled={actionLoading}
                      onClick={handleReject}
                      className="py-2.5 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>

                  {/* Counter Offer Drawer */}
                  {isCountering && (
                    <form
                      onSubmit={handleCounterSubmit}
                      className="p-4 bg-stone-50 border border-amber-200 rounded-xl space-y-3 mt-2"
                    >
                      <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
                        Specify Your Counter-Offer
                      </span>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-serif font-bold text-stone-500">₹</span>
                        <input
                          id="counter-amount-input"
                          type="number"
                          min="1"
                          step="1"
                          value={counterAmount}
                          onChange={(e) => setCounterAmount(e.target.value)}
                          placeholder="e.g. 54000"
                          required
                          className="w-full pl-8 pr-3 py-2 text-xs font-bold border border-stone-300 rounded-lg bg-white"
                        />
                      </div>
                      <textarea
                        value={counterMessage}
                        onChange={(e) => setCounterMessage(e.target.value)}
                        placeholder="Optional reason or condition justification..."
                        rows={2}
                        className="w-full p-2 text-xs border border-stone-300 rounded-lg bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCountering(false)}
                          className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
                        >
                          Cancel
                        </button>
                        <button
                          id="submit-counter-btn"
                          type="submit"
                          disabled={counterSubmitting}
                          className="px-4 py-1.5 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800"
                        >
                          {counterSubmitting ? 'Sending...' : 'Send Counter Offer'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    Your offer has been submitted. Awaiting {counterparty?.full_name}'s decision or counter-offer.
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {/* Chronological Offer History Log */}
          <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <span>Negotiation Ledger</span>
              <span className="text-xs font-sans text-stone-400 font-normal">
                ({negotiation.offers?.length || 0} events)
              </span>
            </h3>

            <div className="space-y-3">
              {/* Original Asking Price Entry */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                    Catalog Base Price
                  </span>
                  <span className="font-semibold text-stone-800">
                    Seller Listed: {formatPrice(negotiation.listing.price)}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">
                  {formatDate(negotiation.listing.created_at)}
                </span>
              </div>

              {/* Offers in reverse order or chronological */}
              {negotiation.offers?.map((off, idx) => {
                const isMyOffer = off.sender_id === user?.id;
                const senderName = isMyOffer ? 'You' : counterparty?.full_name || 'Counterparty';
                const isLatest = idx === (negotiation.offers.length - 1);

                return (
                  <motion.div
                    key={off.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                      off.status === 'accepted'
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : off.status === 'rejected'
                        ? 'bg-rose-50/50 border-rose-200 opacity-70'
                        : off.status === 'superseded'
                        ? 'bg-stone-50 border-stone-200 opacity-60'
                        : isLatest
                        ? 'bg-amber-50/90 border-amber-300 ring-1 ring-amber-300/60 shadow-2xs'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-stone-900">
                          {senderName} offered {formatPrice(off.amount)}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                            off.status === 'accepted'
                              ? 'bg-emerald-800 text-white'
                              : off.status === 'rejected'
                              ? 'bg-rose-800 text-white'
                              : off.status === 'pending'
                              ? 'bg-amber-800 text-white'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {off.status}
                        </span>
                      </div>

                      {off.message && (
                        <p className="text-[11px] text-stone-600 mt-1 italic">"{off.message}"</p>
                      )}
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono flex-shrink-0">
                      {formatTime(off.created_at)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Direct Messaging / Offline Meetup Chat */}
        <div
          className={`lg:col-span-5 bg-white border border-[#e7e2d9] rounded-2xl shadow-xs overflow-hidden flex flex-col h-[580px] ${
            activeTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Chat Header */}
          <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Direct Negotiation Chat
              </span>
            </div>
            <span className="text-[10px] text-stone-400">Realtime Channel</span>
          </div>

          {/* Offline Disclosure Notice */}
          <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-100 text-[11px] text-amber-900 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span>Exchange phone or meetup details safely for offline settlement.</span>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/30">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No chat messages yet.</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Coordinate questions, condition verification, and meetup location here.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isMine
                          ? 'bg-stone-900 text-stone-100 rounded-br-xs'
                          : 'bg-white border border-stone-200 text-stone-900 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1 px-1 font-mono">
                      <span>{formatTime(msg.created_at)}</span>
                      {isMine && msg.read_at && <span>• Read</span>}
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-stone-200 bg-white flex items-center gap-2"
          >
            <input
              id="negotiation-chat-input"
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Message counterparty or share phone..."
              disabled={sendingMsg}
              maxLength={2000}
              className="flex-1 py-2 px-3 text-xs border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
            />
            <button
              id="send-chat-msg-btn"
              type="submit"
              disabled={sendingMsg || !chatText.trim()}
              className="w-9 h-9 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
            >
              {sendingMsg ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
