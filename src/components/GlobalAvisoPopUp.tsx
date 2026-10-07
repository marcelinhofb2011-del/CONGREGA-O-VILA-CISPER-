import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import { ScreenId } from '../types';
import {
  AvisoItem,
  getStoredAvisos,
  getAvisosVisualizadosIds,
  marcarAvisoComoVisualizado,
  isTestOrDemoAviso,
} from '../data/avisosStorage';
import { isAdminAuthenticated } from '../data/territoriosStorage';

interface GlobalAvisoPopUpProps {
  currentScreen: ScreenId;
}

export const GlobalAvisoPopUp: React.FC<GlobalAvisoPopUpProps> = ({ currentScreen }) => {
  const [avisos, setAvisos] = useState<AvisoItem[]>(() => getStoredAvisos());
  const [visualizadosIds, setVisualizadosIds] = useState<string[]>(() =>
    getAvisosVisualizadosIds()
  );

  useEffect(() => {
    const handleAvisosUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AvisoItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setAvisos(customEvent.detail.filter((a) => !isTestOrDemoAviso(a)));
      } else {
        setAvisos(getStoredAvisos());
      }

      // Notificação do navegador em segundo plano se o app estiver minimizado
      if (
        typeof document !== 'undefined' &&
        document.hidden &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        const novos = getStoredAvisos();
        const visualizados = getAvisosVisualizadosIds();
        const pendente = novos.find(
          (a) => a.ativo !== false && !visualizados.includes(a.id) && !isTestOrDemoAviso(a)
        );
        if (pendente) {
          try {
            new Notification(pendente.titulo || 'Comunicado da Congregação', {
              body: pendente.conteudo,
              icon: '/pwa-192x192.png',
              tag: `aviso-${pendente.id}`,
            });
          } catch {
            // ignore
          }
        }
      }
    };

    const handleVisualizadosUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setVisualizadosIds(customEvent.detail);
      } else {
        setVisualizadosIds(getAvisosVisualizadosIds());
      }
    };

    window.addEventListener('avisos-firebase-updated', handleAvisosUpdate);
    window.addEventListener('avisos-visualizados-updated', handleVisualizadosUpdate);

    return () => {
      window.removeEventListener('avisos-firebase-updated', handleAvisosUpdate);
      window.removeEventListener('avisos-visualizados-updated', handleVisualizadosUpdate);
    };
  }, []);

  // Fila de avisos válidos que ainda não foram visualizados
  // Hook deve ser chamado incondicionalmente no topo (Rules of Hooks)
  const avisoAtual = useMemo(() => {
    if (currentScreen === 'inicio') return null;
    if (isAdminAuthenticated()) return null;
    if (!avisos || avisos.length === 0) return null;

    const ativos = avisos.filter((a) => a.ativo !== false && !isTestOrDemoAviso(a));
    const pendentes = ativos.filter((a) => !visualizadosIds.includes(a.id));

    if (pendentes.length === 0) return null;

    // Retorna exatamente 1 aviso (o mais recente)
    const ordenados = [...pendentes].sort((a, b) => {
      if (a.fixado && !b.fixado) return -1;
      if (!a.fixado && b.fixado) return 1;

      const partesA = a.dataPublicacao ? a.dataPublicacao.split('/') : [];
      const partesB = b.dataPublicacao ? b.dataPublicacao.split('/') : [];

      if (partesA.length === 3 && partesB.length === 3) {
        const timeA = new Date(
          parseInt(partesA[2], 10),
          parseInt(partesA[1], 10) - 1,
          parseInt(partesA[0], 10)
        ).getTime();
        const timeB = new Date(
          parseInt(partesB[2], 10),
          parseInt(partesB[1], 10) - 1,
          parseInt(partesB[0], 10)
        ).getTime();
        return timeB - timeA;
      }
      return 0;
    });

    return ordenados[0] || null;
  }, [avisos, visualizadosIds, currentScreen]);

  // Se estiver na tela inicial (gerenciado pelo InicioView), se for admin ou se não houver aviso pendente
  if (currentScreen === 'inicio' || isAdminAuthenticated() || !avisoAtual) {
    return null;
  }

  const handleEntendi = () => {
    marcarAvisoComoVisualizado(avisoAtual.id);
  };

  return (
    <div
      id="modal-aviso-popup-global"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-2xl dark:border-amber-600 dark:bg-slate-900 sm:p-7">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider">
              Comunicado da Congregação
            </span>
          </div>
          <button
            type="button"
            id="btn-fechar-aviso-popup-global"
            onClick={handleEntendi}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Fechar comunicado"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Título do Aviso */}
        <h3 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
          {avisoAtual.titulo}
        </h3>

        {/* Categoria e data */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {avisoAtual.categoria}
          </span>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{avisoAtual.dataPublicacao}</span>
          </div>
          {avisoAtual.autor && (
            <>
              <span>&bull;</span>
              <span>{avisoAtual.autor}</span>
            </>
          )}
        </div>

        {/* Conteúdo do Comunicado */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl bg-amber-50/60 p-4 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/40">
          <p className="whitespace-pre-line text-base leading-relaxed text-slate-800 dark:text-slate-200">
            {avisoAtual.conteudo}
          </p>
        </div>

        {/* Botão ENTENDI (Registra visualização e fecha) */}
        <div className="mt-6 flex justify-end">
          <button
            id="btn-entendi-aviso-popup-global"
            type="button"
            onClick={handleEntendi}
            className="w-full sm:w-auto min-h-[46px] rounded-xl bg-amber-600 px-8 py-3 text-base font-black text-white shadow-md hover:bg-amber-700 active:scale-[0.99] transition-all"
          >
            ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
};
