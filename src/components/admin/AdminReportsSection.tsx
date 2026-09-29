import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Package, 
  ExternalLink 
} from 'lucide-react';
import type { AdminReportWithDetails, ReportStatus } from '../../types';
import { getAdminReports, updateReportStatus } from '../../services/adminService';

interface AdminReportsSectionProps {
  onSelectListing?: (id: string) => void;
}

export const AdminReportsSection: React.FC<AdminReportsSectionProps> = ({ onSelectListing }) => {
  const [reports, setReports] = useState<AdminReportWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminReports(statusFilter);
      setReports(data);
    } catch (err: any) {
      console.error('getAdminReports error:', err);
      setError(err?.message || 'Failed to retrieve moderation reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleStatusTransition = async (reportId: string, newStatus: ReportStatus) => {
    try {
      setUpdatingId(reportId);
      setError(null);
      setActionSuccess(null);

      await updateReportStatus(reportId, newStatus);
      setActionSuccess(`Report status successfully transitioned to "${newStatus}".`);
      await loadReports();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error('Status transition failed:', err);
      setError(err?.message || 'Failed to update report status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
        <div>
          <h2 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-800" />
            <span>Safety & Moderation Queue</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Process flagged items, user safety reports, and enforce platform trust.
          </p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
          {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-stone-900 text-stone-100 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-stone-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-700 mb-2" />
            <span>Loading moderation reports queue...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-stone-500 text-xs">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-stone-700">Moderation queue clean</p>
            <p className="mt-1">No reports matching the selected status filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200">
            {reports.map((report) => (
              <div key={report.id} className="p-5 hover:bg-stone-50/50 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        report.status === 'open'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : report.status === 'reviewing'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : report.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {report.status}
                    </span>

                    <span className="text-xs font-semibold text-stone-800">
                      Reason: <span className="font-normal text-stone-700">{report.reason}</span>
                    </span>
                  </div>

                  <span className="text-[11px] text-stone-400 font-mono">
                    Filed on {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Target Information */}
                <div className="bg-stone-50 rounded-lg p-3 border border-stone-200 text-xs space-y-2">
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-6 text-stone-600">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        Reporter: <strong className="text-stone-900">{report.reporter?.full_name || 'Anonymous Member'}</strong>
                      </span>
                    </div>

                    {report.listing && (
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          Reported Item: <strong className="text-stone-900">{report.listing.title}</strong>
                        </span>
                        {onSelectListing && (
                          <button
                            type="button"
                            onClick={() => onSelectListing(report.listing!.id)}
                            className="text-amber-800 hover:text-amber-900 ml-1 cursor-pointer"
                            title="Inspect reported listing"
                          >
                            <ExternalLink className="w-3 h-3 inline" />
                          </button>
                        )}
                      </div>
                    )}

                    {report.reported_user && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>
                          Reported Member: <strong className="text-stone-900">{report.reported_user.full_name}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {report.details && (
                    <div className="pt-2 border-t border-stone-200 text-stone-700">
                      <span className="font-semibold text-stone-900 block text-[11px] uppercase tracking-wider mb-0.5">
                        Report Details:
                      </span>
                      <p className="italic text-stone-600">&ldquo;{report.details}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {updatingId === report.id ? (
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                      <span>Updating status...</span>
                    </div>
                  ) : (
                    <>
                      {report.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleStatusTransition(report.id, 'reviewing')}
                          className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-amber-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Start Reviewing</span>
                        </button>
                      )}

                      {report.status === 'reviewing' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusTransition(report.id, 'resolved')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-emerald-50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusTransition(report.id, 'dismissed')}
                            className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Dismiss</span>
                          </button>
                        </>
                      )}

                      {(report.status === 'resolved' || report.status === 'dismissed') && (
                        <button
                          type="button"
                          onClick={() => handleStatusTransition(report.id, 'reviewing')}
                          className="px-2.5 py-1 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Reopen Review
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
