import React from 'react';
import { 
  Users, 
  Package, 
  CheckCircle, 
  Clock, 
  ShoppingBag, 
  ArchiveX, 
  AlertTriangle, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import type { AdminDashboardMetrics, ListingWithDetails, Profile } from '../../types';
import { AdminExportButton } from './AdminExportButton';

interface AdminOverviewSectionProps {
  metrics: AdminDashboardMetrics;
  recentUsers: Profile[];
  recentListings: ListingWithDetails[];
  onSelectTab: (tab: 'overview' | 'curator' | 'users' | 'listings' | 'reports') => void;
  onInspectListing?: (id: string) => void;
  onInspectUser?: (user: Profile) => void;
}

export const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({
  metrics,
  recentUsers,
  recentListings,
  onSelectTab,
  onInspectListing,
  onInspectUser,
}) => {
  const metricCards = [
    {
      id: 'metric-curator',
      label: 'Pending Review',
      value: metrics.pendingListings || 0,
      icon: Clock,
      color: (metrics.pendingListings || 0) > 0
        ? 'text-amber-900 bg-amber-100 border-amber-300 ring-2 ring-amber-400/40'
        : 'text-stone-700 bg-stone-50 border-stone-200',
      action: () => onSelectTab('curator'),
    },
    {
      id: 'metric-users',
      label: 'Total Users',
      value: metrics.totalUsers,
      icon: Users,
      color: 'text-stone-800 bg-stone-100 border-stone-300',
      action: () => onSelectTab('users'),
    },
    {
      id: 'metric-listings',
      label: 'Total Listings',
      value: metrics.totalListings,
      icon: Package,
      color: 'text-amber-900 bg-amber-50 border-amber-200',
      action: () => onSelectTab('listings'),
    },
    {
      id: 'metric-available',
      label: 'Available Items',
      value: metrics.availableListings,
      icon: CheckCircle,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
      action: () => onSelectTab('listings'),
    },
    {
      id: 'metric-reserved',
      label: 'Reserved (Agreed)',
      value: metrics.reservedListings,
      icon: Clock,
      color: 'text-blue-800 bg-blue-50 border-blue-200',
      action: () => onSelectTab('listings'),
    },
    {
      id: 'metric-sold',
      label: 'Completed / Sold',
      value: metrics.soldListings,
      icon: ShoppingBag,
      color: 'text-purple-800 bg-purple-50 border-purple-200',
      action: () => onSelectTab('listings'),
    },
    {
      id: 'metric-removed',
      label: 'Removed (Soft-deleted)',
      value: metrics.removedListings,
      icon: ArchiveX,
      color: 'text-rose-800 bg-rose-50 border-rose-200',
      action: () => onSelectTab('listings'),
    },
    {
      id: 'metric-reports',
      label: 'Open Reports',
      value: metrics.openReports,
      icon: metrics.openReports > 0 ? ShieldAlert : AlertTriangle,
      color: metrics.openReports > 0 
        ? 'text-red-900 bg-red-50 border-red-300 ring-2 ring-red-300/60' 
        : 'text-stone-700 bg-stone-50 border-stone-200',
      action: () => onSelectTab('reports'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner with Metric Header & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-2xs">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 block mb-1">
            Database Operational Status
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
            Marketplace Overview & Health
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Real-time aggregate records queried directly through PostgreSQL constraints and RLS layers.
          </p>
        </div>

        <div>
          <AdminExportButton variant="primary" />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              id={card.id}
              type="button"
              onClick={card.action}
              className={`p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-sm cursor-pointer ${card.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-stone-600 tracking-wide uppercase">
                  {card.label}
                </span>
                <Icon className="w-4 h-4 opacity-75" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                {card.value.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      {/* Two Column Section: Recent Users & Recent Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-700" />
                <h3 className="font-serif font-bold text-stone-900 text-base">Recent Members</h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('users')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentUsers.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No registered members yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/60 rounded px-2 transition-colors cursor-pointer"
                    onClick={() => onInspectUser?.(user)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-stone-200 border border-stone-300 overflow-hidden shrink-0 flex items-center justify-center font-bold text-stone-600 text-xs">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.full_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          user.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{user.full_name}</p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {user.location || 'Location unverified'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] text-stone-400 font-mono shrink-0">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Listings Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-stone-700" />
                <h3 className="font-serif font-bold text-stone-900 text-base">Recent Listings</h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('listings')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentListings.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No listings posted yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {recentListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/60 rounded px-2 transition-colors cursor-pointer"
                    onClick={() => onInspectListing?.(listing.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                        {listing.images && listing.images[0] ? (
                          <img
                            src={listing.images[0].image_url}
                            alt={listing.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">
                            No Pic
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-900 truncate">{listing.title}</p>
                        <p className="text-[11px] text-stone-500">
                          ₹{listing.price.toLocaleString()} • {listing.condition} • {listing.seller?.full_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          listing.status === 'pending_review'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : listing.status === 'available' || listing.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : listing.status === 'reserved'
                            ? 'bg-blue-100 text-blue-800'
                            : listing.status === 'sold'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {listing.status === 'pending_review' ? 'UNDER REVIEW' : listing.status}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
