import React from 'react';
import { X, Shield } from 'lucide-react';
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
      <div className="relative flex w-4/5 max-w-xs flex-col bg-white dark:bg-slate-900 p-4 shadow-xl z-10 overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-blue-900 dark:text-blue-400">Vila Cisper</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quadro de Anúncios</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
            Seções
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
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-3 mb-1">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                    isActive
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
