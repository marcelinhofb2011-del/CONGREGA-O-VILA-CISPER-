import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';
import {
  S140TSemana,
  getStoredS140TSemanas,
  deleteS140TSemana,
  ordenarSemanasCronologicamente,
  verificarDesignacaoIrmao,
} from '../data/s140tStorage';
import { classificarSemanaS140T } from '../utils/scheduleStatusUtils';
import { ImportarVidaMinisterioPdfModal } from '../components/ImportarVidaMinisterioPdfModal';

interface VidaEMinisterioViewProps {
  isAdmin?: boolean;
}

export const VidaEMinisterioView: React.FC<VidaEMinisterioViewProps> = ({ isAdmin = false }) => {
  const [semanas, setSemanas] = useState<S140TSemana[]>([]);
  const [semanaIdAtiva, setSemanaIdAtiva] = useState<string>('');
  const [filtroIrmao, setFiltroIrmao] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarDados = () => {
    setSemanas(getStoredS140TSemanas());
  };

  useEffect(() => {
    carregarDados();
    const handleUpdate = () => carregarDados();
    window.addEventListener('s140t-firebase-updated', handleUpdate);
    return () => window.removeEventListener('s140t-firebase-updated', handleUpdate);
  }, []);

  // Semanas ordenadas cronologicamente
  const semanasOrdenadas = useMemo(() => {
    return ordenarSemanasCronologicamente(semanas);
  }, [semanas]);

  // Identifica o índice da semana atual da congregação (ou a próxima futura)
  const proximoIndex = useMemo(() => {
    if (semanasOrdenadas.length === 0) return -1;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 1. Procura semana com situação 'atual' (esta semana)
    const idxAtual = semanasOrdenadas.findIndex((sem) => {
      const situacao = classificarSemanaS140T(sem, hoje);
      return situacao === 'atual';
    });
    if (idxAtual !== -1) return idxAtual;

    // 2. Se não houver atual exata, procura primeira futura
    const idxFutura = semanasOrdenadas.findIndex((sem) => {
      const situacao = classificarSemanaS140T(sem, hoje);
      return situacao === 'futura';
    });
    if (idxFutura !== -1) return idxFutura;

    // 3. Fallback: última semana registrada
    return semanasOrdenadas.length - 1;
  }, [semanasOrdenadas]);

  // Ao carregar ou atualizar lista, seleciona automaticamente a semana atual
  useEffect(() => {
    if (semanasOrdenadas.length > 0) {
      setSemanaIdAtiva((prev) => {
        if (!prev || !semanasOrdenadas.some((s) => s.id === prev)) {
          return proximoIndex !== -1
            ? semanasOrdenadas[proximoIndex].id
            : semanasOrdenadas[semanasOrdenadas.length - 1].id;
        }
        return prev;
      });
    }
  }, [semanasOrdenadas, proximoIndex]);

  // Semana selecionada para exibição em vista
  const semanaAtiva = useMemo(() => {
    if (semanasOrdenadas.length === 0) return null;
    const encontrada = semanasOrdenadas.find((s) => s.id === semanaIdAtiva);
    if (encontrada) return encontrada;
    return proximoIndex !== -1 ? semanasOrdenadas[proximoIndex] : semanasOrdenadas[0];
  }, [semanasOrdenadas, semanaIdAtiva, proximoIndex]);

  // Índice para navegação anterior / próxima
  const indiceSemanaAtual = useMemo(() => {
    if (!semanaAtiva) return -1;
    return semanasOrdenadas.findIndex((s) => s.id === semanaAtiva.id);
  }, [semanasOrdenadas, semanaAtiva]);

  const handleSemanaAnterior = () => {
    if (indiceSemanaAtual > 0) {
      setSemanaIdAtiva(semanasOrdenadas[indiceSemanaAtual - 1].id);
    }
  };

  const handleProximaSemana = () => {
    if (indiceSemanaAtual < semanasOrdenadas.length - 1) {
      setSemanaIdAtiva(semanasOrdenadas[indiceSemanaAtual + 1].id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover esta semana do programa S-140-T?')) {
      deleteS140TSemana(id);
    }
  };

  // Semanas em que o irmão pesquisado possui designações
  const semanasComIrmao = useMemo(() => {
    if (!filtroIrmao.trim()) return [];
    const termo = filtroIrmao.trim();
    return semanasOrdenadas.filter((s) => {
      const matchPres = verificarDesignacaoIrmao(termo, s.presidente);
      const matchOrIni = verificarDesignacaoIrmao(termo, s.oracaoInicial);
      const matchOrFim = verificarDesignacaoIrmao(termo, s.oracaoFinal);
      const matchTes = verificarDesignacaoIrmao(termo, s.discursoTesourosIrmao);
      const matchJoi = verificarDesignacaoIrmao(termo, s.joiasEspirituaisIrmao);
      const matchLei = verificarDesignacaoIrmao(termo, s.leituraBibliaIrmao);
      const matchEstDir = verificarDesignacaoIrmao(termo, s.estudoBiblicoDirigente);
      const matchEstLei = verificarDesignacaoIrmao(termo, s.estudoBiblicoLeitor);
      const matchMin = s.partesMinisterio?.some(
        (p) => verificarDesignacaoIrmao(termo, p.designado) || verificarDesignacaoIrmao(termo, p.ajudante)
      );
      const matchVc = s.partesVidaCrista?.some((p) => verificarDesignacaoIrmao(termo, p.designado));
      return matchPres || matchOrIni || matchOrFim || matchTes || matchJoi || matchLei || matchEstDir || matchEstLei || matchMin || matchVc;
    });
  }, [semanasOrdenadas, filtroIrmao]);

  return (
    <div className="w-full space-y-6 pb-16 pt-1">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Nossa Vida e Ministério Cristão
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Programação oficial da Reunião de Meio de Semana (S-140-T)
          </p>
        </div>

        {/* Botão de Importação do Programa S-140-T */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-importar-pdf-s140t"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-sky-800 active:scale-[0.98] transition cursor-pointer"
            title="Importar programa oficial de Nossa Vida e Ministério via PDF (S-140-T)"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Importar PDF (S-140-T)</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`rounded-xl p-3 text-xs sm:text-sm font-bold flex items-center gap-2 ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* Busca Rápida de Irmão (Opcional) */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={filtroIrmao}
            onChange={(e) => setFiltroIrmao(e.target.value)}
            placeholder="Consultar designações de um irmão em Vida e Ministério..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-8 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {filtroIrmao && (
            <button
              type="button"
              onClick={() => setFiltroIrmao('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Atalhos para semanas em que o irmão consta */}
        {filtroIrmao.trim() && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs dark:border-sky-900 dark:bg-sky-950/40">
            <span className="font-bold text-sky-900 dark:text-sky-200">
              Semanas com "{filtroIrmao.trim()}":{' '}
            </span>
            {semanasComIrmao.length === 0 ? (
              <span className="text-slate-500 dark:text-slate-400 ml-1">Nenhuma designação localizada</span>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {semanasComIrmao.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSemanaIdAtiva(s.id)}
                    className={`rounded-lg px-2 py-1 text-xs font-bold transition cursor-pointer ${
                      semanaAtiva?.id === s.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-white text-sky-800 border border-sky-300 hover:bg-sky-100 dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700'
                    }`}
                  >
                    {s.periodo}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SELETOR INTEGRADO DA SEMANA (PADRÃO CONGREGACIONAL)           */}
      {/* ------------------------------------------------------------- */}
      {semanasOrdenadas.length > 0 && semanaAtiva ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSemanaAnterior}
                disabled={indiceSemanaAtual <= 0}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleProximaSemana}
                disabled={indiceSemanaAtual >= semanasOrdenadas.length - 1}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Próxima semana"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
              <div className="ml-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Semana selecionada:
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{semanaAtiva.periodo}</span>
                  {indiceSemanaAtual === proximoIndex && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Semana Atual
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown direto para escolher a semana */}
            <div className="flex items-center gap-2">
              <select
                value={semanaAtiva.id}
                onChange={(e) => setSemanaIdAtiva(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-xs cursor-pointer"
              >
                {semanasOrdenadas.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    {item.periodo} {idx === proximoIndex ? '(Semana Atual)' : ''}
                  </option>
                ))}
              </select>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(semanaAtiva.id)}
                  className="rounded-lg border border-slate-300 bg-white p-1.5 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 cursor-pointer"
                  title="Excluir semana do programa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* QUADRO COMPLETO DA SEMANA SELECIONADA - CONTÍNUO E SEM BORDAS LATERAIS */}
          <div className="w-full space-y-6">
            {/* Header da Semana */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-sky-200 dark:border-sky-900/60 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {semanaAtiva.periodo}
                  </span>
                  {indiceSemanaAtual === proximoIndex && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Semana Atual
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  {semanaAtiva.leituraBiblica && (
                    <span>
                      Leitura: <strong className="text-slate-900 dark:text-slate-200">{semanaAtiva.leituraBiblica}</strong>
                    </span>
                  )}
                  {semanaAtiva.leituraBiblica && semanaAtiva.presidente && <span>•</span>}
                  {semanaAtiva.presidente && (
                    <span>
                      Presidente: <strong className="text-slate-900 dark:text-slate-200">{semanaAtiva.presidente}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Conteúdo Completo da Semana */}
            <div className="space-y-6">
              {/* Seção 1: Introdução */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cântico Inicial</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{semanaAtiva.canticoInicial || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Oração Inicial</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{semanaAtiva.oracaoInicial || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Presidente</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{semanaAtiva.presidente || '—'}</span>
                </div>
              </div>

              {/* Seção 2: Tesouros da Palavra de Deus */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-200 pb-1.5 dark:border-amber-900/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Tesouros da Palavra de Deus
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  {semanaAtiva.discursoTesourosTitulo && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-amber-50/60 p-3 dark:bg-amber-950/20 gap-1 border border-amber-100 dark:border-amber-900/30">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {semanaAtiva.discursoTesourosTitulo} (10 min)
                      </span>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">
                        {semanaAtiva.discursoTesourosIrmao || '—'}
                      </span>
                    </div>
                  )}
                  {semanaAtiva.joiasEspirituaisIrmao && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-amber-50/60 p-3 dark:bg-amber-950/20 gap-1 border border-amber-100 dark:border-amber-900/30">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Encontre Joias Espirituais (10 min)
                      </span>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">
                        {semanaAtiva.joiasEspirituaisIrmao}
                      </span>
                    </div>
                  )}
                  {semanaAtiva.leituraBibliaIrmao && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-amber-50/60 p-3 dark:bg-amber-950/20 gap-1 border border-amber-100 dark:border-amber-900/30">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Leitura da Bíblia (4 min)
                      </span>
                      <span className="font-extrabold text-amber-800 dark:text-amber-300">
                        {semanaAtiva.leituraBibliaIrmao}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção 3: Faça Seu Melhor no Ministério */}
              {semanaAtiva.partesMinisterio && semanaAtiva.partesMinisterio.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-amber-500/30 pb-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                      Faça Seu Melhor no Ministério
                    </h4>
                  </div>
                  <div className="space-y-2 text-xs">
                    {semanaAtiva.partesMinisterio.map((parte) => (
                      <div
                        key={parte.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-amber-50/40 p-3 dark:bg-amber-950/15 gap-1.5 border border-amber-100/80 dark:border-amber-900/20"
                      >
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {parte.titulo} ({parte.tempoMin} min)
                        </span>
                        <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                          <span>{parte.designado}</span>
                          {parte.ajudante && (
                            <span className="text-slate-500 font-semibold dark:text-slate-400"> / {parte.ajudante}</span>
                          )}
                          {parte.salao && (
                            <span className="ml-2 text-[10px] font-normal text-slate-500">({parte.salao})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção 4: Nossa Vida Cristã */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-rose-200 pb-1.5 dark:border-rose-900/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                    Nossa Vida Cristã
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  {semanaAtiva.canticoMeio && (
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800">
                      Cântico intermediário: <strong className="text-slate-900 dark:text-slate-100 text-sm ml-1">{semanaAtiva.canticoMeio}</strong>
                    </div>
                  )}
                  {semanaAtiva.partesVidaCrista?.map((parte) => (
                    <div
                      key={parte.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-rose-50/50 p-3 dark:bg-rose-950/20 gap-1 border border-rose-100 dark:border-rose-900/30"
                    >
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {parte.titulo} {parte.tempoMin ? `(${parte.tempoMin} min)` : ''}
                      </span>
                      <span className="font-extrabold text-rose-800 dark:text-rose-300">
                        {parte.designado}
                      </span>
                    </div>
                  ))}
                  {semanaAtiva.estudoBiblicoDirigente && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-rose-50/70 p-3 dark:bg-rose-950/30 gap-1.5 border border-rose-200/80 dark:border-rose-900/40">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Estudo Bíblico de Congregação (30 min)
                      </span>
                      <div className="text-xs font-extrabold text-rose-800 dark:text-rose-300">
                        <span>Dirigente: {semanaAtiva.estudoBiblicoDirigente}</span>
                        {semanaAtiva.estudoBiblicoLeitor && (
                          <span className="ml-2">| Leitor: {semanaAtiva.estudoBiblicoLeitor}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Cântico Final</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">{semanaAtiva.canticoFinal || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Oração Final</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">{semanaAtiva.oracaoFinal || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <Calendar className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma semana cadastrada no momento.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Utilize o botão "Importar PDF (S-140-T)" acima para cadastrar o programa oficial.
          </p>
        </div>
      )}

      {/* Modal de Importação S-140-T PDF */}
      <ImportarVidaMinisterioPdfModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSucesso={(count) => {
          carregarDados();
          setFeedbackMsg({
            tipo: 'sucesso',
            texto: `${count} semana(s) de Vida e Ministério importada(s) com sucesso!`,
          });
          setTimeout(() => setFeedbackMsg(null), 3500);
        }}
      />
    </div>
  );
};
