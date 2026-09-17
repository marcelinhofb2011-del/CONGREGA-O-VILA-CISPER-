import React from 'react';
import { ScreenId } from '../types';
import { NAV_ITEMS } from '../navigation';

interface SidebarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onSelectScreen,
}) => {
  const categories = [
    { key: 'principal', title: 'Visão Geral' },
    { key: 'reunioes', title: 'Reuniões' },
    { key: 'atividades', title: 'Atividades e Salão' },
    { key: 'administracao', title: 'Administração' },
  ] as const;

  return (
    <aside
      id="desktop-sidebar"
      className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70 lg:flex"
    >
      <div className="mb-6 px-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
          Navegação
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {categories.map((cat) => {
          const items = NAV_ITEMS.filter((item) => item.category === cat.key);
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                {cat.title}
              </div>
              <div className="mt-1 space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`sidebar-item-${item.id}`}
                      type="button"
                      onClick={() => onSelectScreen(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                          : 'text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800 px-3">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Congregação Vila Cisper &bull; 2026
        </p>
      </div>
    </aside>
  );
};
