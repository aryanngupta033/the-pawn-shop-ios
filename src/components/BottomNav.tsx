import React from 'react';
import { Compass, Tag, Heart, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'browse', label: 'Explore', icon: Compass },
    { id: 'my-listings', label: 'Catalog', icon: Tag },
    { id: 'favorites', label: 'Saved', icon: Heart },
    { id: 'negotiations', label: 'Offers', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User, requiresAuth: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-t border-[#e7e2d9] px-2 py-1 flex items-center justify-around shadow-lg safe-area-inset-bottom">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          currentScreen === item.id ||
          (item.id === 'negotiations' && currentScreen === 'negotiation-detail');

        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            type="button"
            onClick={() => {
              if (item.requiresAuth && !user) {
                onOpenAuth();
              } else {
                onNavigate(item.id);
              }
            }}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl transition-colors cursor-pointer ${
              isActive ? 'text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 text-stone-900' : 'text-stone-500'
                }`}
              />
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-600" />
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
