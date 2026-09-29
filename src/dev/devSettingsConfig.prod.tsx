import React from 'react';
import { SupabaseConfig } from '../lib/supabase';

interface DevSettingsConfigProps {
  currentConfig: SupabaseConfig;
  onOpenInspector?: () => void;
  onConfigChanged?: () => void;
}

export const DevSettingsConfig: React.FC<DevSettingsConfigProps> = () => {
  return null;
};
