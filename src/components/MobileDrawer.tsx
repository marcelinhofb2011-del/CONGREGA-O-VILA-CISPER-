import React from 'react';
import { X } from 'lucide-react';
import { ScreenId } from '../types';
import { NAV_ITEMS } from '../navigation';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onSelectScreen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        id="drawer-backdrop"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        id="drawer-panel"
        className="relative flex w-4/5 max-w-xs flex-1 flex-col bg-white p-5 shadow-2xl transition-transform dark:bg-slate-900 overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              CONGREGAÇÃO VILA CISPER
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todas as Áreas do Sistema
            </p>
          </div>
          <button
            id="btn-close-drawer"
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;

            return (
              <button
                key={item.id}
                id={`drawer-item-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectScreen(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`} />
                <div className="flex-1 truncate">
                  <div className="truncate">{item.label}</div>
                  <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
