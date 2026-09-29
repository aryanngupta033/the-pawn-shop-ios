import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  LayoutDashboard, 
  Users, 
  Package, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  ArrowLeft,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  verifyAdminStatus, 
  getAdminDashboardMetrics 
} from '../../services/adminService';
import type { AdminDashboardMetrics, Profile, ListingWithDetails } from '../../types';
import { AdminOverviewSection } from './AdminOverviewSection';
import { AdminCuratorDeskSection } from './AdminCuratorDeskSection';
import { AdminUsersSection } from './AdminUsersSection';
import { AdminListingsSection } from './AdminListingsSection';
import { AdminReportsSection } from './AdminReportsSection';
import { AdminExportButton } from './AdminExportButton';

type AdminTab = 'overview' | 'curator' | 'users' | 'listings' | 'reports';

interface AdminDashboardProps {
  onBack?: () => void;
  onSelectListing?: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBack,
  onSelectListing,
}) => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [metricsData, setMetricsData] = useState<{
    metrics: AdminDashboardMetrics;
    recentUsers: Profile[];
    recentListings: ListingWithDetails[];
  } | null>(null);

  // Initial server-side authorization check
  const checkAuthAndLoad = async () => {
    try {
      setLoadingMetrics(true);
      setMetricsError(null);

      // Verify server-side PostgreSQL JWT role via RPC is_admin()
      const adminVerified = await verifyAdminStatus();
      setIsAdmin(adminVerified);

      if (adminVerified) {
        const data = await getAdminDashboardMetrics();
        setMetricsData(data);
      }
    } catch (err: any) {
      console.error('Admin initialization error:', err);
      setMetricsError(err?.message || 'Access denied. Backend verification failed.');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoad();
  }, [user]);

  // Loading state
  if (isAdmin === null || loadingMetrics) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-700 mb-3" />
        <h3 className="font-serif font-bold text-stone-900 text-lg">
          Verifying Database Authority
        </h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm">
          Checking server-side JWT claims with PostgreSQL Row-Level Security...
        </p>
      </div>
    );
  }

  // Security barrier: non-admin access rejection
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="font-serif font-bold text-xl text-stone-900 mb-2">
          Administrator Privileges Required
        </h2>

        <p className="text-xs text-stone-600 leading-relaxed mb-6">
          Access to this area is strictly restricted to authenticated administrators.
          Server-side authorization verified via PostgreSQL Row-Level Security rejected
          this request.
        </p>

        <div className="p-3 bg-stone-100 border border-stone-200 rounded-lg text-[11px] text-stone-600 font-mono mb-6 text-left">
          <p className="font-bold text-stone-800 mb-1">Authorization Details:</p>
          <p>• Auth State: {user ? 'Authenticated' : 'Anonymous'}</p>
          <p>• Role Claim: {user?.app_metadata?.role || '(none / standard member)'}</p>
          <p>• PostgreSQL RPC is_admin(): false</p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Return to Marketplace
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
              title="Return to marketplace"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
                Administrative Dashboard
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-800" />
                <span>Verified Admin</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              The Pawn Shop backend moderation, inventory supervision, and safety records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={checkAuthAndLoad}
            className="p-2 border border-stone-300 hover:bg-stone-100 rounded-lg text-stone-600 transition-colors cursor-pointer"
            title="Refresh Dashboard Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <AdminExportButton variant="secondary" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-stone-900 text-stone-100 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curator')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'curator'
              ? 'bg-amber-900 text-amber-50 shadow-xs'
              : 'text-amber-900 hover:bg-amber-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Curator Desk</span>
          {metricsData?.metrics.pendingListings ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-stone-950 ml-0.5">
              {metricsData.metrics.pendingListings}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-stone-900 text-stone-100 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users Directory</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'listings'
              ? 'bg-stone-900 text-stone-100 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Listing Moderation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-stone-900 text-stone-100 shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Report Queue</span>
          {metricsData?.metrics.openReports ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white ml-0.5">
              {metricsData.metrics.openReports}
            </span>
          ) : null}
        </button>
      </div>

      {/* Main Tab Views */}
      <div>
        {activeTab === 'overview' && metricsData && (
          <AdminOverviewSection
            metrics={metricsData.metrics}
            recentUsers={metricsData.recentUsers}
            recentListings={metricsData.recentListings}
            onSelectTab={(tab) => setActiveTab(tab)}
            onInspectListing={onSelectListing}
          />
        )}

        {activeTab === 'curator' && (
          <AdminCuratorDeskSection
            onInspectListing={onSelectListing}
            onQueueUpdated={checkAuthAndLoad}
          />
        )}

        {activeTab === 'users' && (
          <AdminUsersSection onSelectListing={onSelectListing} />
        )}

        {activeTab === 'listings' && (
          <AdminListingsSection onSelectListing={onSelectListing} />
        )}

        {activeTab === 'reports' && (
          <AdminReportsSection onSelectListing={onSelectListing} />
        )}
      </div>
    </div>
  );
};
