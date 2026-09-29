import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flag, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { createReport } from '../services/reportsService';
import { useAuth } from '../context/AuthContext';

interface ReportModalProps {
  listingId?: string;
  reportedUserId?: string;
  onClose: () => void;
  onRequireAuth: () => void;
}

const REASONS = [
  'Suspected replica / counterfeit item',
  'Misleading condition or false description',
  'Prohibited or stolen merchandise',
  'Unresponsive or suspicious behavior in negotiation',
  'Harassment or inappropriate message in chat',
  'Off-platform scam attempt',
  'Other integrity concern',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  listingId,
  reportedUserId,
  onClose,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth();
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await createReport({
        reporterId: user.id,
        reason,
        details,
        listingId,
        reportedUserId,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(err?.message || 'Failed to file report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.26, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-xl p-5 sm:p-7 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-700" />
            <h3 className="font-serif text-base font-bold text-stone-900">
              {listingId ? 'Report Vintage Listing' : 'Report Collector'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-semibold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-base font-bold text-stone-900">Report Submitted</h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Thank you for keeping The Pawn Shop marketplace safe. Our trust & safety team has logged this incident.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                Primary Reason *
              </label>
              <select
                id="report-reason-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50 cursor-pointer"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                Additional Details (Optional)
              </label>
              <textarea
                id="report-details-textarea"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain what happened or why this item violates authenticity standards..."
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50"
              />
            </div>

            <p className="text-[11px] text-stone-400 leading-normal">
              Reports are confidential and reviewed independently. Malicious reporting violates community standards.
            </p>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2 px-4 border border-stone-300 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="submit-report-btn"
                type="submit"
                disabled={submitting}
                className="flex-1 py-2 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : 'File Report'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
};
