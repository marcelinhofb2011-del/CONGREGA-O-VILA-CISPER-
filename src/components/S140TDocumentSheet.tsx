import React from 'react';
import {
  S140TSemana,
  verificarDesignacaoIrmao,
} from '../data/s140tStorage';
import { Edit2, Trash2, Star, Users } from 'lucide-react';

interface S140TDocumentSheetProps {
  semanas: S140TSemana[];
  destacarIrmao?: string;
  isAdmin?: boolean;
  onEdit?: (semana: S140TSemana) => void;
  onDelete?: (id: string) => void;
}

export const S140TDocumentSheet: React.FC<S140TDocumentSheetProps> = ({
  semanas,
  destacarIrmao,
  isAdmin,
  onEdit,
  onDelete,
}) => {
  if (semanas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Nenhuma programação cadastrada no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="s140t-print-container space-y-8">
      {/* Folha do Documento Oficial S-140-T */}
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Cabeçalho Oficial do Formulário S-140-T */}
        <div className="border-b-2 border-slate-900 pb-3 dark:border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Vila Cisper - 67744
            </span>
            <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white text-right">
              Programação da reunião do meio de semana
            </h1>
          </div>
        </div>

        {/* Semanas da Programação */}
        <div className="mt-6 space-y-12 divide-y divide-slate-200 dark:divide-slate-800">
          {semanas.map((semana, index) => {
            const isPresidenteDestacado = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.presidente
            );
            const isOracaoInicialDestacada = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.oracaoInicial
            );
            const isDiscursoTesourosDestacado = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.discursoTesourosIrmao
            );
            const isJoiasDestacadas = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.joiasEspirituaisIrmao
            );
            const isLeituraBibliaDestacada = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.leituraBibliaIrmao
            );
            const isEstudoDirigenteDestacado = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.estudoBiblicoDirigente
            );
            const isEstudoLeitorDestacado = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.estudoBiblicoLeitor
            );
            const isOracaoFinalDestacada = verificarDesignacaoIrmao(
              destacarIrmao,
              semana.oracaoFinal
            );

            return (
              <div
                key={semana.id}
                className={`pt-6 ${index === 0 ? 'pt-0' : ''} space-y-4`}
              >
                {/* Linha da Semana / Leitura Bíblica + Presidente */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-300 pb-2 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                      {semana.periodo} | {semana.leituraBiblica}
                    </span>
                    {semana.ehVisita && (
                      <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                        (VISITA)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={`text-xs sm:text-sm transition-colors rounded-sm px-1.5 py-0.5 ${
                        isPresidenteDestacado
                          ? 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-900/60 dark:text-amber-100 ring-1 ring-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        Presidente:{' '}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {semana.presidente}
                      </span>
                      {isPresidenteDestacado && (
                        <span className="ml-1 text-[10px] bg-amber-500 text-white rounded-xs px-1 font-semibold uppercase tracking-wider">
                          Sua
                        </span>
                      )}
                    </div>

                    {/* Botões do Responsável */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 no-print">
                        <button
                          type="button"
                          onClick={() => onEdit?.(semana)}
                          title="Editar esta semana"
                          className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(semana.id)}
                          title="Excluir esta semana"
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloco de Introdução */}
                <div className="space-y-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-10 font-mono text-slate-400 dark:text-slate-500">
                        0:00
                      </span>
                      <span>&bull; Cântico {semana.canticoInicial}</span>
                    </div>
                    <div
                      className={`transition-colors rounded-sm px-1.5 py-0.5 ${
                        isOracaoInicialDestacada
                          ? 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-900/60 dark:text-amber-100 ring-1 ring-amber-400'
                          : ''
                      }`}
                    >
                      <span className="text-slate-500 dark:text-slate-400">
                        Oração:{' '}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {semana.oracaoInicial}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-10 font-mono text-slate-400 dark:text-slate-500">
                        0:00
                      </span>
                      <span>
                        &bull; Comentários iniciais ({semana.comentariosIniciaisMin || 1} min)
                      </span>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 1. SEÇÃO: TESOUROS DA PALAVRA DE DEUS (Cinza Grafite)    */}
                {/* ========================================================= */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between bg-slate-700 px-3 py-1 text-white dark:bg-slate-800">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                      TESOUROS DA PALAVRA DE DEUS
                    </span>
                    <span className="text-[11px] font-medium tracking-wide text-slate-200">
                      {semana.tesourosSalao || 'Salão principal'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {/* Discurso 10 min */}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-0.5 px-2 rounded transition-colors ${
                        isDiscursoTesourosDestacado
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="w-10 font-mono text-slate-400 dark:text-slate-500 shrink-0">
                          0:00
                        </span>
                        <span>
                          1. {semana.discursoTesourosTitulo} ({semana.discursoTesourosTempoMin || 10} min)
                        </span>
                      </div>
                      <div className="text-right pl-13 sm:pl-0">
                        <span
                          className={`font-semibold ${
                            isDiscursoTesourosDestacado
                              ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {semana.discursoTesourosIrmao}
                        </span>
                      </div>
                    </div>

                    {/* Joias Espirituais 10 min */}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-0.5 px-2 rounded transition-colors ${
                        isJoiasDestacadas
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="w-10 font-mono text-slate-400 dark:text-slate-500 shrink-0">
                          0:00
                        </span>
                        <span>
                          2. Joias espirituais ({semana.joiasEspirituaisTempoMin || 10} min)
                        </span>
                      </div>
                      <div className="text-right pl-13 sm:pl-0">
                        <span
                          className={`font-semibold ${
                            isJoiasDestacadas
                              ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {semana.joiasEspirituaisIrmao}
                        </span>
                      </div>
                    </div>

                    {/* Leitura da Bíblia 4 min */}
                    <div
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-0.5 px-2 rounded transition-colors ${
                        isLeituraBibliaDestacada
                          ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="w-10 font-mono text-slate-400 dark:text-slate-500 shrink-0">
                          0:00
                        </span>
                        <span>
                          3. Leitura da Bíblia ({semana.leituraBibliaTempoMin || 4} min)
                        </span>
                      </div>
                      <div className="text-right pl-13 sm:pl-0">
                        <span
                          className={`font-semibold ${
                            isLeituraBibliaDestacada
                              ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {semana.leituraBibliaIrmao}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 2. SEÇÃO: FAÇA SEU MELHOR NO MINISTÉRIO (Mostarda/Ocre)   */}
                {/* ========================================================= */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between bg-[#b48214] px-3 py-1 text-white dark:bg-amber-700">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                      FAÇA SEU MELHOR NO MINISTÉRIO
                    </span>
                    <span className="text-[11px] font-medium tracking-wide text-amber-100">
                      {semana.ministerioSalao || 'Salão principal'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {semana.partesMinisterio.map((parte) => {
                      const isDesignadoDestacado = verificarDesignacaoIrmao(
                        destacarIrmao,
                        parte.designado
                      );
                      const isAjudanteDestacado = verificarDesignacaoIrmao(
                        destacarIrmao,
                        parte.ajudante
                      );
                      const isParteDestacada =
                        isDesignadoDestacado || isAjudanteDestacado;

                      return (
                        <div
                          key={parte.id}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-0.5 px-2 rounded transition-colors ${
                            isParteDestacada
                              ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-baseline gap-3">
                            <span className="w-10 font-mono text-slate-400 dark:text-slate-500 shrink-0">
                              0:00
                            </span>
                            <span>
                              {parte.numero}. {parte.titulo} ({parte.tempoMin} min)
                            </span>
                          </div>
                          <div className="text-right pl-13 sm:pl-0">
                            <span
                              className={`font-semibold ${
                                isDesignadoDestacado
                                  ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {parte.designado}
                            </span>
                            {parte.ajudante && (
                              <>
                                <span className="text-slate-400 mx-0.5">/</span>
                                <span
                                  className={`font-semibold ${
                                    isAjudanteDestacado
                                      ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {parte.ajudante}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 3. SEÇÃO: NOSSA VIDA CRISTÃ (Bordô / Vinho)              */}
                {/* ========================================================= */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between bg-[#701a28] px-3 py-1 text-white dark:bg-rose-950">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                      NOSSA VIDA CRISTÃ
                    </span>
                    <span className="text-[11px] font-medium tracking-wide text-rose-200">
                      {/* Espaço reservado para manter alinhamento estético */}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    {/* Cântico do meio */}
                    <div className="flex items-center justify-between py-0.5 px-2">
                      <div className="flex items-center gap-3">
                        <span className="w-10 font-mono text-slate-400 dark:text-slate-500">
                          0:00
                        </span>
                        <span>&bull; Cântico {semana.canticoMeio}</span>
                      </div>
                    </div>

                    {/* Partes temáticas da Vida Cristã */}
                    {semana.partesVidaCrista.map((pvc) => {
                      const isDestacado = verificarDesignacaoIrmao(
                        destacarIrmao,
                        pvc.designado
                      );

                      return (
                        <div
                          key={pvc.id}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-0.5 px-2 rounded transition-colors ${
                            isDestacado
                              ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-semibold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-baseline gap-3">
                            <span className="w-10 font-mono text-slate-400 dark:text-slate-500 shrink-0">
                              0:00
                            </span>
                            <span>
                              {pvc.numero ? `${pvc.numero}. ` : ''}
                              {pvc.titulo}
                              {pvc.tempoMin ? ` (${pvc.tempoMin} min)` : ''}
                            </span>
                          </div>
                          <div className="text-right pl-13 sm:pl-0">
                            <span
                              className={`font-semibold ${
                                isDestacado
                                  ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {pvc.designado}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Estudo bíblico de congregação (se houver na semana) */}
                    {semana.estudoBiblicoDirigente && (
                      <div
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between py-0.5 px-2 rounded transition-colors ${
                          isEstudoDirigenteDestacado || isEstudoLeitorDestacado
                            ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="w-10 font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            0:00
                          </span>
                          <span>
                            8. Estudo bíblico de congregação ({semana.estudoBiblicoTempoMin || 30} min)
                          </span>
                        </div>
                        <div className="text-right pl-13 sm:pl-0">
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            Dirigente/leitor:{' '}
                          </span>
                          <span
                            className={`font-semibold ${
                              isEstudoDirigenteDestacado
                                ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {semana.estudoBiblicoDirigente}
                          </span>
                          {semana.estudoBiblicoLeitor && (
                            <>
                              <span className="text-slate-400 mx-0.5">/</span>
                              <span
                                className={`font-semibold ${
                                  isEstudoLeitorDestacado
                                  ? 'text-amber-900 dark:text-amber-200 underline decoration-amber-400'
                                  : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {semana.estudoBiblicoLeitor}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Comentários finais */}
                    <div className="flex items-center justify-between py-0.5 px-2">
                      <div className="flex items-center gap-3">
                        <span className="w-10 font-mono text-slate-400 dark:text-slate-500">
                          0:00
                        </span>
                        <span>
                          &bull; Comentários finais ({semana.comentariosFinaisMin || 3} min)
                        </span>
                      </div>
                    </div>

                    {/* Cântico final e oração */}
                    <div className="flex items-center justify-between py-0.5 px-2">
                      <div className="flex items-center gap-3">
                        <span className="w-10 font-mono text-slate-400 dark:text-slate-500">
                          0:00
                        </span>
                        <span>&bull; Cântico {semana.canticoFinal}</span>
                      </div>
                      <div
                        className={`transition-colors rounded-sm px-1.5 py-0.5 ${
                          isOracaoFinalDestacada
                            ? 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-900/60 dark:text-amber-100 ring-1 ring-amber-400'
                            : ''
                        }`}
                      >
                        <span className="text-slate-500 dark:text-slate-400">
                          Oração:{' '}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {semana.oracaoFinal}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé Oficial S-140-T */}
        <div className="mt-10 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-serif italic font-medium">S-140-T 11/23</span>
          <span className="font-sans">Congregação Vila Cisper - 67744</span>
        </div>
      </div>
    </div>
  );
};
