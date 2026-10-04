import React from 'react';
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '../navigation';
import { ScreenId } from '../types';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate, isAdmin }) => {
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-3">
        Navegação Principal
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {isAdmin && (
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 px-3">
            Administração
          </div>
          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </aside>
  );
};
