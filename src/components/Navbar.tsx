import React from 'react';
import { Plus, Heart, MessageSquare, Tag, User, ShieldCheck, Settings, ExternalLink, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onOpenAuth: () => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  onOpenAuth,
  unreadNotificationCount = 0,
  onOpenNotifications,
}) => {
  const { user, profile, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#faf8f5]/90 backdrop-blur-md border-b border-[#e7e2d9] transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between overflow-x-hidden">
        {/* Brand Logo */}
        <button
          id="navbar-brand-btn"
          type="button"
          onClick={() => onNavigate('browse')}
          className="flex items-center gap-2 sm:gap-3 group text-left cursor-pointer shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-amber-600/40 bg-stone-900 flex items-center justify-center shadow-xs shrink-0">
            <span className="font-serif text-xs sm:text-sm tracking-widest text-amber-300 font-bold">PS</span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="font-serif text-sm sm:text-base md:text-lg font-bold tracking-wider text-stone-900 uppercase block leading-tight whitespace-nowrap">
              The Pawn Shop
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-stone-500 font-sans font-medium block leading-tight whitespace-nowrap">
              Curated Vintage
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            id="nav-link-browse"
            type="button"
            onClick={() => onNavigate('browse')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              currentScreen === 'browse'
                ? 'bg-stone-900 text-stone-100'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            Marketplace
          </button>
          <button
            id="nav-link-my-listings"
            type="button"
            onClick={() => onNavigate('my-listings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              currentScreen === 'my-listings'
                ? 'bg-stone-900 text-stone-100'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            My Catalog
          </button>
          <button
            id="nav-link-favorites"
            type="button"
            onClick={() => onNavigate('favorites')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentScreen === 'favorites'
                ? 'bg-stone-900 text-stone-100'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Saved</span>
          </button>
          <button
            id="nav-link-negotiations"
            type="button"
            onClick={() => onNavigate('negotiations')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              currentScreen === 'negotiations' || currentScreen === 'negotiation-detail'
                ? 'bg-stone-900 text-stone-100'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Offers</span>
          </button>
          {isAdmin && (
            <button
              id="nav-link-admin"
              type="button"
              onClick={() => onNavigate('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                currentScreen === 'admin'
                  ? 'bg-amber-950 text-amber-200 border border-amber-800/60 shadow-xs'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Sell Vintage Button (Desktop/Tablet) */}
          <button
            id="nav-action-create"
            type="button"
            onClick={() => onNavigate('create-listing')}
            className="hidden sm:flex py-1.5 sm:py-2 px-2.5 sm:px-3.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-bold uppercase tracking-wider items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">List Item</span>
          </button>

          {/* Authenticated Notification Bell */}
          {user && (
            <button
              id="navbar-notification-bell-btn"
              type="button"
              onClick={onOpenNotifications}
              aria-label={`Notifications ${unreadNotificationCount > 0 ? `(${unreadNotificationCount} unread)` : ''}`}
              title="Notifications"
              className="relative p-1.5 sm:p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {unreadNotificationCount > 0 && (
                <span
                  id="navbar-notification-badge"
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-amber-600 text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center border-2 border-[#faf8f5] shadow-xs"
                >
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile or Sign In */}
          {user ? (
            <button
              id="navbar-profile-btn"
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-stone-200 border border-stone-300 overflow-hidden flex items-center justify-center shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-stone-600" />
                )}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-stone-800 max-w-[100px] truncate">
                {profile?.full_name?.split(' ')[0] || 'Member'}
              </span>
            </button>
          ) : (
            <button
              id="navbar-login-btn"
              type="button"
              onClick={onOpenAuth}
              className="py-1 sm:py-1.5 px-2.5 sm:px-3 border border-stone-300 hover:border-stone-400 bg-white text-stone-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          {/* Official Website External Link */}
          <a
            id="navbar-official-website-link"
            href="https://thepawnshop.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors font-medium"
            title="Visit official website"
          >
            <span>Official Website</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>

          {/* Settings */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-1.5 sm:p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            title="Settings & Credentials"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
