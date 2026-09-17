import React from 'react';
import { Home, Mic, BookOpen, Speech, Layers } from 'lucide-react';
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
  const quickItems = [
    { id: 'inicio' as ScreenId, label: 'Início', icon: Home },
    { id: 'designacoes' as ScreenId, label: 'Designações', icon: Mic },
    { id: 'vida-e-ministerio' as ScreenId, label: 'Vida e Min.', icon: BookOpen },
    { id: 'discurso-publico' as ScreenId, label: 'Discurso', icon: Speech },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Navegação inferior móvel"
      className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      {quickItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentScreen === item.id && !isDrawerOpen;

        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            type="button"
            onClick={() => onSelectScreen(item.id)}
            className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
              isActive
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="mt-1 text-[11px] leading-none">{item.label}</span>
          </button>
        );
      })}

      {/* Button to open all other 7 sections */}
      <button
        id="bottom-nav-all-menu"
        type="button"
        onClick={onOpenDrawer}
        className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
          isDrawerOpen
            ? 'text-slate-900 dark:text-white font-semibold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
      >
        <Layers className={`h-5 w-5 ${isDrawerOpen ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
        <span className="mt-1 text-[11px] leading-none">Todas</span>
      </button>
    </nav>
  );
};
