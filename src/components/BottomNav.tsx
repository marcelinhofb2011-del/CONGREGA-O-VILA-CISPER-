import React from 'react';
import { Home, Menu } from 'lucide-react';
import { ScreenId } from '../types';

interface BottomNavProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  onOpenDrawer: () => void;
  isDrawerOpen: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenDrawer,
  isDrawerOpen,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegação móvel"
      className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <button
        id="bottom-nav-inicio"
        type="button"
        onClick={() => onSelectScreen('inicio')}
        className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl transition-colors ${
          currentScreen === 'inicio' && !isDrawerOpen
            ? 'text-amber-700 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-950/40'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-bold'
        }`}
      >
        <Home className="h-5 w-5" />
        <span className="text-sm font-bold">Início</span>
      </button>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

      <button
        id="bottom-nav-menu"
        type="button"
        onClick={onOpenDrawer}
        className={`flex flex-1 items-center justify-center gap-2 py-2.5 rounded-xl transition-colors ${
          isDrawerOpen
            ? 'text-amber-700 dark:text-amber-400 font-black bg-amber-50 dark:bg-amber-950/40'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-bold'
        }`}
      >
        <Menu className="h-5 w-5" />
        <span className="text-sm font-bold">Menu</span>
      </button>
    </nav>
  );
};
