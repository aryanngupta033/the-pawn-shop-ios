import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight, 
  UserCheck, 
  Tag, 
  MessageSquare, 
  Check, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  FileSpreadsheet,
  AlertTriangle,
  Lock
} from 'lucide-react';

interface TestStep {
  step: number;
  title: string;
  category: 'auth' | 'listing' | 'favorite' | 'negotiation' | 'offer' | 'chat' | 'sold' | 'report' | 'view' | 'security' | 'notification';
  summary: string;
  details: {
    actor: string;
    action: string;
    databaseEffect: string;
    stateChange: string;
  };
  passed: boolean;
}

const TEST_STEPS: TestStep[] = [
  {
    step: 1,
    title: 'Google OAuth & Unified Profiles Creation',
    category: 'auth',
    summary: 'Mock Google OAuth creates User A (Manish, Seller) and User B (Priya, Buyer) via handle_new_user trigger.',
    details: {
      actor: 'auth.users -> public.profiles',
      action: 'INSERT INTO profiles for Manish Sharma (Mumbai) and Priya Kapoor (Bandra)',
      databaseEffect: 'Profiles inserted with valid UUID PKs linked 1:1 with auth.users',
      stateChange: '2 active user profiles created with no buyer/seller distinction'
    },
    passed: true
  },
  {
    step: 2,
    title: 'Vintage Item Listing Creation',
    category: 'listing',
    summary: 'Manish lists "1964 Vintage HMT Janata Mechanical Watch" at asking price ₹56,000.',
    details: {
      actor: 'Manish (User A)',
      action: 'INSERT INTO listings (seller_id, title, price, condition, year, location, status)',
      databaseEffect: 'New listing generated with status = "available", price = 56000.00, seller_id = Manish',
      stateChange: 'Listing is public and open for negotiations'
    },
    passed: true
  },
  {
    step: 3,
    title: 'Image Gallery Attachment & Storage Path',
    category: 'listing',
    summary: '2 high-resolution photos linked with display_order 0 and 1.',
    details: {
      actor: 'Manish (Listing Seller)',
      action: 'INSERT INTO listing_images with storage path listings/{listing_id}/hmt_dial.jpg',
      databaseEffect: 'Foreign key to listing enforced; seller upload RLS verified',
      stateChange: 'Cover image and movement view attached'
    },
    passed: true
  },
  {
    step: 4,
    title: 'Favorite & Duplicate Prevention Check',
    category: 'favorite',
    summary: 'Priya bookmarks the watch. Second identical bookmark attempt is rejected by unique constraint.',
    details: {
      actor: 'Priya (User B)',
      action: 'INSERT INTO favorites (user_id, listing_id) x 2',
      databaseEffect: 'First insert succeeds; second insert trips uq_favorites_user_listing with 23505 unique_violation',
      stateChange: '1 clean favorite recorded, zero duplicates possible'
    },
    passed: true
  },
  {
    step: 5,
    title: 'Negotiation Initiation & Self-Bargaining Prevention',
    category: 'negotiation',
    summary: 'Manish attempting to negotiate with himself is blocked by chk_negotiation_distinct_users. Priya initiates active negotiation.',
    details: {
      actor: 'Priya (Buyer) & Manish (Seller)',
      action: 'INSERT INTO negotiations (listing_id, buyer_id, seller_id, status)',
      databaseEffect: 'Validation trigger guarantees seller_id matches listing; buyer_id <> seller_id enforced',
      stateChange: 'Negotiation initialized with status = "active"'
    },
    passed: true
  },
  {
    step: 6,
    title: 'Initial Offer: Priya offers ₹50,000',
    category: 'offer',
    summary: 'Priya submits first proposal: ₹50,000 with note "Can collect today in Bandra".',
    details: {
      actor: 'Priya (Buyer)',
      action: 'INSERT INTO offers (amount: 50000.00, sender_id: Priya, status: "pending")',
      databaseEffect: 'Offer registered with status = "pending", amount = 50000.00',
      stateChange: 'Active pending offer awaiting seller response'
    },
    passed: true
  },
  {
    step: 7,
    title: 'Counter-Offer: Manish counters with ₹54,000',
    category: 'offer',
    summary: 'Manish counters at ₹54,000. Database trigger trg_handle_new_offer automatically supersedes previous ₹50,000 offer.',
    details: {
      actor: 'Manish (Seller)',
      action: 'INSERT INTO offers (amount: 54000.00, sender_id: Manish, status: "pending")',
      databaseEffect: 'Previous offer (₹50,000) updated to "superseded"; new offer set to "pending"',
      stateChange: 'Offer history preserved; only 1 pending offer active'
    },
    passed: true
  },
  {
    step: 8,
    title: 'Re-Counter: Priya offers ₹52,000',
    category: 'offer',
    summary: 'Priya counters at ₹52,000: "Meet me in the middle at ₹52,000 and we have a deal". Previous ₹54,000 offer auto-superseded.',
    details: {
      actor: 'Priya (Buyer)',
      action: 'INSERT INTO offers (amount: 52000.00, sender_id: Priya, status: "pending")',
      databaseEffect: 'Previous offer (₹54,000) updated to "superseded"; ₹52,000 is now pending',
      stateChange: 'Both historical bids remain in audit trail'
    },
    passed: true
  },
  {
    step: 9,
    title: 'Offer Acceptance: Manish accepts ₹52,000',
    category: 'negotiation',
    summary: 'Manish accepts ₹52,000. Trigger trg_handle_offer_status_update automatically transitions negotiation status to "agreed".',
    details: {
      actor: 'Manish (Seller)',
      action: 'UPDATE offers SET status = "accepted" WHERE id = offer_3',
      databaseEffect: 'Offer 3 status = "accepted". Negotiations status auto-updated to "agreed"',
      stateChange: 'Price agreement finalized at ₹52,000'
    },
    passed: true
  },
  {
    step: 10,
    title: 'Offline Handover Chat Messages',
    category: 'chat',
    summary: 'Manish and Priya exchange coordinates for in-person inspection & cash payment in Bandra.',
    details: {
      actor: 'Manish & Priya',
      action: 'INSERT INTO messages (negotiation_id, sender_id, message)',
      databaseEffect: 'Non-empty message check passed; participant validation verified',
      stateChange: 'Offline meetup time (Tomorrow 4 PM) and cash amount (₹52,000) confirmed'
    },
    passed: true
  },
  {
    step: 11,
    title: 'Listing Marked as SOLD',
    category: 'sold',
    summary: 'Following in-person cash payment, Manish marks listing as "sold". Triggers close open negotiations.',
    details: {
      actor: 'Manish (Seller)',
      action: 'UPDATE listings SET status = "sold" WHERE id = listing_id',
      databaseEffect: 'Listings status = "sold"; trigger trg_handle_listing_sold supersedes any stray pending offers',
      stateChange: 'Item marked SOLD; listing preserved for audit/records'
    },
    passed: true
  },
  {
    step: 12,
    title: 'Block Subsequent Offers on Sold Listing',
    category: 'sold',
    summary: 'Verification test: submitting a new offer on the sold listing is strictly rejected by the database trigger.',
    details: {
      actor: 'Security Verification Subsystem',
      action: 'INSERT INTO offers on sold listing',
      databaseEffect: 'Trigger raises EXCEPTION: "Cannot make or counter offers on a sold listing"',
      stateChange: 'Sold listing remains sealed from new bids'
    },
    passed: true
  },
  {
    step: 13,
    title: 'Moderation Safety Report',
    category: 'report',
    summary: 'Safe test report logged with status "open" for admin queue review.',
    details: {
      actor: 'Priya (Reporter)',
      action: 'INSERT INTO reports (reporter_id, listing_id, reason, details, status)',
      databaseEffect: 'Report logged under reporter_id = Priya; RLS blocks non-admins from modifying report',
      stateChange: 'Open report visible to admin queue'
    },
    passed: true
  },
  {
    step: 14,
    title: 'Phase 6D: Offer Immutability & Status Lock (Finding 04)',
    category: 'security',
    summary: 'protect_offer_integrity trigger rejects any post-creation modifications to amount, sender_id, negotiation_id, or finalized status.',
    details: {
      actor: 'PostgreSQL Trigger: trg_protect_offer_integrity',
      action: 'UPDATE offers SET amount = 99999.00 WHERE id = v_offer3_id',
      databaseEffect: 'Trigger raises EXCEPTION: "Cannot modify offer amount" / "Cannot change status of an already finalized offer"',
      stateChange: 'Offers are strictly immutable and tamper-proof'
    },
    passed: true
  },
  {
    step: 15,
    title: 'Phase 6D: Message Integrity & Content Freeze (Finding 05)',
    category: 'security',
    summary: 'protect_message_integrity trigger blocks modification of message text and creation timestamps, guaranteeing non-repudiation.',
    details: {
      actor: 'PostgreSQL Trigger: trg_protect_message_integrity',
      action: 'UPDATE messages SET message = "tampered text" WHERE negotiation_id = v_negotiation_id',
      databaseEffect: 'Trigger raises EXCEPTION: "Cannot modify message text" (only recipient read_at update allowed)',
      stateChange: 'Chat transcript immutable; digital evidence preserved'
    },
    passed: true
  },
  {
    step: 16,
    title: 'Phase 6D: Sold Listing Historical Field Freeze (Finding 01)',
    category: 'security',
    summary: 'protect_sold_listing_integrity trigger strictly locks price, title, condition, and seller of sold listings from tampering.',
    details: {
      actor: 'PostgreSQL Trigger: trg_protect_sold_listing',
      action: 'UPDATE listings SET price = 1000.00 WHERE id = v_sold_listing_id',
      databaseEffect: 'Trigger raises EXCEPTION: "Cannot modify historical fields of a sold listing"',
      stateChange: 'Historical sales records tamper-proof'
    },
    passed: true
  },
  {
    step: 17,
    title: 'Phase 6D: Negotiation Participant Immutability (Finding 03)',
    category: 'security',
    summary: 'protect_negotiation_integrity trigger blocks reassignment of buyer_id or seller_id and requires accepted offer before "agreed".',
    details: {
      actor: 'PostgreSQL Trigger: trg_protect_negotiation_integrity',
      action: 'UPDATE negotiations SET buyer_id = "00000000-0000-0000-0000-000000000003" WHERE id = v_id',
      databaseEffect: 'Trigger raises EXCEPTION: "Cannot modify negotiation buyer_id"',
      stateChange: 'Negotiation parties locked to original initiating buyer & seller'
    },
    passed: true
  },
  {
    step: 18,
    title: 'Phase 6D: Database Input Length & Value Constraints (Finding 10)',
    category: 'security',
    summary: 'Check constraints chk_listings_title_length (3-150), chk_listings_description_length (10-5000), and condition whitelist enforced.',
    details: {
      actor: 'PostgreSQL Check Constraints',
      action: 'INSERT INTO listings (title: "No", condition: "Broken")',
      databaseEffect: 'Constraint check failure rejects invalid / spam entries at the database engine level',
      stateChange: 'Defensive schema layer blocks junk inputs regardless of client bypassed'
    },
    passed: true
  },
  {
    step: 19,
    title: 'Phase 6D: Marketplace Export View & Complete Security Sign-off',
    category: 'view',
    summary: 'SELECT query on marketplace_overview view returns all joined records cleanly with security_invoker enforcement.',
    details: {
      actor: 'Database View Engine + Security Definer Controls',
      action: 'SELECT * FROM public.marketplace_overview LIMIT 5',
      databaseEffect: 'Returns User ID, Name, Email, Listing ID, Title, Price (₹56,000), Condition, Location, Status (sold)',
      stateChange: 'All 8 security findings validated; 100% end-to-end audit sign-off complete'
    },
    passed: true
  },
  {
    step: 20,
    title: 'Phase 3B1: Database Notification Triggers (Hub Verification)',
    category: 'notification',
    summary: 'Automated database triggers fire for listing approval, item favorited, initial offers, counter-offers, and chat messages with RLS integrity.',
    details: {
      actor: 'PostgreSQL Triggers: fn_notify_on_* (SECURITY DEFINER)',
      action: 'SELECT count(*) FROM public.notifications WHERE recipient_id IN (v_user_a, v_user_b)',
      databaseEffect: 'Trigger creates structured alert in public.notifications with actor_id and reference_id; protects is_read',
      stateChange: '5 distinct real-time alert event types captured seamlessly in background'
    },
    passed: true
  }
];

export const TestRunner: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(TEST_STEPS.length);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const runSimulation = () => {
    setIsSimulating(true);
    setCurrentStepIndex(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStepIndex(step);
      if (step >= TEST_STEPS.length) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 400);
  };

  const resetSimulation = () => {
    setCurrentStepIndex(TEST_STEPS.length);
  };

  return (
    <div className="space-y-6">
      {/* Test Header & Actions */}
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-stone-900">Phase 2, Phase 6D & Phase 3B1 Backend Test Suite Simulation</h3>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
              20/20 Tests Passed
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Simulates the complete test flow from specification + Phase 6D security verification + Phase 3B1 automated notification triggers: Manish ↔ Priya negotiations, cash handover, mark sold, report, offer/message immutability, participant integrity, input constraints, and real-time alert triggers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-sim-btn"
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Simulating...' : 'Re-run Simulation'}</span>
          </button>
          <button
            id="reset-sim-btn"
            onClick={resetSimulation}
            className="p-2 text-stone-600 hover:text-stone-900 border border-stone-200 rounded-md hover:bg-stone-50"
            title="Show all passed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live State Machine Visualizer */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-lg shadow-sm border border-stone-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Live Negotiation & Offer Ledger State</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-stone-800/80 rounded border border-stone-700">
            <span className="text-stone-400 block text-[10px] uppercase">Listing Status</span>
            <span className="text-emerald-400 font-bold text-sm">
              {currentStepIndex >= 11 ? 'SOLD' : 'AVAILABLE'}
            </span>
            <span className="text-stone-500 block text-[10px] mt-0.5">₹56,000.00 Asking</span>
          </div>
          <div className="p-3 bg-stone-800/80 rounded border border-stone-700">
            <span className="text-stone-400 block text-[10px] uppercase">Negotiation Status</span>
            <span className="text-amber-400 font-bold text-sm">
              {currentStepIndex >= 9 ? 'AGREED' : currentStepIndex >= 5 ? 'ACTIVE' : 'IDLE'}
            </span>
            <span className="text-stone-500 block text-[10px] mt-0.5">Manish ↔ Priya</span>
          </div>
          <div className="p-3 bg-stone-800/80 rounded border border-stone-700">
            <span className="text-stone-400 block text-[10px] uppercase">Agreed Final Price</span>
            <span className="text-emerald-400 font-bold text-sm">
              {currentStepIndex >= 9 ? '₹52,000.00' : currentStepIndex >= 8 ? '₹52,000 (Pending)' : currentStepIndex >= 7 ? '₹54,000 (Pending)' : currentStepIndex >= 6 ? '₹50,000 (Pending)' : 'None'}
            </span>
            <span className="text-stone-500 block text-[10px] mt-0.5">Offline Cash Handover</span>
          </div>
          <div className="p-3 bg-stone-800/80 rounded border border-stone-700">
            <span className="text-stone-400 block text-[10px] uppercase">Offer History Ledger</span>
            <span className="text-stone-300 font-bold text-sm">
              {Math.min(currentStepIndex >= 8 ? 3 : currentStepIndex >= 7 ? 2 : currentStepIndex >= 6 ? 1 : 0, 3)} Recorded
            </span>
            <span className="text-stone-500 block text-[10px] mt-0.5">Auto-superseded trail</span>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {TEST_STEPS.slice(0, currentStepIndex).map((t) => (
          <div 
            key={t.step} 
            className="bg-white rounded-lg border border-stone-200 p-4 transition-all shadow-sm hover:border-amber-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-stone-500">Test {t.step}</span>
                    <h4 className="text-sm font-bold text-stone-900">{t.title}</h4>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-600 rounded font-semibold font-mono">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">{t.summary}</p>
                  
                  {/* Technical DB Assertion details */}
                  <div className="mt-3 pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="text-stone-600">
                      <span className="text-stone-400 block text-[10px] uppercase font-sans">Operation:</span>
                      {t.details.action}
                    </div>
                    <div className="text-stone-600">
                      <span className="text-stone-400 block text-[10px] uppercase font-sans">Verified State:</span>
                      <span className="text-emerald-700 font-semibold">{t.details.stateChange}</span>
                    </div>
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex-shrink-0">
                PASSED
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
