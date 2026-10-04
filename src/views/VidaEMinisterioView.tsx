import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Calendar, ChevronDown, ChevronUp, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import {
  S140TSemana,
  getStoredS140TSemanas,
  saveS140TSemana,
  deleteS140TSemana,
  verificarDesignacaoIrmao,
  parseSemanaDateLimits,
} from '../data/s140tStorage';
import {
  ScheduleNavTabs,
} from '../components/ScheduleNavTabs';
import {
  ModoVisualizacao,
  classificarSemanaS140T,
  extrairRotuloMesAno,
} from '../utils/scheduleStatusUtils';

interface VidaEMinisterioViewProps {
  isAdmin?: boolean;
}

export const VidaEMinisterioView: React.FC<VidaEMinisterioViewProps> = ({ isAdmin = false }) => {
  const [semanas, setSemanas] = useState<S140TSemana[]>([]);
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('proximas');
  const [mesHistoricoSelecionado, setMesHistoricoSelecionado] = useState<string>('todos');
  const [filtroIrmao, setFiltroIrmao] = useState('');
  const [semanaExpandidaId, setSemanaExpandidaId] = useState<string | null>(null);

  const carregarDados = () => {
    setSemanas(getStoredS140TSemanas());
  };

  useEffect(() => {
    carregarDados();
    const handleUpdate = () => carregarDados();
    window.addEventListener('s140t-firebase-updated', handleUpdate);
    return () => window.removeEventListener('s140t-firebase-updated', handleUpdate);
  }, []);

  // Classifica as semanas
  const classifiedSemanas = useMemo(() => {
    return semanas.map((semana) => {
      const situacao = classificarSemanaS140T(semana);
      const limits = parseSemanaDateLimits(semana);
      const timestamp = limits ? limits.inicio.getTime() : 0;
      const mesRotulo = extrairRotuloMesAno(semana.dataReuniao || semana.periodo);
      return { semana, situacao, timestamp, mesRotulo };
    });
  }, [semanas]);

  // Próximas (atual + futuras) ordenadas cronologicamente
  const itensProximos = useMemo(() => {
    return classifiedSemanas
      .filter((cs) => cs.situacao === 'atual' || cs.situacao === 'futura')
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [classifiedSemanas]);

  // Histórico (passadas) ordenadas do mais recente para o mais antigo
  const itensPassados = useMemo(() => {
    return classifiedSemanas
      .filter((cs) => cs.situacao === 'passada')
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [classifiedSemanas]);

  // Expandir automaticamente a semana atual se existir nas próximas
  useEffect(() => {
    if (modoVisualizacao === 'proximas') {
      const atual = itensProximos.find((i) => i.situacao === 'atual');
      if (atual) {
        setSemanaExpandidaId(atual.semana.id);
      } else if (itensProximos.length > 0) {
        setSemanaExpandidaId(itensProximos[0].semana.id);
      }
    } else {
      if (itensPassados.length > 0) {
        setSemanaExpandidaId(itensPassados[0].semana.id);
      }
    }
  }, [modoVisualizacao, itensProximos, itensPassados]);

  // Meses disponíveis para o histórico
  const mesesDisponiveisHistorico = useMemo(() => {
    const map = new Map<string, string>();
    itensPassados.forEach((cs) => {
      if (cs.mesRotulo && !map.has(cs.mesRotulo)) {
        map.set(cs.mesRotulo, cs.mesRotulo);
      }
    });
    return Array.from(map.entries()).map(([chave, rotulo]) => ({ chave, rotulo }));
  }, [itensPassados]);

  // Lista filtrada
  const listaExibida = useMemo(() => {
    const baseList = modoVisualizacao === 'proximas' ? itensProximos : itensPassados;

    return baseList.filter((cs) => {
      if (modoVisualizacao === 'historico' && mesHistoricoSelecionado !== 'todos') {
        if (cs.mesRotulo !== mesHistoricoSelecionado) return false;
      }

      if (filtroIrmao.trim()) {
        const termo = filtroIrmao.trim();
        const s = cs.semana;
        const matchesPresidente = verificarDesignacaoIrmao(termo, s.presidente);
        const matchesOracaoIni = verificarDesignacaoIrmao(termo, s.oracaoInicial);
        const matchesOracaoFim = verificarDesignacaoIrmao(termo, s.oracaoFinal);
        const matchesTesouro = verificarDesignacaoIrmao(termo, s.discursoTesourosIrmao);
        const matchesJoias = verificarDesignacaoIrmao(termo, s.joiasEspirituaisIrmao);
        const matchesLeitura = verificarDesignacaoIrmao(termo, s.leituraBibliaIrmao);
        const matchesEstudoDir = verificarDesignacaoIrmao(termo, s.estudoBiblicoDirigente);
        const matchesEstudoLei = verificarDesignacaoIrmao(termo, s.estudoBiblicoLeitor);
        const matchesMinisterio = s.partesMinisterio?.some(
          (p) =>
            verificarDesignacaoIrmao(termo, p.designado) ||
            verificarDesignacaoIrmao(termo, p.ajudante)
        );
        const matchesVidaCrista = s.partesVidaCrista?.some((p) =>
          verificarDesignacaoIrmao(termo, p.designado)
        );

        return (
          matchesPresidente ||
          matchesOracaoIni ||
          matchesOracaoFim ||
          matchesTesouro ||
          matchesJoias ||
          matchesLeitura ||
          matchesEstudoDir ||
          matchesEstudoLei ||
          matchesMinisterio ||
          matchesVidaCrista
        );
      }

      return true;
    });
  }, [modoVisualizacao, itensProximos, itensPassados, mesHistoricoSelecionado, filtroIrmao]);

  const toggleExpand = (id: string) => {
    setSemanaExpandidaId((prev) => (prev === id ? null : id));
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover esta semana do programa S-140-T?')) {
      deleteS140TSemana(id);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Nossa Vida e Ministério Cristão
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Programação oficial da Reunião de Meio de Semana (S-140-T)
          </p>
        </div>
      </div>

      {/* Abas: Próximas vs HISTÓRICO */}
      <ScheduleNavTabs
        modoVisualizacao={modoVisualizacao}
        onChangeModo={(novoModo) => {
          setModoVisualizacao(novoModo);
          setMesHistoricoSelecionado('todos');
        }}
        qtdProximas={itensProximos.length}
        qtdHistorico={itensPassados.length}
        accentColor="sky"
        mesesHistorico={mesesDisponiveisHistorico}
        mesHistoricoSelecionado={mesHistoricoSelecionado}
        onChangeMesHistorico={setMesHistoricoSelecionado}
      />

      {/* Filtro por Irmão */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={filtroIrmao}
          onChange={(e) => setFiltroIrmao(e.target.value)}
          placeholder={`Buscar irmão em partes de Vida e Ministério (${modoVisualizacao === 'proximas' ? 'próximas' : 'histórico'})...`}
          className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        {filtroIrmao && (
          <button
            type="button"
            onClick={() => setFiltroIrmao('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista de Semanas */}
      {listaExibida.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <Calendar className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma semana encontrada
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {modoVisualizacao === 'proximas'
              ? 'Não há semanas futuras na lista principal. As semanas anteriores estão no Histórico.'
              : 'Nenhum registro anterior localizado para o filtro selecionado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listaExibida.map(({ semana, situacao }) => {
            const isAtual = situacao === 'atual';
            const isExpanded = semanaExpandidaId === semana.id;

            return (
              <div
                key={semana.id}
                className={`overflow-hidden rounded-2xl border transition-all shadow-xs ${
                  isAtual
                    ? 'border-sky-500 bg-white ring-2 ring-sky-500/20 dark:border-sky-400 dark:bg-slate-900'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                {/* Header da Semana */}
                <div
                  onClick={() => toggleExpand(semana.id)}
                  className={`flex cursor-pointer items-center justify-between p-4 sm:p-5 transition-colors ${
                    isAtual ? 'bg-sky-50/50 dark:bg-sky-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {semana.periodo}
                      </span>
                      {isAtual && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          Semana Atual
                        </span>
                      )}
                      {situacao === 'passada' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Histórico
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span>
                        Leitura: <strong className="text-slate-900 dark:text-slate-200">{semana.leituraBiblica}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Presidente: <strong className="text-slate-900 dark:text-slate-200">{semana.presidente}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(semana.id);
                        }}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 sm:p-5 dark:border-slate-800/80 space-y-5">
                    {/* Seção 1: Introdução */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Cântico Inicial</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{semana.canticoInicial}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Oração Inicial</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{semana.oracaoInicial}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Presidente</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{semana.presidente}</span>
                      </div>
                    </div>

                    {/* Seção 2: Tesouros da Palavra de Deus */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-amber-200 pb-1 dark:border-amber-900/60">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          Tesouros da Palavra de Deus
                        </h4>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between rounded-lg bg-amber-50/50 p-2 dark:bg-amber-950/20">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {semana.discursoTesourosTitulo} (10 min)
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-300">
                            {semana.discursoTesourosIrmao}
                          </span>
                        </div>
                        <div className="flex justify-between rounded-lg bg-amber-50/50 p-2 dark:bg-amber-950/20">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Encontre Joias Espirituais (10 min)
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-300">
                            {semana.joiasEspirituaisIrmao}
                          </span>
                        </div>
                        <div className="flex justify-between rounded-lg bg-amber-50/50 p-2 dark:bg-amber-950/20">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Leitura da Bíblia (4 min)
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-300">
                            {semana.leituraBibliaIrmao}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Seção 3: Faça Seu Melhor no Ministério */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-amber-500/30 pb-1">
                        <span className="h-2 w-2 rounded-full bg-amber-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                          Faça Seu Melhor no Ministério
                        </h4>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {semana.partesMinisterio?.map((parte) => (
                          <div
                            key={parte.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg bg-amber-50/30 p-2 dark:bg-amber-950/10 gap-1"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {parte.titulo} ({parte.tempoMin} min)
                            </span>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {parte.designado}
                              {parte.ajudante && (
                                <span className="text-slate-500 font-normal"> / {parte.ajudante}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Seção 4: Nossa Vida Cristã */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-red-200 pb-1 dark:border-red-900/60">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                          Nossa Vida Cristã
                        </h4>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                          Cântico intermediário: <strong className="text-slate-800 dark:text-slate-200">{semana.canticoMeio}</strong>
                        </div>
                        {semana.partesVidaCrista?.map((parte) => (
                          <div
                            key={parte.id}
                            className="flex justify-between rounded-lg bg-red-50/40 p-2 dark:bg-red-950/20"
                          >
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {parte.titulo} {parte.tempoMin ? `(${parte.tempoMin} min)` : ''}
                            </span>
                            <span className="font-bold text-red-800 dark:text-red-300">
                              {parte.designado}
                            </span>
                          </div>
                        ))}
                        {semana.estudoBiblicoDirigente && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg bg-red-50/50 p-2 dark:bg-red-950/30 gap-1">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Estudo Bíblico de Congregação (30 min)
                            </span>
                            <div className="text-xs font-bold text-red-800 dark:text-red-300">
                              Dirigente: {semana.estudoBiblicoDirigente}
                              {semana.estudoBiblicoLeitor && ` | Leitor: ${semana.estudoBiblicoLeitor}`}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-400">
                          <div>Cântico Final: <strong className="text-slate-800 dark:text-slate-200">{semana.canticoFinal}</strong></div>
                          <div>Oração Final: <strong className="text-slate-800 dark:text-slate-200">{semana.oracaoFinal}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
