import React, { useState, useEffect, useMemo } from 'react';
import {
  EscalaDesignacaoItem,
  getStoredEscalaDesignacoes,
  saveStoredEscalaItem,
  deleteStoredEscalaItem,
} from '../data/designacoesStorage';
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
  Mic,
  Volume2,
  Video,
  FileSpreadsheet,
  FileText,
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';
import { parseItemDate } from '../utils/dateUtils';

function verificarDesignacaoNome(nomeBuscado: string, campoTexto?: string): boolean {
  if (!campoTexto || !nomeBuscado) return false;
  const regex = new RegExp(`\\b${nomeBuscado.trim()}\\b`, 'i');
  return regex.test(campoTexto);
}

interface DesignacoesViewProps {
  isAdmin?: boolean;
}

export const DesignacoesView: React.FC<DesignacoesViewProps> = ({ isAdmin: propIsAdmin }) => {
  const [escalas, setEscalas] = useState<EscalaDesignacaoItem[]>([]);
  const [escalaIdAtiva, setEscalaIdAtiva] = useState<string>('');

  // Autenticação do Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (propIsAdmin !== undefined) return propIsAdmin;
    return isAdminAuthenticated();
  });

  // Modais
  const [isImportPlanilhaOpen, setIsImportPlanilhaOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [itemParaEditar, setItemParaEditar] = useState<EscalaDesignacaoItem | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<EscalaDesignacaoItem | null>(null);

  // Filtros
  const [buscaIrmao, setBuscaIrmao] = useState<string>('');
  const [mesFiltro, setMesFiltro] = useState<string>('todos');
  const [mostrarAnteriores, setMostrarAnteriores] = useState<boolean>(false);

  // Formulário de Cadastro / Edição
  const [formData, setFormData] = useState<{
    mes: string;
    dia: string;
    indicador: string;
    microfone: string;
    leitor: string;
    audio: string;
    video: string;
    presidencia: string;
    observacao: string;
    ehEspecial: boolean;
  }>({
    mes: 'Janeiro 2026',
    dia: '',
    indicador: '',
    microfone: '',
    leitor: '',
    audio: '',
    video: '',
    presidencia: '',
    observacao: '',
    ehEspecial: false,
  });

  // Mensagens de Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const carregarEscalas = () => {
    setEscalas(getStoredEscalaDesignacoes());
    if (propIsAdmin !== undefined) {
      setIsAdmin(propIsAdmin);
    } else {
      setIsAdmin(isAdminAuthenticated());
    }
  };

  useEffect(() => {
    carregarEscalas();
  }, [propIsAdmin]);

  useEffect(() => {
    const handleFirebaseUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<EscalaDesignacaoItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setEscalas(customEvent.detail);
      } else {
        carregarEscalas();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'vila_cisper_designacoes_reuniao_2026' ||
        e.key === 'vila_cisper_admin_auth' ||
        !e.key
      ) {
        carregarEscalas();
      }
    };

    window.addEventListener('designacoes-firebase-updated', handleFirebaseUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('designacoes-firebase-updated', handleFirebaseUpdate);
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

  // Resumo de designações caso haja busca de irmão
  const resumoIrmao = useMemo(() => {
    if (!buscaIrmao.trim() || buscaIrmao.trim().length < 2) return null;
    const termo = buscaIrmao.trim();
    let total = 0;
    let indicador = 0;
    let microfone = 0;
    let audio = 0;
    let video = 0;
    let leitor = 0;
    let presidencia = 0;

    escalas.forEach((item) => {
      if (verificarDesignacaoNome(termo, item.indicador)) {
        indicador++;
        total++;
      }
      if (verificarDesignacaoNome(termo, item.microfone)) {
        microfone++;
        total++;
      }
      if (verificarDesignacaoNome(termo, item.audio)) {
        audio++;
        total++;
      }
      if (verificarDesignacaoNome(termo, item.video)) {
        video++;
        total++;
      }
      if (verificarDesignacaoNome(termo, item.leitor)) {
        leitor++;
        total++;
      }
      if (verificarDesignacaoNome(termo, item.presidencia)) {
        presidencia++;
        total++;
      }
    });

    if (total === 0) return null;
    return { total, indicador, microfone, audio, video, leitor, presidencia };
  }, [escalas, buscaIrmao]);

  // Ordenação cronológica das escalas
  const escalasOrdenadas = useMemo(() => {
    return [...escalas].sort((a, b) => {
      const dtA = parseItemDate(a.dia, a.mes);
      const dtB = parseItemDate(b.dia, b.mes);
      if (dtA && dtB) {
        return dtA.getTime() - dtB.getTime();
      }
      if (dtA) return -1;
      if (dtB) return 1;
      return a.id.localeCompare(b.id);
    });
  }, [escalas]);

  // Filtragem por busca e mês
  const escalasFiltradas = useMemo(() => {
    return escalasOrdenadas.filter((item) => {
      if (mesFiltro !== 'todos' && item.mesChave !== mesFiltro) {
        return false;
      }
      if (buscaIrmao.trim()) {
        const termo = buscaIrmao.trim().toLowerCase();
        const texto = `${item.dia} ${item.mes} ${item.indicador} ${item.microfone} ${item.audio} ${item.video} ${item.leitor || ''} ${item.presidencia || ''} ${item.observacao || ''}`.toLowerCase();
        return texto.includes(termo);
      }
      return true;
    });
  }, [escalasOrdenadas, mesFiltro, buscaIrmao]);

  // Identificar a próxima reunião futura (data >= hoje)
  const proximoIndex = useMemo(() => {
    if (escalasOrdenadas.length === 0) return -1;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return escalasOrdenadas.findIndex((item) => {
      const dt = parseItemDate(item.dia, item.mes);
      if (!dt) return false;
      return dt.getTime() >= hoje.getTime();
    });
  }, [escalasOrdenadas]);

  // Próxima designação futura
  const proximaDesignacao = useMemo(() => {
    if (escalasOrdenadas.length === 0) return null;
    if (proximoIndex !== -1) {
      return escalasOrdenadas[proximoIndex];
    }
    return escalasOrdenadas[0];
  }, [escalasOrdenadas, proximoIndex]);

  // Ao abrir ou atualizar lista, seleciona automaticamente a próxima reunião futura
  useEffect(() => {
    if (escalasOrdenadas.length > 0) {
      setEscalaIdAtiva((prev) => {
        if (!prev || !escalasOrdenadas.some((item) => item.id === prev)) {
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
    const encontrada = escalasOrdenadas.find((item) => item.id === escalaIdAtiva);
    if (encontrada) return encontrada;
    return proximoIndex !== -1 ? escalasOrdenadas[proximoIndex] : escalasOrdenadas[0];
  }, [escalasOrdenadas, escalaIdAtiva, proximoIndex]);

  // Índice para navegação anterior / próximo
  const indiceEscalaAtual = useMemo(() => {
    if (!escalaAtiva) return -1;
    return escalasOrdenadas.findIndex((item) => item.id === escalaAtiva.id);
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

  // Handlers de Cadastro / Edição
  const handleOpenCreate = () => {
    setItemParaEditar(null);
    setFormData({
      mes: mesesDisponiveis.length > 0 ? mesesDisponiveis[0].rotulo : 'Janeiro 2026',
      dia: '',
      indicador: '',
      microfone: '',
      leitor: '',
      audio: '',
      video: '',
      presidencia: '',
      observacao: '',
      ehEspecial: false,
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: EscalaDesignacaoItem) => {
    setItemParaEditar(item);
    setFormData({
      mes: item.mes,
      dia: item.dia,
      indicador: item.indicador,
      microfone: item.microfone,
      leitor: item.leitor || '',
      audio: item.audio,
      video: item.video,
      presidencia: item.presidencia || '',
      observacao: item.observacao || '',
      ehEspecial: !!item.ehEspecial,
    });
    setIsEditorOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dia.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe a data ou reunião da designação.' });
      return;
    }

    const mesChave = formData.mes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+\d{4}$/, '');
    const item: EscalaDesignacaoItem = {
      id: itemParaEditar ? itemParaEditar.id : `desig-${Date.now()}`,
      mes: formData.mes.trim(),
      mesChave,
      dia: formData.dia.trim(),
      indicador: formData.indicador.trim(),
      microfone: formData.microfone.trim(),
      leitor: formData.leitor.trim(),
      audio: formData.audio.trim(),
      video: formData.video.trim(),
      presidencia: formData.presidencia.trim(),
      observacao: formData.observacao.trim(),
      ehEspecial: formData.ehEspecial,
    };

    const res = await saveStoredEscalaItem(item);
    if (res.success && res.data) {
      setEscalas(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Designação salva com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao salvar designação.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return;
    const res = await deleteStoredEscalaItem(itemParaExcluir.id);
    if (res.success && res.data) {
      setEscalas(res.data);
      setItemParaExcluir(null);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Designação excluída.' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao excluir designação.' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 pt-2">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DO MÓDULO                                           */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              DESIGNAÇÕES
            </h1>
          </div>

          {/* Botões de Ação de Designações - Bem proporcionados */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-importar-pdf-designacoes"
              onClick={() => setIsImportPlanilhaOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 active:scale-[0.98] transition cursor-pointer"
              title="Importar programação oficial de designações via PDF"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Importar PDF</span>
            </button>

            <button
              type="button"
              id="btn-cadastrar-designacao"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors cursor-pointer"
              title="Cadastrar nova programação manualmente"
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
      {/* BUSCA RÁPIDA DE IRMÃO (OPCIONAL)                              */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={buscaIrmao}
            onChange={(e) => setBuscaIrmao(e.target.value)}
            placeholder="Consultar designações de um irmão..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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

        {/* Resumo de designações do irmão caso esteja buscando */}
        {resumoIrmao && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs dark:border-blue-900 dark:bg-blue-950/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-blue-900 dark:text-blue-200">
                Designações para "{buscaIrmao.trim()}":{' '}
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-white font-black">
                  {resumoIrmao.total} total
                </span>
              </span>
              <div className="flex flex-wrap gap-2 text-slate-700 dark:text-slate-300">
                {resumoIrmao.indicador > 0 && <span>Indicador: <b>{resumoIrmao.indicador}</b></span>}
                {resumoIrmao.microfone > 0 && <span>Microfone: <b>{resumoIrmao.microfone}</b></span>}
                {resumoIrmao.audio > 0 && <span>Áudio: <b>{resumoIrmao.audio}</b></span>}
                {resumoIrmao.video > 0 && <span>Vídeo: <b>{resumoIrmao.video}</b></span>}
                {resumoIrmao.leitor > 0 && <span>Leitor: <b>{resumoIrmao.leitor}</b></span>}
                {resumoIrmao.presidencia > 0 && <span>Presidência: <b>{resumoIrmao.presidencia}</b></span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SELETOR INTEGRADO À TELA (PADRÃO VIDA E MINISTÉRIO)           */}
      {/* ------------------------------------------------------------- */}
      {escalasOrdenadas.length > 0 && escalaAtiva ? (
        <div className="space-y-6">
          {/* Barra de Navegação da Reunião Integrada */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEscalaAnterior}
                disabled={indiceEscalaAtual <= 0}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Reunião anterior"
                title="Reunião anterior"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleProximaEscala}
                disabled={indiceEscalaAtual >= escalasOrdenadas.length - 1}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Próxima reunião"
                title="Próxima reunião"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>

              <div className="ml-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Reunião selecionada:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {escalaAtiva.dia}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    ({escalaAtiva.mes})
                  </span>
                  {proximoIndex !== -1 && escalaAtiva.id === escalasOrdenadas[proximoIndex]?.id && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      Semana Atual
                    </span>
                  )}
                  {escalaAtiva.ehEspecial && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                      Especial
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown direto para escolher a data */}
            <div className="flex items-center gap-2">
              <select
                value={escalaAtiva.id}
                onChange={(e) => setEscalaIdAtiva(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer max-w-xs"
              >
                {escalasOrdenadas.map((item, idx) => (
                  <option key={item.id} value={item.id}>
                    {item.dia} - {item.mes} {idx === proximoIndex ? '(Semana Atual)' : ''}
                  </option>
                ))}
              </select>

              {/* Ações administrativas para a reunião selecionada */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(escalaAtiva)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-blue-800 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-300 cursor-pointer"
                    title="Editar designação"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemParaExcluir(escalaAtiva)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 cursor-pointer"
                    title="Excluir designação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* QUADRO DE DESIGNAÇÕES CONTÍNUO (SEM BORDAS LATERAIS DE CARD)  */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full space-y-6">
            {/* Cabeçalho da Reunião Selecionada */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-blue-200 dark:border-blue-900/60 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {escalaAtiva.dia} ({escalaAtiva.mes})
                  </span>
                  {proximoIndex !== -1 && escalaAtiva.id === escalasOrdenadas[proximoIndex]?.id && (
                    <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Semana Atual
                    </span>
                  )}
                  {escalaAtiva.ehEspecial && (
                    <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Especial
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Designações e responsabilidades da reunião congregacional
                </p>
              </div>
            </div>

            {/* Lista Contínua de Designações - Sem caixas/bordas laterais de cards */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* Presidência */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <User className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Presidência
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {escalaAtiva.presidencia || 'A definir'}
                </div>
              </div>

              {/* Indicadores */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Indicadores (Entrada & Auditório)
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {escalaAtiva.indicador || '—'}
                </div>
              </div>

              {/* Microfones Volantes */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Mic className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Microfones Volantes
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {escalaAtiva.microfone || '—'}
                </div>
              </div>

              {/* Sistema de Áudio & Vídeo */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sistema de Áudio & Vídeo
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  Áudio: {escalaAtiva.audio || '—'} &bull; Vídeo: {escalaAtiva.video || '—'}
                </div>
              </div>

              {/* Leitor da Sentinela */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Leitor da Sentinela / Estudo
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {escalaAtiva.leitor || '—'}
                </div>
              </div>

              {/* Observação se houver */}
              {escalaAtiva.observacao && (
                <div className="py-4 bg-amber-50/40 dark:bg-amber-950/20 text-xs sm:text-sm text-slate-700 dark:text-slate-300 rounded-xl px-4 mt-2">
                  <strong className="text-amber-800 dark:text-amber-300 uppercase mr-1">Observação:</strong>
                  <span>{escalaAtiva.observacao}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma designação cadastrada no momento.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeira Programação</span>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CADASTRO / EDIÇÃO DE DESIGNAÇÃO                    */}
      {/* ------------------------------------------------------------- */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {itemParaEditar ? 'Editar Designação' : 'Cadastrar Designação'}
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
                    placeholder="Ex: Setembro 2026"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Reunião / Data:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.dia}
                    onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                    placeholder="Ex: Quinta-Feira 03/09"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Indicadores:
                </label>
                <input
                  type="text"
                  value={formData.indicador}
                  onChange={(e) => setFormData({ ...formData, indicador: e.target.value })}
                  placeholder="Ex: Pedro / Fernando"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Microfones (Volantes):
                </label>
                <input
                  type="text"
                  value={formData.microfone}
                  onChange={(e) => setFormData({ ...formData, microfone: e.target.value })}
                  placeholder="Ex: Vanderlei / Vilson"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Áudio:
                  </label>
                  <input
                    type="text"
                    value={formData.audio}
                    onChange={(e) => setFormData({ ...formData, audio: e.target.value })}
                    placeholder="Ex: Guilherme"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Vídeo:
                  </label>
                  <input
                    type="text"
                    value={formData.video}
                    onChange={(e) => setFormData({ ...formData, video: e.target.value })}
                    placeholder="Ex: Dhiego"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Leitor (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formData.leitor}
                    onChange={(e) => setFormData({ ...formData, leitor: e.target.value })}
                    placeholder="Ex: Airton"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Presidência (Opcional):
                  </label>
                  <input
                    type="text"
                    value={formData.presidencia}
                    onChange={(e) => setFormData({ ...formData, presidencia: e.target.value })}
                    placeholder="Ex: Marcelo"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
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
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
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
              Excluir Designação
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Tem certeza que deseja remover a designação de{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {itemParaExcluir.dia} ({itemParaExcluir.mes})
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
        modulo="designacoes"
        onImportadoComSucesso={(_total, meses) => {
          setEscalas(getStoredEscalaDesignacoes());
          if (meses && meses.length > 0) {
            setMesFiltro(meses[0]);
          }
          setFeedbackMsg({ tipo: 'sucesso', texto: 'Programação importada com sucesso via PDF!' });
          setTimeout(() => setFeedbackMsg(null), 3500);
        }}
      />

    </div>
  );
};
