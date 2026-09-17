import React, { useEffect, useState } from 'react';
import { Menu, Sun, Moon, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { ScreenId } from '../types';
import { firebaseSync, SyncStatus } from '../data/firebaseSyncService';

interface HeaderProps {
  currentScreen: ScreenId;
  onOpenMobileMenu: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  isDark,
  onToggleTheme,
  isOnline,
}) => {
  const [firebaseStatus, setFirebaseStatus] = useState<SyncStatus>('connecting');

  useEffect(() => {
    return firebaseSync.onStatusChange((status) => {
      setFirebaseStatus(status);
    });
  }, []);
  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/95 sm:px-6"
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          id="btn-mobile-menu"
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu de navegação"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mandatory Congregation Title */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1
              id="congregation-name"
              className="text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg"
            >
              CONGREGAÇÃO: VILA CISPER
            </h1>
          </div>
          <span className="text-[11px] font-medium tracking-wide uppercase text-slate-500 dark:text-slate-400">
            Sistema Interno de Atividades
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Firebase Cloud Sync Indicator */}
        <div
          id="status-firebase-sync"
          className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
            firebaseStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80'
              : firebaseStatus === 'connecting'
              ? 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80'
          }`}
          title={
            firebaseStatus === 'connected'
              ? 'Banco de dados Firebase Firestore conectado em tempo real'
              : firebaseStatus === 'connecting'
              ? 'Conectando ao Firebase...'
              : 'Modo Offline / Local ativo'
          }
        >
          {firebaseStatus === 'connected' ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Nuvem Ativa</span>
            </>
          ) : firebaseStatus === 'connecting' ? (
            <>
              <Cloud className="h-3.5 w-3.5 animate-pulse text-sky-600 dark:text-sky-400" />
              <span>Conectando...</span>
            </>
          ) : (
            <>
              <CloudOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Local</span>
            </>
          )}
        </div>

        {/* Offline indicator if disconnected */}
        {!isOnline && (
          <div
            id="status-offline"
            className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"
            title="Trabalhando em modo offline. As informações locais continuam disponíveis."
          >
            <WifiOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Theme Toggle */}
        <button
          id="btn-toggle-theme"
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
