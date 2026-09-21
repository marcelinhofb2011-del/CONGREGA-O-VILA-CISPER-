import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import {
  AssistenciaItem,
  getStoredAssistencia,
  registrarNovaAssistencia,
  atualizarAssistencia,
  deleteStoredAssistencia,
} from '../data/assistenciaStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  formatDateBR,
  parseDateBR,
  brToInputDate,
  inputDateToBR,
} from '../utils/dateUtils';

const OPCOES_TIPO_REUNIAO = [
  'Nossa Vida e Ministério Cristão',
  'Reunião de fim de semana',
  'Outra',
] as const;

export const AssistenciaView: React.FC = () => {
  // Estado de autenticação do Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Mensagem de confirmação simples ("Assistência registrada com sucesso.")
  const [confirmacaoSucesso, setConfirmacaoSucesso] = useState<string>('');

  // -------------------------------------------------------------
  // ESTADOS DO LANÇAMENTO DE ASSISTÊNCIA (ACESSO DO IRMÃO / ADMIN)
  // -------------------------------------------------------------
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    data: string;
    tipo: string;
    outroTipoEspecificacao: string;
    assistencia: string;
    observacao: string;
  }>({
    data: '',
    tipo: '',
    outroTipoEspecificacao: '',
    assistencia: '',
    observacao: '',
  });
  const [formError, setFormError] = useState<string>('');

  // -------------------------------------------------------------
  // ESTADOS DA ÁREA DO RESPONSÁVEL (REGISTROS DE ASSISTÊNCIA)
  // -------------------------------------------------------------
  const [registros, setRegistros] = useState<AssistenciaItem[]>([]);
  const [editingItem, setEditingItem] = useState<AssistenciaItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    data: string;
    tipo: string;
    outroTipoEspecificacao: string;
    assistencia: string;
    observacao: string;
  }>({
    data: '',
    tipo: '',
    outroTipoEspecificacao: '',
    assistencia: '',
    observacao: '',
  });
  const [editFormError, setEditFormError] = useState<string>('');
  const [deletingItem, setDeletingItem] = useState<AssistenciaItem | null>(null);

  // Inicializar estado administrativo a partir da sessão
  useEffect(() => {
    const authenticated = isAdminAuthenticated();
    setIsAdmin(authenticated);
    if (authenticated) {
      setRegistros(getStoredAssistencia());
    } else {
      setRegistros([]);
    }
  }, []);

  // -------------------------------------------------------------
  // AUTENTICAÇÃO DO RESPONSÁVEL
  // -------------------------------------------------------------
  const handleOpenAuthModal = () => {
    setPasswordInput('');
    setAuthError('');
    setShowPasswordText(false);
    setShowAuthModal(true);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setPasswordInput('');
      setAuthError('');
      // Carrega os registros protegidos
      setRegistros(getStoredAssistencia());
    } else {
      setAuthError('Senha incorreta. Verifique e tente novamente.');
    }
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setRegistros([]);
    setEditingItem(null);
    setDeletingItem(null);
  };

  // -------------------------------------------------------------
  // FLUXO DO IRMÃO: ABRIR E PREPARAR O FORMULÁRIO
  // -------------------------------------------------------------
  const handleOpenLancamento = () => {
    setFormData({
      data: '',
      tipo: '',
      outroTipoEspecificacao: '',
      assistencia: '',
      observacao: '',
    });
    setFormError('');
    setConfirmacaoSucesso('');
    setIsFormOpen(true);
  };

  const handleCancelLancamento = () => {
    setIsFormOpen(false);
    setFormError('');
  };

  // -------------------------------------------------------------
  // FLUXO DO IRMÃO: SALVAR ASSISTÊNCIA
  // Informa data, tipo e quantidade -> SALVAR ASSISTÊNCIA -> "Assistência registrada com sucesso." -> Fim.
  // -------------------------------------------------------------
  const handleSalvarAssistencia = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. DATA (Formato DD/MM/AAAA)
    const dataTrim = formData.data.trim();
    if (!dataTrim) {
      setFormError('A data é obrigatória.');
      return;
    }

    const parsedDate = parseDateBR(dataTrim);
    if (!parsedDate) {
      setFormError('Data inválida. Por favor, utilize o formato DD/MM/AAAA.');
      return;
    }

    // 2. TIPO DE REUNIÃO
    if (!formData.tipo) {
      setFormError('O tipo de reunião é obrigatório.');
      return;
    }

    let tipoFinal = formData.tipo;
    if (formData.tipo === 'Outra') {
      const espec = formData.outroTipoEspecificacao.trim();
      tipoFinal = espec ? `Outra (${espec})` : 'Outra';
    }

    // 3. ASSISTÊNCIA (Campo numérico inteiro >= 0)
    const assistenciaTrim = formData.assistencia.trim();
    if (assistenciaTrim === '') {
      setFormError('A assistência é obrigatória.');
      return;
    }

    const valorNumero = Number(assistenciaTrim);
    if (
      isNaN(valorNumero) ||
      !Number.isInteger(valorNumero) ||
      valorNumero < 0
    ) {
      setFormError('A assistência deve ser um número inteiro igual ou maior que zero (0).');
      return;
    }

    // Gravar novo registro no sistema
    const resultado = registrarNovaAssistencia({
      data: dataTrim,
      tipo: tipoFinal,
      assistencia: valorNumero,
      observacao: formData.observacao.trim() || undefined,
    });

    if (!resultado.success) {
      setFormError(resultado.error || 'Erro ao salvar a assistência.');
      return;
    }

    // Limpar / fechar formulário
    setIsFormOpen(false);
    setFormData({
      data: '',
      tipo: '',
      outroTipoEspecificacao: '',
      assistencia: '',
      observacao: '',
    });
    setFormError('');

    // Mostrar confirmação simples
    setConfirmacaoSucesso('Assistência registrada com sucesso.');

    // Se estiver no modo responsável, atualiza a lista de registros
    if (isAdmin) {
      setRegistros(getStoredAssistencia());
    }
  };

  // -------------------------------------------------------------
  // ÁREA DO RESPONSÁVEL: CORREÇÃO / EDIÇÃO
  // -------------------------------------------------------------
  const handleOpenEdit = (item: AssistenciaItem) => {
    setEditingItem(item);
    const isOpcaoPadrao =
      item.tipo === 'Nossa Vida e Ministério Cristão' ||
      item.tipo === 'Reunião de fim de semana';

    const isOutra = !isOpcaoPadrao;

    setEditFormData({
      data: item.data,
      tipo: isOpcaoPadrao ? item.tipo : 'Outra',
      outroTipoEspecificacao: isOutra && item.tipo !== 'Outra' ? item.tipo.replace(/^Outra \((.*)\)$/, '$1') : '',
      assistencia: String(item.assistencia),
      observacao: item.observacao || '',
    });
    setEditFormError('');
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const dataTrim = editFormData.data.trim();
    if (!dataTrim || !parseDateBR(dataTrim)) {
      setEditFormError('Data inválida. Utilize o formato DD/MM/AAAA.');
      return;
    }

    if (!editFormData.tipo) {
      setEditFormError('O tipo de reunião é obrigatório.');
      return;
    }

    let tipoFinal = editFormData.tipo;
    if (editFormData.tipo === 'Outra') {
      const espec = editFormData.outroTipoEspecificacao.trim();
      tipoFinal = espec ? `Outra (${espec})` : 'Outra';
    }

    const valorNumero = Number(editFormData.assistencia.trim());
    if (
      isNaN(valorNumero) ||
      !Number.isInteger(valorNumero) ||
      valorNumero < 0
    ) {
      setEditFormError('A assistência deve ser um número inteiro igual ou maior que zero (0).');
      return;
    }

    const resultado = atualizarAssistencia({
      ...editingItem,
      data: dataTrim,
      tipo: tipoFinal,
      assistencia: valorNumero,
      observacao: editFormData.observacao.trim() || undefined,
    });

    if (resultado.success) {
      setRegistros(resultado.registros);
      setEditingItem(null);
      setEditFormError('');
    } else {
      setEditFormError(resultado.error || 'Erro ao atualizar o registro.');
    }
  };

  // -------------------------------------------------------------
  // ÁREA DO RESPONSÁVEL: EXCLUSÃO
  // -------------------------------------------------------------
  const handleConfirmarExclusao = () => {
    if (!deletingItem) return;
    const resultado = deleteStoredAssistencia(deletingItem.id);
    if (resultado.success) {
      setRegistros(resultado.registros);
      setDeletingItem(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DA TELA ASSISTÊNCIA */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              ASSISTÊNCIA
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {isAdmin
                ? 'Painel administrativo — Registros de assistência das reuniões'
                : 'Lançamento de assistência das reuniões congregacionais'}
            </p>
          </div>

          {/* Botão de autenticação / encerramento do Responsável */}
          <div>
            {!isAdmin ? (
              <button
                id="btn-acesso-responsavel-assistencia"
                type="button"
                onClick={handleOpenAuthModal}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                Acesso do Responsável
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-sm bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Responsável
                </span>
                <button
                  id="btn-sair-responsavel-assistencia"
                  type="button"
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Sair do Acesso Restrito
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONFIRMAÇÃO SIMPLES APÓS SALVAR */}
      {/* "Assistência registrada com sucesso." */}
      {/* ------------------------------------------------------------- */}
      {confirmacaoSucesso && (
        <div
          id="alerta-sucesso-assistencia"
          className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 dark:text-emerald-400" />
            <span>{confirmacaoSucesso}</span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmacaoSucesso('')}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. LANÇAMENTO DE ASSISTÊNCIA — ACESSO DO IRMÃO */}
      {/* Serve SOMENTE para lançar uma nova assistência */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        {!isFormOpen ? (
          <div>
            <button
              id="btn-abrir-registrar-assistencia"
              type="button"
              onClick={handleOpenLancamento}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
            >
              <Plus className="h-4 w-4" />
              + REGISTRAR ASSISTÊNCIA
            </button>
          </div>
        ) : (
          <div
            id="form-lancamento-assistencia"
            className="rounded-lg border border-slate-300 bg-white p-5 shadow-xs dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 pb-3 mb-4 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Registrar Assistência
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Congregação Vila Cisper
              </span>
            </div>

            {formError && (
              <div className="mb-4 rounded-md bg-red-50 p-2.5 text-xs font-medium text-red-800 border border-red-200 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSalvarAssistencia} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* CAMPO: DATA (Formato DD/MM/AAAA) */}
                <div>
                  <label
                    htmlFor="input-data-assistencia"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    DATA *
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="input-data-assistencia"
                      type="text"
                      required
                      placeholder="DD/MM/AAAA"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <input
                      type="date"
                      aria-label="Selecionar data no calendário"
                      value={brToInputDate(formData.data)}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData({ ...formData, data: inputDateToBR(e.target.value) });
                        }
                      }}
                      className="w-10 cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                    Formato DD/MM/AAAA
                  </span>
                </div>

                {/* CAMPO: TIPO DE REUNIÃO */}
                <div>
                  <label
                    htmlFor="select-tipo-reuniao"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    TIPO DE REUNIÃO *
                  </label>
                  <select
                    id="select-tipo-reuniao"
                    required
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">Selecione o tipo</option>
                    {OPCOES_TIPO_REUNIAO.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CAMPO: ASSISTÊNCIA (Campo numérico) */}
                <div>
                  <label
                    htmlFor="input-quantidade-assistencia"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    ASSISTÊNCIA *
                  </label>
                  <input
                    id="input-quantidade-assistencia"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="Quantidade de presentes"
                    value={formData.assistencia}
                    onChange={(e) => setFormData({ ...formData, assistencia: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">
                    Apenas número
                  </span>
                </div>
              </div>

              {/* Especificação quando o tipo for "Outra" */}
              {formData.tipo === 'Outra' && (
                <div>
                  <label
                    htmlFor="input-especificacao-outra"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Especificação da Reunião (Opcional)
                  </label>
                  <input
                    id="input-especificacao-outra"
                    type="text"
                    placeholder="Ex: Reunião de pioneiros, Celebração, Visita especial..."
                    value={formData.outroTipoEspecificacao}
                    onChange={(e) =>
                      setFormData({ ...formData, outroTipoEspecificacao: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              )}

              {/* CAMPO: OBSERVAÇÃO (Opcional) */}
              <div>
                <label
                  htmlFor="input-observacao-assistencia"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  OBSERVAÇÃO
                </label>
                <textarea
                  id="input-observacao-assistencia"
                  rows={2}
                  placeholder="Observação opcional..."
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white resize-y"
                />
              </div>

              {/* BOTÕES: SALVAR ASSISTÊNCIA e CANCELAR */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  id="btn-cancelar-lancamento-assistencia"
                  onClick={handleCancelLancamento}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  CANCELAR
                </button>

                <button
                  type="submit"
                  id="btn-salvar-assistencia-action"
                  className="rounded-md bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                >
                  SALVAR ASSISTÊNCIA
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. REGISTROS DE ASSISTÊNCIA — SOMENTE RESPONSÁVEL */}
      {/* Os registros enviados aparecem SOMENTE na área do responsável */}
      {/* ------------------------------------------------------------- */}
      {isAdmin && (
        <div id="area-responsavel-assistencia" className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Registros de Assistência Recebidos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualização, correção e exclusão restritas ao responsável da congregação.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Total: {registros.length}
            </span>
          </div>

          {registros.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Nenhum registro de assistência cadastrado.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-300">
                      <th className="px-4 py-3">DATA</th>
                      <th className="px-4 py-3">TIPO</th>
                      <th className="px-4 py-3">ASSISTÊNCIA</th>
                      <th className="px-4 py-3">OBSERVAÇÃO</th>
                      <th className="px-4 py-3 text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-xs">
                    {registros.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        {/* DATA */}
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {item.data}
                        </td>

                        {/* TIPO */}
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {item.tipo}
                          </span>
                        </td>

                        {/* ASSISTÊNCIA */}
                        <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900 dark:text-white">
                          {item.assistencia}
                        </td>

                        {/* OBSERVAÇÃO */}
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {item.observacao || '-'}
                        </td>

                        {/* AÇÕES (Corrigir / Excluir) */}
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              id={`btn-corrigir-assistencia-${item.id}`}
                              onClick={() => handleOpenEdit(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="h-3 w-3" />
                              Corrigir
                            </button>
                            <button
                              type="button"
                              id={`btn-excluir-assistencia-${item.id}`}
                              onClick={() => setDeletingItem(item)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL */}
      {/* ------------------------------------------------------------- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Acesso do Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setPasswordInput('');
                  setAuthError('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Digite a senha de responsável para acessar os registros de assistência da congregação.
              </p>

              {authError && (
                <div className="rounded-md bg-red-50 p-2 text-xs text-red-700 border border-red-200 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300">
                  {authError}
                </div>
              )}

              <div>
                <label
                  htmlFor="input-senha-responsavel-assistencia"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    id="input-senha-responsavel-assistencia"
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha..."
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setPasswordInput('');
                    setAuthError('');
                  }}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                >
                  Acessar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CORREÇÃO DE REGISTRO (SOMENTE RESPONSÁVEL) */}
      {/* ------------------------------------------------------------- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Corrigir Lançamento de Assistência
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editFormError && (
              <div className="mt-3 rounded-md bg-red-50 p-2.5 text-xs font-medium text-red-800 border border-red-200 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleSalvarEdicao} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* DATA */}
                <div>
                  <label
                    htmlFor="edit-input-data"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    DATA *
                  </label>
                  <input
                    id="edit-input-data"
                    type="text"
                    required
                    placeholder="DD/MM/AAAA"
                    value={editFormData.data}
                    onChange={(e) => setEditFormData({ ...editFormData, data: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                {/* TIPO */}
                <div>
                  <label
                    htmlFor="edit-select-tipo"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    TIPO *
                  </label>
                  <select
                    id="edit-select-tipo"
                    required
                    value={editFormData.tipo}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    {OPCOES_TIPO_REUNIAO.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ASSISTÊNCIA */}
                <div>
                  <label
                    htmlFor="edit-input-assistencia"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    ASSISTÊNCIA *
                  </label>
                  <input
                    id="edit-input-assistencia"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editFormData.assistencia}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, assistencia: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {editFormData.tipo === 'Outra' && (
                <div>
                  <label
                    htmlFor="edit-input-especificacao"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Especificação da Reunião
                  </label>
                  <input
                    id="edit-input-especificacao"
                    type="text"
                    value={editFormData.outroTipoEspecificacao}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        outroTipoEspecificacao: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-input-observacao"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
                >
                  OBSERVAÇÃO
                </label>
                <textarea
                  id="edit-input-observacao"
                  rows={2}
                  value={editFormData.observacao}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, observacao: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
                >
                  Salvar Correção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (SOMENTE RESPONSÁVEL) */}
      {/* ------------------------------------------------------------- */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Confirmar Exclusão
              </h4>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Deseja realmente excluir o registro de assistência de{' '}
              <strong>{deletingItem.data}</strong> ({deletingItem.tipo} -{' '}
              <strong>{deletingItem.assistencia} presentes</strong>)?
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
