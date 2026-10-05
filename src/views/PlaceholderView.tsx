import React from 'react';
import { ScreenId } from '../types';

interface PlaceholderViewProps {
  screenId: ScreenId;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ screenId }) => {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        Seção em Construção
      </h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        A seção <span className="font-semibold text-blue-600 dark:text-blue-400">{screenId}</span> estará disponível em breve.
      </p>
    </div>
  );
};
