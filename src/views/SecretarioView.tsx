import React from 'react';
import { Shield, FileText } from 'lucide-react';

export const SecretarioView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Secretário
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Área administrativa e registros da congregação.
          </p>
        </div>
      </div>

      {/* Painel Administrativo Estruturado */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Barra de identificação da seção */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Funções administrativas
            </span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            CONGREGAÇÃO: VILA CISPER
          </span>
        </div>

        {/* Estado Inicial Limpo e Objetivo */}
        <div
          id="estado-inicial-secretario"
          className="p-10 text-center flex flex-col items-center justify-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mb-3">
            <Shield className="h-6 w-6" />
          </div>

          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            As funções administrativas serão disponibilizadas aqui.
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Esta área está estruturada e preparada para receber os módulos e registros específicos do secretário conforme forem definidos.
          </p>
        </div>
      </div>
    </div>
  );
};
