import React, { useState } from 'react';
import { Database, Key, CheckCircle, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

interface TableSpec {
  name: string;
  description: string;
  fields: { name: string; type: string; constraints: string; note: string }[];
  triggers?: string[];
}

export const TABLES_DATA: TableSpec[] = [
  {
    name: 'profiles',
    description: 'Unified account profile linked 1:1 with Supabase auth.users. No role division.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE', note: 'Immutable single user identity' },
      { name: 'full_name', type: 'TEXT', constraints: 'NOT NULL', note: 'Extracted from Google OAuth metadata' },
      { name: 'avatar_url', type: 'TEXT', constraints: 'NULLABLE', note: 'Google profile picture' },
      { name: 'location', type: 'TEXT', constraints: 'NULLABLE', note: 'City/vicinity for physical handover' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Account creation timestamp' }
    ],
    triggers: ['on_auth_user_created (AFTER INSERT ON auth.users)']
  },
  {
    name: 'listings',
    description: 'Items posted by sellers. Ownership strictly immutable via seller_id.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Unique listing identifier' },
      { name: 'seller_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Listing owner' },
      { name: 'title', type: 'TEXT', constraints: 'NOT NULL', note: 'Item headline' },
      { name: 'description', type: 'TEXT', constraints: 'NOT NULL', note: 'Item provenance and details' },
      { name: 'price', type: 'NUMERIC(12,2)', constraints: 'NOT NULL, CHECK (price >= 0)', note: 'Asking price' },
      { name: 'condition', type: 'TEXT', constraints: 'NOT NULL', note: 'Mint, Excellent, Good, Fair, Poor' },
      { name: 'year', type: 'INTEGER', constraints: 'NULLABLE, CHECK (year >= 1500 AND year <= current_year + 1)', note: 'Vintage year' },
      { name: 'brand', type: 'TEXT', constraints: 'NULLABLE', note: 'Manufacturer or maker mark' },
      { name: 'location', type: 'TEXT', constraints: 'NOT NULL', note: 'Physical handover location' },
      { name: 'status', type: 'TEXT', constraints: "NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'removed'))", note: 'Listing status lifecycle' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Post timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Auto-updated via handle_updated_at()' }
    ],
    triggers: ['trg_listings_updated_at (BEFORE UPDATE)', 'trg_handle_listing_sold (AFTER UPDATE OF status)']
  },
  {
    name: 'listing_images',
    description: 'Ordered multi-image visual assets per listing.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Image record ID' },
      { name: 'listing_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES listings(id) ON DELETE CASCADE', note: 'Target listing' },
      { name: 'image_url', type: 'TEXT', constraints: 'NOT NULL', note: 'Supabase storage bucket URL' },
      { name: 'display_order', type: 'INTEGER', constraints: 'NOT NULL DEFAULT 0', note: 'Sort order (0 = primary cover)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Upload timestamp' }
    ]
  },
  {
    name: 'favorites',
    description: 'User saved listings. Enforces uniqueness so duplicate bookmarks are impossible.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Favorite ID' },
      { name: 'user_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Saver user identity' },
      { name: 'listing_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES listings(id) ON DELETE CASCADE', note: 'Bookmarked listing' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Timestamp' }
    ],
    triggers: ['UNIQUE CONSTRAINT (user_id, listing_id)']
  },
  {
    name: 'negotiations',
    description: 'Bargaining conversation thread between prospective buyer and listing owner.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Negotiation ID' },
      { name: 'listing_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES listings(id) ON DELETE CASCADE', note: 'Target listing' },
      { name: 'buyer_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Prospective buyer' },
      { name: 'seller_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Must equal listing.seller_id' },
      { name: 'status', type: 'TEXT', constraints: "NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'agreed', 'rejected', 'closed'))", note: 'Negotiation lifecycle state' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Thread start' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Last activity timestamp' }
    ],
    triggers: [
      'trg_negotiations_updated_at (BEFORE UPDATE)',
      'trg_validate_negotiation (BEFORE INSERT)',
      'CHECK (buyer_id <> seller_id)',
      'UNIQUE CONSTRAINT (listing_id, buyer_id)'
    ]
  },
  {
    name: 'offers',
    description: 'Immutable historical ledger of proposals and counters. Never deleted or modified.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Offer ID' },
      { name: 'negotiation_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES negotiations(id) ON DELETE CASCADE', note: 'Negotiation context' },
      { name: 'sender_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Author (buyer or seller)' },
      { name: 'amount', type: 'NUMERIC(12,2)', constraints: 'NOT NULL, CHECK (amount > 0)', note: 'Price proposal' },
      { name: 'message', type: 'TEXT', constraints: 'NULLABLE', note: 'Optional proposal note' },
      { name: 'status', type: 'TEXT', constraints: "NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded'))", note: 'Offer status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Proposal timestamp' }
    ],
    triggers: [
      'trg_handle_new_offer (BEFORE INSERT - auto-supersedes old pending offers)',
      'trg_handle_offer_status_update (AFTER UPDATE OF status - auto-updates negotiation to agreed)'
    ]
  },
  {
    name: 'messages',
    description: 'Direct communication inside negotiation to coordinate physical inspection & cash handover.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Message ID' },
      { name: 'negotiation_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES negotiations(id) ON DELETE CASCADE', note: 'Negotiation context' },
      { name: 'sender_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Sender identity' },
      { name: 'message', type: 'TEXT', constraints: 'NOT NULL, CHECK (length(trim(message)) > 0)', note: 'Non-empty message content' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Sent timestamp' },
      { name: 'read_at', type: 'TIMESTAMPTZ', constraints: 'NULLABLE', note: 'Read receipt timestamp' }
    ]
  },
  {
    name: 'reports',
    description: 'Moderation queue for user or listing safety infractions.',
    fields: [
      { name: 'id', type: 'UUID', constraints: 'PRIMARY KEY DEFAULT gen_random_uuid()', note: 'Report ID' },
      { name: 'reporter_id', type: 'UUID', constraints: 'NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE', note: 'Author of report' },
      { name: 'listing_id', type: 'UUID', constraints: 'NULLABLE, REFERENCES listings(id) ON DELETE SET NULL', note: 'Reported listing' },
      { name: 'reported_user_id', type: 'UUID', constraints: 'NULLABLE, REFERENCES profiles(id) ON DELETE SET NULL', note: 'Reported user' },
      { name: 'reason', type: 'TEXT', constraints: 'NOT NULL', note: 'Infraction category' },
      { name: 'details', type: 'TEXT', constraints: 'NULLABLE', note: 'Contextual notes' },
      { name: 'status', type: 'TEXT', constraints: "NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed'))", note: 'Moderation review status' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraints: 'NOT NULL DEFAULT now()', note: 'Report submission timestamp' }
    ],
    triggers: ['CHECK (listing_id IS NOT NULL OR reported_user_id IS NOT NULL)']
  }
];

export const SchemaViewer: React.FC = () => {
  const [selectedTable, setSelectedTable] = useState<string>('listings');
  const table = TABLES_DATA.find(t => t.name === selectedTable) || TABLES_DATA[1];

  return (
    <div className="space-y-6">
      {/* Category Constraint Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-semibold block text-sm mb-0.5">Strict V1 Scope Adherence</strong>
          Zero categories table, zero checkout/payment tables, zero shipping/wallets, and zero separate buyer/seller account types. The schema is centered exclusively on 8 core tables with strict relational integrity.
        </div>
      </div>

      {/* Table Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {TABLES_DATA.map(t => (
          <button
            key={t.name}
            id={`schema-btn-${t.name}`}
            onClick={() => setSelectedTable(t.name)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              selectedTable === t.name
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedTable === t.name ? 'bg-amber-800 text-amber-100' : 'bg-stone-100 text-stone-600'
            }`}>
              {t.fields.length}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Table Inspector */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-stone-900 font-mono">public.{table.name}</h3>
              <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded font-medium">PostgreSQL 15</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">{table.description}</p>
          </div>
          {table.triggers && table.triggers.length > 0 && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded">
              <span className="font-semibold block mb-0.5">Automations:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {table.triggers.map((trg, i) => (
                  <li key={i}>{trg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-600 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th className="px-5 py-3">Column</th>
                <th className="px-5 py-3">Data Type</th>
                <th className="px-5 py-3">Constraints & Default</th>
                <th className="px-5 py-3">Business Logic Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 font-mono">
              {table.fields.map((f, idx) => (
                <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                  <td className="px-5 py-3 font-semibold text-stone-900 flex items-center gap-1.5">
                    {f.constraints.includes('PRIMARY KEY') || f.constraints.includes('PK') ? (
                      <Key className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    {f.name}
                  </td>
                  <td className="px-5 py-3 text-amber-800 font-medium">{f.type}</td>
                  <td className="px-5 py-3 text-stone-600 font-sans text-[11px] leading-relaxed">
                    {f.constraints}
                  </td>
                  <td className="px-5 py-3 text-stone-500 font-sans text-[11px]">
                    {f.note}
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
