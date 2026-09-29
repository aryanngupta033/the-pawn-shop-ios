import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { saveSupabaseConfig, resetSupabaseConfig, SupabaseConfig } from '../lib/supabase';

interface DevSettingsConfigProps {
  currentConfig: SupabaseConfig;
  onOpenInspector?: () => void;
  onConfigChanged?: () => void;
}

export const DevSettingsConfig: React.FC<DevSettingsConfigProps> = ({
  currentConfig,
  onOpenInspector,
  onConfigChanged,
}) => {
  const [editingConfig, setEditingConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(currentConfig.supabaseUrl);
  const [customKey, setCustomKey] = useState(currentConfig.supabaseAnonKey);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(customUrl.trim(), customKey.trim());
    if (onConfigChanged) onConfigChanged();
    setEditingConfig(false);
  };

  const handleResetConfig = () => {
    resetSupabaseConfig();
    if (onConfigChanged) onConfigChanged();
    setCustomUrl(currentConfig.supabaseUrl);
    setCustomKey(currentConfig.supabaseAnonKey);
    setEditingConfig(false);
  };

  return (
    <>
      <div className="flex items-center gap-3 pt-2">
        {onOpenInspector && (
          <button
            type="button"
            onClick={onOpenInspector}
            className="flex-1 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Architecture Inspector</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setEditingConfig(!editingConfig)}
          className="py-2 px-3 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer"
        >
          {editingConfig ? 'Close' : 'Configure Credentials'}
        </button>
      </div>

      {/* Custom Supabase credentials form (Dev Only) */}
      {editingConfig && (
        <form onSubmit={handleSaveConfig} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 mt-3">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
            Override Supabase Credentials
          </span>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              required
              className="w-full p-2 text-xs border border-stone-300 rounded-md bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Supabase Anon Public Key
            </label>
            <input
              type="text"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              required
              className="w-full p-2 text-xs border border-stone-300 rounded-md bg-white font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleResetConfig}
              className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800"
            >
              Reset to Default
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-900 hover:bg-amber-800 text-amber-50 rounded-lg text-xs font-semibold"
            >
              Save Credentials
            </button>
          </div>
        </form>
      )}
    </>
  );
};
