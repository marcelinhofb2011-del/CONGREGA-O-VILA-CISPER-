import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Pin, Calendar, Tag, Info } from 'lucide-react';
import { AvisoItem, getStoredAvisos } from '../data/avisosStorage';

export const AvisosView: React.FC = () => {
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  useEffect(() => {
    setAvisos(getStoredAvisos());

    const handleAvisosUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AvisoItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setAvisos(customEvent.detail);
      }
    };

    window.addEventListener('avisos-firebase-updated', handleAvisosUpdate);
    return () => {
      window.removeEventListener('avisos-firebase-updated', handleAvisosUpdate);
    };
  }, []);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    avisos.forEach((a) => set.add(a.categoria));
    return ['todos', ...Array.from(set)];
  }, [avisos]);

  const avisosFiltrados = useMemo(() => {
    return avisos.filter((a) => {
      if (filtroCategoria !== 'todos' && a.categoria !== filtroCategoria) {
        return false;
      }
      return true;
    });
  }, [avisos, filtroCategoria]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Quadro de Avisos */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  AVISOS DA CONGREGAÇÃO
                </h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Quadro de anúncios, lembretes e comunicados oficiais
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Atualizado pelos anciãos e servos ministeriais</span>
          </div>
        </div>

        {/* Filtro por Categoria */}
        {categorias.length > 2 && (
          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="self-center text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              Filtrar:
            </span>
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  filtroCategoria === cat
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'todos' ? 'Todos os Avisos' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Avisos em Cartões Grandes e Legíveis */}
      {avisosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Bell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-slate-200">
            Nenhum aviso no momento
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Não há anúncios registrados para esta categoria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {avisosFiltrados.map((aviso) => {
            const isImportante = aviso.categoria === 'Importante';
            return (
              <article
                key={aviso.id}
                id={`aviso-card-${aviso.id}`}
                className={`rounded-2xl border p-6 transition-shadow shadow-xs hover:shadow-md ${
                  isImportante
                    ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800/80 dark:bg-amber-950/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {aviso.fixado && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Pin className="h-3 w-3" />
                        Fixado
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Tag className="h-3 w-3 text-slate-400" />
                      {aviso.categoria}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{aviso.dataPublicacao}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {aviso.titulo}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {aviso.conteudo}
                  </p>
                </div>

                {aviso.autor && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs font-bold text-slate-500 dark:text-slate-400">
                    Fonte: {aviso.autor}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
