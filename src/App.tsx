import React, { useState, useEffect } from 'react';
import { ScreenId, TextSize, ThemeMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { MobileDrawer } from './components/MobileDrawer';
import { InicioView } from './views/InicioView';
import { ProgramacaoGeralView } from './views/ProgramacaoGeralView';
import { DesignacoesView } from './views/DesignacoesView';
import { VidaEMinisterioView } from './views/VidaEMinisterioView';
import { LimpezaView } from './views/LimpezaView';
import { ServicoDeCampoView } from './views/ServicoDeCampoView';
import { DiscursoPublicoView } from './views/DiscursoPublicoView';
import { AssistenciaView } from './views/AssistenciaView';
import { TerritoriosView } from './views/TerritoriosView';
import { AvisosView } from './views/AvisosView';
import { AdminPainelView } from './views/AdminPainelView';
import { SecretarioView } from './views/SecretarioView';
import { RelatoriosView } from './views/RelatoriosView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { PlaceholderView } from './views/PlaceholderView';
import { GlobalAvisoPopUp } from './components/GlobalAvisoPopUp';
import { usePWA } from './hooks/usePWA';
import { isAdminAuthenticated } from './data/territoriosStorage';

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

const isValidScreenId = (val: any): val is ScreenId => {
  return typeof val === 'string' && VALID_SCREENS.includes(val as ScreenId);
};

const getScreenFromUrlOrState = (): ScreenId => {
  try {
    if (window.history.state && isValidScreenId(window.history.state.screen)) {
      return window.history.state.screen;
    }
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    if (isValidScreenId(screenParam)) {
      return screenParam;
    }
  } catch {}
  return 'inicio';
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(getScreenFromUrlOrState);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isOnline } = usePWA();

  // Persistent Theme
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('vila_cisper_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Persistent Text Size
  const [textSize, setTextSize] = useState<TextSize>(() => {
    const saved = localStorage.getItem('vila_cisper_text_size');
    if (saved === 'pequeno' || saved === 'medio' || saved === 'grande') return saved;
    return 'medio';
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('vila_cisper_theme', theme);
  }, [theme]);

  // Apply text size to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
    const sizePx = textSize === 'pequeno' ? '14px' : textSize === 'grande' ? '20px' : '16px';
    document.documentElement.style.fontSize = sizePx;
    localStorage.setItem('vila_cisper_text_size', textSize);
  }, [textSize]);

  // Sincronização com o histórico do navegador / PWA e botão Voltar nativo do Android
  useEffect(() => {
    // Inicializa a primeira entrada do histórico com a tela atual (evita duplicar entrada no histórico inicial)
    const initialScreen = getScreenFromUrlOrState();
    const initialUrl = initialScreen === 'inicio' ? '/' : `/?screen=${initialScreen}`;
    window.history.replaceState({ screen: initialScreen }, '', initialUrl);

    // Escuta o botão Voltar nativo do Android e histórico do navegador
    const handlePopState = (event: PopStateEvent) => {
      let targetScreen: ScreenId = 'inicio';
      if (event.state && isValidScreenId(event.state.screen)) {
        targetScreen = event.state.screen;
      } else {
        const params = new URLSearchParams(window.location.search);
        const screenParam = params.get('screen');
        if (isValidScreenId(screenParam)) {
          targetScreen = screenParam;
        }
      }
      setCurrentScreen(targetScreen);
      setIsDrawerOpen(false);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navegação que empilha cada tela acessada no histórico do navegador
  const navigateToScreen = (screen: ScreenId) => {
    setIsDrawerOpen(false);
    if (screen === currentScreen) {
      return;
    }
    const targetUrl = screen === 'inicio' ? '/' : `/?screen=${screen}`;
    window.history.pushState({ screen }, '', targetUrl);
    setCurrentScreen(screen);
  };

  const handleBackToPublic = () => {
    if (window.history.state && window.history.state.screen === 'administracao' && window.history.length > 1) {
      window.history.back();
    } else {
      navigateToScreen('inicio');
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleFontSize = () => {
    setTextSize((prev) => {
      // De médio, vai para grande (melhorando imediatamente para irmãos idosos), depois pequeno, depois médio
      if (prev === 'medio') return 'grande';
      if (prev === 'grande') return 'pequeno';
      return 'medio';
    });
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'inicio':
        return <InicioView onNavigate={(screen) => navigateToScreen(screen)} />;
      case 'programacao':
        return <ProgramacaoGeralView onNavigate={(screen) => navigateToScreen(screen)} />;
      case 'designacoes':
        return <DesignacoesView isAdmin={isAdminAuthenticated()} />;
      case 'vida-e-ministerio':
        return <VidaEMinisterioView isAdmin={isAdminAuthenticated()} />;
      case 'discurso-publico':
        return <DiscursoPublicoView />;
      case 'servico-de-campo':
        return <ServicoDeCampoView />;
      case 'limpeza':
        return <LimpezaView isAdmin={isAdminAuthenticated()} />;
      case 'territorios':
        return <TerritoriosView isAdmin={isAdminAuthenticated()} />;
      case 'avisos':
        return <AvisosView />;
      case 'administracao':
        return <AdminPainelView onBackToPublic={handleBackToPublic} />;
      case 'secretario':
        return <SecretarioView />;
      case 'relatorios':
        return <RelatoriosView />;
      case 'assistencia':
        return <AssistenciaView />;
      case 'configuracoes':
        return (
          <ConfiguracoesView
            theme={theme}
            onToggleTheme={toggleTheme}
            textSize={textSize}
            onToggleFontSize={toggleFontSize}
          />
        );
      default:
        return <PlaceholderView screenId={currentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Header Fixo do Quadro Digital */}
      <Header
        onOpenMenu={() => setIsDrawerOpen(true)}
        isAdmin={isAdminAuthenticated()}
        onOpenAdminLogin={() => navigateToScreen('administracao')}
        onAdminLogout={() => {}}
        theme={theme}
        onToggleTheme={toggleTheme}
        fontSize={textSize === 'pequeno' ? 'P' : textSize === 'grande' ? 'G' : 'M'}
        onToggleFontSize={toggleFontSize}
      />

      {/* Layout Principal com Sidebar (Tablet/PC) e Quadro de Leitura */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen) => navigateToScreen(screen)}
          isAdmin={isAdminAuthenticated()}
        />

        {/* Main Content Area - Expansivo para aproveitar toda a proporção da tela */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 pb-20 sm:pb-24 lg:pb-12 max-w-7xl mx-auto w-full"
        >
          {renderActiveScreen()}
        </main>
      </div>

      {/* Navegação Inferior para Celular */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={(screen) => navigateToScreen(screen)}
        onOpenMore={() => setIsDrawerOpen((prev) => !prev)}
      />

      {/* Gaveta de Navegação Mobile Completa */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={currentScreen}
        onNavigate={(screen) => navigateToScreen(screen)}
        isAdmin={isAdminAuthenticated()}
      />

      {/* Pop-up de Aviso Global em Tempo Real */}
      <GlobalAvisoPopUp currentScreen={currentScreen} />
    </div>
  );
}
