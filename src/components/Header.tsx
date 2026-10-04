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
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
      {/* Botão Menu à Esquerda */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegação"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <Menu className="h-4 w-4" />
        <span>Menu</span>
      </button>

      {/* Controles à Direita: Tamanho da Fonte [T M], Modo Escuro [🌙], Acesso Admin [🔒] */}
      <div className="flex items-center gap-2">
        {/* Alternador de Tamanho de Fonte */}
        <button
          type="button"
          onClick={onToggleFontSize}
          title={`Tamanho da fonte atual: ${fontSize === 'P' ? 'Pequeno' : fontSize === 'G' ? 'Grande' : 'Médio'}. Clique para alterar.`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        >
          <span className="text-blue-600 font-extrabold text-xs">T</span>
          <span className="text-slate-900 dark:text-white font-bold text-xs">{fontSize}</span>
        </button>

        {/* Modo Escuro / Claro */}
        <button
          type="button"
          onClick={onToggleTheme}
          title="Alternar modo escuro"
          aria-label="Alternar tema"
          className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Acesso Modo Responsável (Cadeado) */}
        {isAdmin ? (
          <button
            type="button"
            onClick={onAdminLogout}
            title="Sair do Modo Responsável"
            className="rounded-xl border border-indigo-400 bg-indigo-50 p-2 text-indigo-700 shadow-xs hover:bg-indigo-100 dark:border-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
          >
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            title="Acesso Responsável"
            className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
};
