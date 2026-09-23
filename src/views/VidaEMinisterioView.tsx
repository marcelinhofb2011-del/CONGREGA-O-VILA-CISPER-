import React, { useState, useEffect, useMemo } from 'react';
import {
  S140TSemana,
  getStoredS140TSemanas,
  saveS140TSemana,
  deleteS140TSemana,
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
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';

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

  // Carregar semanas e estado de autenticação
  const carregarDados = (novoIdDesejado?: string) => {
    const lista = getStoredS140TSemanas();
    setSemanas(lista);
    if (novoIdDesejado && lista.some((s) => s.id === novoIdDesejado)) {
      setSemanaIdAtiva(novoIdDesejado);
    } else if (lista.length > 0) {
      setSemanaIdAtiva((prev) => {
        if (!prev || !lista.some((s) => s.id === prev)) {
          return lista[0].id;
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
        const novas = customEvent.detail;
        setSemanas(novas);
        if (novas.length > 0) {
          setSemanaIdAtiva((prev) => {
            if (!prev || !novas.some((s) => s.id === prev)) {
              return novas[0].id;
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

  // Semana ativa
  const semanaAtual = useMemo(() => {
    if (semanas.length === 0) return null;
    const encontrada = semanas.find((s) => s.id === semanaIdAtiva);
    return encontrada || semanas[0];
  }, [semanas, semanaIdAtiva]);

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
        setSemanaIdAtiva(res.data[0].id);
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
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-16 pt-2">
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
                  id="btn-importar-planilha-vida-ministerio"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Importar planilha trimestral de Vida e Ministério"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>IMPORTAR PLANILHA</span>
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
      {/* SELETOR SIMPLES DA SEMANA DA REUNIÃO                          */}
      {/* ------------------------------------------------------------- */}
      {semanas.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
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
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Semana selecionada:
              </span>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {semanaAtual?.dataReuniao || semanaAtual?.periodo}
              </div>
            </div>
          </div>

          {/* Dropdown direto para escolher a semana */}
          <div className="flex items-center gap-2">
            <select
              value={semanaAtual?.id}
              onChange={(e) => setSemanaIdAtiva(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {semanas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.dataReuniao || s.periodo}
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
      {/* ÁREA PÚBLICA DE VISUALIZAÇÃO DA PROGRAMAÇÃO                   */}
      {/* ------------------------------------------------------------- */}
      {semanaAtual ? (
        <div className="space-y-6">
          {/* 1. DADOS DA REUNIÃO DA SEMANA */}
          <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-7 space-y-4">
            <div className="border-b border-slate-200 pb-3 dark:border-slate-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Programação da Reunião
              </span>
              <h2 className="text-xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-2xl">
                {semanaAtual.dataReuniao || semanaAtual.periodo}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-base">
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
          </section>

          {/* 2. TESOUROS DA PALAVRA DE DEUS */}
          <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3 dark:border-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <BookOpen className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white sm:text-xl">
                TESOUROS DA PALAVRA DE DEUS
              </h2>
            </div>

            <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-base sm:text-lg">
              {/* Discurso de 10 min */}
              <li className="py-3 space-y-1">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.discursoTesourosTitulo || 'Discurso Temático'}
                </div>
                <div className="flex items-baseline gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Irmão responsável:</span>
                  <span className="font-bold">{semanaAtual.discursoTesourosIrmao || '—'}</span>
                </div>
              </li>

              {/* Joias Espirituais */}
              <li className="py-3 space-y-1">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.joiasEspirituaisTitulo || 'Joias espirituais'}
                </div>
                <div className="flex items-baseline gap-2 text-slate-800 dark:text-slate-200">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Irmão responsável:</span>
                  <span className="font-bold">{semanaAtual.joiasEspirituaisIrmao || '—'}</span>
                </div>
              </li>

              {/* Leitura da Bíblia */}
              <li className="py-3 flex flex-wrap items-baseline gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white">Leitura da Bíblia:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {semanaAtual.leituraBibliaIrmao || '—'}
                </span>
              </li>
            </ul>
          </section>

          {/* 3. FAÇA SEU MELHOR NO MINISTÉRIO */}
          <section className="rounded-2xl border-2 border-amber-300 bg-white p-6 shadow-xs dark:border-amber-800/60 dark:bg-slate-900 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-amber-600 pb-3 dark:border-amber-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
                <Compass className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 sm:text-xl">
                FAÇA SEU MELHOR NO MINISTÉRIO
              </h2>
            </div>

            {semanaAtual.partesMinisterio && semanaAtual.partesMinisterio.length > 0 ? (
              <div className="space-y-3">
                {semanaAtual.partesMinisterio.map((parte, idx) => (
                  <div
                    key={parte.id || idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {parte.titulo || `Parte ${idx + 1}`}
                      </h3>
                      {parte.tempoMin && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {parte.tempoMin} min
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 sm:text-base pt-1">
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Nenhuma designação de estudante cadastrada para esta semana.
              </p>
            )}
          </section>

          {/* 4. NOSSA VIDA CRISTÃ */}
          <section className="rounded-2xl border-2 border-rose-300 bg-white p-6 shadow-xs dark:border-rose-800/60 dark:bg-slate-900 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-rose-700 pb-3 dark:border-rose-500">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-700 text-white">
                <Heart className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider text-rose-950 dark:text-rose-300 sm:text-xl">
                NOSSA VIDA CRISTÃ
              </h2>
            </div>

            {semanaAtual.partesVidaCrista && semanaAtual.partesVidaCrista.length > 0 ? (
              <ul className="divide-y divide-slate-200 dark:divide-slate-800 text-base sm:text-lg">
                {semanaAtual.partesVidaCrista.map((parte, idx) => (
                  <li key={parte.id || idx} className="py-3 space-y-1">
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
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Nenhuma parte cadastrada para esta semana.
              </p>
            )}
          </section>

          {/* 5. ESTUDO BÍBLICO DE CONGREGAÇÃO */}
          <section className="rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-xs dark:border-slate-700 dark:bg-slate-900 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-3 dark:border-slate-100">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white sm:text-xl">
                ESTUDO BÍBLICO DE CONGREGAÇÃO
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-base sm:text-lg">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Dirigente
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.estudoBiblicoDirigente || '—'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Leitor
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {semanaAtual.estudoBiblicoLeitor || '—'}
                </span>
              </div>
            </div>
          </section>
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
