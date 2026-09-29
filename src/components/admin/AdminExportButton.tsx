import React, { useState } from 'react';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMarketplaceExportData, formatMarketplaceCsv } from '../../services/adminService';

interface AdminExportButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary';
}

export const AdminExportButton: React.FC<AdminExportButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportSuccess(false);

      // Secure database RPC call internally verifying public.is_admin()
      const rows = await getMarketplaceExportData();

      if (!rows || rows.length === 0) {
        setExportError('No marketplace records found to export.');
        return;
      }

      // Convert to RFC-4180 CSV
      const csvContent = formatMarketplaceCsv(rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `the-pawn-shop-marketplace-export-${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      console.error('Export CSV error:', err);
      setExportError(err?.message || 'Failed to export marketplace data.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        id="admin-export-csv-btn"
        type="button"
        disabled={isExporting}
        onClick={handleExport}
        className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-xs disabled:opacity-50 ${
          variant === 'primary'
            ? 'bg-amber-700 hover:bg-amber-800 text-amber-50'
            : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700'
        } ${className}`}
        title="Export full marketplace overview as CSV via secure database RPC"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
            <span>Generating CSV...</span>
          </>
        ) : exportSuccess ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Export Complete</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Export Marketplace CSV</span>
          </>
        )}
      </button>

      {exportError && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}
    </div>
  );
};
