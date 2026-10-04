import React, { useState, useEffect, useCallback } from 'react';
import { ScreenId, ThemeMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { MobileDrawer } from './components/MobileDrawer';

import { InicioView } from './views/InicioView';
import { ProgramacaoGeralView } from './views/ProgramacaoGeralView';
import { DesignacoesView } from './views/DesignacoesView';
import { VidaEMinisterioView } from './views/VidaEMinisterioView';
import { ServicoDeCampoView } from './views/ServicoDeCampoView';
import { LimpezaView } from './views/LimpezaView';
import { DiscursoPublicoView } from './views/DiscursoPublicoView';
import { TerritoriosView } from './views/TerritoriosView';
import { AvisosView } from './views/AvisosView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { AdminPainelView } from './views/AdminPainelView';

import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from './data/territoriosStorage';

const VALID_SCREENS: ScreenId[] = [
  'inicio',
  'programacao',
  'designacoes',
  'vida-e-ministerio',
  'discurso-publico',
  'servico-de-campo',
  'limpeza',
  'territorios',
  'avisos',
  'administracao',
  'secretario',
  'relatorios',
  'assistencia',
  'configuracoes',
];

function getScreenFromUrlOrState(): ScreenId {
  if (typeof window === 'undefined') return 'inicio';
  try {
    const params = new URLSearchParams(window.location.search);
    const screenParam = (params.get('tela') || params.get('screen')) as ScreenId;
    if (screenParam && VALID_SCREENS.includes(screenParam)) {
      return screenParam;
    }
    const stateScreen = window.history.state?.screen as ScreenId;
    if (stateScreen && VALID_SCREENS.includes(stateScreen)) {
      return stateScreen;
    }
  } catch {
    // fallback
  }
  return 'inicio';
}

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(getScreenFromUrlOrState);
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminAuthenticated);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState(false);

  // Tamanho de Fonte (P, M, G)
  const [fontSize, setFontSize] = useState<'P' | 'M' | 'G'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vila_cisper_font_size');
      if (saved === 'P' || saved === 'M' || saved === 'G') return saved;
    }
    return 'M';
  });

  const toggleFontSize = () => {
    setFontSize((prev) => {
      const next = prev === 'P' ? 'M' : prev === 'M' ? 'G' : 'P';
      localStorage.setItem('vila_cisper_font_size', next);
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'P') {
      root.style.fontSize = '14px';
    } else if (fontSize === 'G') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [fontSize]);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vila_cisper_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Aplica classe dark no html
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('vila_cisper_theme', theme);
  }, [theme]);

  // Inicializa o histórico na montagem
  useEffect(() => {
    const initialScreen = getScreenFromUrlOrState();
    setCurrentScreen(initialScreen);

    const url = new URL(window.location.href);
    if (initialScreen === 'inicio') {
      url.searchParams.delete('tela');
      url.searchParams.delete('screen');
    } else {
      url.searchParams.set('tela', initialScreen);
    }
    window.history.replaceState({ screen: initialScreen }, '', url.toString());

    // Suporte ao botão "Voltar" nativo do Android via popstate
    const handlePopState = (e: PopStateEvent) => {
      const targetScreen = (e.state?.screen as ScreenId) || 'inicio';
      if (VALID_SCREENS.includes(targetScreen)) {
        setCurrentScreen(targetScreen);
      } else {
        setCurrentScreen('inicio');
      }
      setIsDrawerOpen(false);
      setIsAdmin(isAdminAuthenticated());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navegação com pushState para suportar o botão Voltar do Android
  const navigateToScreen = useCallback(
    (screen: ScreenId) => {
      if (screen === currentScreen) {
        setIsDrawerOpen(false);
        return;
      }

      const url = new URL(window.location.href);
      if (screen === 'inicio') {
        url.searchParams.delete('tela');
        url.searchParams.delete('screen');
      } else {
        url.searchParams.set('tela', screen);
      }

      window.history.pushState({ screen }, '', url.toString());
      setCurrentScreen(screen);
      setIsDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [currentScreen]
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    if (currentScreen === 'administracao') {
      navigateToScreen('inicio');
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    navigateToScreen('administracao');
  };

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(adminPasswordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAdminPasswordModal(false);
      setAdminPasswordInput('');
      setAdminPasswordError(false);
      navigateToScreen('administracao');
    } else {
      setAdminPasswordError(true);
    }
  };

  const renderContent = () => {
    switch (currentScreen) {
      case 'inicio':
        return (
          <InicioView
            onNavigate={navigateToScreen}
            isAdmin={isAdmin}
            onNavigateToAdmin={() => navigateToScreen('administracao')}
          />
        );
      case 'programacao':
        return <ProgramacaoGeralView onNavigate={navigateToScreen} />;
      case 'designacoes':
        return <DesignacoesView isAdmin={isAdmin} />;
      case 'vida-e-ministerio':
        return <VidaEMinisterioView isAdmin={isAdmin} />;
      case 'servico-de-campo':
        return <ServicoDeCampoView isAdmin={isAdmin} />;
      case 'limpeza':
        return <LimpezaView isAdmin={isAdmin} />;
      case 'discurso-publico':
        return <DiscursoPublicoView isAdmin={isAdmin} />;
      case 'territorios':
        return (
          <TerritoriosView
            isAdmin={isAdmin}
            onAdminLoginSuccess={handleAdminLoginSuccess}
          />
        );
      case 'avisos':
        return <AvisosView isAdmin={isAdmin} />;
      case 'configuracoes':
        return <ConfiguracoesView theme={theme} onToggleTheme={toggleTheme} />;
      case 'administracao':
        return (
          <AdminPainelView
            onNavigate={navigateToScreen}
            onLogout={handleAdminLogout}
          />
        );
      default:
        return (
          <InicioView
            onNavigate={navigateToScreen}
            isAdmin={isAdmin}
            onNavigateToAdmin={() => navigateToScreen('administracao')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      <Header
        onOpenMenu={() => setIsDrawerOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setShowAdminPasswordModal(true)}
        onAdminLogout={handleAdminLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        fontSize={fontSize}
        onToggleFontSize={toggleFontSize}
      />

      <div className="flex flex-1">
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={navigateToScreen}
          isAdmin={isAdmin}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>

      <BottomNav
        currentScreen={currentScreen}
        onNavigate={navigateToScreen}
        onOpenMore={() => setIsDrawerOpen(true)}
      />

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={currentScreen}
        onNavigate={navigateToScreen}
        isAdmin={isAdmin}
      />

      {/* Modal Senha de Acesso Responsável (Cadeado Header) */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Modo Responsável
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Digite a senha de responsável da Congregação Vila Cisper:
            </p>
            <form onSubmit={handleAdminPasswordSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Senha de acesso (67744)"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-hidden"
              />
              {adminPasswordError && (
                <p className="text-xs text-red-500 font-semibold">Senha incorreta. Tente novamente.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
