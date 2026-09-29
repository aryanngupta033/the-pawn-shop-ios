import React, { useState } from 'react';
import { Copy, Check, FileCode, Terminal, ShieldAlert, BellRing } from 'lucide-react';
import { SUPABASE_REMEDIATION_PHASE6B_SQL, PHASE_3B1_NOTIFICATION_TRIGGERS_SQL } from '../data/sqlContent';

interface SqlViewerProps {
  schemaSql: string;
  testSql: string;
  remediationSql?: string;
  phase3b1Sql?: string;
}

export const SqlViewer: React.FC<SqlViewerProps> = ({ 
  schemaSql, 
  testSql,
  remediationSql = SUPABASE_REMEDIATION_PHASE6B_SQL,
  phase3b1Sql = PHASE_3B1_NOTIFICATION_TRIGGERS_SQL
}) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'phase3b1' | 'remediation' | 'test'>('phase3b1');
  const [copied, setCopied] = useState<boolean>(false);

  const getSqlAndFileName = () => {
    switch (activeTab) {
      case 'schema':
        return { sql: schemaSql, fileName: 'supabase_schema.sql' };
      case 'phase3b1':
        return { sql: phase3b1Sql, fileName: 'supabase_phase3b1_notification_triggers.sql' };
      case 'remediation':
        return { sql: remediationSql, fileName: 'supabase_remediation_phase6b.sql' };
      case 'test':
        return { sql: testSql, fileName: 'supabase_seed_test.sql' };
    }
  };

  const { sql: currentSql, fileName: currentFileName } = getSqlAndFileName();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-stone-200">
        <div className="flex items-center flex-wrap gap-2">
          <button
            id="btn-view-phase3b1-sql"
            onClick={() => setActiveTab('phase3b1')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'phase3b1'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Phase 3B1: Notification Triggers</span>
          </button>
          <button
            id="btn-view-schema-sql"
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'schema'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>supabase_schema.sql</span>
          </button>
          <button
            id="btn-view-remediation-sql"
            onClick={() => setActiveTab('remediation')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'remediation'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Phase 6B Security Fixes</span>
          </button>
          <button
            id="btn-view-test-sql"
            onClick={() => setActiveTab('test')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'test'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>supabase_seed_test.sql</span>
          </button>
        </div>

        <button
          id="btn-copy-sql"
          onClick={handleCopy}
          className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : `Copy ${currentFileName}`}</span>
        </button>
      </div>

      {/* SQL Output Box */}
      <div className="bg-stone-950 text-stone-200 rounded-lg border border-stone-800 overflow-hidden shadow-sm">
        <div className="bg-stone-900 px-4 py-2.5 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400 font-mono">
          <span>{currentFileName}</span>
          <span>PostgreSQL 15 / Supabase</span>
        </div>
        <pre className="p-5 text-xs font-mono overflow-x-auto text-amber-100/90 leading-relaxed max-h-[600px] overflow-y-auto">
          {currentSql}
        </pre>
      </div>
    </div>
  );
};
