import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MessageSquare, 
  Tag, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { fetchUserNegotiations } from '../services/negotiationsService';
import type { NegotiationWithContext } from '../types';
import { formatPrice, formatDate, getStatusBadge } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface NegotiationsListScreenProps {
  onSelectNegotiation: (id: string) => void;
  onRequireAuth: () => void;
}

export const NegotiationsListScreen: React.FC<NegotiationsListScreenProps> = ({
  onSelectNegotiation,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [negotiations, setNegotiations] = useState<NegotiationWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'received' | 'sent'>('all');

  const loadNegotiations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUserNegotiations(user.id);
      setNegotiations(data);
    } catch (err: any) {
      console.error('Error loading negotiations:', err);
      setError(err?.message || 'Failed to load offers and negotiations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNegotiations();
    }
  }, [user?.id]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xs">
          <MessageSquare className="w-10 h-10 text-amber-700 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">Sign in to View Offers</h2>
          <p className="text-xs text-stone-600 mb-6">
            Log in to view incoming buyer inquiries and counter-offers on your collection.
          </p>
          <button
            onClick={onRequireAuth}
            className="w-full py-2.5 bg-stone-900 text-stone-100 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const filtered = negotiations.filter((item) => {
    if (filterTab === 'received') return item.seller_id === user.id;
    if (filterTab === 'sent') return item.buyer_id === user.id;
    return true;
  });

  const receivedCount = negotiations.filter((n) => n.seller_id === user.id).length;
  const sentCount = negotiations.filter((n) => n.buyer_id === user.id).length;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
          Offers & Negotiations
        </h1>
        <p className="text-xs text-stone-500">
          Peer-to-peer price agreements and offline exchange communications.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filterTab === 'all'
              ? 'bg-stone-900 text-stone-100'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          All Negotiations ({negotiations.length})
        </button>

        <button
          onClick={() => setFilterTab('received')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'received'
              ? 'bg-stone-900 text-stone-100'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
          <span>Offers Received ({receivedCount})</span>
        </button>

        <button
          onClick={() => setFilterTab('sent')}
          className={`px-3.5 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            filterTab === 'sent'
              ? 'bg-stone-900 text-stone-100'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
          <span>Offers Sent ({sentCount})</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
          <p className="text-xs text-stone-500">Loading negotiation threads...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 max-w-md mx-auto">
          <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">
            No Active Negotiations
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            {filterTab === 'received'
              ? 'You have not received any offers on your listings yet.'
              : filterTab === 'sent'
              ? 'You have not submitted an offer on any collectibles yet.'
              : 'When you make an offer on a piece or a buyer makes an offer on your listing, negotiations will appear here.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((neg) => {
            const isSeller = neg.seller_id === user.id;
            const counterparty = isSeller ? neg.buyer : neg.seller;
            const statusBadge = getStatusBadge(neg.status);
            const latestOffer = neg.latest_offer;
            const primaryImg =
              neg.listing?.images?.[0]?.image_url ||
              'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800';

            return (
              <div
                key={neg.id}
                id={`negotiation-row-${neg.id}`}
                onClick={() => onSelectNegotiation(neg.id)}
                className="bg-white border border-[#e7e2d9] hover:border-amber-700/60 rounded-xl p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
              >
                {/* Left: Listing thumbnail & details */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                    <img
                      src={primaryImg}
                      alt={neg.listing?.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusBadge.bg}`}
                      >
                        {statusBadge.label}
                      </span>

                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 flex items-center gap-1">
                        {isSeller ? (
                          <>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                            <span>Offer from {counterparty?.full_name || 'Buyer'}</span>
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-amber-600" />
                            <span>Your offer to {counterparty?.full_name || 'Seller'}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-serif text-sm font-bold text-stone-900 hover:text-amber-900 transition-colors">
                      {neg.listing?.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span>
                        Asking:{' '}
                        <strong className="text-stone-800">
                          {formatPrice(neg.listing?.price || 0)}
                        </strong>
                      </span>
                      {latestOffer && (
                        <>
                          <span>•</span>
                          <span className="text-amber-900 font-bold">
                            Latest Offer: {formatPrice(latestOffer.amount)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Negotiation action arrow */}
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block font-mono">
                      {formatDate(neg.updated_at)}
                    </span>
                    <span className="text-[11px] text-stone-600 font-medium">
                      {neg.offers?.length || 0} counter{neg.offers?.length === 1 ? '' : 's'} recorded
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center text-stone-600 flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
