import React from 'react';
import { Calendar, Users, BookOpen, Compass, Speech, Sparkles, Clock } from 'lucide-react';
import { ScreenId } from '../types';
import { getHorariosReunioes, getHorarioSaidaDeCampo } from '../data/horariosReunioesStorage';

interface ProgramacaoGeralViewProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ProgramacaoGeralView: React.FC<ProgramacaoGeralViewProps> = ({ onNavigate }) => {
  const horarios = getHorariosReunioes();
  const horarioSaida = horarios?.saidaDeCampo?.horario || getHorarioSaidaDeCampo() || '08:00';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Programação Geral
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Visão unificada das atividades e reuniões da Congregação Vila Cisper
        </p>
      </div>

      {/* Horários Regulares */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Horários Oficiais das Atividades
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              Reunião de Meio de Semana
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {horarios.meioDeSemana.dia}
            </div>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-300 mt-1">
              {horarios.meioDeSemana.horario}
            </div>
          </div>

          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-1">
              Reunião de Fim de Semana
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {horarios.fimDeSemana.dia}
            </div>
            <div className="text-xs font-bold text-sky-700 dark:text-sky-300 mt-1">
              {horarios.fimDeSemana.horario}
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-1">
              Saídas de Campo
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white">
              Sábados & Domingos
            </div>
            <div className="text-xs font-bold text-teal-700 dark:text-teal-300 mt-1">
              {horarioSaida} (Salão do Reino)
            </div>
          </div>
        </div>
      </div>

      {/* Atalhos para os 5 departamentos com separação de histórico */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Acesse os Departamentos de Programação
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('designacoes')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Designações de Reunião</div>
              <div className="text-xs text-slate-500">Áudio, vídeo, indicadores e leitores</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('vida-e-ministerio')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-sky-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="rounded-xl bg-sky-100 p-2.5 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Vida e Ministério (S-140-T)</div>
              <div className="text-xs text-slate-500">Programa semanal detalhado</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('servico-de-campo')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="rounded-xl bg-teal-100 p-2.5 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Serviço de Campo</div>
              <div className="text-xs text-slate-500">Escala oficial de saídas e pontos</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('discurso-publico')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Speech className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Discurso Público</div>
              <div className="text-xs text-slate-500">Oradores e temas de domingo</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('limpeza')}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900 sm:col-span-2"
          >
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Escala de Limpeza</div>
              <div className="text-xs text-slate-500">Grupos escalados para higienização</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
