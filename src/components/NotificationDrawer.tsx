import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  Tag, 
  Heart, 
  ArrowDownLeft, 
  ArrowUpRight, 
  MessageSquare, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import type { NotificationWithDetails, NotificationType } from '../types';
import { formatRelativeTime } from '../lib/formatters';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationWithDetails[];
  isLoading: boolean;
  error: string | null;
  onSelectNotification: (notification: NotificationWithDetails) => void;
  onMarkAllAsRead: () => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  isLoading,
  error,
  onSelectNotification,
  onMarkAllAsRead,
  onRefresh,
}) => {
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    try {
      setMarkingAll(true);
      await onMarkAllAsRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'listing_approved':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'listing_favorited':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Heart className="w-4 h-4" />
          </div>
        );
      case 'new_offer':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        );
      case 'new_counter_offer':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        );
      case 'new_chat_message':
        return (
          <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-600/50 flex items-center justify-center text-amber-200 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-300 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
        );
    }
  };

  const getActionHint = (type: NotificationType) => {
    switch (type) {
      case 'listing_approved':
      case 'listing_favorited':
        return 'View Listing';
      case 'new_offer':
      case 'new_counter_offer':
        return 'View Offer';
      case 'new_chat_message':
        return 'Open Chat';
      default:
        return 'Open';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            id="notification-drawer-panel"
            role="dialog"
            aria-label="Notifications"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:max-w-md bg-[#faf8f5] text-stone-900 shadow-2xl flex flex-col border-l border-[#e7e2d9] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-4 bg-stone-900 text-stone-100 border-b border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-950/80 border border-amber-600/40 flex items-center justify-center text-amber-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-base sm:text-lg font-bold tracking-wide text-stone-100">
                      Notifications
                    </h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-400 font-sans tracking-wide">
                    Live updates on your listings, offers & inquiries
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-notification-drawer-btn"
                onClick={onClose}
                aria-label="Close notifications"
                className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Header Actions */}
            <div className="px-4 sm:px-5 py-2.5 bg-stone-100/90 border-b border-[#e7e2d9] flex items-center justify-between text-xs shrink-0">
              <span className="text-stone-600 text-[11px] font-medium">
                {notifications.length} {notifications.length === 1 ? 'record' : 'records'}
              </span>

              {unreadCount > 0 && (
                <button
                  type="button"
                  id="mark-all-notifications-read-btn"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 hover:underline disabled:opacity-50 cursor-pointer"
                >
                  {markingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5 text-amber-700" />
                  )}
                  <span>Mark all as read</span>
                </button>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">Unable to refresh notifications</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
                </div>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={() => onRefresh()}
                    className="text-xs font-semibold text-rose-900 underline shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Notification List Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#ece7de]">
              {isLoading && notifications.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-stone-500">
                  <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
                  <p className="text-xs">Fetching notification ledger...</p>
                </div>
              ) : notifications.length === 0 ? (
                /* Clean luxury empty state */
                <div className="py-20 px-6 text-center flex flex-col items-center justify-center space-y-3.5">
                  <div className="w-14 h-14 rounded-full bg-stone-200/80 border border-stone-300 flex items-center justify-center text-stone-400">
                    <Bell className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h3 className="font-serif text-base font-bold text-stone-800">
                      Ledger is Quiet
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      You will receive notifications here when collectors favorite your items, submit offers, or when your listings are verified and approved.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = !item.is_read;
                  return (
                    <div
                      key={item.id}
                      id={`notification-item-${item.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectNotification(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectNotification(item);
                        }
                      }}
                      className={`w-full p-4 text-left transition-colors flex items-start gap-3.5 cursor-pointer relative group focus:outline-none focus:bg-stone-100 ${
                        isUnread
                          ? 'bg-amber-50/50 hover:bg-amber-100/60'
                          : 'bg-white hover:bg-stone-50/90'
                      }`}
                    >
                      {/* Left luxury indicator line for unread */}
                      {isUnread && (
                        <span
                          className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600"
                          aria-hidden="true"
                        />
                      )}

                      {/* Icon */}
                      <div className="shrink-0 pt-0.5">
                        {getNotificationIcon(item.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-xs font-serif tracking-tight truncate ${
                              isUnread ? 'font-bold text-stone-900' : 'font-medium text-stone-700'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-mono whitespace-nowrap flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {formatRelativeTime(item.created_at)}
                          </span>
                        </div>

                        <p
                          className={`text-xs leading-relaxed line-clamp-2 ${
                            isUnread ? 'text-stone-800 font-medium' : 'text-stone-600'
                          }`}
                        >
                          {item.body}
                        </p>

                        {/* Associated listing preview or context tag */}
                        <div className="pt-1 flex items-center justify-between gap-2">
                          {item.listing?.title ? (
                            <span className="text-[10px] text-stone-500 font-sans truncate max-w-[200px] flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5 text-stone-400 shrink-0" />
                              <span className="truncate">{item.listing.title}</span>
                            </span>
                          ) : (
                            <span />
                          )}

                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 group-hover:text-amber-950 inline-flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <span>{getActionHint(item.type)}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>

                      {/* Unread dot */}
                      {isUnread && (
                        <div className="pt-1.5 shrink-0" aria-label="Unread notification">
                          <span className="w-2 h-2 rounded-full bg-amber-600 block shadow-xs" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with safety note */}
            <div className="px-4 py-3 bg-[#f5f1ea] border-t border-[#e7e2d9] text-[11px] text-stone-500 text-center shrink-0">
              <span>Verified offline transactions and collector communications</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
