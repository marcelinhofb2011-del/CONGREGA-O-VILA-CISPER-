import React, { useState } from 'react';
import { Settings, Sun, Moon, Download, Smartphone, Check, Wifi, WifiOff, Type, RefreshCw, Sparkles } from 'lucide-react';
import { TextSize, ThemeMode } from '../types';
import { usePWA } from '../hooks/usePWA';

interface ConfiguracoesViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  textSize?: TextSize;
  onToggleFontSize?: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  theme,
  onToggleTheme,
  textSize = 'medio',
  onToggleFontSize,
}) => {
  const { isInstallable, isInstalled, isOnline, hasUpdate, promptInstall, forceUpdatePWA } = usePWA();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await forceUpdatePWA();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Configurações do Aplicativo
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Ajustes de visualização, acessibilidade, instalação e preferências de uso
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
        {/* Atualização e Renovação de Cache PWA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 text-blue-600 dark:text-blue-400 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>Atualizar Aplicativo (PWA)</span>
              {hasUpdate && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white animate-pulse">
                  Nova Versão Disponível
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Força o aplicativo a descarregar as melhorias mais recentes, recarregando o cache e atualizando arquivos
            </p>
          </div>
          <button
            type="button"
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Atualizando...' : 'Atualizar Aplicativo Agora'}</span>
          </button>
        </div>

        {/* Tamanho da Fonte / Acessibilidade para Idosos */}
        {onToggleFontSize && (
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Type className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Tamanho do Texto (Acessibilidade)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aumenta a proporção das letras para irmãos com dificuldades visuais
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleFontSize}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <span className="text-blue-600 dark:text-blue-400 font-extrabold text-sm">T</span>
              <span>
                {textSize === 'pequeno'
                  ? 'Pequeno (P)'
                  : textSize === 'grande'
                  ? 'Grande (G)'
                  : 'Médio (M)'}
              </span>
            </button>
          </div>
        )}

        {/* Aparência */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Aparência do Quadro</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alterne entre o tema claro e o tema escuro
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-600" />
                <span>Modo Escuro</span>
              </>
            )}
          </button>
        </div>

        {/* Instalar App / PWA */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Instalar no Celular</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adicione o ícone nativo na tela inicial para acesso rápido e funcionamento offline
            </p>
          </div>

          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Instalado</span>
            </span>
          ) : isInstallable ? (
            <button
              type="button"
              onClick={promptInstall}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Instalar</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">Acesse via Chrome/Safari para instalar</span>
          )}
        </div>

        {/* Conexão */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status da Conexão</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sincronização em tempo real com o banco de dados
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-600" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-amber-600" />
                <span>Modo Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-bold text-slate-700 dark:text-slate-300">
          Congregação Vila Cisper (Código: 67744)
        </p>
        <p>Quadro Digital de Anúncios e Programações • PWA Nativo Atualizado 2026</p>
      </div>
    </div>
  );
};
