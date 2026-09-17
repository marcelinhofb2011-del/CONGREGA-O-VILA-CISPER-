import React from 'react';
import { ScreenId } from '../types';
import { NAV_ITEMS } from '../navigation';
import { Clock } from 'lucide-react';

interface PlaceholderViewProps {
  screenId: ScreenId;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ screenId }) => {
  const item = NAV_ITEMS.find((n) => n.id === screenId);
  const Icon = item?.icon || Clock;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          {item?.label || 'Área do Sistema'}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {item?.description || 'Área interna da Congregação Vila Cisper.'}
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-950/40">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          Área Preparada para Configuração
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          A base visual e de navegação desta seção já está devidamente estruturada. Conforme solicitado, as funções e formulários específicos serão adicionados na próxima etapa.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          Aguardando instruções e estrutura do módulo
        </div>
      </div>
    </div>
  );
};
