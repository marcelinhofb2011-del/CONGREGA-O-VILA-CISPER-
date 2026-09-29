import React, { useState, useEffect, useMemo } from 'react';
import {
  S140TSemana,
  getStoredS140TSemanas,
  saveS140TSemana,
  deleteS140TSemana,
  identificarSemanaMaisProxima,
  ordenarSemanasCronologicamente,
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
  Clock,
  Gem,
  Wheat,
  Music,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';

// Ícone de carneirinho adaptável no padrão Lucide (stroke 2, 24x24)
const CarneirinhoIcon: React.FC<{ className?: string }> = ({ className = 'h-4.5 w-4.5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Corpo com lã do carneirinho */}
    <path d="M19 12a3.5 3.5 0 0 0-3.5-3.5h-.5a3 3 0 0 0-3-2.5 3 3 0 0 0-3 2.5 3.5 3.5 0 0 0-3.5 3.5 3.5 3.5 0 0 0 3.5 3.5h6.5A3.5 3.5 0 0 0 19 12z" />
    {/* Patinhas */}
    <path d="M8 15.5V19" />
    <path d="M11 15.5V19" />
    <path d="M14 15.5V19" />
    <path d="M16.5 15.5V19" />
    {/* Cabeça */}
    <circle cx="5" cy="11.5" r="2" />
    {/* Orelhinha */}
    <path d="M4.5 9.5c-.8-.3-1.5.3-1.2 1.2" />
  </svg>
);

export const VidaEMinisterioView: React.FC = () => {
  const [semanas, setSemanas] = useState<S140TSemana[]>([]);
  const [semanaIdAtiva, setSemanaIdAtiva] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

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

  // Carregar semanas organizadas e selecionar automaticamente a semana mais próxima ao abrir
  const carregarDados = (novoIdDesejado?: string) => {
    const lista = getStoredS140TSemanas();
    setSemanas(lista);
    if (novoIdDesejado && lista.some((s) => s.id === novoIdDesejado)) {
      setSemanaIdAtiva(novoIdDesejado);
    } else if (lista.length > 0) {
      const maisProxima = identificarSemanaMaisProxima(lista);
      setSemanaIdAtiva((prev) => {
        // Ao abrir a aba (!prev) ou se a semana selecionada anteriormente não existe mais:
        if (!prev || !lista.some((s) => s.id === prev)) {
          return maisProxima ? maisProxima.id : lista[0].id;
        }
        return prev;
      });
    }
  };

  useEffect(() => {
    carregarDados();
    setIsAdmin(isAdminAuthenticated());

    const handleFirebaseUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<S140TSemana[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        const novas = ordenarSemanasCronologicamente(customEvent.detail);
        setSemanas(novas);
        if (novas.length > 0) {
          const maisProxima = identificarSemanaMaisProxima(novas);
          setSemanaIdAtiva((prev) => {
            if (!prev || !novas.some((s) => s.id === prev)) {
              return maisProxima ? maisProxima.id : novas[0].id;
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

    window.addEventListener('s140t-firebase-updated', handleFirebaseUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('s140t-firebase-updated', handleFirebaseUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Semana mais próxima com base na data atual
  const semanaMaisProxima = useMemo(() => {
    return identificarSemanaMaisProxima(semanas);
  }, [semanas]);

  // Semana ativa (com fallback prioritário para a semana mais próxima)
  const semanaAtual = useMemo(() => {
    if (semanas.length === 0) return null;
    const encontrada = semanas.find((s) => s.id === semanaIdAtiva);
    if (encontrada) return encontrada;
    return semanaMaisProxima || semanas[0];
  }, [semanas, semanaIdAtiva, semanaMaisProxima]);

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
      const ordenadas = ordenarSemanasCronologicamente(res.data);
      setSemanas(ordenadas);
      if (ordenadas.length > 0) {
        const prox = identificarSemanaMaisProxima(ordenadas);
        setSemanaIdAtiva(prox ? prox.id : ordenadas[0].id);
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
    <div className="w-full space-y-8 pb-16 pt-2">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DO MÓDULO                                           */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white">
              Vida e Ministério
            </h1>
          </div>

          {/* Botões do Responsável */}
          <div className="flex items-center gap-1.5">
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  id="btn-importar-pdf-vida-ministerio"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 transition"
                  title="Importar programação oficial via PDF"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Importar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleNovoCadastro}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 transition"
                  title="Cadastrar nova programação"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Cadastrar</span>
                </button>

                {semanaAtual && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditar(semanaAtual)}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300 transition"
                      title="Editar a programação da semana selecionada"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSemanaParaExcluir(semanaAtual.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300 transition"
                      title="Excluir a programação da semana selecionada"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Excluir</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                  title="Sair do modo responsável"
                >
                  <Unlock className="h-3 w-3 text-green-600" />
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 transition"
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
            className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs sm:text-sm font-semibold ${
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
      {/* NAVEGAÇÃO ENTRE SEMANAS (CONTROLE LIMPO E SEM REPETIÇÕES)     */}
      {/* ------------------------------------------------------------- */}
      {semanas.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-1.5 flex-1 w-full">
            <button
              type="button"
              onClick={handleSemanaAnterior}
              disabled={indiceSemanaAtual <= 0}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 transition"
              aria-label="Semana anterior"
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <select
              id="select-semana-vida-ministerio"
              value={semanaAtual?.id}
              onChange={(e) => setSemanaIdAtiva(e.target.value)}
              className="flex-1 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {semanas.map((s) => {
                const ehProxima = s.id === semanaMaisProxima?.id;
                return (
                  <option key={s.id} value={s.id}>
                    {ehProxima ? '★ ' : ''}
                    {s.dataReuniao || s.periodo}
                    {ehProxima ? ' (Mais próxima)' : ''}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={handleProximaSemana}
              disabled={indiceSemanaAtual >= semanas.length - 1}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 transition"
              aria-label="Próxima semana"
              title="Próxima semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {semanaMaisProxima && semanaAtual?.id !== semanaMaisProxima.id && (
            <button
              type="button"
              onClick={() => setSemanaIdAtiva(semanaMaisProxima.id)}
              className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 transition"
              title="Voltar para a programação da semana mais próxima"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Semana Mais Próxima</span>
            </button>
          )}
        </div>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* ÁREA PÚBLICA DE VISUALIZAÇÃO DA PROGRAMAÇÃO                   */}
      {/* ------------------------------------------------------------- */}
      {semanaAtual ? (
        <article className="w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 lg:p-10 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-8">
          {/* 1. DADOS DA REUNIÃO DA SEMANA (DESTAQUE PRINCIPAL E EXCLUSIVO) */}
          <section className="space-y-4">
            <div className="border-b border-slate-200 pb-4 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Programação da Reunião
                </span>
                <h2 className="text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
                  {semanaAtual.dataReuniao || semanaAtual.periodo}
                </h2>
              </div>

              {semanaAtual.id === semanaMaisProxima?.id && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Clock className="h-3.5 w-3.5" />
                  Mais Próxima
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-1 text-base">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Presidente
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.presidente || '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cântico Inicial
                </span>
                <span className="inline-flex items-center gap-1.5 text-base sm:text-lg font-extrabold text-blue-700 dark:text-blue-400">
                  <Music className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  {semanaAtual.canticoInicial ? `Cântico ${semanaAtual.canticoInicial}` : '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Oração Inicial
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.oracaoInicial || '—'}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Leitura Bíblica
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.leituraBiblica || '—'}
                </span>
              </div>
            </div>
          </section>

          {/* 2. TESOUROS DA PALAVRA DE DEUS */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-3 border-b-2 border-emerald-600 pb-3 dark:border-emerald-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs dark:bg-emerald-600 dark:text-white">
                <Gem className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-300 sm:text-xl">
                TESOUROS DA PALAVRA DE DEUS
              </h3>
            </div>

            <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-base sm:text-lg">
              {/* Discurso de 10 min */}
              <li className="py-3.5 space-y-1">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.discursoTesourosTitulo || 'Discurso Temático'}
                </div>
                <div className="flex items-baseline gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Irmão responsável:</span>
                  <span className="font-bold">{semanaAtual.discursoTesourosIrmao || '—'}</span>
                </div>
              </li>

              {/* Joias Espirituais */}
              <li className="py-3.5 space-y-1">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.joiasEspirituaisTitulo || 'Joias espirituais'}
                </div>
                <div className="flex items-baseline gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Irmão responsável:</span>
                  <span className="font-bold">{semanaAtual.joiasEspirituaisIrmao || '—'}</span>
                </div>
              </li>

              {/* Leitura da Bíblia */}
              <li className="py-3.5 flex flex-wrap items-baseline gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">Leitura da Bíblia:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.leituraBibliaIrmao || '—'}
                </span>
              </li>
            </ul>
          </section>

          {/* 3. FAÇA SEU MELHOR NO MINISTÉRIO */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-3 border-b-2 border-amber-500 pb-3 dark:border-amber-400">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-amber-950 shadow-2xs dark:bg-amber-400 dark:text-amber-950">
                <Wheat className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 sm:text-xl">
                FAÇA SEU MELHOR NO MINISTÉRIO
              </h3>
            </div>

            {semanaAtual.partesMinisterio && semanaAtual.partesMinisterio.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-base sm:text-lg">
                {semanaAtual.partesMinisterio.map((parte, idx) => (
                  <li
                    key={parte.id || idx}
                    className="py-3.5 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {parte.titulo || `Parte ${idx + 1}`}
                      </span>
                      {parte.tempoMin && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {parte.tempoMin} min
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm sm:text-base">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Estudante:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {parte.designado || '—'}
                        </span>
                      </div>
                      {parte.ajudante && (
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">Ajudante:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {parte.ajudante}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
                Nenhuma designação de estudante cadastrada para esta semana.
              </p>
            )}
          </section>

          {/* CÂNTICO DO MEIO */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                <Music className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cântico do Meio
                </span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.canticoMeio ? `Cântico ${semanaAtual.canticoMeio}` : 'Cântico —'}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
              Transição para Nossa Vida Cristã
            </span>
          </div>

          {/* 4. NOSSA VIDA CRISTÃ */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-3 border-b-2 border-red-600 pb-3 dark:border-red-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-2xs dark:bg-red-600 dark:text-white">
                <CarneirinhoIcon className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-red-950 dark:text-red-300 sm:text-xl">
                NOSSA VIDA CRISTÃ
              </h3>
            </div>

            {semanaAtual.partesVidaCrista && semanaAtual.partesVidaCrista.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-base sm:text-lg">
                {semanaAtual.partesVidaCrista.map((parte, idx) => (
                  <li key={parte.id || idx} className="py-3.5 space-y-1">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {parte.titulo || `Parte ${idx + 1}`}
                    </div>
                    <div className="flex items-baseline gap-2 text-slate-800 dark:text-slate-200">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Irmão responsável:</span>
                      <span className="font-bold">{parte.designado || '—'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
                Nenhuma parte cadastrada para esta semana.
              </p>
            )}
          </section>

          {/* 5. ESTUDO BÍBLICO DE CONGREGAÇÃO */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3 dark:border-slate-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Users className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white sm:text-xl">
                ESTUDO BÍBLICO DE CONGREGAÇÃO
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 text-base sm:text-lg">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Dirigente:
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.estudoBiblicoDirigente || '—'}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Leitor:
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.estudoBiblicoLeitor || '—'}
                </span>
              </div>
            </div>
          </section>

          {/* 6. CONCLUSÃO DA REUNIÃO */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-3 border-b-2 border-slate-300 pb-3 dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <Music className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white sm:text-xl">
                CONCLUSÃO DA REUNIÃO
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1 text-base sm:text-lg">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Cântico Final:
                </span>
                <span className="inline-flex items-center gap-1.5 font-extrabold text-blue-700 dark:text-blue-400">
                  <Music className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  {semanaAtual.canticoFinal ? `Cântico ${semanaAtual.canticoFinal}` : '—'}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Oração Final:
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.oracaoFinal || '—'}
                </span>
              </div>
            </div>
          </section>
        </article>
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
