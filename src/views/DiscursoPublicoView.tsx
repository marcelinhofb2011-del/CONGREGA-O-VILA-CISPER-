import React, { useState, useEffect, useMemo } from 'react';
import {
  DiscursoBiblicoItem,
  getStoredDiscursosBiblicos,
  saveStoredDiscursoBiblico,
  deleteStoredDiscursoBiblico,
} from '../data/discursoStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import { IRMAOS_CONGREGACAO } from '../data/irmaos';
import {
  Speech,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';
import { parseItemDate } from '../utils/dateUtils';

export const DiscursoPublicoView: React.FC = () => {
  const [discursos, setDiscursos] = useState<DiscursoBiblicoItem[]>([]);
  const [discursoIdAtivo, setDiscursoIdAtivo] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Autenticação do Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return isAdminAuthenticated();
  });

  // Modal de Cadastro / Edição
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [itemParaEditar, setItemParaEditar] = useState<DiscursoBiblicoItem | null>(null);
  const [formData, setFormData] = useState<{
    data: string;
    tema: string;
    orador: string;
  }>({
    data: '',
    tema: '',
    orador: '',
  });

  // Modal de Exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<DiscursoBiblicoItem | null>(null);

  // Mensagens de Feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Controle de exibição de anteriores
  const [mostrarAnteriores, setMostrarAnteriores] = useState<boolean>(false);

  // Carregar dados
  const carregarDiscursos = () => {
    setDiscursos(getStoredDiscursosBiblicos());
  };

  useEffect(() => {
    carregarDiscursos();
    setIsAdmin(isAdminAuthenticated());

    const handleFirebaseUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<DiscursoBiblicoItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setDiscursos(customEvent.detail);
      } else {
        carregarDiscursos();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vila_cisper_discursos_2026' || e.key === 'vila_cisper_admin_auth') {
        carregarDiscursos();
        setIsAdmin(isAdminAuthenticated());
      }
    };

    window.addEventListener('discursos-firebase-updated', handleFirebaseUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('discursos-firebase-updated', handleFirebaseUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Parser de data para ordenação cronológica
  const parseDataDiscurso = (dataStr: string): Date | null => {
    if (!dataStr) return null;
    const s = dataStr.trim();

    // Formato ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    // Formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y, m - 1, d);
    }

    // Formato DD/MM (assume ano corrente)
    if (/^\d{1,2}\/\d{1,2}$/.test(s)) {
      const [d, m] = s.split('/').map(Number);
      const ano = new Date().getFullYear();
      return new Date(ano, m - 1, d);
    }

    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  // Discursos ordenados cronologicamente
  const discursosOrdenados = useMemo(() => {
    return [...discursos].sort((a, b) => {
      const dtA = parseItemDate(a.data) || parseDataDiscurso(a.data);
      const dtB = parseItemDate(b.data) || parseDataDiscurso(b.data);
      if (dtA && dtB) {
        return dtA.getTime() - dtB.getTime();
      }
      if (dtA) return -1;
      if (dtB) return 1;
      return a.data.localeCompare(b.data);
    });
  }, [discursos]);

  // Identificar a próxima programação futura (data >= hoje)
  const proximoIndex = useMemo(() => {
    if (discursosOrdenados.length === 0) return -1;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return discursosOrdenados.findIndex((d) => {
      const dt = parseItemDate(d.data) || parseDataDiscurso(d.data);
      if (!dt) return false;
      return dt.getTime() >= hoje.getTime();
    });
  }, [discursosOrdenados]);

  // Próximo discurso futuro
  const proximoDiscurso = useMemo(() => {
    if (discursosOrdenados.length === 0) return null;
    if (proximoIndex !== -1) {
      return discursosOrdenados[proximoIndex];
    }
    return discursosOrdenados[0];
  }, [discursosOrdenados, proximoIndex]);

  // Ao abrir ou atualizar lista, seleciona automaticamente a próxima programação futura
  useEffect(() => {
    if (discursosOrdenados.length > 0) {
      setDiscursoIdAtivo((prev) => {
        if (!prev || !discursosOrdenados.some((d) => d.id === prev)) {
          return proximoIndex !== -1
            ? discursosOrdenados[proximoIndex].id
            : discursosOrdenados[discursosOrdenados.length - 1].id;
        }
        return prev;
      });
    }
  }, [discursosOrdenados, proximoIndex]);

  // Discurso selecionado para exibição no quadro
  const discursoAtivo = useMemo(() => {
    if (discursosOrdenados.length === 0) return null;
    const encontrado = discursosOrdenados.find((d) => d.id === discursoIdAtivo);
    if (encontrado) return encontrado;
    return proximoIndex !== -1 ? discursosOrdenados[proximoIndex] : discursosOrdenados[0];
  }, [discursosOrdenados, discursoIdAtivo, proximoIndex]);

  // Índice para navegação anterior / próximo
  const indiceDiscursoAtual = useMemo(() => {
    if (!discursoAtivo) return -1;
    return discursosOrdenados.findIndex((d) => d.id === discursoAtivo.id);
  }, [discursosOrdenados, discursoAtivo]);

  const handleProximoDiscurso = () => {
    if (indiceDiscursoAtual < discursosOrdenados.length - 1) {
      setDiscursoIdAtivo(discursosOrdenados[indiceDiscursoAtual + 1].id);
    }
  };

  const handleDiscursoAnterior = () => {
    if (indiceDiscursoAtual > 0) {
      setDiscursoIdAtivo(discursosOrdenados[indiceDiscursoAtual - 1].id);
    }
  };

  // Abrir Modal de Cadastro
  const handleOpenNovo = () => {
    setItemParaEditar(null);
    setFormData({
      data: '',
      tema: '',
      orador: '',
    });
    setIsEditorOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEditar = (item: DiscursoBiblicoItem) => {
    setItemParaEditar(item);
    setFormData({
      data: item.data || '',
      tema: item.tema || '',
      orador: item.orador || '',
    });
    setIsEditorOpen(true);
  };

  // Salvar Programação (Novo ou Editado)
  const handleSalvarProgramacao = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.data.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe a data do discurso público.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    if (!formData.tema.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe o tema do discurso público.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    if (!formData.orador.trim()) {
      setFeedbackMsg({ tipo: 'erro', texto: 'Informe o nome do orador.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
      return;
    }

    const item: DiscursoBiblicoItem = {
      id: itemParaEditar ? itemParaEditar.id : `disc-${Date.now()}`,
      data: formData.data.trim(),
      tema: formData.tema.trim(),
      orador: formData.orador.trim(),
      mes: itemParaEditar?.mes || '',
      presidente: itemParaEditar?.presidente || '',
      leitor: itemParaEditar?.leitor || '',
    };

    const res = await saveStoredDiscursoBiblico(item);
    if (res.success && res.data) {
      setDiscursos(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: itemParaEditar ? 'Discurso atualizado com sucesso!' : 'Novo discurso cadastrado com sucesso!',
      });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao salvar a programação.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Excluir Programação
  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return;

    const res = await deleteStoredDiscursoBiblico(itemParaExcluir.id);
    if (res.success && res.data) {
      setDiscursos(res.data);
      setItemParaExcluir(null);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Discurso excluído com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao excluir a programação.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
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
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              DISCURSO PÚBLICO
            </h1>
          </div>

          {/* Botões de Ação de Discurso Público */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-importar-pdf-discursos"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-purple-800 active:scale-[0.98] transition cursor-pointer"
              title="Importar programação oficial via PDF"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Importar PDF</span>
            </button>
            <button
              type="button"
              onClick={handleOpenNovo}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-800 active:scale-[0.98] dark:bg-amber-600 dark:hover:bg-amber-700 transition-colors cursor-pointer"
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

      {/* Datalist para sugestão rápida de irmãos da congregação */}
      <datalist id="lista-irmaos-oradores">
        {IRMAOS_CONGREGACAO.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      {/* ------------------------------------------------------------- */}
      {/* SELETOR INTEGRADO DA DATA DO DISCURSO (PADRÃO VIDA E MINISTÉRIO) */}
      {/* ------------------------------------------------------------- */}
      {discursosOrdenados.length > 0 && discursoAtivo ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscursoAnterior}
                disabled={indiceDiscursoAtual <= 0}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Discurso anterior"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleProximoDiscurso}
                disabled={indiceDiscursoAtual >= discursosOrdenados.length - 1}
                className="rounded-lg border border-slate-300 bg-white p-1.5 sm:p-2 text-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                aria-label="Próximo discurso"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
              <div className="ml-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Data selecionada:
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{discursoAtivo.data}</span>
                  {proximoIndex !== -1 && discursoAtivo.id === discursosOrdenados[proximoIndex]?.id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Semana Atual
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dropdown direto para escolher a data */}
            <div className="flex items-center gap-2">
              <select
                value={discursoAtivo.id}
                onChange={(e) => setDiscursoIdAtivo(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-amber-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-xs cursor-pointer"
              >
                {discursosOrdenados.map((d, idx) => (
                  <option key={d.id} value={d.id}>
                    {d.data} - {d.tema ? (d.tema.length > 30 ? d.tema.substring(0, 30) + '...' : d.tema) : 'Discurso'} {idx === proximoIndex ? '(Semana Atual)' : ''}
                  </option>
                ))}
              </select>

              {/* Ações administrativas para o discurso selecionado */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditar(discursoAtivo)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-amber-800 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 cursor-pointer"
                    title="Editar discurso"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemParaExcluir(discursoAtivo)}
                    className="rounded-lg border border-slate-300 bg-white p-1.5 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 cursor-pointer"
                    title="Excluir discurso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* QUADRO DO DISCURSO SELECIONADO - CONTÍNUO E SEM BORDAS        */}
          {/* ------------------------------------------------------------- */}
          <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-amber-200 dark:border-amber-800 gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                  <Speech className="h-3.5 w-3.5" />
                  {proximoIndex !== -1 && discursoAtivo.id === discursosOrdenados[proximoIndex]?.id
                    ? 'Próximo Discurso (Semana Atual)'
                    : 'Discurso Público'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {/* Data */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data da Reunião
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-300 sm:text-right">
                  {discursoAtivo.data}
                </div>
              </div>

              {/* Tema */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tema do Discurso
                  </span>
                </div>
                <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white sm:text-right max-w-2xl">
                  {discursoAtivo.tema}
                </div>
              </div>

              {/* Orador */}
              <div className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Orador
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white sm:text-right">
                  {discursoAtivo.orador || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Estado Vazio */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma programação cadastrada no momento.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenNovo}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 dark:bg-amber-600"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeiro Discurso</span>
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CADASTRO / EDIÇÃO                                    */}
      {/* ------------------------------------------------------------- */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {itemParaEditar ? 'Editar Programação de Discurso' : 'Cadastrar Novo Discurso'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Discurso Público &bull; Congregação Vila Cisper
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSalvarProgramacao} className="p-6 space-y-4">
              {/* 1. DATA */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Data *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 27/09/2026 ou 27/09"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* 2. TEMA DO DISCURSO */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tema do Discurso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Como a Bíblia pode ajudar você?"
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* 3. NOME DO ORADOR */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Orador *
                </label>
                <input
                  type="text"
                  required
                  list="lista-irmaos-oradores"
                  placeholder="Nome do orador (local ou visitante)"
                  value={formData.orador}
                  onChange={(e) => setFormData({ ...formData, orador: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
                >
                  {itemParaEditar ? 'Salvar Alterações' : 'Cadastrar Discurso'}
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
          <div className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Confirmar Exclusão
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tem certeza de que deseja excluir o discurso do dia <strong>"{itemParaExcluir.data}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
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

      {/* Modal de Importação de Planilha Trimestral */}
      <ImportarPlanilhaModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        modulo="discursos"
        onImportadoComSucesso={(_total, _meses) => {
          setDiscursos(getStoredDiscursosBiblicos());
        }}
      />
    </div>
  );
};
