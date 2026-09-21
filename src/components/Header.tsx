import React, { useEffect, useState } from 'react';
import { Menu, Sun, Moon, WifiOff, Cloud, CloudOff, Type, Lock } from 'lucide-react';
import { ScreenId, TextSize } from '../types';
import { firebaseSync, SyncStatus } from '../data/firebaseSyncService';

interface HeaderProps {
  currentScreen: ScreenId;
  onOpenMobileMenu: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  isOnline: boolean;
  textSize: TextSize;
  onChangeTextSize: (size: TextSize) => void;
  onNavigateToAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onOpenMobileMenu,
  isDark,
  onToggleTheme,
  isOnline,
  textSize,
  onChangeTextSize,
  onNavigateToAdmin,
}) => {
  const [firebaseStatus, setFirebaseStatus] = useState<SyncStatus>('connecting');

  useEffect(() => {
    return firebaseSync.onStatusChange((status) => {
      setFirebaseStatus(status);
    });
  }, []);

  const cycleTextSize = () => {
    if (textSize === 'sm') onChangeTextSize('md');
    else if (textSize === 'md') onChangeTextSize('lg');
    else onChangeTextSize('sm');
  };

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-900/95"
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          id="btn-mobile-menu"
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu de navegação"
          className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 lg:hidden font-bold"
        >
          <Menu className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
          <span className="text-sm font-bold">Menu</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Controle rápido de Tamanho da Letra (Essencial para irmãos idosos) */}
        <button
          id="btn-toggle-text-size"
          type="button"
          onClick={cycleTextSize}
          title={`Tamanho da letra: ${textSize === 'lg' ? 'Grande' : textSize === 'md' ? 'Médio' : 'Padrão'}. Clique para alterar.`}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline">Letra:</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold uppercase dark:bg-slate-800">
            {textSize === 'lg' ? 'G' : textSize === 'md' ? 'M' : 'P'}
          </span>
        </button>

        {/* Firebase Cloud Sync Indicator */}
        <div
          id="status-firebase-sync"
          className={`hidden md:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
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
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Acesso Discreto para Responsáveis */}
        {currentScreen !== 'administracao' && (
          <button
            id="btn-header-admin-discreto"
            type="button"
            onClick={onNavigateToAdmin}
            title="Acesso dos Irmãos Responsáveis"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-slate-500 hover:text-slate-700 dark:border-slate-700 dark:text-slate-500 dark:hover:border-slate-400 dark:hover:text-slate-200 transition"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};
