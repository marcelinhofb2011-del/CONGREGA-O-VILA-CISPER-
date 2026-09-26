import React, { useState, useEffect, useMemo } from 'react';
import {
  S140TSemana,
  getStoredS140TSemanas,
  saveS140TSemana,
  deleteS140TSemana,
  getSemanaAtualId,
} from '../data/s140tStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import { VidaEMinisterioEditorModal } from '../components/VidaEMinisterioEditorModal';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Compass,
  Heart,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Gem,
  Wheat,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';
import { ImportarVidaMinisterioPdfModal } from '../components/ImportarVidaMinisterioPdfModal';

// Ícone de carneirinho personalizado no padrão Lucide para Nossa Vida Cristã
const CarneirinhoIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Corpo de lã fofinho do carneirinho */}
    <path d="M8.5 16.5A3 3 0 0 1 6 14a2.8 2.8 0 0 1 .5-1.6 3 3 0 0 1-.2-3.4 3 3 0 0 1 2.7-1.5c.3 0 .6.05.9.15A3.2 3.2 0 0 1 13 6.5a3.2 3.2 0 0 1 2.8 1.6 3 3 0 0 1 2.2 2.9c0 .7-.2 1.3-.6 1.8a2.8 2.8 0 0 1 .6 1.7 3 3 0 0 1-2.5 2.5" />
    {/* Cabeça do carneirinho */}
    <path d="M16 11.5c0-1.8 1.2-2.8 2.5-2.8s2.5 1 2.5 2.8c0 1.5-1 2.5-2.5 2.5s-2.5-1-2.5-2.5Z" />
    {/* Orelhas */}
    <path d="M16.5 10c-.8-.5-1.5-.2-1.5.5M20.5 10c.8-.5 1.5-.2 1.5.5" />
    {/* Patinhas */}
    <path d="M9 16.5v3M11.5 16.5v3M14 16.5v3M16.5 16.5v3" />
  </svg>
);

export const VidaEMinisterioView: React.FC = () => {
  const [semanas, setSemanas] = useState<S140TSemana[]>([]);
  const [semanaIdAtiva, setSemanaIdAtiva] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Autenticação do Irmão Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [semanaParaEditar, setSemanaParaEditar] = useState<S140TSemana | null>(null);

  // Mensagens de feedback
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Confirmação de exclusão
  const [semanaParaExcluir, setSemanaParaExcluir] = useState<string | null>(null);

  // Carregar semanas e estado de autenticação
  // Ao entrar ou retornar à aba, SEMPRE posiciona automaticamente na programação da semana atual
  const carregarDados = (novoIdDesejado?: string) => {
    const lista = getStoredS140TSemanas();
    setSemanas(lista);
    if (novoIdDesejado && lista.some((s) => s.id === novoIdDesejado)) {
      setSemanaIdAtiva(novoIdDesejado);
    } else if (lista.length > 0) {
      const atualId = getSemanaAtualId(lista);
      setSemanaIdAtiva(atualId || lista[0].id);
    }
  };

  useEffect(() => {
    carregarDados();
    setIsAdmin(isAdminAuthenticated());

    const handleFirebaseUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<S140TSemana[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        const novas = customEvent.detail;
        setSemanas(novas);
        if (novas.length > 0) {
          setSemanaIdAtiva((prev) => {
            if (!prev || !novas.some((s) => s.id === prev)) {
              return getSemanaAtualId(novas) || novas[0].id;
            }
            return prev;
          });
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vila_cisper_programacao_s140t') {
        carregarDados();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lista = getStoredS140TSemanas();
        setSemanas(lista);
        const atualId = getSemanaAtualId(lista);
        if (atualId) {
          setSemanaIdAtiva(atualId);
        }
      }
    };

    window.addEventListener('s140t-firebase-updated', handleFirebaseUpdate);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('s140t-firebase-updated', handleFirebaseUpdate);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Semana ativa
  const semanaAtual = useMemo(() => {
    if (semanas.length === 0) return null;
    const encontrada = semanas.find((s) => s.id === semanaIdAtiva);
    return encontrada || semanas[0];
  }, [semanas, semanaIdAtiva]);

  // ID da semana atual real calculada cronologicamente
  const idSemanaAtualReal = useMemo(() => {
    return getSemanaAtualId(semanas);
  }, [semanas]);

  // Índice da semana ativa para navegação anterior / próxima
  const indiceSemanaAtual = useMemo(() => {
    if (!semanaAtual) return -1;
    return semanas.findIndex((s) => s.id === semanaAtual.id);
  }, [semanas, semanaAtual]);

  const handleProximaSemana = () => {
    if (indiceSemanaAtual < semanas.length - 1) {
      setSemanaIdAtiva(semanas[indiceSemanaAtual + 1].id);
    }
  };

  const handleSemanaAnterior = () => {
    if (indiceSemanaAtual > 0) {
      setSemanaIdAtiva(semanas[indiceSemanaAtual - 1].id);
    }
  };

  // Autenticação de Responsável
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setPasswordInput('');
      setAuthError('');
      setFeedback({ tipo: 'sucesso', texto: 'Modo de responsável ativado com sucesso.' });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setAuthError('Senha incorreta. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setFeedback({ tipo: 'sucesso', texto: 'Você saiu do modo de responsável.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Abrir Modal para Cadastro
  const handleNovoCadastro = () => {
    setSemanaParaEditar(null);
    setIsEditorOpen(true);
  };

  // Abrir Modal para Edição
  const handleEditar = (semana: S140TSemana) => {
    setSemanaParaEditar(semana);
    setIsEditorOpen(true);
  };

  // Salvar Programação
  const handleSalvarSemana = (semana: S140TSemana) => {
    const res = saveS140TSemana(semana);
    if (res.success && res.data) {
      setSemanas(res.data);
      setSemanaIdAtiva(semana.id);
      setIsEditorOpen(false);
      setFeedback({ tipo: 'sucesso', texto: 'Programação salva com sucesso.' });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ tipo: 'erro', texto: res.error || 'Erro ao salvar a programação.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Excluir Programação
  const handleConfirmarExclusao = () => {
    if (!semanaParaExcluir) return;
    const res = deleteS140TSemana(semanaParaExcluir);
    if (res.success && res.data) {
      setSemanas(res.data);
      if (res.data.length > 0) {
        setSemanaIdAtiva(getSemanaAtualId(res.data) || res.data[0].id);
      } else {
        setSemanaIdAtiva('');
      }
      setSemanaParaExcluir(null);
      setFeedback({ tipo: 'sucesso', texto: 'Programação excluída com sucesso.' });
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ tipo: 'erro', texto: res.error || 'Erro ao excluir a programação.' });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16 pt-2">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DO MÓDULO                                           */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              Vida e Ministério
            </h1>
          </div>

          {/* Botões do Responsável */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-importar-pdf-vida-ministerio"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-600 bg-red-600 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-red-700 transition"
                  title="Importar documento PDF oficial da programação (S-140-T)"
                >
                  <FileText className="h-4 w-4" />
                  <span>IMPORTAR PDF</span>
                </button>
                <button
                  type="button"
                  id="btn-importar-planilha-vida-ministerio"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Importar planilha de Vida e Ministério"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>PLANILHA</span>
                </button>
                <button
                  type="button"
                  onClick={handleNovoCadastro}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Programação</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  title="Sair do modo responsável"
                >
                  <Unlock className="h-3.5 w-3.5 text-green-600" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPasswordInput('');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Responsável</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl p-3.5 text-sm font-bold ${
              feedback.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            {feedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.texto}</span>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SELETOR DA SEMANA DA REUNIÃO (AUTOMATIZADO NA SEMANA ATUAL)   */}
      {/* ------------------------------------------------------------- */}
      {semanas.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSemanaAnterior}
              disabled={indiceSemanaAtual <= 0}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleProximaSemana}
              disabled={indiceSemanaAtual >= semanas.length - 1}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Próxima semana"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="ml-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Semana selecionada:
                </span>
                {semanaAtual?.id === idSemanaAtualReal && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Semana Atual
                  </span>
                )}
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {semanaAtual?.dataReuniao || semanaAtual?.periodo}
              </div>
            </div>
          </div>

          {/* Dropdown direto para escolher a semana e botão de retorno */}
          <div className="flex flex-wrap items-center gap-2">
            {semanaAtual?.id !== idSemanaAtualReal && idSemanaAtualReal && (
              <button
                type="button"
                onClick={() => setSemanaIdAtiva(idSemanaAtualReal)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 transition shadow-2xs"
                title="Voltar para a programação da semana atual"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Semana Atual</span>
              </button>
            )}

            <select
              value={semanaAtual?.id}
              onChange={(e) => setSemanaIdAtiva(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {semanas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === idSemanaAtualReal
                    ? `★ ${s.dataReuniao || s.periodo} (Semana Atual)`
                    : (s.dataReuniao || s.periodo)}
                </option>
              ))}
            </select>

            {/* Ações administrativas para a semana selecionada */}
            {isAdmin && semanaAtual && (
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => handleEditar(semanaAtual)}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-blue-700 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400"
                  title="Editar programação"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSemanaParaExcluir(semanaAtual.id)}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
                  title="Excluir programação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* ÁREA PÚBLICA DE VISUALIZAÇÃO DA PROGRAMAÇÃO (PÁGINA CONTÍNUA) */}
      {/* ------------------------------------------------------------- */}
      {semanaAtual ? (
        <div className="w-full rounded-3xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
          {/* 1. CABEÇALHO INTEGRADO DA SEMANA */}
          <div className="bg-slate-50/70 p-5 sm:p-7 dark:bg-slate-900/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3.5 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Programação da Reunião
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  {semanaAtual.dataReuniao || semanaAtual.periodo}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {semanaAtual.leituraBiblica && (
                  <span className="rounded-xl bg-slate-200/90 px-3 py-1.5 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {semanaAtual.leituraBiblica}
                  </span>
                )}
                {semanaAtual.ehVisita && (
                  <span className="rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300 uppercase tracking-wider">
                    Visita do Superintendente
                  </span>
                )}
              </div>
            </div>

            {/* Presidência e Orações Integradas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm sm:text-base">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Presidente
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.presidente || '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cântico Inicial
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.canticoInicial ? `Cântico ${semanaAtual.canticoInicial}` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Oração Inicial
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.oracaoInicial || '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Oração Final
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.oracaoFinal || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. TESOUROS DA PALAVRA DE DEUS (INTEGRADO) */}
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-emerald-600 pb-2.5 dark:border-emerald-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white dark:bg-emerald-600 shadow-2xs">
                <Gem className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                TESOUROS DA PALAVRA DE DEUS
              </h3>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Discurso de 10 min */}
              <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Discurso (10 min)
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {semanaAtual.discursoTesourosTitulo || 'Discurso Temático'}
                  </div>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 sm:text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">Irmão: </span>
                  {semanaAtual.discursoTesourosIrmao || '—'}
                </div>
              </div>

              {/* Joias Espirituais */}
              <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Joias Espirituais (10 min)
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {semanaAtual.joiasEspirituaisTitulo || 'Encontre Joias Espirituais'}
                  </div>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 sm:text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">Irmão: </span>
                  {semanaAtual.joiasEspirituaisIrmao || '—'}
                </div>
              </div>

              {/* Leitura da Bíblia */}
              <div className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Leitura da Bíblia (4 min)
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    {semanaAtual.leituraBiblica || 'Leitura designada'}
                  </div>
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 sm:text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">Estudante: </span>
                  {semanaAtual.leituraBibliaIrmao || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. FAÇA SEU MELHOR NO MINISTÉRIO (INTEGRADO) */}
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-2.5 dark:border-amber-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white dark:bg-amber-500 shadow-2xs">
                <Wheat className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                FAÇA SEU MELHOR NO MINISTÉRIO
              </h3>
            </div>

            {semanaAtual.partesMinisterio && semanaAtual.partesMinisterio.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {semanaAtual.partesMinisterio.map((parte, idx) => (
                  <div
                    key={parte.id || idx}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          {parte.numero ? `${parte.numero}. ` : ''}{parte.titulo || `Parte ${idx + 1}`}
                        </span>
                        {parte.tempoMin && (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {parte.tempoMin} min
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm sm:text-base">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Estudante:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {parte.designado || '—'}
                        </span>
                      </div>
                      {parte.ajudante && (
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Ajudante:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {parte.ajudante}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
                Nenhuma designação de estudante cadastrada para esta semana.
              </p>
            )}
          </div>

          {/* 4. NOSSA VIDA CRISTÃ (INTEGRADO COM ESTUDO BÍBLICO) */}
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-red-600 pb-2.5 dark:border-red-500">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white dark:bg-red-600 shadow-2xs">
                  <CarneirinhoIcon className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  NOSSA VIDA CRISTÃ
                </h3>
              </div>
              {semanaAtual.canticoMeio && (
                <span className="text-xs font-bold text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-md">
                  Cântico {semanaAtual.canticoMeio}
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {/* Partes de Nossa Vida Cristã */}
              {semanaAtual.partesVidaCrista && semanaAtual.partesVidaCrista.length > 0 ? (
                semanaAtual.partesVidaCrista.map((parte, idx) => (
                  <div
                    key={parte.id || idx}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <div className="space-y-0.5">
                      <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        {parte.titulo || `Parte ${idx + 1}`}
                      </div>
                      {parte.tempoMin && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {parte.tempoMin} min
                        </span>
                      )}
                    </div>
                    <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 sm:text-right">
                      <span className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">Irmão: </span>
                      {parte.designado || '—'}
                    </div>
                  </div>
                ))
              ) : null}

              {/* Estudo Bíblico de Congregação integrado na sequência */}
              <div className="py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                  <span className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Estudo Bíblico de Congregação (30 min)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-baseline gap-2 text-sm sm:text-base">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Dirigente:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {semanaAtual.estudoBiblicoDirigente || '—'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 text-sm sm:text-base">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Leitor:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {semanaAtual.estudoBiblicoLeitor || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conclusão da Reunião integrada */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Cântico Final:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {semanaAtual.canticoFinal ? `Cântico ${semanaAtual.canticoFinal}` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Oração Final:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {semanaAtual.oracaoFinal || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="text-base font-bold">Nenhuma programação cadastrada no momento.</p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleNovoCadastro}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeira Programação</span>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL                          */}
      {/* ------------------------------------------------------------- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Acesso do Responsável
              </h3>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              {authError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Senha do Responsável
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Digite a senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                              */}
      {/* ------------------------------------------------------------- */}
      {semanaParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tem certeza de que deseja excluir a programação desta semana? Esta ação não poderá ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSemanaParaExcluir(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE EDIÇÃO / CADASTRO DA PROGRAMAÇÃO                     */}
      {/* ------------------------------------------------------------- */}
      <VidaEMinisterioEditorModal
        isOpen={isEditorOpen}
        semana={semanaParaEditar}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSalvarSemana}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE IMPORTAÇÃO DE DOCUMENTO PDF OFICIAL (S-140-T)       */}
      {/* ------------------------------------------------------------- */}
      <ImportarVidaMinisterioPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onSucesso={(count) => {
          const lista = getStoredS140TSemanas();
          setSemanas(lista);
          if (lista.length > 0) {
            // Define a visualização na última semana adicionada ou primeira
            setSemanaIdAtiva(lista[lista.length - 1].id);
          }
          setFeedback({
            tipo: 'sucesso',
            texto: `${count} semanas importadas do PDF com sucesso! Meses anteriores mantidos em perfeita continuidade.`,
          });
          setTimeout(() => setFeedback(null), 4500);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE IMPORTAÇÃO DE PLANILHA TRIMESTRAL                   */}
      {/* ------------------------------------------------------------- */}
      <ImportarPlanilhaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        modulo="vida-ministerio"
        onImportadoComSucesso={(_total, _meses) => {
          const lista = getStoredS140TSemanas();
          setSemanas(lista);
          if (lista.length > 0) {
            setSemanaIdAtiva(lista[0].id);
          }
        }}
      />
    </div>
  );
};
