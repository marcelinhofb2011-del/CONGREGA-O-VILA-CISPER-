import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';
import { parseItemDate } from '../utils/dateUtils';
import {
  CampoProgramacao,
  getStoredCampoProgramacao,
  saveStoredCampoProgramacao,
  deleteStoredCampoProgramacao,
} from '../data/campoStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';

// Função auxiliar para interpretar a data e permitir ordenação cronológica correta
const parseDataCampo = (s: string): Date | null => {
  if (!s) return null;
  const limpo = s.trim();

  // Formato DD/MM/YYYY
  const matchComAno = limpo.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchComAno) {
    const [, d, m, y] = matchComAno;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Formato DD/MM (assume ano corrente)
  const matchSemAno = limpo.match(/(\d{1,2})\/(\d{1,2})/);
  if (matchSemAno) {
    const [, d, m] = matchSemAno;
    const ano = new Date().getFullYear();
    return new Date(ano, Number(m) - 1, Number(d));
  }

  const d = new Date(limpo);
  return isNaN(d.getTime()) ? null : d;
};

export const ServicoDeCampoView: React.FC = () => {
  const [programacoes, setProgramacoes] = useState<CampoProgramacao[]>([]);
  const [programacaoIdAtiva, setProgramacaoIdAtiva] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminAuthenticated());

  // Modais
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<CampoProgramacao | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<CampoProgramacao | null>(null);

  // Formulário: Data, Horário, Ponto de encontro, Irmão responsável
  const [formData, setFormData] = useState({
    data: '',
    horario: '',
    pontoEncontro: '',
    responsavel: '',
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{
    tipo: 'sucesso' | 'erro';
    texto: string;
  } | null>(null);

  // Carregamento inicial e listeners de atualização em tempo real
  const carregarDados = () => {
    setProgramacoes(getStoredCampoProgramacao());
    setIsAdmin(isAdminAuthenticated());
  };

  useEffect(() => {
    carregarDados();

    const handleFirebaseUpdate = () => {
      carregarDados();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'vila_cisper_campo_programacao_2026' ||
        e.key === 'vila_cisper_admin_auth'
      ) {
        carregarDados();
      }
    };

    window.addEventListener('campo-programacao-firebase-updated', handleFirebaseUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('campo-programacao-firebase-updated', handleFirebaseUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Ordenação cronológica das programações
  const programacoesOrdenadas = useMemo(() => {
    return [...programacoes].sort((a, b) => {
      const dtA = parseItemDate(a.data) || parseDataCampo(a.data);
      const dtB = parseItemDate(b.data) || parseDataCampo(b.data);
      if (dtA && dtB) {
        return dtA.getTime() - dtB.getTime();
      }
      if (dtA) return -1;
      if (dtB) return 1;
      return a.data.localeCompare(b.data);
    });
  }, [programacoes]);

  // Identificar a próxima programação futura (data >= hoje)
  const proximoIndex = useMemo(() => {
    if (programacoesOrdenadas.length === 0) return -1;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return programacoesOrdenadas.findIndex((item) => {
      const dt = parseItemDate(item.data) || parseDataCampo(item.data);
      if (!dt) return false;
      return dt.getTime() >= hoje.getTime();
    });
  }, [programacoesOrdenadas]);

  // Próxima programação futura
  const proximaProgramacao = useMemo(() => {
    if (programacoesOrdenadas.length === 0) return null;
    if (proximoIndex !== -1) {
      return programacoesOrdenadas[proximoIndex];
    }
    return programacoesOrdenadas[0];
  }, [programacoesOrdenadas, proximoIndex]);

  // Ao carregar ou atualizar lista, seleciona automaticamente a próxima programação futura
  useEffect(() => {
    if (programacoesOrdenadas.length > 0) {
      setProgramacaoIdAtiva((prev) => {
        if (!prev || !programacoesOrdenadas.some((p) => p.id === prev)) {
          return proximoIndex !== -1
            ? programacoesOrdenadas[proximoIndex].id
            : programacoesOrdenadas[programacoesOrdenadas.length - 1].id;
        }
        return prev;
      });
    }
  }, [programacoesOrdenadas, proximoIndex]);

  // Programação selecionada para exibição no quadro
  const programacaoAtiva = useMemo(() => {
    if (programacoesOrdenadas.length === 0) return null;
    const encontrada = programacoesOrdenadas.find((p) => p.id === programacaoIdAtiva);
    if (encontrada) return encontrada;
    return proximoIndex !== -1 ? programacoesOrdenadas[proximoIndex] : programacoesOrdenadas[0];
  }, [programacoesOrdenadas, programacaoIdAtiva, proximoIndex]);

  // Índice para navegação anterior / próximo
  const indiceProgramacaoAtual = useMemo(() => {
    if (!programacaoAtiva) return -1;
    return programacoesOrdenadas.findIndex((p) => p.id === programacaoAtiva.id);
  }, [programacoesOrdenadas, programacaoAtiva]);

  const handleProximaProgramacao = () => {
    if (indiceProgramacaoAtual < programacoesOrdenadas.length - 1) {
      setProgramacaoIdAtiva(programacoesOrdenadas[indiceProgramacaoAtual + 1].id);
    }
  };

  const handleProgramacaoAnterior = () => {
    if (indiceProgramacaoAtual > 0) {
      setProgramacaoIdAtiva(programacoesOrdenadas[indiceProgramacaoAtual - 1].id);
    }
  };

  // Handlers de Autenticação do Responsável
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      setAuthError('');
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Acesso de responsável concedido.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setAuthError('Senha incorreta. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: 'Modo responsável desativado.' });
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  // Handlers do Formulário de Programação
  const handleOpenNovo = () => {
    setItemParaEditar(null);
    setFormData({
      data: '',
      horario: '09:00',
      pontoEncontro: 'Salão do Reino',
      responsavel: '',
    });
    setIsEditorOpen(true);
  };

  const handleOpenEditar = (item: CampoProgramacao) => {
    setItemParaEditar(item);
    setFormData({
      data: item.data,
      horario: item.horario,
      pontoEncontro: item.pontoEncontro,
      responsavel: item.responsavel,
    });
    setIsEditorOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe a data da programação.' });
      return;
    }

    const item: CampoProgramacao = {
      id: itemParaEditar ? itemParaEditar.id : `prog-campo-${Date.now()}`,
      data: formData.data.trim(),
      horario: formData.horario.trim() || '09:00',
      pontoEncontro: formData.pontoEncontro.trim() || 'Salão do Reino',
      responsavel: formData.responsavel.trim(),
    };

    const res = await saveStoredCampoProgramacao(item);
    if (res.success && res.data) {
      setProgramacoes(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: itemParaEditar
          ? 'Programação de campo atualizada com sucesso!'
          : 'Programação de campo cadastrada com sucesso!',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.error || 'Erro ao salvar a programação.',
      });
    }
  };

  const handleConfirmExcluir = async () => {
    if (!itemParaExcluir) return;
    const res = await deleteStoredCampoProgramacao(itemParaExcluir.id);
    if (res.success && res.data) {
      setProgramacoes(res.data);
      setItemParaExcluir(null);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Programação excluída com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.error || 'Erro ao excluir a programação.',
      });
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
            <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              SERVIÇO DE CAMPO
            </h1>
          </div>

          {/* Área de Autenticação / Controles do Responsável */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-importar-planilha-campo"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Importar planilha trimestral de Serviço de Campo"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>IMPORTAR PLANILHA</span>
                </button>
                <button
                  type="button"
                  id="btn-cadastrar-campo"
                  onClick={handleOpenNovo}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Programação</span>
                </button>
                <button
                  type="button"
                  id="btn-sair-responsavel-campo"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                  title="Sair do modo responsável"
                >
                  <Unlock className="h-3.5 w-3.5 text-green-600" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-login-responsavel-campo"
                onClick={() => {
                  setPasswordInput('');
                  setAuthError('');
                  setIsAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Responsável</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mt-4 flex items-center justify-between rounded-xl p-3.5 text-sm font-bold ${
              feedbackMsg.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedbackMsg.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* SELETOR SIMPLES DA DATA DE CAMPO (PADRÃO VIDA E MINISTÉRIO)   */}
      {/* ------------------------------------------------------------- */}
      {programacoesOrdenadas.length > 0 && programacaoAtiva ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleProgramacaoAnterior}
                disabled={indiceProgramacaoAtual <= 0}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Saída anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleProximaProgramacao}
                disabled={indiceProgramacaoAtual >= programacoesOrdenadas.length - 1}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                aria-label="Próxima saída"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="ml-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saída selecionada:
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white">
                  {programacaoAtiva.data}
                </div>
              </div>
            </div>

            {/* Dropdown direto para escolher a data */}
            <div className="flex items-center gap-2">
              <select
                value={programacaoAtiva.id}
                onChange={(e) => setProgramacaoIdAtiva(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-xs"
              >
                {programacoesOrdenadas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.data} - {item.horario} ({item.pontoEncontro})
                  </option>
                ))}
              </select>

              {/* Ações administrativas para a saída selecionada */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditar(programacaoAtiva)}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-sky-800 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 transition-colors"
                    title="Editar programação"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemParaExcluir(programacaoAtiva)}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 transition-colors"
                    title="Excluir programação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* QUADRO DA PROGRAMAÇÃO SELECIONADA                             */}
          {/* ------------------------------------------------------------- */}
          <section
            id="card-programacao-campo-selecionada"
            className="rounded-2xl border-2 border-sky-600 bg-white p-6 shadow-sm dark:border-sky-500 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-sky-200 pb-3 dark:border-sky-900/60">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sky-700 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white dark:bg-sky-600">
                  {proximoIndex !== -1 && programacaoAtiva.id === programacoesOrdenadas[proximoIndex]?.id
                    ? 'Próxima Saída'
                    : 'Serviço de Campo'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
              {/* Data */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data:
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {programacaoAtiva.data}
                  </span>
                </div>
              </div>

              {/* Horário */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Horário:
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {programacaoAtiva.horario}
                  </span>
                </div>
              </div>

              {/* Ponto de encontro */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ponto de encontro:
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {programacaoAtiva.pontoEncontro}
                  </span>
                </div>
              </div>

              {/* Responsável */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Responsável:
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {programacaoAtiva.responsavel || '—'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma programação cadastrada no momento.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenNovo}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeira Programação</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE PROGRAMAÇÃO                                 */}
      {/* Apenas: Data, Horário, Ponto de encontro, Irmão responsável               */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  {itemParaEditar ? 'Editar Programação' : 'Cadastrar Programação'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Serviço de Campo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Data */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Data *
                </label>
                <input
                  type="text"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  placeholder="Ex: 26/09/2026 ou 26/09"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Horário */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Horário *
                </label>
                <input
                  type="text"
                  value={formData.horario}
                  onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                  placeholder="Ex: 09:00 ou 09:15"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Ponto de encontro */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ponto de encontro *
                </label>
                <input
                  type="text"
                  value={formData.pontoEncontro}
                  onChange={(e) => setFormData({ ...formData, pontoEncontro: e.target.value })}
                  placeholder="Ex: Salão do Reino ou Praça Vila Cisper"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Irmão responsável */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Irmão responsável *
                </label>
                <input
                  type="text"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  placeholder="Ex: Marcelo Ferreira ou Dhiego"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-700 px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-xs hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                                         */}
      {/* ========================================================================= */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Excluir Programação?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Deseja realmente excluir a programação de serviço de campo do dia{' '}
              <strong className="text-slate-900 dark:text-white">
                {itemParaExcluir.data}
              </strong>
              ?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExcluir}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ACESSO DO RESPONSÁVEL                                           */}
      {/* ========================================================================= */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-sky-700 dark:text-sky-400" />
                <h3 className="text-base font-black uppercase tracking-wide text-slate-900 dark:text-white">
                  Acesso do Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setPasswordInput('');
                  setAuthError('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Senha de Acesso
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authError) setAuthError('');
                    }}
                    placeholder="Digite a senha"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 pr-10 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-sky-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {authError && (
                  <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                    {authError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setPasswordInput('');
                    setAuthError('');
                  }}
                  className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-700"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Planilha Trimestral */}
      <ImportarPlanilhaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        modulo="campo"
        onImportadoComSucesso={(_total, _meses) => {
          setProgramacoes(getStoredCampoProgramacao());
        }}
      />
    </div>
  );
};
