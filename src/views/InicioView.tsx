import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Bell,
  Clock,
  Mic,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Volume2,
  Tv,
  Users,
  BookOpen,
  Compass,
} from 'lucide-react';
import { ScreenId } from '../types';
import { getStoredEscalaDesignacoes, EscalaDesignacaoItem } from '../data/designacoesStorage';
import { getStoredDiscursosBiblicos, DiscursoBiblicoItem } from '../data/discursoStorage';
import { getStoredLimpezaEscala, LimpezaEscalaItem } from '../data/limpezaStorage';
import { getStoredCampoFds, CampoFimDeSemanaItem } from '../data/campoStorage';
import { parseItemDate } from '../utils/dateUtils';

interface InicioViewProps {
  onNavigate: (screen: ScreenId) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ onNavigate }) => {
  // Carrega dados dinâmicos da congregação
  const todasDesignacoes = useMemo(() => getStoredEscalaDesignacoes(), []);
  const todosDiscursos = useMemo(() => getStoredDiscursosBiblicos(), []);
  const todasLimpezas = useMemo(() => getStoredLimpezaEscala(), []);
  const todosCamposFds = useMemo(() => getStoredCampoFds(), []);

  // Encontra reuniões mais próximas baseadas na data atual real
  const proximasReunioes = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const comData = todasDesignacoes
      .map((item) => ({
        item,
        date: parseItemDate(item.dia, item.mes),
      }))
      .filter((d): d is { item: EscalaDesignacaoItem; date: Date } => d.date !== null);

    // Filtra reuniões a partir de hoje em ordem cronológica
    const futuras = comData
      .filter((r) => r.date.getTime() >= hoje.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((r) => r.item);

    if (futuras.length > 0) {
      return futuras.slice(0, 8);
    }

    // Fallback: se todas já passaram ou nenhuma futura encontrada, exibe as mais recentes
    return todasDesignacoes.slice(-8);
  }, [todasDesignacoes]);

  // Reuniões para seleção rápida na tela inicial
  const reunioesExibicao = proximasReunioes;

  // Reunião selecionada no quadro de próximas designações (inicia na primeira reunião válida mais próxima)
  const [reuniaoSelecionadaId, setReuniaoSelecionadaId] = useState<string>(() => {
    return proximasReunioes[0]?.id || todasDesignacoes[0]?.id || '';
  });

  // Atualiza a reunião ativa caso a lista mude
  useEffect(() => {
    if (proximasReunioes.length > 0) {
      setReuniaoSelecionadaId((atual) => {
        const existe = proximasReunioes.some((r) => r.id === atual);
        return existe && atual ? atual : proximasReunioes[0].id;
      });
    }
  }, [proximasReunioes]);

  const reuniaoAtiva: EscalaDesignacaoItem | undefined = useMemo(() => {
    return (
      reunioesExibicao.find((r) => r.id === reuniaoSelecionadaId) ||
      reunioesExibicao[0] ||
      todasDesignacoes[0]
    );
  }, [reunioesExibicao, reuniaoSelecionadaId, todasDesignacoes]);

  // Próximo discurso bíblico a partir da data atual
  const proximoDiscurso: DiscursoBiblicoItem | undefined = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const comData = todosDiscursos
      .map((d) => ({
        item: d,
        date: parseItemDate(d.data, d.mes),
      }))
      .filter((d): d is { item: DiscursoBiblicoItem; date: Date } => d.date !== null);

    const futuros = comData
      .filter((d) => d.date.getTime() >= hoje.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (futuros.length > 0) {
      return futuros[0].item;
    }

    return comData.length > 0 ? comData[comData.length - 1].item : todosDiscursos[0];
  }, [todosDiscursos]);

  // Próxima limpeza da congregação a partir da data atual
  const proximaLimpeza: LimpezaEscalaItem | undefined = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const comData = todasLimpezas
      .map((l) => ({
        item: l,
        date: parseItemDate(l.dias, l.mes || l.mesChave),
      }))
      .filter((l): l is { item: LimpezaEscalaItem; date: Date } => l.date !== null);

    const futuras = comData
      .filter((l) => l.date.getTime() >= hoje.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (futuras.length > 0) {
      return futuras[0].item;
    }

    return comData.length > 0 ? comData[comData.length - 1].item : todasLimpezas[0];
  }, [todasLimpezas]);

  // Próximas saídas de campo no fim de semana a partir da data atual
  const proximoCampo: CampoFimDeSemanaItem | undefined = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const comData = todosCamposFds
      .map((c) => ({
        item: c,
        date: parseItemDate(c.data, c.mes || c.mesChave),
      }))
      .filter((c): c is { item: CampoFimDeSemanaItem; date: Date } => c.date !== null);

    const futuros = comData
      .filter((c) => c.date.getTime() >= hoje.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (futuros.length > 0) {
      return futuros[0].item;
    }

    return comData.length > 0 ? comData[comData.length - 1].item : todosCamposFds[0];
  }, [todosCamposFds]);

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Identificação Padrão da Congregação */}
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Congregação Vila Cisper (67744)
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quadro Geral de Atividades
          </span>
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Painel Principal da Congregação
        </h1>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          Programação semanal, próximas designações e informações relevantes para as atividades da Congregação Vila Cisper.
        </p>
      </header>

      {/* Programação Semanal de Reuniões */}
      <section aria-labelledby="section-programacao" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <h2 id="section-programacao" className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              Programação Semanal de Reuniões
            </h2>
          </div>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Salão do Reino
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Reunião de Meio de Semana */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Meio de Semana
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Quinta-feira às 19:30
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                Nossa Vida e Ministério Cristão
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tesouros da Palavra de Deus &bull; Faça Seu Melhor no Ministério &bull; Nossa Vida Cristã
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Programa e apostilas da semana
              </span>
              <button
                type="button"
                onClick={() => onNavigate('vida-e-ministerio')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Ver programa</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Reunião de Fim de Semana */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-sm bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  Fim de Semana
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Domingo às 18:00
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                Discurso Público e Estudo de A Sentinela
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Discurso bíblico temático de 30 min seguido pelo estudo da revista semanal
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Temas, oradores e leitores
              </span>
              <button
                type="button"
                onClick={() => onNavigate('discurso-publico')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Ver programa</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Próximas Designações das Reuniões (Dinâmico com dados reais de Vila Cisper) */}
      <section aria-labelledby="section-designacoes-proximas" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <h2 id="section-designacoes-proximas" className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              Próximas Designações das Reuniões
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('designacoes')}
            className="inline-flex items-center gap-1 self-start sm:self-auto text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <span>Ver escala completa</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          {/* Seletor de Data da Reunião */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Selecione a reunião:
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {reunioesExibicao.map((r) => {
                  const isSelected = r.id === reuniaoAtiva?.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setReuniaoSelecionadaId(r.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r.dia}
                    </button>
                  );
                })}
              </div>
            </div>

            {reuniaoAtiva && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 self-start sm:self-auto">
                <Calendar className="h-3.5 w-3.5" />
                <span>{reuniaoAtiva.mes}</span>
              </div>
            )}
          </div>

          {/* Grade Responsiva de Irmãos Designados */}
          {reuniaoAtiva ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Indicadores */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span>Indicador</span>
                  </div>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    2 irmãos
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {reuniaoAtiva.indicador || 'A definir'}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Auditório e recepção do Salão
                </span>
              </div>

              {/* Microfones Volantes */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Mic className="h-4 w-4 text-slate-500" />
                    <span>Microfone</span>
                  </div>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    2 irmãos
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {reuniaoAtiva.microfone || 'A definir'}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Microfones volantes no auditório
                </span>
              </div>

              {/* Sistema de Áudio */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Volume2 className="h-4 w-4 text-slate-500" />
                    <span>Áudio</span>
                  </div>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    1 irmão
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {reuniaoAtiva.audio || 'A definir'}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mesa de som e microfones
                </span>
              </div>

              {/* Sistema de Vídeo */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Tv className="h-4 w-4 text-slate-500" />
                    <span>Vídeo</span>
                  </div>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    1 irmão
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {reuniaoAtiva.video || 'A definir'}
                </p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transmissão e telas do auditório
                </span>
              </div>

              {/* Leitor de A Sentinela (Reunião de Fim de Semana) */}
              {reuniaoAtiva.leitor ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <BookOpen className="h-4 w-4 text-slate-500" />
                      <span>Leitor de A Sentinela</span>
                    </div>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      1 irmão
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {reuniaoAtiva.leitor}
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Leitura dos parágrafos do estudo
                  </span>
                </div>
              ) : null}

              {/* Presidente da Reunião (quando cadastrado) */}
              {reuniaoAtiva.presidencia ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Sparkles className="h-4 w-4 text-slate-500" />
                      <span>Presidente</span>
                    </div>
                    <span className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      1 irmão
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {reuniaoAtiva.presidencia}
                  </p>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Presidência da reunião de fim de semana
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Nenhuma escala cadastrada para exibição no momento.
            </p>
          )}
        </div>
      </section>

      {/* Avisos Importantes & Informações Relevantes */}
      <section aria-labelledby="section-avisos" className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          <h2 id="section-avisos" className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
            Avisos Importantes e Lembretes da Reunião
          </h2>
        </div>

        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-xs dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {/* Lembrete de Limpeza do Salão */}
          <div className="p-4 space-y-1 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                Limpeza do Salão do Reino nesta semana
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {proximaLimpeza ? `${proximaLimpeza.mes} &bull; Dias ${proximaLimpeza.dias}` : 'Programação Semanal'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm leading-relaxed">
              {proximaLimpeza ? (
                <>
                  A limpeza semanal está a cargo do{' '}
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    {proximaLimpeza.grupo}
                  </strong>{' '}
                  ({proximaLimpeza.responsaveis}).
                </>
              ) : (
                'A limpeza semanal é coordenada pelos grupos de serviço designados.'
              )}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('limpeza')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Ver escala de limpeza</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Próximo Discurso Bíblico */}
          <div className="p-4 space-y-1 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                Discurso Público do próximo fim de semana
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {proximoDiscurso
                  ? `Data: ${proximoDiscurso.data.includes('/20') ? proximoDiscurso.data : `${proximoDiscurso.data}/2026`}`
                  : 'Reunião de Fim de Semana'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm leading-relaxed">
              {proximoDiscurso ? (
                <>
                  Tema:{' '}
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    "{proximoDiscurso.tema}"
                  </strong>{' '}
                  &bull; Orador: {proximoDiscurso.orador || 'Orador Convidado'}{' '}
                  {proximoDiscurso.presidente ? `&bull; Presidente: ${proximoDiscurso.presidente}` : ''}
                </>
              ) : (
                'Programação temática de 30 minutos seguida pelo Estudo de A Sentinela.'
              )}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('discurso-publico')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Ver programação de discursos</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Orientações para Irmãos Designados */}
          <div className="p-4 space-y-1 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                Orientações para os irmãos com designação
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Procedimento padrão
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm leading-relaxed">
              Solicita-se aos irmãos designados para microfones, indicadores, áudio e vídeo que cheguem com <strong>20 minutos de antecedência</strong> para testes técnicos de som e acolhimento dos presentes.
            </p>
          </div>

          {/* Serviço de Campo no Fim de Semana */}
          <div className="p-4 space-y-1 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                Arranjos para o Serviço de Campo
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Fim de Semana
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm leading-relaxed">
              {proximoCampo ? (
                <>
                  Saídas de pregação aos sábados e domingos no Salão do Reino e pontos dos grupos. Próximo dirigente:{' '}
                  <strong className="font-semibold text-slate-800 dark:text-slate-200">
                    {proximoCampo.dirigente}
                  </strong>{' '}
                  ({proximoCampo.diaSemana} - {proximoCampo.data}).
                </>
              ) : (
                'Saídas de pregação regulares aos sábados e domingos no Salão do Reino e residências dos grupos.'
              )}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('servico-de-campo')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Ver escala de campo</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
