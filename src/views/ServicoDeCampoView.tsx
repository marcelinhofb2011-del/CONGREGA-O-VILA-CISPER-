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
  FileText,
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
  getHorariosReunioes,
  HorariosReunioesConfig,
  STORAGE_KEY_HORARIOS_REUNIOES,
} from '../data/horariosReunioesStorage';
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
  const [horariosConfig, setHorariosConfig] = useState<HorariosReunioesConfig>(() =>
    getHorariosReunioes()
  );

  // Modais
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
    setHorariosConfig(getHorariosReunioes());
  };

  useEffect(() => {
    carregarDados();

    const handleFirebaseUpdate = () => {
      carregarDados();
    };

    const handleHorariosUpdate = (e: CustomEvent<HorariosReunioesConfig>) => {
      if (e.detail) {
        setHorariosConfig(e.detail);
      } else {
        setHorariosConfig(getHorariosReunioes());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'vila_cisper_campo_programacao_2026' ||
        e.key === 'vila_cisper_admin_auth' ||
        e.key === STORAGE_KEY_HORARIOS_REUNIOES
      ) {
        carregarDados();
      }
    };

    window.addEventListener('campo-programacao-firebase-updated', handleFirebaseUpdate);
    window.addEventListener('horarios-reunioes-updated', handleHorariosUpdate as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('campo-programacao-firebase-updated', handleFirebaseUpdate);
      window.removeEventListener('horarios-reunioes-updated', handleHorariosUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Horário oficial configurado nas configurações gerais do modo responsável
  const horarioSaidaConfig = horariosConfig.saidaDeCampo?.horario || '08:00';
  const getHorarioDisplay = (item?: CampoProgramacao | null) => {
    return horarioSaidaConfig || item?.horario || '08:00';
  };

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

  // Handlers do Formulário de Programação
  const handleOpenNovo = () => {
    setItemParaEditar(null);
    setFormData({
      data: '',
      horario: horarioSaidaConfig,
      pontoEncontro: 'Salão do Reino',
      responsavel: '',
    });
    setIsEditorOpen(true);
  };

  const handleOpenEditar = (item: CampoProgramacao) => {
    setItemParaEditar(item);
    setFormData({
      data: item.data,
      horario: item.horario || horarioSaidaConfig,
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
      horario: formData.horario.trim() || horarioSaidaConfig,
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
    <div className="w-full space-y-6 pb-16 pt-1">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DO MÓDULO                                           */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              SERVIÇO DE CAMPO
            </h1>
          </div>

          {/* Botões de Ação de Serviço de Campo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-importar-pdf-campo"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 active:scale-[0.98] transition cursor-pointer"
              title="Importar programação oficial via PDF"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Importar PDF</span>
            </button>
            <button
              type="button"
              id="btn-cadastrar-campo"
              onClick={handleOpenNovo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-sky-800 active:scale-[0.98] dark:bg-sky-600 dark:hover:bg-sky-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Cadastrar Programação</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mt-4 flex items-center justify-between rounded-xl p-3 text-xs sm:text-sm font-bold ${
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
      {/* SELETOR INTEGRADO DA DATA DE CAMPO (PADRÃO VIDA E MINISTÉRIO) */}
      {/* ------------------------------------------------------------- */}
      {programacoesOrdenadas.length > 0 && programacaoAtiva ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleProgramacaoAnterior}
                disabled={indiceProgramacaoAtual <= 0}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Saída anterior"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleProximaProgramacao}
                disabled={indiceProgramacaoAtual >= programacoesOrdenadas.length - 1}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Próxima saída"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
              <div className="ml-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Saída selecionada:
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{programacaoAtiva.data}</span>
                  {proximoIndex !== -1 && programacaoAtiva.id === programacoesOrdenadas[proximoIndex]?.id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Semana Atual
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown direto para escolher a data */}
            <div className="flex items-center gap-2">
              <select
                value={programacaoAtiva.id}
                onChange={(e) => setProgramacaoIdAtiva(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-xs cursor-pointer"
              >
                {programacoesOrdenadas.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    {item.data} - {getHorarioDisplay(item)} ({item.pontoEncontro}) {idx === proximoIndex ? '(Semana Atual)' : ''}
                  </option>
                ))}
              </select>

              {/* Ações administrativas para a saída selecionada */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditar(programacaoAtiva)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-sky-800 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-300 transition-colors cursor-pointer"
                    title="Editar programação"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemParaExcluir(programacaoAtiva)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 transition-colors cursor-pointer"
                    title="Excluir programação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* QUADRO DA PROGRAMAÇÃO SELECIONADA - CONTÍNUO E SEM BORDAS     */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-sky-200 dark:border-sky-900/60 gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-white dark:bg-sky-600">
                  {proximoIndex !== -1 && programacaoAtiva.id === programacoesOrdenadas[proximoIndex]?.id
                    ? 'Próxima Saída (Semana Atual)'
                    : 'Serviço de Campo'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* Data */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data da Saída
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {programacaoAtiva.data}
                </div>
              </div>

              {/* Horário */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Horário da Saída
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {getHorarioDisplay(programacaoAtiva)}
                </div>
              </div>

              {/* Ponto de encontro */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                    <MapPin className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ponto de Encontro
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {programacaoAtiva.pontoEncontro}
                </div>
              </div>

              {/* Responsável */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Irmão Responsável
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {programacaoAtiva.responsavel || '—'}
                </div>
              </div>
            </div>
          </div>
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
                  placeholder={`Ex: ${horarioSaidaConfig}`}
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
