import React from 'react';
import { ArrowLeft, ShieldAlert, Mail, MapPin, CheckCircle2, Lock, AlertTriangle, Scale, UserCheck, ShieldCheck } from 'lucide-react';

interface LegalScreenProps {
  onBack: () => void;
}

export const LegalScreen: React.FC<LegalScreenProps> = ({ onBack }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white border border-[#e7e2d9] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
              Terms of Service, Intermediary Disclaimers & Safety Rules
            </h1>
          </div>
          <p className="text-xs text-stone-500">
            Last Updated: March 2026 • Governed under the Information Technology Act, 2000 & Consumer Protection Rules
          </p>
        </div>

        {/* Mandatory Statutory Intermediary Notice */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-900 shrink-0" />
            <span className="font-serif text-xs font-bold text-amber-900 uppercase tracking-wider block">
              Statutory Intermediary Declaration (Section 79 Safe Harbor)
            </span>
          </div>
          <p className="text-xs text-amber-950 leading-relaxed font-medium">
            <strong>The Pawn Shop is an intermediary venue</strong> as defined under Section 2(1)(w) of the Information Technology Act, 2000. 
            The platform provides only technical discovery and messaging facilities connecting independent collectors. 
            <strong> The Pawn Shop does not participate in transactions, does not hold custody of items, does not process or escrow payments, does not provide collateral lending or pawnbroking services, and is not a party to any contract or bill of sale between users.</strong>
          </p>
        </div>

        {/* Critical Anti-Fraud Warning */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-800 shrink-0" />
            <span className="font-serif text-xs font-bold text-rose-900 uppercase tracking-wider block">
              Critical Warning: Zero Advance Payments & Offline Fraud Notice
            </span>
          </div>
          <p className="text-xs text-rose-950 leading-relaxed">
            <strong>NEVER send advance money, courier booking fees, UPI deposits, or gift cards before meeting in person and thoroughly inspecting the item.</strong> The Pawn Shop will NEVER contact you requesting payments on behalf of a seller or asking for bank credentials. Any user demanding advance deposits is likely fraudulent; report them immediately.
          </p>
        </div>

        {/* Clauses */}
        <div className="space-y-5 text-xs text-stone-700 leading-relaxed divide-y divide-stone-100">
          <section className="space-y-1.5 pt-2">
            <h3 className="font-serif text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>1. Discovery Venue & No Pawn Lending Services</span>
            </h3>
            <p>
              The name "The Pawn Shop" is used exclusively as a creative moniker for our vintage and historical collectibles directory. 
              <strong> The platform is NOT a licensed pawnbroker, money lender, or banking institution.</strong> We strictly prohibit collateralized loans, interest-bearing lending, debt agreements, or high-cost pawn loans on this platform. All listings are strictly for direct, final peer-to-peer sale of pre-owned physical goods.
            </p>
          </section>

          <section className="space-y-1.5 pt-4">
            <h3 className="font-serif text-sm font-bold text-stone-900">
              2. User-Generated Content (UGC) & Prohibited Items
            </h3>
            <p>
              Users retain sole legal responsibility for all photos, descriptions, and communications submitted. By publishing content, you warrant that you are the lawful owner or authorized seller of the listed item.
            </p>
            <p className="font-semibold text-stone-800 mt-1">Strictly Prohibited Goods & Activities:</p>
            <ul className="list-disc pl-5 space-y-1 text-stone-600">
              <li>Stolen property, unverified antiquities lacking lawful documentation, or looted cultural relics.</li>
              <li>Counterfeit luxury goods, replicas, fake currency, or falsely hallmarked precious metals.</li>
              <li>Firearms, weapons, ammunition, explosives, or hazardous vintage materials.</li>
              <li>Alcohol, tobacco, prescription substances, or endangered wildlife artifacts (e.g., ivory).</li>
              <li>Any form of scam, financial fraud, phishing, or predatory solicitation.</li>
            </ul>
            <p className="mt-1">
              Violations result in immediate listing removal, permanent account termination, and referral to law enforcement authorities where appropriate.
            </p>
          </section>

          <section className="space-y-1.5 pt-4">
            <h3 className="font-serif text-sm font-bold text-stone-900">
              3. Mandatory In-Person Inspection & As-Is Condition
            </h3>
            <p>
              All items on The Pawn Shop are pre-owned vintage collectibles traded strictly <strong>"AS IS, WHERE IS"</strong> without express or implied warranties. Buyers must verify provenance, mechanical movements, serial numbers, and hallmarks with certified experts prior to handing over funds. The platform cannot verify physical authenticity and accepts zero liability for disputes regarding condition or grading.
            </p>
          </section>

          <section className="space-y-1.5 pt-4">
            <h3 className="font-serif text-sm font-bold text-stone-900">
              4. Complete Limitation of Liability & Indemnification
            </h3>
            <p>
              To the maximum extent permitted under applicable law, The Pawn Shop, its founders, operators, employees, and software providers shall NOT be liable for any direct, indirect, punitive, incidental, or consequential damages, including but not limited to: financial loss from scams, bounced checks, fraudulent UPI transfers, counterfeit merchandise, damaged items, personal injury, theft during meetups, or platform downtime.
            </p>
            <p className="mt-1 font-medium text-stone-800">
              User Indemnification: You agree to defend, indemnify, and hold harmless The Pawn Shop and its operators from any claims, disputes, consumer lawsuits, damages, or legal expenses arising from your transactions, conduct, or violation of these Terms.
            </p>
          </section>

          <section className="space-y-1.5 pt-4">
            <h3 className="font-serif text-sm font-bold text-stone-900">
              5. Safe Meetup & Settlement Protocol
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-stone-600">
              <li>Always conduct exchanges in safe, well-lit, publicly monitored spaces (such as bank lobbies, police station exchange zones, or recognized watchmaker boutiques).</li>
              <li>Never meet alone in isolated residences, dark parking alleys, or unverified locations.</li>
              <li>Inspect the goods physically before executing payment. Settle directly through verified peer-to-peer methods (cash or direct UPI).</li>
            </ul>
          </section>

          <section className="space-y-1.5 pt-4">
            <h3 className="font-serif text-sm font-bold text-stone-900">
              6. Account & Data Deletion Rights
            </h3>
            <p>
              In compliance with Google Play Developer Policies and global privacy regulations, every user has the right to permanently delete their account and associated data. You can initiate account deletion from the in-app Settings screen or by emailing our Grievance Desk at{' '}
              <a href="mailto:thepawnshop09@gmail.com?subject=Account%20Deletion%20Request" className="font-mono text-amber-900 underline font-semibold">
                thepawnshop09@gmail.com
              </a>.
            </p>
          </section>

          <section className="space-y-1.5 pt-4">
            <h3 className="font-serif text-sm font-bold text-stone-900">
              7. Grievance Redressal & Law Enforcement Contact
            </h3>
            <p>
              In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and Consumer Protection (E-Commerce) Rules, 2020:
            </p>
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 font-mono text-[11px] text-stone-800">
              <div className="flex items-center gap-2 font-sans font-bold text-xs text-stone-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Designated Grievance & Compliance Officer</span>
              </div>
              <p>Email: <a href="mailto:thepawnshop09@gmail.com" className="underline font-bold text-amber-900">thepawnshop09@gmail.com</a></p>
              <p>Grievance Acknowledgment: Within 48 hours</p>
              <p>Resolution Target: Within 30 days of receipt</p>
              <p>Jurisdiction: Noida / Ghaziabad, Uttar Pradesh, India</p>
            </div>
          </section>
        </div>

        {/* Support & Contact Footer */}
        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-stone-400" />
            <span>Official Desk: <a href="mailto:thepawnshop09@gmail.com" className="text-stone-700 hover:text-stone-900 underline font-medium">thepawnshop09@gmail.com</a></span>
          </div>
          <span className="font-mono text-[11px]">Revision 2026.4 • Uttar Pradesh Desk</span>
        </div>
      </div>
    </div>
  );
};
