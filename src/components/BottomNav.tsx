import React from 'react';
import { Home, Menu } from 'lucide-react';
import { ScreenId } from '../types';

interface BottomNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenMore: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, onOpenMore }) => {
  const isInicio = currentScreen === 'inicio';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-t border-slate-200/90 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden px-4 gap-3">
      {/* Botão Início */}
      <button
        type="button"
        onClick={() => onNavigate('inicio')}
        className={`flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
          isInicio
            ? 'bg-amber-100/70 border border-amber-200/80 text-amber-950 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-200'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
      >
        <Home className="h-4 w-4" />
        <span>Início</span>
      </button>

      {/* Botão Menu */}
      <button
        type="button"
        onClick={onOpenMore}
        className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
      >
        <Menu className="h-4 w-4" />
        <span>Menu</span>
      </button>
    </nav>
  );
};
