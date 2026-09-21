import React, { useState } from 'react';
import { BookOpen, Speech, Calendar } from 'lucide-react';
import { VidaEMinisterioView } from './VidaEMinisterioView';
import { DiscursoPublicoView } from './DiscursoPublicoView';

export const ProgramacaoGeralView: React.FC = () => {
  const [reuniaoAtiva, setReuniaoAtiva] = useState<'vida-e-ministerio' | 'discurso-publico'>('vida-e-ministerio');

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Programação com Seleção das Reuniões */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                PROGRAMAÇÃO DAS REUNIÕES
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Consulte os programas das duas reuniões semanais da congregação
              </p>
            </div>
          </div>
        </div>

        {/* Seletor Grande de Reuniões */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            id="btn-tab-vida-ministerio"
            type="button"
            onClick={() => setReuniaoAtiva('vida-e-ministerio')}
            className={`flex items-center justify-center gap-3 rounded-xl p-4 text-base font-bold transition-all ${
              reuniaoAtiva === 'vida-e-ministerio'
                ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-700 ring-offset-2 dark:ring-offset-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Meio de Semana: Nossa Vida e Ministério</span>
          </button>

          <button
            id="btn-tab-discurso-sentinela"
            type="button"
            onClick={() => setReuniaoAtiva('discurso-publico')}
            className={`flex items-center justify-center gap-3 rounded-xl p-4 text-base font-bold transition-all ${
              reuniaoAtiva === 'discurso-publico'
                ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-700 ring-offset-2 dark:ring-offset-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'
            }`}
          >
            <Speech className="h-5 w-5" />
            <span>Fim de Semana: Discurso e Sentinela</span>
          </button>
        </div>
      </div>

      {/* Conteúdo da Reunião Selecionada */}
      <div>
        {reuniaoAtiva === 'vida-e-ministerio' ? (
          <VidaEMinisterioView />
        ) : (
          <DiscursoPublicoView />
        )}
      </div>
    </div>
  );
};
