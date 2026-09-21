import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  BookOpen,
  Speech,
  Compass,
  Users,
  Sparkles,
  Map,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react';
import { ScreenId } from '../types';
import {
  getStoredEscalaDesignacoes,
  EscalaDesignacaoItem,
  STORAGE_KEY_DESIGNACOES,
} from '../data/designacoesStorage';
import {
  getStoredAvisos,
  AvisoItem,
  STORAGE_KEY_AVISOS,
  STORAGE_KEY_AVISOS_VISUALIZADOS,
  getAvisosVisualizadosIds,
  marcarAvisoComoVisualizado,
} from '../data/avisosStorage';
import {
  getHorariosReunioes,
  HorariosReunioesConfig,
  STORAGE_KEY_HORARIOS_REUNIOES,
  DIAS_SEMANA_MAPA_INDICE,
} from '../data/horariosReunioesStorage';
import { parseItemDate } from '../utils/dateUtils';
import bannerReuniaoOficial from '../assets/images/1011229_univ_pnr_lg.jpg';

interface InicioViewProps {
  onNavigate: (screen: ScreenId) => void;
}

const DIAS_SEMANA_EXTENSO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const MESES_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export const InicioView: React.FC<InicioViewProps> = ({ onNavigate }) => {
  const [escala, setEscala] = useState<EscalaDesignacaoItem[]>([]);
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [visualizadosIds, setVisualizadosIds] = useState<string[]>([]);
  const [horariosConfig, setHorariosConfig] = useState<HorariosReunioesConfig>(() =>
    getHorariosReunioes()
  );

  // Carregar dados e sincronizar com eventos do storage/Firebase
  const carregarDados = () => {
    setEscala(getStoredEscalaDesignacoes());
    setAvisos(getStoredAvisos());
    setVisualizadosIds(getAvisosVisualizadosIds());
    setHorariosConfig(getHorariosReunioes());
  };

  useEffect(() => {
    carregarDados();

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY_DESIGNACOES ||
        e.key === STORAGE_KEY_AVISOS ||
        e.key === STORAGE_KEY_AVISOS_VISUALIZADOS ||
        e.key === STORAGE_KEY_HORARIOS_REUNIOES ||
        !e.key
      ) {
        carregarDados();
      }
    };

    const handleDesignacoesUpdate = () => {
      setEscala(getStoredEscalaDesignacoes());
    };

    const handleAvisosUpdate = () => {
      setAvisos(getStoredAvisos());
    };

    const handleVisualizadosUpdate = (e: CustomEvent<string[]>) => {
      if (Array.isArray(e.detail)) {
        setVisualizadosIds(e.detail);
      } else {
        setVisualizadosIds(getAvisosVisualizadosIds());
      }
    };

    const handleHorariosUpdate = (e: CustomEvent<HorariosReunioesConfig>) => {
      if (e.detail) {
        setHorariosConfig(e.detail);
      } else {
        setHorariosConfig(getHorariosReunioes());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('designacoes-firebase-updated', handleDesignacoesUpdate);
    window.addEventListener('avisos-firebase-updated', handleAvisosUpdate);
    window.addEventListener(
      'avisos-visualizados-updated',
      handleVisualizadosUpdate as EventListener
    );
    window.addEventListener(
      'horarios-reunioes-updated',
      handleHorariosUpdate as EventListener
    );

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('designacoes-firebase-updated', handleDesignacoesUpdate);
      window.removeEventListener('avisos-firebase-updated', handleAvisosUpdate);
      window.removeEventListener(
        'avisos-visualizados-updated',
        handleVisualizadosUpdate as EventListener
      );
      window.removeEventListener(
        'horarios-reunioes-updated',
        handleHorariosUpdate as EventListener
      );
    };
  }, []);

  // Fila de avisos ativos que o usuário ainda NÃO confirmou neste dispositivo
  const avisosNaoVisualizados = useMemo(() => {
    if (!avisos || avisos.length === 0) return [];

    // Filtra apenas avisos ativos (ou sem campo ativo explícito, considerado ativo por padrão)
    const ativos = avisos.filter((a) => a.ativo !== false);

    // Filtra apenas os que este dispositivo AINDA NÃO visualizou
    const pendentes = ativos.filter((a) => !visualizadosIds.includes(a.id));

    // Ordena para exibir prioritariamente fixados e depois por data mais recente
    return pendentes.sort((a, b) => {
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
  }, [avisos, visualizadosIds]);

  // Exibe exatamente o primeiro aviso não visualizado da fila (um por vez)
  const avisoAtualPopUp = avisosNaoVisualizados.length > 0 ? avisosNaoVisualizados[0] : null;

  // Ao clicar em ENTENDI: marca como visualizado de forma permanente no dispositivo
  // e avança automaticamente para o próximo não visualizado (se houver)
  const handleEntendiAviso = (id: string) => {
    marcarAvisoComoVisualizado(id);
    setVisualizadosIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // 1. Data Atual de Maneira Simples
  const dataAtualFormatada = useMemo(() => {
    const hoje = new Date();
    const diaSemana = DIAS_SEMANA_EXTENSO[hoje.getDay()];
    const dia = hoje.getDate();
    const mes = MESES_EXTENSO[hoje.getMonth()];
    const ano = hoje.getFullYear();
    return `${diaSemana}, ${dia} de ${mes} de ${ano}`;
  }, []);

  // 2. Próxima Reunião
  const proximaReuniaoInfo = useMemo(() => {
    if (!escala || escala.length === 0) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const comData = escala
      .map((item) => ({
        item,
        date: parseItemDate(item.dia, item.mes),
      }))
      .filter((d): d is { item: EscalaDesignacaoItem; date: Date } => d.date !== null);

    if (comData.length === 0) return null;

    // Filtra reuniões a partir de hoje
    const futuras = comData
      .filter((r) => r.date.getTime() >= hoje.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Se houver futuras a partir de hoje, pega a primeira; senão, a mais próxima cadastrada
    const itemAlvo = futuras.length > 0 ? futuras[0] : comData[comData.length - 1];
    if (!itemAlvo) return null;

    const d = itemAlvo.date;
    const diaSemana = DIAS_SEMANA_EXTENSO[d.getDay()];
    const diaMes = `${d.getDate()} de ${MESES_EXTENSO[d.getMonth()]}`;

    const diaIndiceMeio = DIAS_SEMANA_MAPA_INDICE[horariosConfig.meioDeSemana.dia];
    const diaIndiceFds = DIAS_SEMANA_MAPA_INDICE[horariosConfig.fimDeSemana.dia];

    const ehFimDeSemana = d.getDay() === diaIndiceFds || (d.getDay() !== diaIndiceMeio && (d.getDay() === 0 || d.getDay() === 6));
    const tipoReuniao = itemAlvo.item.observacao || (ehFimDeSemana
      ? 'Reunião de fim de semana'
      : 'Reunião de meio de semana');

    // Horário automático configurado pelos responsáveis
    const horario = ehFimDeSemana
      ? horariosConfig.fimDeSemana.horario
      : horariosConfig.meioDeSemana.horario;

    return {
      item: itemAlvo.item,
      tipoReuniao,
      diaSemana,
      data: diaMes,
      dataCompleta: `${diaSemana}, ${diaMes}`,
      horario,
    };
  }, [escala, horariosConfig]);

  // 3. Próximas Designações estruturadas de forma resumida
  const designacoesResumo = useMemo(() => {
    if (!proximaReuniaoInfo) return null;
    const item = proximaReuniaoInfo.item;

    const hasAnyDesignacao = Boolean(
      (item.indicador && item.indicador.trim()) ||
      (item.microfone && item.microfone.trim()) ||
      (item.audio && item.audio.trim()) ||
      (item.video && item.video.trim()) ||
      (item.leitor && item.leitor.trim())
    );
    if (!hasAnyDesignacao) return null;

    const indicador = item.indicador && item.indicador.trim() ? item.indicador.trim() : 'A definir';
    const microfone = item.microfone && item.microfone.trim() ? item.microfone.trim() : 'A definir';

    // Áudio e vídeo agrupados conforme especificação
    let audioVideo = 'A definir';
    const audio = item.audio?.trim();
    const video = item.video?.trim();
    if (audio && video) {
      audioVideo = audio === video ? audio : `${audio} / ${video}`;
    } else if (audio) {
      audioVideo = audio;
    } else if (video) {
      audioVideo = video;
    }

    const leitor = item.leitor && item.leitor.trim() ? item.leitor.trim() : 'A definir';

    return {
      indicador,
      microfone,
      audioVideo,
      leitor,
    };
  }, [proximaReuniaoInfo]);

  // 4. Acessos Principais solicitados
  const botoesAcessoPrincipal = [
    {
      id: 'btn-acesso-designacoes',
      label: 'Designações',
      screen: 'designacoes' as ScreenId,
      icon: CalendarCheck,
    },
    {
      id: 'btn-acesso-vida-ministerio',
      label: 'Vida e Ministério',
      screen: 'vida-e-ministerio' as ScreenId,
      icon: BookOpen,
    },
    {
      id: 'btn-acesso-discurso-publico',
      label: 'Discurso Público',
      screen: 'discurso-publico' as ScreenId,
      icon: Speech,
    },
    {
      id: 'btn-acesso-servico-campo',
      label: 'Serviço de Campo',
      screen: 'servico-de-campo' as ScreenId,
      icon: Compass,
    },
    {
      id: 'btn-acesso-assistencia',
      label: 'Assistência',
      screen: 'assistencia' as ScreenId,
      icon: Users,
    },
    {
      id: 'btn-acesso-limpeza',
      label: 'Grupo de Limpeza',
      screen: 'limpeza' as ScreenId,
      icon: Sparkles,
    },
    {
      id: 'btn-acesso-territorios',
      label: 'Território',
      screen: 'territorios' as ScreenId,
      icon: Map,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 pb-16 pt-2">
      {/* ------------------------------------------------------------- */}
      {/* 1. CABEÇALHO                                                  */}
      {/* ------------------------------------------------------------- */}
      <header
        id="cabecalho-quadro"
        className="border-b border-slate-200 pb-5 dark:border-slate-800"
      >
        <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
          CONGREGAÇÃO: VILA CISPER
        </h1>
        <p className="mt-1.5 text-base font-semibold capitalize text-slate-600 dark:text-slate-400 sm:text-lg">
          {dataAtualFormatada}
        </p>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* BANNER VISUAL DISCRETO E MODERNO                              */}
      {/* ------------------------------------------------------------- */}
      <div
        id="banner-horizontal-inicio"
        className="overflow-hidden rounded-xl border border-slate-200 shadow-2xs dark:border-slate-800"
      >
        <img
          src={bannerReuniaoOficial}
          alt="Reunião congregacional e estudo bíblico"
          className="h-28 sm:h-36 w-full object-cover object-center"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. PRÓXIMA REUNIÃO                                            */}
      {/* ------------------------------------------------------------- */}
      <section id="secao-proxima-reuniao" className="space-y-3">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          PRÓXIMA REUNIÃO
        </h2>

        {proximaReuniaoInfo ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70 sm:p-6 space-y-2.5">
            <div className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              {proximaReuniaoInfo.tipoReuniao}
            </div>

            <div className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              {proximaReuniaoInfo.dataCompleta}
            </div>

            {proximaReuniaoInfo.horario && (
              <div className="flex items-center gap-2 pt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">
                <Clock className="h-5 w-5 text-slate-500 shrink-0" />
                <span>{proximaReuniaoInfo.horario}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-5 text-base font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            Nenhuma reunião cadastrada no momento.
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. PRÓXIMAS DESIGNAÇÕES                                       */}
      {/* Exibição resumida e objetiva: Indicador, Microfone,           */}
      {/* Áudio e vídeo, Leitor                                         */}
      {/* ------------------------------------------------------------- */}
      <section id="secao-proximas-designacoes" className="space-y-3">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          PRÓXIMAS DESIGNAÇÕES
        </h2>

        {designacoesResumo ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/70 sm:p-6 space-y-3">
            <div className="flex flex-wrap items-baseline gap-2 text-base sm:text-lg">
              <span className="font-bold text-slate-900 dark:text-white">Indicador:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {designacoesResumo.indicador}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 text-base sm:text-lg">
              <span className="font-bold text-slate-900 dark:text-white">Microfone:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {designacoesResumo.microfone}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 text-base sm:text-lg">
              <span className="font-bold text-slate-900 dark:text-white">Áudio e vídeo:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {designacoesResumo.audioVideo}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 text-base sm:text-lg">
              <span className="font-bold text-slate-900 dark:text-white">Leitor:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {designacoesResumo.leitor}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-5 text-base font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            Nenhuma designação cadastrada no momento.
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. ACESSOS PRINCIPAIS                                         */}
      {/* ------------------------------------------------------------- */}
      <section id="secao-acessos-principais" className="space-y-3">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          ACESSOS PRINCIPAIS
        </h2>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {botoesAcessoPrincipal.map((botao) => {
            const Icon = botao.icon;
            return (
              <button
                key={botao.id}
                id={botao.id}
                type="button"
                onClick={() => onNavigate(botao.screen)}
                className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left shadow-2xs hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-850"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  {botao.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* POP-UP TEMPORÁRIO DE AVISOS (EXIBE 1 POR VEZ ATÉ "ENTENDI")   */}
      {/* ------------------------------------------------------------- */}
      {avisoAtualPopUp && (
        <div
          id="modal-aviso-popup"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-2xl dark:border-amber-600 dark:bg-slate-900 sm:p-7">
            {/* Cabeçalho do Pop-up com indicador de contagem se houver múltiplos */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Comunicado da Congregação
                </span>
              </div>
              {avisosNaoVisualizados.length > 1 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  1 de {avisosNaoVisualizados.length}
                </span>
              )}
            </div>

            {/* Título do Aviso */}
            <h3 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
              {avisoAtualPopUp.titulo}
            </h3>

            {/* Categoria, data e autor */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {avisoAtualPopUp.categoria}
              </span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{avisoAtualPopUp.dataPublicacao}</span>
              </div>
              {avisoAtualPopUp.autor && (
                <>
                  <span>&bull;</span>
                  <span>{avisoAtualPopUp.autor}</span>
                </>
              )}
            </div>

            {/* Conteúdo do Comunicado */}
            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl bg-amber-50/60 p-4 border border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-800/40">
              <p className="whitespace-pre-line text-base leading-relaxed text-slate-800 dark:text-slate-200">
                {avisoAtualPopUp.conteudo}
              </p>
            </div>

            {/* Botão ENTENDI (Registra visualização e fecha / avança para o próximo) */}
            <div className="mt-6 flex justify-end">
              <button
                id="btn-entendi-aviso-popup"
                type="button"
                onClick={() => handleEntendiAviso(avisoAtualPopUp.id)}
                className="w-full sm:w-auto min-h-[46px] rounded-xl bg-amber-600 px-8 py-3 text-base font-black text-white shadow-md hover:bg-amber-700 active:scale-[0.99] transition-all"
              >
                ENTENDI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
