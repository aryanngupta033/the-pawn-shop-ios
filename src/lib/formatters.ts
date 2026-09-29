/**
 * Formatting helpers for currency, dates, and labels
 */

export function formatPrice(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getConditionColor(condition: string): { bg: string; text: string; border: string } {
  switch (condition?.toLowerCase()) {
    case 'mint':
    case 'pristine':
    case 'new with tags':
      return { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200' };
    case 'excellent':
      return { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200' };
    case 'very good':
    case 'good':
      return { bg: 'bg-stone-100', text: 'text-stone-800', border: 'border-stone-300' };
    case 'fair':
    case 'needs work':
    case 'restoration':
      return { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200' };
    default:
      return { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' };
  }
}

export function getStatusBadge(status: string): { bg: string; text: string; label: string } {
  switch (status?.toLowerCase()) {
    case 'pending_review':
      return { bg: 'bg-amber-100 text-amber-900 border border-amber-300', text: 'text-amber-900', label: 'UNDER REVIEW' };
    case 'approved':
    case 'available':
      return { bg: 'bg-stone-900 text-stone-100', text: 'text-stone-100', label: 'AVAILABLE' };
    case 'reserved':
      return { bg: 'bg-amber-800 text-amber-100', text: 'text-amber-100', label: 'RESERVED' };
    case 'sold':
      return { bg: 'bg-rose-900 text-rose-100', text: 'text-rose-100', label: 'SOLD' };
    case 'removed':
      return { bg: 'bg-stone-400 text-stone-900', text: 'text-stone-900', label: 'REMOVED' };
    case 'rejected':
      return { bg: 'bg-rose-100 text-rose-800 border border-rose-300', text: 'text-rose-800', label: 'REJECTED' };
    case 'active':
      return { bg: 'bg-amber-700 text-amber-50', text: 'text-amber-50', label: 'IN NEGOTIATION' };
    case 'agreed':
      return { bg: 'bg-emerald-800 text-emerald-100', text: 'text-emerald-100', label: 'DEAL AGREED' };
    case 'declined':
      return { bg: 'bg-stone-300 text-stone-700', text: 'text-stone-700', label: 'DECLINED' };
    case 'closed':
      return { bg: 'bg-stone-200 text-stone-600', text: 'text-stone-600', label: 'CLOSED' };
    default:
      return { bg: 'bg-stone-800 text-stone-100', text: 'text-stone-100', label: status?.toUpperCase() || '' };
  }
}

/**
 * Returns human-readable relative time (e.g., 'just now', '5m ago', '2h ago', '3d ago')
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return formatDate(isoString);
}
