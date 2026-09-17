import React from 'react';
import { FileSpreadsheet, BarChart2 } from 'lucide-react';

export const RelatoriosView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Relatórios
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Consulta e acompanhamento de relatórios da congregação.
          </p>
        </div>
      </div>

      {/* Área de Relatórios Disponíveis */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Barra superior da seção */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Relatórios disponíveis
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            CONGREGAÇÃO: VILA CISPER
          </span>
        </div>

        {/* Estado Inicial Fiel às Regras */}
        <div
          id="estado-inicial-relatorios"
          className="p-10 text-center flex flex-col items-center justify-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mb-3">
            <BarChart2 className="h-6 w-6" />
          </div>

          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Nenhum relatório disponível no momento.
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Esta área está estruturada para receber os relatórios do sistema com base nos dados reais cadastrados nas atividades da congregação.
          </p>
        </div>
      </div>
    </div>
  );
};
