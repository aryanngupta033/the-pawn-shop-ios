import React, { useState } from 'react';
import { 
  Terminal, 
  KeyRound, 
  HardDrive, 
  ExternalLink, 
  CheckCircle, 
  Copy, 
  Layers,
  ArrowRight,
  Database,
  ShieldCheck
} from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 mb-1">Supabase Backend Deployment & Setup Guide</h3>
        <p className="text-xs text-stone-600 leading-relaxed">
          Follow these 4 straightforward steps in your Supabase dashboard to initialize the PostgreSQL schema, configure Google OAuth, enable image storage, and execute the test plan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: SQL Schema Execution */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold">
                1
              </div>
              <h4 className="text-sm font-bold text-stone-900">Execute PostgreSQL Migration</h4>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">
              Navigate to <strong>SQL Editor</strong> in your Supabase project. Paste and execute the contents of <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">/supabase_schema.sql</code>.
            </p>
            <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside">
              <li>Creates 8 core tables with UUID PKs and relational constraints</li>
              <li>Installs triggers for <code className="font-mono text-[11px]">updated_at</code>, profile creation, and offer superseding</li>
              <li>Installs sold listing protection and offer acceptance automation</li>
              <li>Enables RLS on all 8 tables and configures granular policies</li>
              <li>Creates the <code className="font-mono text-[11px]">marketplace_overview</code> view</li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>File: <code className="font-mono text-stone-800">/supabase_schema.sql</code></span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> DDL Ready
            </span>
          </div>
        </div>

        {/* Step 2: Google OAuth Configuration */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <h4 className="text-sm font-bold text-stone-900">Configure Google OAuth</h4>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">
              In Supabase dashboard, go to <strong>Authentication → Providers → Google</strong>.
            </p>
            <ol className="text-xs text-stone-600 space-y-1.5 list-decimal list-inside">
              <li>Enable the Google provider toggle.</li>
              <li>In Google Cloud Console, create an OAuth 2.0 Client ID (Web Application).</li>
              <li>Set Authorized Redirect URI to: <br/>
                <code className="bg-stone-100 px-1.5 py-0.5 rounded text-amber-900 font-mono text-[10px] break-all block my-1">
                  https://&lt;your-project-ref&gt;.supabase.co/auth/v1/callback
                </code>
              </li>
              <li>Paste Client ID and Client Secret into Supabase and Save.</li>
            </ol>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-500">
            <span>Automated by trigger: <code className="font-mono text-stone-800 text-[11px]">on_auth_user_created</code></span>
          </div>
        </div>

        {/* Step 3: Storage Bucket Setup */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold">
                3
              </div>
              <h4 className="text-sm font-bold text-stone-900">Supabase Storage Configuration</h4>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">
              Go to <strong>Storage</strong> in Supabase. The migration script automatically declares the bucket and policies:
            </p>
            <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside">
              <li>Bucket Name: <code className="font-mono text-amber-900 font-semibold">listing-images</code></li>
              <li>Public Bucket: <strong className="text-stone-900">True</strong> (public read for gallery images)</li>
              <li>Storage Path Pattern: <code className="font-mono text-[11px]">listings/&#123;listing_id&#125;/&#123;filename&#125;</code></li>
              <li>Upload / Update / Delete policies: strictly limited to the listing seller using <code className="font-mono text-[11px]">storage.foldername(name)</code></li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Bucket: <code className="font-mono text-stone-800">listing-images</code></span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Policies in SQL
            </span>
          </div>
        </div>

        {/* Step 4: Run Safe Test Plan */}
        <div className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold">
                4
              </div>
              <h4 className="text-sm font-bold text-stone-900">Run Safe Seed & Verification Suite</h4>
            </div>
            <p className="text-xs text-stone-600 mb-3 leading-relaxed">
              In Supabase <strong>SQL Editor</strong>, paste and run <code className="bg-stone-100 px-1 py-0.5 rounded text-amber-900 font-mono text-[11px]">/supabase_seed_test.sql</code>.
            </p>
            <ul className="text-xs text-stone-600 space-y-1.5 list-disc list-inside">
              <li>Injects Manish (User A) and Priya (User B)</li>
              <li>Tests ₹56,000 listing creation & image linking</li>
              <li>Tests bookmark uniqueness violation rejection</li>
              <li>Verifies ₹50,000 → ₹54,000 → ₹52,000 offer sequence and auto-superseding</li>
              <li>Verifies offer acceptance triggers negotiation status = "agreed"</li>
              <li>Tests chat message audit trail</li>
              <li>Verifies mark as sold & blocks subsequent bids</li>
              <li>Verifies <code className="font-mono text-[11px]">public.marketplace_overview</code> view output</li>
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>File: <code className="font-mono text-stone-800">/supabase_seed_test.sql</code></span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Verified Clean
            </span>
          </div>
        </div>
      </div>

      {/* Environment Config Snippet */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-lg border border-stone-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Environment Variables (.env)</h4>
          <span className="text-[11px] text-stone-400">Add to project root when connecting frontend</span>
        </div>
        <pre className="text-xs font-mono bg-stone-950 p-4 rounded border border-stone-800 text-stone-300 overflow-x-auto">
{`# Supabase Project Credentials
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`}
        </pre>
      </div>
    </div>
  );
};
