import React from 'react';
import { X, Lock } from 'lucide-react';
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
      {/* Fundo escurecido com toque para fechar */}
      <div
        id="drawer-backdrop"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel do Menu Lateral no celular */}
      <div
        id="drawer-panel"
        className="relative flex w-5/6 max-w-sm flex-1 flex-col bg-white p-5 shadow-2xl transition-transform dark:bg-slate-900 overflow-y-auto"
      >
        {/* Cabeçalho do Menu */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Menu Principal
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              VILA CISPER
            </h2>
          </div>
          <button
            id="btn-close-drawer"
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista dos 8 Módulos com nomes completos, sem abreviações e sem submenus */}
        <nav className="mt-4 flex-1 space-y-2" aria-label="Navegação móvel">
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
                className={`flex min-h-[52px] w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-black shadow-sm dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-800 hover:bg-slate-100 font-bold dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300 dark:bg-amber-500/20 dark:text-amber-600'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-base sm:text-lg">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Área dos Responsáveis no final do menu */}
        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            id="drawer-item-admin"
            type="button"
            onClick={() => {
              onSelectScreen('administracao');
              onClose();
            }}
            className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-bold transition-colors ${
              currentScreen === 'administracao'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'border border-dashed border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="h-4 w-4 shrink-0" />
            <span>Área dos Responsáveis</span>
          </button>
        </div>
      </div>
    </div>
  );
};
