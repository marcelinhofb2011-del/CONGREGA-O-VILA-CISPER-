import React from 'react';
import { Calendar, History, Filter } from 'lucide-react';
import { ModoVisualizacao } from '../utils/scheduleStatusUtils';

interface ScheduleNavTabsProps {
  modoVisualizacao: ModoVisualizacao;
  onChangeModo: (modo: ModoVisualizacao) => void;
  qtdProximas: number;
  qtdHistorico: number;
  accentColor?: 'blue' | 'sky' | 'teal' | 'amber' | 'emerald';
  // Filtro de mês/período opcional para o Histórico
  mesesHistorico?: { chave: string; rotulo: string }[];
  mesHistoricoSelecionado?: string;
  onChangeMesHistorico?: (chave: string) => void;
}

export const ScheduleNavTabs: React.FC<ScheduleNavTabsProps> = ({
  modoVisualizacao,
  onChangeModo,
  qtdProximas,
  qtdHistorico,
  accentColor = 'blue',
  mesesHistorico = [],
  mesHistoricoSelecionado = 'todos',
  onChangeMesHistorico,
}) => {
  // Cores dinâmicas por departamento
  const activeClassMap: Record<string, string> = {
    blue: 'bg-blue-700 text-white shadow-xs dark:bg-blue-600',
    sky: 'bg-sky-600 text-white shadow-xs dark:bg-sky-500',
    teal: 'bg-teal-700 text-white shadow-xs dark:bg-teal-600',
    emerald: 'bg-emerald-700 text-white shadow-xs dark:bg-emerald-600',
    amber: 'bg-amber-600 text-white shadow-xs dark:bg-amber-500',
  };

  const activeProximasClass = activeClassMap[accentColor] || activeClassMap.blue;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
      {/* Abas: Próximas vs Histórico */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="btn-aba-proximas"
          onClick={() => onChangeModo('proximas')}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-all active:scale-[0.99] cursor-pointer ${
            modoVisualizacao === 'proximas'
              ? activeProximasClass
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Próximas</span>
          <span
            className={`ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-black ${
              modoVisualizacao === 'proximas'
                ? 'bg-black/20 text-white dark:bg-white/20'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {qtdProximas}
          </span>
        </button>

        <button
          type="button"
          id="btn-aba-historico"
          onClick={() => onChangeModo('historico')}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-all active:scale-[0.99] cursor-pointer ${
            modoVisualizacao === 'historico'
              ? 'bg-slate-800 text-white shadow-xs dark:bg-slate-200 dark:text-slate-900'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <History className="h-4 w-4" />
          <span>HISTÓRICO</span>
          <span
            className={`ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-black ${
              modoVisualizacao === 'historico'
                ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {qtdHistorico}
          </span>
        </button>
      </div>

      {/* Filtro de período/mês quando em modo Histórico */}
      {modoVisualizacao === 'historico' && mesesHistorico.length > 0 && onChangeMesHistorico && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            Período:
          </span>
          <select
            id="select-filtro-mes-historico"
            value={mesHistoricoSelecionado}
            onChange={(e) => onChangeMesHistorico(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="todos">Todos os meses ({qtdHistorico})</option>
            {mesesHistorico.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
