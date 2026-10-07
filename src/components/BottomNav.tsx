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
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 sm:h-18 items-center justify-between border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden px-3.5 sm:px-5 gap-3 shadow-md">
      {/* Botão Início - Tamanho ampliado e confortável */}
      <button
        type="button"
        id="btn-bottom-nav-inicio"
        onClick={() => onNavigate('inicio')}
        className={`flex items-center justify-center gap-2.5 flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all active:scale-[0.98] cursor-pointer ${
          isInicio
            ? 'bg-slate-100 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-xs font-extrabold'
            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
        }`}
      >
        <Home
          className={`h-5.5 w-5.5 sm:h-6 sm:w-6 shrink-0 ${isInicio ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
          strokeWidth={2.2}
        />
        <span>Início</span>
      </button>

      {/* Botão Menu - Tamanho ampliado e confortável */}
      <button
        type="button"
        id="btn-bottom-nav-menu"
        onClick={onOpenMore}
        className="flex items-center justify-center gap-2.5 flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
      >
        <Menu className="h-5.5 w-5.5 sm:h-6 sm:w-6 shrink-0 text-slate-700 dark:text-slate-300" strokeWidth={2.2} />
        <span>Menu</span>
      </button>
    </nav>
  );
};
