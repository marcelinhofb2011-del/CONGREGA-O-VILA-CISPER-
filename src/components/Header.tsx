import React from 'react';
import { Menu, Sun, Moon, Lock, ShieldCheck } from 'lucide-react';
import { ThemeMode } from '../types';

interface HeaderProps {
  onOpenMenu: () => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  fontSize: 'P' | 'M' | 'G';
  onToggleFontSize: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMenu,
  isAdmin,
  onOpenAdminLogin,
  onAdminLogout,
  theme,
  onToggleTheme,
  fontSize,
  onToggleFontSize,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-13 sm:h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 shadow-2xs">
      {/* Botão Menu à Esquerda */}
      <button
        type="button"
        id="btn-header-menu"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegação"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs sm:text-sm font-bold text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer transition-all active:scale-[0.98]"
      >
        <Menu className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200" strokeWidth={2.2} />
        <span>Menu</span>
      </button>

      {/* Controles à Direita: Tamanho da Fonte [T M], Modo Escuro [🌙], Acesso Admin [🔒] */}
      <div className="flex items-center gap-1.5">
        {/* Alternador de Tamanho de Fonte */}
        <button
          type="button"
          id="btn-header-font-size"
          onClick={onToggleFontSize}
          title={`Tamanho da fonte atual: ${fontSize === 'P' ? 'Pequeno' : fontSize === 'G' ? 'Grande' : 'Médio'}. Clique para alterar.`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 cursor-pointer transition-all active:scale-[0.98]"
        >
          <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs">T</span>
          <span className="text-slate-900 dark:text-white font-bold">{fontSize}</span>
        </button>

        {/* Modo Escuro / Claro */}
        <button
          type="button"
          id="btn-header-theme"
          onClick={onToggleTheme}
          title="Alternar modo escuro"
          aria-label="Alternar tema"
          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-all active:scale-[0.98]"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          )}
        </button>

        {/* Acesso Modo Responsável (Cadeado) */}
        {isAdmin ? (
          <button
            type="button"
            onClick={onAdminLogout}
            title="Sair do Modo Responsável"
            className="rounded-lg border border-indigo-400 bg-indigo-50 p-1.5 text-indigo-700 shadow-2xs hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 cursor-pointer transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" strokeWidth={2.2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            title="Acesso Responsável"
            className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Lock className="h-4 w-4 text-slate-600 dark:text-slate-300" strokeWidth={2.2} />
          </button>
        )}
      </div>
    </header>
  );
};
