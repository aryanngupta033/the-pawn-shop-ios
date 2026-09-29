import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface RlsPolicySpec {
  table: string;
  select: string;
  insert: string;
  update: string;
  delete: string;
}

const POLICIES: RlsPolicySpec[] = [
  {
    table: 'profiles',
    select: 'Public authenticated read (to identify buyers & sellers in market)',
    insert: 'auth.uid() = id (Automatic trigger syncs Google OAuth metadata)',
    update: 'auth.uid() = id (Users can only edit their own name/location)',
    delete: 'auth.uid() = id OR public.is_admin()'
  },
  {
    table: 'listings',
    select: "status IN ('available', 'reserved', 'sold') OR seller_id = auth.uid() OR is_admin()",
    insert: 'seller_id = auth.uid() (Forces immutable ownership to creator)',
    update: 'seller_id = auth.uid() OR is_admin()',
    delete: 'seller_id = auth.uid() OR is_admin()'
  },
  {
    table: 'listing_images',
    select: 'EXISTS in public.listings (Visible if parent listing is visible)',
    insert: 'Parent listing seller_id = auth.uid()',
    update: 'Parent listing seller_id = auth.uid()',
    delete: 'Parent listing seller_id = auth.uid()'
  },
  {
    table: 'favorites',
    select: 'user_id = auth.uid() (Strictly private to the user)',
    insert: 'user_id = auth.uid()',
    update: 'Blocked (favorites are binary toggles)',
    delete: 'user_id = auth.uid()'
  },
  {
    table: 'negotiations',
    select: 'buyer_id = auth.uid() OR seller_id = auth.uid() OR is_admin()',
    insert: 'buyer_id = auth.uid() (Buyer initiates negotiation)',
    update: 'buyer_id = auth.uid() OR seller_id = auth.uid() (Both can update status)',
    delete: 'Blocked (Preserves audit trail)'
  },
  {
    table: 'offers',
    select: 'Participant in parent negotiation OR is_admin()',
    insert: 'sender_id = auth.uid() AND participant in negotiation',
    update: 'Recipient only (sender cannot accept own offer) OR is_admin()',
    delete: 'Blocked (Offers are strictly append-only)'
  },
  {
    table: 'messages',
    select: 'Participant in parent negotiation OR is_admin()',
    insert: 'sender_id = auth.uid() AND participant in negotiation',
    update: 'Recipient only for updating read_at timestamp',
    delete: 'Blocked (Chat audit trail immutable)'
  },
  {
    table: 'reports',
    select: 'reporter_id = auth.uid() OR is_admin()',
    insert: 'reporter_id = auth.uid() (Any authenticated user can report)',
    update: 'is_admin() (Only moderators can change resolution/status)',
    delete: 'is_admin() only'
  },
  {
    table: 'storage.objects (listing-images)',
    select: "bucket_id = 'listing-images' (Public read for item photos)",
    insert: 'Seller of listing_id extracted from path listings/{listing_id}/*',
    update: 'Seller of listing_id extracted from path',
    delete: 'Seller of listing_id extracted from path'
  }
];

export const RlsMatrix: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900">Kernel-Level Row Level Security (RLS)</h3>
            <p className="text-xs text-stone-600">
              Every query is enforced inside PostgreSQL by evaluating <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono">auth.uid()</code>. 
              Data cannot leak across participants, even if frontend code is bypassed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-stone-200 text-xs">
          <div className="p-3 bg-stone-50 rounded border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">Zero Blind Deletes</span>
            <p className="text-stone-600">Offers and messages have no DELETE policy; historical negotiation ledgers and timestamps are tamper-proof.</p>
          </div>
          <div className="p-3 bg-stone-50 rounded border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">Contextual Negotiation Boundary</span>
            <p className="text-stone-600">Offers and chat are filtered with <code className="text-amber-800 font-mono">EXISTS(negotiations WHERE buyer_id = auth.uid() OR seller_id = auth.uid())</code>.</p>
          </div>
          <div className="p-3 bg-stone-50 rounded border border-stone-200">
            <span className="font-bold text-stone-900 block mb-1">Storage Ownership Verification</span>
            <p className="text-stone-600">Image uploads are checked against the seller_id of the listing matching the folder UUID.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/80">
          <h4 className="text-sm font-bold text-stone-900">Complete Table & Storage Policy Matrix</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="px-5 py-3">Resource / Table</th>
                <th className="px-5 py-3">SELECT (Read)</th>
                <th className="px-5 py-3">INSERT (Create)</th>
                <th className="px-5 py-3">UPDATE (Edit)</th>
                <th className="px-5 py-3">DELETE (Remove)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 font-sans">
              {POLICIES.map((p, i) => (
                <tr key={i} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-bold font-mono text-stone-900 bg-stone-50/40">
                    {p.table}
                  </td>
                  <td className="px-5 py-3.5 text-stone-700 text-[11px] leading-relaxed">
                    <span className="inline-block bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-mono text-[10px] mb-1">SELECT</span>
                    <div>{p.select}</div>
                  </td>
                  <td className="px-5 py-3.5 text-stone-700 text-[11px] leading-relaxed">
                    <span className="inline-block bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono text-[10px] mb-1">INSERT</span>
                    <div>{p.insert}</div>
                  </td>
                  <td className="px-5 py-3.5 text-stone-700 text-[11px] leading-relaxed">
                    <span className="inline-block bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-mono text-[10px] mb-1">UPDATE</span>
                    <div>{p.update}</div>
                  </td>
                  <td className="px-5 py-3.5 text-stone-700 text-[11px] leading-relaxed">
                    <span className="inline-block bg-rose-50 text-rose-800 px-2 py-0.5 rounded font-mono text-[10px] mb-1">DELETE</span>
                    <div>{p.delete}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
