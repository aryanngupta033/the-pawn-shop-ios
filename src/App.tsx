import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { BrowseScreen } from './components/BrowseScreen';
import { ListingDetailScreen } from './components/ListingDetailScreen';
import { CreateListingScreen } from './components/CreateListingScreen';
import { EditListingScreen } from './components/EditListingScreen';
import { MyListingsScreen } from './components/MyListingsScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { NegotiationsListScreen } from './components/NegotiationsListScreen';
import { NegotiationDetailScreen } from './components/NegotiationDetailScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LegalScreen } from './components/LegalScreen';
import { ReportModal } from './components/ReportModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { NotificationDrawer } from './components/NotificationDrawer';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToUserNotifications,
  resolveNotificationNavigation,
} from './services/notificationService';
import type { NotificationWithDetails } from './types';

import { seedInitialArchiveIfEmpty } from './lib/seedData';

type ScreenType =
  | 'browse'
  | 'listing-detail'
  | 'create-listing'
  | 'edit-listing'
  | 'my-listings'
  | 'favorites'
  | 'negotiations'
  | 'negotiation-detail'
  | 'profile'
  | 'settings'
  | 'legal'
  | 'admin';

function MarketplaceApp() {
  const { user, isLoading, isAdmin } = useAuth();

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('browse');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [selectedNegotiationId, setSelectedNegotiationId] = useState<string | null>(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [reportTarget, setReportTarget] = useState<{ listingId?: string; reportedUserId?: string } | null>(null);

  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Cold start splash effect + seed check
  useEffect(() => {
    // Attempt archive seeding if empty
    seedInitialArchiveIfEmpty();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Notification Hub State (Phase 3B2)
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState<boolean>(false);
  const [notificationsLoading, setNotificationsLoading] = useState<boolean>(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  // Fetch notifications ledger and unread count
  const loadNotificationsData = async (silent: boolean = false) => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    if (!silent) setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const [list, count] = await Promise.all([
        getNotifications(50),
        getUnreadNotificationCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (err: any) {
      console.warn('Notifications fetch notice:', err?.message || err);
      setNotificationsError(err?.message || 'Failed to load notifications');
    } finally {
      if (!silent) setNotificationsLoading(false);
    }
  };

  // Initial load and Realtime Subscription for authenticated user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setNotificationsError(null);
      return;
    }

    loadNotificationsData(false);

    // Subscribe to realtime notification events for the active user
    const unsubscribe = subscribeToUserNotifications(
      user.id,
      (newNotification) => {
        // Prevent duplicate notifications in list
        setNotifications((prev) => {
          if (prev.some((item) => item.id === newNotification.id)) {
            return prev;
          }
          return [newNotification as NotificationWithDetails, ...prev];
        });
        // Immediately increment unread count
        setUnreadCount((prev) => prev + 1);
      },
      (updatedNotification) => {
        // Notification updated (e.g. read status changed)
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === updatedNotification.id
              ? { ...item, ...updatedNotification }
              : item
          )
        );
        // Refresh exact unread count
        getUnreadNotificationCount()
          .then((cnt) => setUnreadCount(cnt))
          .catch(() => {});
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Handle Mark Single Notification As Read
  const handleMarkNotificationRead = async (notificationId: string) => {
    // Optimistically update read state in UI immediately without full reload
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(notificationId);
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
      // Silently sync real count
      getUnreadNotificationCount()
        .then((cnt) => setUnreadCount(cnt))
        .catch(() => {});
    }
  };

  // Handle Mark All As Read
  const handleMarkAllNotificationsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsAsRead();
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
      loadNotificationsData(true);
      throw err;
    }
  };

  // Handle Notification Selection & Intelligent Navigation
  const handleSelectNotification = async (notification: NotificationWithDetails) => {
    // 1. Mark as read immediately
    if (!notification.is_read) {
      handleMarkNotificationRead(notification.id);
    }

    // 2. Close drawer
    setShowNotificationDrawer(false);

    // 3. Resolve target screen according to notification type mapping
    try {
      const target = await resolveNotificationNavigation(notification);
      if (target.screen === 'listing-detail' && target.id) {
        handleSelectListing(target.id);
      } else if (target.screen === 'negotiation-detail' && target.id) {
        handleSelectNegotiation(target.id);
      } else if (target.screen === 'negotiations') {
        setCurrentScreen('negotiations');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setCurrentScreen('browse');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Notification navigation error:', err);
      setCurrentScreen('browse');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handlers
  const handleSelectListing = (id: string) => {
    setSelectedListingId(id);
    setCurrentScreen('listing-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditListing = (id: string) => {
    setSelectedListingId(id);
    setCurrentScreen('edit-listing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectNegotiation = (id: string) => {
    setSelectedNegotiationId(id);
    setCurrentScreen('negotiation-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequireAuth = () => {
    setShowAuthModal(true);
  };

  const handleOpenReport = (listingId?: string, reportedUserId?: string) => {
    setReportTarget({ listingId, reportedUserId });
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 flex flex-col font-sans selection:bg-amber-900 selection:text-amber-100 relative">
      {/* Splash Screen with smooth exit fade */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* Top Luxury Navbar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen as ScreenType);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        unreadNotificationCount={unreadCount}
        onOpenNotifications={() => setShowNotificationDrawer(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3.5 sm:py-6">
        <motion.div
          key={currentScreen + (selectedListingId || '') + (selectedNegotiationId || '')}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* SCREEN 3: HOME / BROWSE */}
          {currentScreen === 'browse' && (
          <BrowseScreen
            onSelectListing={handleSelectListing}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* SCREEN 4: LISTING DETAILS */}
        {currentScreen === 'listing-detail' && selectedListingId && (
          <ListingDetailScreen
            listingId={selectedListingId}
            onBack={() => setCurrentScreen('browse')}
            onEditListing={handleEditListing}
            onOpenNegotiation={handleSelectNegotiation}
            onOpenReport={(lid, uid) => handleOpenReport(lid, uid)}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* SCREEN 5: CREATE LISTING */}
        {currentScreen === 'create-listing' && (
          <CreateListingScreen
            onBack={() => setCurrentScreen('browse')}
            onSuccess={(newId) => handleSelectListing(newId)}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* SCREEN 6: EDIT LISTING */}
        {currentScreen === 'edit-listing' && selectedListingId && (
          <EditListingScreen
            listingId={selectedListingId}
            onBack={() => setCurrentScreen('my-listings')}
            onSuccess={() => setCurrentScreen('my-listings')}
          />
        )}

        {/* SCREEN 7: MY LISTINGS */}
        {currentScreen === 'my-listings' && (
          <MyListingsScreen
            onSelectListing={handleSelectListing}
            onEditListing={handleEditListing}
            onCreateListing={() => setCurrentScreen('create-listing')}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* SCREEN 8: FAVORITES */}
        {currentScreen === 'favorites' && (
          <FavoritesScreen
            onSelectListing={handleSelectListing}
            onBrowse={() => setCurrentScreen('browse')}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* SCREEN 9: OFFERS / NEGOTIATIONS LIST */}
        {currentScreen === 'negotiations' && (
          <NegotiationsListScreen
            onSelectNegotiation={handleSelectNegotiation}
            onRequireAuth={handleRequireAuth}
          />
        )}

        {/* SCREEN 10 & 11: NEGOTIATION DETAILS & CHAT */}
        {currentScreen === 'negotiation-detail' && selectedNegotiationId && (
          <NegotiationDetailScreen
            negotiationId={selectedNegotiationId}
            onBack={() => setCurrentScreen('negotiations')}
            onViewListing={handleSelectListing}
          />
        )}

        {/* SCREEN 12: PROFILE */}
        {currentScreen === 'profile' && (
          <ProfileScreen
            onRequireAuth={handleRequireAuth}
            onOpenSettings={() => setCurrentScreen('settings')}
          />
        )}

        {/* SCREEN 14: SETTINGS */}
        {currentScreen === 'settings' && (
          <SettingsScreen
            onOpenLegal={() => setCurrentScreen('legal')}
            onOpenAdmin={isAdmin ? () => setCurrentScreen('admin') : undefined}
          />
        )}

        {/* SCREEN 15: LEGAL / DISCLAIMER */}
        {currentScreen === 'legal' && (
          <LegalScreen onBack={() => setCurrentScreen('browse')} />
        )}

        {/* SCREEN 16: ADMINISTRATIVE DASHBOARD */}
        {currentScreen === 'admin' && (
          <AdminDashboard
            onBack={() => setCurrentScreen('browse')}
            onSelectListing={handleSelectListing}
          />
        )}
        </motion.div>
      </main>

      {/* Offline Intermediary Footer */}
      <footer className="hidden md:block bg-stone-900 text-stone-400 border-t border-stone-800 py-6 px-6 text-xs mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif font-bold text-stone-200 tracking-wider">
              THE PAWN SHOP
            </span>
            <span>•</span>
            <span>Peer-to-peer vintage discovery & offline settlement venue</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-stone-500">
            <a
              id="footer-official-website-link"
              href="https://thepawnshop.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-300 cursor-pointer transition-colors inline-flex items-center gap-1 text-stone-400"
              title="Visit official website"
            >
              <span>Official Website</span>
              <ExternalLink className="w-3 h-3 text-stone-500" />
            </a>
            <span>•</span>
            <a
              href="mailto:thepawnshop09@gmail.com"
              className="hover:text-stone-300 cursor-pointer transition-colors"
              title="Email support"
            >
              Contact Support
            </a>
            <span>•</span>
            <button
              onClick={() => setCurrentScreen('legal')}
              className="hover:text-stone-300 cursor-pointer transition-colors"
            >
              Terms & Offline Disclaimers
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen as ScreenType);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAuth={handleRequireAuth}
      />

      {/* SCREEN 2 MODAL: GOOGLE & EMAIL LOGIN */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="w-full max-w-md relative my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-2 right-2 sm:-top-3 sm:-right-3 z-10 w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center text-xs font-bold cursor-pointer shadow-lg"
              >
                ✕
              </button>
              <LoginScreen
                onCancel={() => setShowAuthModal(false)}
                onSuccess={() => setShowAuthModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 3B2: NOTIFICATION DRAWER */}
      <NotificationDrawer
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        notifications={notifications}
        isLoading={notificationsLoading}
        error={notificationsError}
        onSelectNotification={handleSelectNotification}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onRefresh={() => loadNotificationsData(false)}
      />

      {/* SCREEN 13 MODAL: REPORTING */}
      <AnimatePresence>
        {reportTarget && (
          <ReportModal
            listingId={reportTarget.listingId}
            reportedUserId={reportTarget.reportedUserId}
            onClose={() => setReportTarget(null)}
            onRequireAuth={handleRequireAuth}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MarketplaceApp />
    </AuthProvider>
  );
}
