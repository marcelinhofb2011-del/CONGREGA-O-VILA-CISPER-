import React, { useState, useEffect } from 'react';
import { ScreenId, TextSize, ThemeMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { MobileDrawer } from './components/MobileDrawer';
import { InicioView } from './views/InicioView';
import { DesignacoesView } from './views/DesignacoesView';
import { VidaEMinisterioView } from './views/VidaEMinisterioView';
import { LimpezaView } from './views/LimpezaView';
import { ServicoDeCampoView } from './views/ServicoDeCampoView';
import { DiscursoPublicoView } from './views/DiscursoPublicoView';
import { AssistenciaView } from './views/AssistenciaView';
import { TerritoriosView } from './views/TerritoriosView';
import { SecretarioView } from './views/SecretarioView';
import { RelatoriosView } from './views/RelatoriosView';
import { ConfiguracoesView } from './views/ConfiguracoesView';
import { PlaceholderView } from './views/PlaceholderView';
import { usePWA } from './hooks/usePWA';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('inicio');
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
    if (saved === 'sm' || saved === 'md' || saved === 'lg') return saved;
    return 'md';
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('vila_cisper_theme', theme);
  }, [theme]);

  // Apply text size to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', textSize);
    localStorage.setItem('vila_cisper_text_size', textSize);
  }, [textSize]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'inicio':
        return <InicioView onNavigate={(screen) => setCurrentScreen(screen)} />;
      case 'designacoes':
        return <DesignacoesView />;
      case 'vida-e-ministerio':
        return <VidaEMinisterioView />;
      case 'limpeza':
        return <LimpezaView />;
      case 'servico-de-campo':
        return <ServicoDeCampoView />;
      case 'discurso-publico':
        return <DiscursoPublicoView />;
      case 'assistencia':
        return <AssistenciaView />;
      case 'territorios':
        return <TerritoriosView />;
      case 'secretario':
        return <SecretarioView />;
      case 'relatorios':
        return <RelatoriosView />;
      case 'configuracoes':
        return (
          <ConfiguracoesView
            textSize={textSize}
            onChangeTextSize={setTextSize}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        );
      default:
        return <PlaceholderView screenId={currentScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Header Fixo e Obrigatório */}
      <Header
        currentScreen={currentScreen}
        onOpenMobileMenu={() => setIsDrawerOpen(true)}
        isDark={theme === 'dark'}
        onToggleTheme={toggleTheme}
        isOnline={isOnline}
      />

      {/* Layout Principal com Sidebar (Tablet/PC) e Área de Trabalho */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentScreen={currentScreen}
          onSelectScreen={(screen) => setCurrentScreen(screen)}
        />

        {/* Main Content Area - Mobile First, pb-32 for mobile bottom navigation clearance */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 pb-32 sm:pb-36 lg:pb-12 max-w-5xl mx-auto w-full"
        >
          {renderActiveScreen()}
        </main>
      </div>

      {/* Navegação Inferior para Celular */}
      <BottomNav
        currentScreen={currentScreen}
        onSelectScreen={(screen) => {
          setCurrentScreen(screen);
          setIsDrawerOpen(false);
        }}
        onOpenDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Gaveta de Navegação Mobile Completa */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
      />
    </div>
  );
}
