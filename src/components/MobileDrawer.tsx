import React from 'react';
import { X } from 'lucide-react';
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '../navigation';
import { ScreenId } from '../types';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  isAdmin: boolean;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  isAdmin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative flex w-[85vw] max-w-xs flex-col bg-white dark:bg-slate-900 p-4 shadow-2xl z-10 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Vila Cisper</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Quadro Digital</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <X className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 mb-1.5">
            Seções do Aplicativo
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-700 shadow-2xs font-bold'
                    : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                  strokeWidth={2}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 px-3 mb-1.5">
              Administração
            </div>
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer ${
                    isActive
                      ? 'bg-amber-100 text-amber-950 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-100 dark:border-amber-700 shadow-2xs font-bold'
                      : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
