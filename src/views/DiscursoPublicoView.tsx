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
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';

export const DiscursoPublicoView: React.FC = () => {
  const [discursos, setDiscursos] = useState<DiscursoBiblicoItem[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Autenticação do Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

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
      const dtA = parseDataDiscurso(a.data);
      const dtB = parseDataDiscurso(b.data);
      if (dtA && dtB) {
        return dtA.getTime() - dtB.getTime();
      }
      if (dtA) return -1;
      if (dtB) return 1;
      return a.data.localeCompare(b.data);
    });
  }, [discursos]);

  // Identificar o Próximo Discurso e as Programações Futuras
  const { proximoDiscurso, programacoesFuturas, programacoesAnteriores } = useMemo(() => {
    if (discursosOrdenados.length === 0) {
      return { proximoDiscurso: null, programacoesFuturas: [], programacoesAnteriores: [] };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Encontra o primeiro discurso com data >= hoje
    let proximoIndex = discursosOrdenados.findIndex((d) => {
      const dt = parseDataDiscurso(d.data);
      if (!dt) return false;
      return dt.getTime() >= hoje.getTime();
    });

    // Se nenhum tiver data >= hoje (por exemplo, todas no passado ou sem formato reconhecido),
    // seleciona o primeiro da lista
    if (proximoIndex === -1) {
      proximoIndex = 0;
    }

    const proximo = discursosOrdenados[proximoIndex];
    const futuras = discursosOrdenados.filter((_, idx) => idx > proximoIndex);
    const anteriores = discursosOrdenados.filter((_, idx) => idx < proximoIndex);

    return {
      proximoDiscurso: proximo,
      programacoesFuturas: futuras,
      programacoesAnteriores: anteriores,
    };
  }, [discursosOrdenados]);

  // Login de Responsável
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setPasswordInput('');
      setAuthError('');
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Acesso de responsável concedido.' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: 'Modo de responsável finalizado.' });
    setTimeout(() => setFeedbackMsg(null), 3000);
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
  const handleSalvarProgramacao = (e: React.FormEvent) => {
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

    const res = saveStoredDiscursoBiblico(item);
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
  const handleConfirmarExclusao = () => {
    if (!itemParaExcluir) return;

    const res = deleteStoredDiscursoBiblico(itemParaExcluir.id);
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
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-16 pt-2">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DO MÓDULO                                           */}
      {/* ------------------------------------------------------------- */}
      <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Congregação: Vila Cisper
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white sm:text-3xl">
              DISCURSO PÚBLICO
            </h1>
          </div>

          {/* Botões do Responsável */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-importar-planilha-discursos"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-700 transition"
                  title="Importar planilha trimestral de Discursos Públicos"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>IMPORTAR PLANILHA</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNovo}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700"
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

      {/* Datalist para sugestão rápida de irmãos da congregação */}
      <datalist id="lista-irmaos-oradores">
        {IRMAOS_CONGREGACAO.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      {/* ------------------------------------------------------------- */}
      {/* ÁREA PÚBLICA DE VISUALIZAÇÃO                                  */}
      {/* ------------------------------------------------------------- */}
      {discursos.length > 0 ? (
        <div className="space-y-8">
          {/* 1. PRÓXIMO DISCURSO (DESTAQUE) */}
          {proximoDiscurso && (
            <section className="rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-sm dark:border-amber-600 dark:bg-slate-900 sm:p-7 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                    <Speech className="h-3.5 w-3.5" />
                    Próximo Discurso
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditar(proximoDiscurso)}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-amber-800 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300"
                      title="Editar discurso"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemParaExcluir(proximoDiscurso)}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
                      title="Excluir discurso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-1">
                {/* Data */}
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Data:
                  </span>
                  <span className="text-lg font-black text-amber-900 dark:text-amber-300 sm:text-xl">
                    {proximoDiscurso.data}
                  </span>
                </div>

                {/* Tema */}
                <div>
                  <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                    Tema:
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                    {proximoDiscurso.tema}
                  </h2>
                </div>

                {/* Orador */}
                <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Orador:
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                    {proximoDiscurso.orador || '—'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* 2. PROGRAMAÇÕES FUTURAS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Programações Futuras
              </h2>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {programacoesFuturas.length} {programacoesFuturas.length === 1 ? 'discurso programado' : 'discursos programados'}
              </span>
            </div>

            {programacoesFuturas.length > 0 ? (
              <div className="space-y-3">
                {programacoesFuturas.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-300 bg-white p-5 shadow-2xs hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {/* Data */}
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {item.data}
                          </span>
                        </div>

                        {/* Tema */}
                        <h3 className="mt-2 text-base font-extrabold text-slate-900 dark:text-white sm:text-lg">
                          {item.tema}
                        </h3>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditar(item)}
                            className="rounded-lg border border-slate-300 bg-white p-2 text-amber-800 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300"
                            title="Editar discurso"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemParaExcluir(item)}
                            className="rounded-lg border border-slate-300 bg-white p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
                            title="Excluir discurso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Orador */}
                    <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-sm sm:text-base">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Orador:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.orador || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                Não há outras programações futuras cadastradas.
              </div>
            )}
          </section>

          {/* 3. PROGRAMAÇÕES ANTERIORES (OPCIONAL/EXPANSÍVEL) */}
          {programacoesAnteriores.length > 0 && (
            <section className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setMostrarAnteriores(!mostrarAnteriores)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <span>
                  Discursos Anteriores ({programacoesAnteriores.length})
                </span>
                {mostrarAnteriores ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              {mostrarAnteriores && (
                <div className="space-y-2.5 pt-1">
                  {programacoesAnteriores.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {item.data}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {item.tema}
                          </h4>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Orador: {item.orador || '—'}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditar(item)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                              title="Editar"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemParaExcluir(item)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
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
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 focus:border-amber-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                  className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800"
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
        modulo="discursos"
        onImportadoComSucesso={() => setDiscursos(getStoredDiscursosBiblicos())}
      />
    </div>
  );
};
