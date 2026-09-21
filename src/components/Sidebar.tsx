import React from 'react';
import { ScreenId } from '../types';
import { NAV_ITEMS } from '../navigation';
import { Lock } from 'lucide-react';

interface SidebarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  return (
    <aside
      id="desktop-sidebar"
      aria-label="Menu principal de navegação"
      className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/80 lg:flex"
    >
      <div className="mb-4 px-3">
        <span className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
          Menu Principal
        </span>
      </div>

      {/* Lista direta e simples dos 8 módulos, sem submenus */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              type="button"
              onClick={() => onSelectScreen(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  isActive
                    ? 'text-amber-400 dark:text-amber-600'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Área dos Responsáveis - Protegida e acessível aos autorizados */}
      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800 px-1 space-y-2">
        <button
          id="sidebar-item-admin"
          type="button"
          onClick={() => onSelectScreen('administracao')}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
            currentScreen === 'administracao'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span>Área dos Responsáveis</span>
        </button>
        <p className="px-2 text-[11px] text-slate-400 dark:text-slate-500">
          Congregação Vila Cisper
        </p>
      </div>
    </aside>
  );
};
