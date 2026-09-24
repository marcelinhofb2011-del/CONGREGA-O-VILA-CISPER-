import React, { useState, useEffect, useMemo } from 'react';
import {
  LimpezaEscalaItem,
  GrupoLimpezaMembros,
  getStoredLimpezaEscalas,
  getStoredGruposMembros,
  saveStoredLimpezaEscala,
  deleteStoredLimpezaEscala,
} from '../data/limpezaStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  Lock,
  Unlock,
  Plus,
  Calendar,
  Eye,
  EyeOff,
  X,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  FileSpreadsheet,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';
import { parseItemDate } from '../utils/dateUtils';

export const LimpezaView: React.FC = () => {
  const [escalas, setEscalas] = useState<LimpezaEscalaItem[]>([]);
  const [escalaIdAtiva, setEscalaIdAtiva] = useState<string>('');
  const [grupos] = useState<GrupoLimpezaMembros[]>(getStoredGruposMembros());

  // Autenticação do Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Modais
  const [isImportPlanilhaOpen, setIsImportPlanilhaOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [itemParaEditar, setItemParaEditar] = useState<LimpezaEscalaItem | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<LimpezaEscalaItem | null>(null);

  // Filtros e Navegação
  const [abaAtiva, setAbaAtiva] = useState<'escala' | 'grupos'>('escala');
  const [buscaIrmao, setBuscaIrmao] = useState<string>('');

  // Formulário de Cadastro / Edição
  const [formData, setFormData] = useState<{
    mes: string;
    dias: string;
    diasSemana: string;
    grupo: string;
    responsaveis: string;
    observacao: string;
    ehEspecial: boolean;
  }>({
    mes: 'Janeiro',
    dias: '',
    diasSemana: 'Quarta Feira e Domingo',
    grupo: 'GRUPO 1',
    responsaveis: '',
    observacao: '',
    ehEspecial: false,
  });

  // Mensagens de Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarDados = () => {
    setEscalas(getStoredLimpezaEscalas());
    setIsAdmin(isAdminAuthenticated());
  };

  useEffect(() => {
    carregarDados();

    const handleUpdate = () => {
      carregarDados();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'vila_cisper_limpeza_escalas_2026' ||
        e.key === 'vila_cisper_admin_auth' ||
        !e.key
      ) {
        carregarDados();
      }
    };

    window.addEventListener('limpeza-firebase-updated', handleUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('limpeza-firebase-updated', handleUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Meses únicos disponíveis
  const mesesDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    escalas.forEach((item) => {
      if (!map.has(item.mesChave)) {
        map.set(item.mesChave, item.mes);
      }
    });
    return Array.from(map.entries()).map(([chave, rotulo]) => ({ chave, rotulo }));
  }, [escalas]);

  // Ordenação cronológica das escalas
  const escalasOrdenadas = useMemo(() => {
    return [...escalas].sort((a, b) => {
      const dtA = parseItemDate(a.dias, a.mes);
      const dtB = parseItemDate(b.dias, b.mes);
      if (dtA && dtB) {
        return dtA.getTime() - dtB.getTime();
      }
      if (dtA) return -1;
      if (dtB) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [escalas]);

  // Identificação da próxima escala futura (data >= hoje)
  const proximoIndex = useMemo(() => {
    if (escalasOrdenadas.length === 0) return -1;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return escalasOrdenadas.findIndex((item) => {
      const dt = parseItemDate(item.dias, item.mes);
      if (!dt) return false;
      return dt.getTime() >= hoje.getTime();
    });
  }, [escalasOrdenadas]);

  // Ao carregar ou atualizar lista, seleciona automaticamente a próxima escala futura
  useEffect(() => {
    if (escalasOrdenadas.length > 0) {
      setEscalaIdAtiva((prev) => {
        if (!prev || !escalasOrdenadas.some((e) => e.id === prev)) {
          return proximoIndex !== -1
            ? escalasOrdenadas[proximoIndex].id
            : escalasOrdenadas[escalasOrdenadas.length - 1].id;
        }
        return prev;
      });
    }
  }, [escalasOrdenadas, proximoIndex]);

  // Escala selecionada para exibição no quadro
  const escalaAtiva = useMemo(() => {
    if (escalasOrdenadas.length === 0) return null;
    const encontrada = escalasOrdenadas.find((e) => e.id === escalaIdAtiva);
    if (encontrada) return encontrada;
    return proximoIndex !== -1 ? escalasOrdenadas[proximoIndex] : escalasOrdenadas[0];
  }, [escalasOrdenadas, escalaIdAtiva, proximoIndex]);

  // Índice para navegação anterior / próximo
  const indiceEscalaAtual = useMemo(() => {
    if (!escalaAtiva) return -1;
    return escalasOrdenadas.findIndex((e) => e.id === escalaAtiva.id);
  }, [escalasOrdenadas, escalaAtiva]);

  const handleProximaEscala = () => {
    if (indiceEscalaAtual < escalasOrdenadas.length - 1) {
      setEscalaIdAtiva(escalasOrdenadas[indiceEscalaAtual + 1].id);
    }
  };

  const handleEscalaAnterior = () => {
    if (indiceEscalaAtual > 0) {
      setEscalaIdAtiva(escalasOrdenadas[indiceEscalaAtual - 1].id);
    }
  };

  // Handlers de Autenticação
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
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

  // Handlers de Criação / Edição
  const handleOpenCreate = () => {
    setItemParaEditar(null);
    setFormData({
      mes: mesesDisponiveis.length > 0 ? mesesDisponiveis[0].rotulo : 'Janeiro',
      dias: '',
      diasSemana: 'Quarta Feira e Domingo',
      grupo: 'GRUPO 1',
      responsaveis: '',
      observacao: '',
      ehEspecial: false,
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: LimpezaEscalaItem) => {
    setItemParaEditar(item);
    setFormData({
      mes: item.mes,
      dias: item.dias,
      diasSemana: item.diasSemana,
      grupo: item.grupo,
      responsaveis: item.responsaveis || '',
      observacao: item.observacao || '',
      ehEspecial: !!item.ehEspecial,
    });
    setIsEditorOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dias.trim() || !formData.grupo.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe os dias e o grupo responsável.' });
      return;
    }

    const mesChave = formData.mes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const item: LimpezaEscalaItem = {
      id: itemParaEditar ? itemParaEditar.id : `limp-${Date.now()}`,
      mes: formData.mes.trim(),
      mesChave,
      dias: formData.dias.trim(),
      diasSemana: formData.diasSemana.trim(),
      grupo: formData.grupo.trim(),
      responsaveis: formData.responsaveis.trim(),
      observacao: formData.observacao.trim(),
      ehEspecial: formData.ehEspecial,
    };

    const res = await saveStoredLimpezaEscala(item);
    if (res.success && res.data) {
      setEscalas(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala de limpeza salva com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao salvar escala.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return;
    const res = await deleteStoredLimpezaEscala(itemParaExcluir.id);
    if (res.success && res.data) {
      setEscalas(res.data);
      setItemParaExcluir(null);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala de limpeza excluída.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao excluir escala.' });
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
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              GRUPOS DE LIMPEZA
            </h1>
          </div>

          {/* Botões do Responsável */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-importar-planilha-limpeza"
                  onClick={() => setIsImportPlanilhaOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Importar planilha trimestral de Grupos de Limpeza"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>IMPORTAR PLANILHA</span>
                </button>
                <button
                  type="button"
                  id="btn-cadastrar-limpeza"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Programação</span>
                </button>
                <button
                  type="button"
                  id="btn-sair-responsavel-limpeza"
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
                id="btn-login-responsavel-limpeza"
                onClick={() => {
                  setPasswordInput('');
                  setAuthError('');
                  setShowAuthModal(true);
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
      {/* NAVEGAÇÃO DE SUB-ABAS (ESCALAS VS COMPOSIÇÃO DOS GRUPOS)      */}
      {/* ------------------------------------------------------------- */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setAbaAtiva('escala')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            abaAtiva === 'escala'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Escalas de Limpeza</span>
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('grupos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            abaAtiva === 'grupos'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Intervalos por Grupo</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO DA ABA 1: ESCALAS DE LIMPEZA                         */}
      {/* ------------------------------------------------------------- */}
      {abaAtiva === 'escala' && (
        <>
          {/* ------------------------------------------------------------- */}
          {/* BUSCA RÁPIDA DE IRMÃO OU GRUPO                                */}
          {/* ------------------------------------------------------------- */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={buscaIrmao}
              onChange={(e) => setBuscaIrmao(e.target.value)}
              placeholder="Consultar grupo, intervalo ou responsável..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            {buscaIrmao && (
              <button
                type="button"
                onClick={() => setBuscaIrmao('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SELETOR SIMPLES DA DATA (PADRÃO VIDA E MINISTÉRIO)            */}
          {/* ------------------------------------------------------------- */}
          {escalasOrdenadas.length > 0 && escalaAtiva ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEscalaAnterior}
                    disabled={indiceEscalaAtual <= 0}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Escala anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleProximaEscala}
                    disabled={indiceEscalaAtual >= escalasOrdenadas.length - 1}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    aria-label="Próxima escala"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="ml-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Escala selecionada:
                    </span>
                    <div className="text-base font-black text-slate-900 dark:text-white">
                      {escalaAtiva.dias} de {escalaAtiva.mes}
                    </div>
                  </div>
                </div>

                {/* Dropdown direto para escolher a data */}
                <div className="flex items-center gap-2">
                  <select
                    value={escalaAtiva.id}
                    onChange={(e) => setEscalaIdAtiva(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-xs"
                  >
                    {escalasOrdenadas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.dias} de {item.mes} - {item.grupo}
                      </option>
                    ))}
                  </select>

                  {/* Ações administrativas para a escala selecionada */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 ml-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(escalaAtiva)}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-emerald-800 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-300"
                        title="Editar escala"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemParaExcluir(escalaAtiva)}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
                        title="Excluir escala"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* QUADRO DIGITAL DA ESCALA SELECIONADA                          */}
              {/* ------------------------------------------------------------- */}
              <section
                id="card-escala-limpeza-selecionada"
                className="rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-sm dark:border-emerald-500 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between border-b border-emerald-200 pb-3 dark:border-emerald-900/60">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white dark:bg-emerald-600">
                      {proximoIndex !== -1 && escalaAtiva.id === escalasOrdenadas[proximoIndex]?.id
                        ? 'Próxima Limpeza'
                        : 'Escala de Limpeza'}
                    </span>
                    {escalaAtiva.ehEspecial && (
                      <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white">
                        Especial
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Mês e Intervalo de Dias */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Intervalo da Data / Dias:
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {escalaAtiva.dias} de {escalaAtiva.mes}
                      </span>
                    </div>
                  </div>

                  {/* Grupo */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Grupo Encarregado:
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                        {escalaAtiva.grupo}
                      </span>
                    </div>
                  </div>

                  {/* Reuniões / Frequência */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Reuniões:
                      </span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {escalaAtiva.diasSemana}
                      </span>
                    </div>
                  </div>

                  {/* Responsáveis */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Responsáveis:
                      </span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">
                        {escalaAtiva.responsaveis || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Observação se houver */}
                {escalaAtiva.observacao && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold">Observação: </span>
                    {escalaAtiva.observacao}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhuma escala de limpeza cadastrada no momento.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar Primeira Programação</span>
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO DA ABA 2: INTERVALO DE DATAS DE CADA GRUPO           */}
      {/* ------------------------------------------------------------- */}
      {abaAtiva === 'grupos' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={buscaIrmao}
              onChange={(e) => setBuscaIrmao(e.target.value)}
              placeholder="Filtrar por grupo ou data..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            {buscaIrmao && (
              <button
                type="button"
                onClick={() => setBuscaIrmao('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {grupos.map((g) => {
              const nomeG = g.nomeGrupo || g.nome;
              const numeroGrupo = nomeG.match(/\d+/)?.[0] || '';
              const escalasDoGrupo = escalasOrdenadas.filter((item) => {
                if (numeroGrupo) {
                  return (
                    item.grupo.toLowerCase().includes(`grupo ${numeroGrupo}`) ||
                    item.grupo.toLowerCase().includes(`g${numeroGrupo}`) ||
                    item.grupo.toLowerCase() === `grupo ${numeroGrupo}`
                  );
                }
                return item.grupo.toLowerCase().includes(nomeG.toLowerCase());
              });

              const atendeBusca = !buscaIrmao.trim() || 
                nomeG.toLowerCase().includes(buscaIrmao.toLowerCase()) ||
                escalasDoGrupo.some((item) => 
                  item.dias.toLowerCase().includes(buscaIrmao.toLowerCase()) || 
                  item.mes.toLowerCase().includes(buscaIrmao.toLowerCase()) ||
                  item.responsaveis.toLowerCase().includes(buscaIrmao.toLowerCase())
                );

              if (!atendeBusca) return null;

              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                >
                  <div>
                    <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-black uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {nomeG}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {escalasDoGrupo.length} {escalasDoGrupo.length === 1 ? 'escala' : 'escalas'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Dirigente(s): </span>
                        {g.superintendentes}
                      </p>
                    </div>

                    <div className="mt-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                        Intervalos de Datas Encarregadas:
                      </span>
                      {escalasDoGrupo.length > 0 ? (
                        <div className="space-y-2">
                          {escalasDoGrupo.map((item) => {
                            const isProxima = proximoIndex !== -1 && item.id === escalasOrdenadas[proximoIndex]?.id;
                            return (
                              <div
                                key={item.id}
                                className={`rounded-xl p-2.5 border text-xs transition-colors ${
                                  isProxima
                                    ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800'
                                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                    <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                      {item.dias} de {item.mes}
                                    </span>
                                  </div>
                                  {isProxima && (
                                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase text-white">
                                      Próxima
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                                  <span>{item.diasSemana}</span>
                                  {item.responsaveis && (
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                      Resp: {item.responsaveis}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-400 py-2">
                          Nenhum intervalo cadastrado para este grupo no trimestre.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL                         */}
      {/* ------------------------------------------------------------- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Acesso do Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Senha de Acesso:
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setAuthError('');
                    }}
                    placeholder="Digite a senha..."
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && <p className="mt-1 text-xs font-bold text-red-600">{authError}</p>}
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
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE ESCALA                         */}
      {/* ------------------------------------------------------------- */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {itemParaEditar ? 'Editar Escala de Limpeza' : 'Cadastrar Escala de Limpeza'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Mês:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mes}
                    onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                    placeholder="Ex: Setembro"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Dias:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dias}
                    onChange={(e) => setFormData({ ...formData, dias: e.target.value })}
                    placeholder="Ex: 04/08 ou 1"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Grupo Designado:
                </label>
                <input
                  type="text"
                  required
                  value={formData.grupo}
                  onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                  placeholder="Ex: GRUPO 1, GRUPO 2..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Dias da Semana / Reuniões:
                </label>
                <input
                  type="text"
                  value={formData.diasSemana}
                  onChange={(e) => setFormData({ ...formData, diasSemana: e.target.value })}
                  placeholder="Ex: Quarta Feira e Domingo"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Responsáveis:
                </label>
                <input
                  type="text"
                  value={formData.responsaveis}
                  onChange={(e) => setFormData({ ...formData, responsaveis: e.target.value })}
                  placeholder="Ex: AIRTON E DHIEGO"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Observação:
                </label>
                <input
                  type="text"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Ex: Limpeza especial / Assembléia"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO                              */}
      {/* ------------------------------------------------------------- */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
              Excluir Escala
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Tem certeza que deseja remover a escala de{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {itemParaExcluir.dias} de {itemParaExcluir.mes} ({itemParaExcluir.grupo})
              </span>
              ?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE IMPORTAÇÃO DE PLANILHA TRIMESTRAL                   */}
      {/* ------------------------------------------------------------- */}
      <ImportarPlanilhaModal
        isOpen={isImportPlanilhaOpen}
        onClose={() => setIsImportPlanilhaOpen(false)}
        modulo="limpeza"
        onImportadoComSucesso={() => {
          setEscalas(getStoredLimpezaEscalas());
        }}
      />
    </div>
  );
};
