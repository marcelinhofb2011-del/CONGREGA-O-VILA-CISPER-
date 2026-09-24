import React, { useState, useMemo } from 'react';
import {
  Map,
  Clock,
  CheckCircle2,
  Share2,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  XCircle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  Territorio,
  SolicitacaoTerritorio,
  TransferenciaTerritorio,
  HistoricoTerritorio,
  saveStoredTerritorio,
  deleteStoredTerritorio,
  designarTerritorioParaSolicitacao,
  cancelarSolicitacaoTerritorio,
  aprovarTransferencia,
  recusarTransferencia,
  tornarTerritorioDisponivel,
  tornarTerritoriosDisponiveisEmLote,
  isStatusDisponivel,
  isStatusSolicitado,
  isStatusDesignado,
  isStatusConcluido,
  isStatusEstornado,
} from '../../data/territoriosStorage';

type AdminTab = 'solicitacoes' | 'transferencias' | 'territorios' | 'historico';

interface AdminTerritoriosViewProps {
  territorios: Territorio[];
  solicitacoes: SolicitacaoTerritorio[];
  transferencias: TransferenciaTerritorio[];
  historico: HistoricoTerritorio[];
  onDataChange: () => void;
  onNotification: (msg: string) => void;
}

export const AdminTerritoriosView: React.FC<AdminTerritoriosViewProps> = ({
  territorios,
  solicitacoes,
  transferencias,
  historico,
  onDataChange,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('solicitacoes');

  // -------------------------------------------------------------
  // ESTADOS: SOLICITAÇÕES & DESIGNAÇÃO
  // -------------------------------------------------------------
  const [designandoSolicitacao, setDesignandoSolicitacao] = useState<SolicitacaoTerritorio | null>(null);
  const [solicitacaoParaCancelar, setSolicitacaoParaCancelar] = useState<SolicitacaoTerritorio | null>(null);
  const [selectedTerritorioIdParaDesignar, setSelectedTerritorioIdParaDesignar] = useState<string>('');
  const [responsavelDesignacaoNome, setResponsavelDesignacaoNome] = useState<string>('');
  const [designacaoError, setDesignacaoError] = useState<string>('');

  // -------------------------------------------------------------
  // ESTADOS: TRANSFERÊNCIAS & ANÁLISE
  // -------------------------------------------------------------
  const [analisandoTransferencia, setAnalisandoTransferencia] = useState<TransferenciaTerritorio | null>(null);
  const [responsavelDecisaoNome, setResponsavelDecisaoNome] = useState<string>('');
  const [recusaMotivo, setRecusaMotivo] = useState<string>('');
  const [isConfirmingRecusa, setIsConfirmingRecusa] = useState<boolean>(false);

  // -------------------------------------------------------------
  // ESTADOS: CADASTRO / EDIÇÃO DE TERRITÓRIO
  // -------------------------------------------------------------
  const [isFormTerritorioOpen, setIsFormTerritorioOpen] = useState<boolean>(false);
  const [editingTerritorioId, setEditingTerritorioId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    numero: string;
    localidade: string;
    descricao: string;
    observacao: string;
    mapa_url: string;
  }>({
    numero: '',
    localidade: '',
    descricao: '',
    observacao: '',
    mapa_url: '',
  });
  const [formError, setFormError] = useState<string>('');

  // Exclusão com confirmação
  const [deletingTerritorio, setDeletingTerritorio] = useState<Territorio | null>(null);

  // -------------------------------------------------------------
  // ESTADOS: TORNAR DISPONÍVEL / NOVO CICLO
  // -------------------------------------------------------------
  const [tornandoDisponivelItem, setTornandoDisponivelItem] = useState<Territorio | null>(null);
  const [responsavelDisponibilizarNome, setResponsavelDisponibilizarNome] = useState<string>('');
  const [selecionadosParaNovoCiclo, setSelecionadosParaNovoCiclo] = useState<string[]>([]);
  const [isNovoCicloModalOpen, setIsNovoCicloModalOpen] = useState<boolean>(false);

  // Filtros de busca
  const [buscaTerritorio, setBuscaTerritorio] = useState<string>('');
  const [buscaHistorico, setBuscaHistorico] = useState<string>('');

  // -------------------------------------------------------------
  // CÁLCULOS E ORDENAÇÃO DOS TERRITÓRIOS
  // -------------------------------------------------------------
  // Territórios disponíveis para seleção na designação
  const territoriosDisponiveis = useMemo(() => {
    return territorios
      .filter((t) => isStatusDisponivel(t.status))
      .sort((a, b) => a.numero - b.numero);
  }, [territorios]);

  // Solicitações que ainda aguardam atendimento do responsável
  const pendentesSolicitacoes = useMemo(() => {
    return solicitacoes.filter((s) => s.status === 'Pendente');
  }, [solicitacoes]);

  // Contadores para os badges das abas
  const pendentesSolicitacoesCount = useMemo(() => {
    return pendentesSolicitacoes.length;
  }, [pendentesSolicitacoes]);

  const pendentesTransferenciasCount = useMemo(() => {
    return transferencias.filter((t) => t.status === 'Aguardando aprovação').length;
  }, [transferencias]);

  // Territórios disponíveis para a designação em análise (inclui o já solicitado pelo irmão, se houver)
  const territoriosParaDesignar = useMemo(() => {
    return territorios
      .filter(
        (t) =>
          isStatusDisponivel(t.status) ||
          (designandoSolicitacao &&
            (t.id === designandoSolicitacao.territorio_id ||
              t.solicitacao_id === designandoSolicitacao.id ||
              (isStatusSolicitado(t.status) && t.solicitado_por === designandoSolicitacao.nome_publicador)))
      )
      .sort((a, b) => a.numero - b.numero);
  }, [territorios, designandoSolicitacao]);

  // Território selecionado no modal de designação para exibição dos detalhes
  const selectedTerritorioParaDesignarObj = useMemo(() => {
    return territorios.find((t) => t.id === selectedTerritorioIdParaDesignar) || null;
  }, [territorios, selectedTerritorioIdParaDesignar]);

  // Lista administrativa organizada por STATUS:
  // PRIMEIRO: Territórios ativos / em trabalho (Disponível, Solicitado, Designado)
  // DEPOIS: Territórios concluídos e estornados que aguardam novo ciclo
  const { territoriosAtivos, territoriosConcluidosEstornados } = useMemo(() => {
    const filtrados = territorios.filter((t) => {
      if (!buscaTerritorio.trim()) return true;
      const term = buscaTerritorio.toLowerCase();
      return (
        t.numero.toString().includes(term) ||
        t.localidade.toLowerCase().includes(term) ||
        t.descricao.toLowerCase().includes(term) ||
        (t.designado_para && t.designado_para.toLowerCase().includes(term)) ||
        (t.solicitado_por && t.solicitado_por.toLowerCase().includes(term))
      );
    });

    const ativos = filtrados
      .filter((t) => isStatusDisponivel(t.status) || isStatusSolicitado(t.status) || isStatusDesignado(t.status))
      .sort((a, b) => a.numero - b.numero);

    const concluidosEstornados = filtrados
      .filter((t) => isStatusConcluido(t.status) || isStatusEstornado(t.status))
      .sort((a, b) => {
        const dateA = a.data_ultimo_retorno_sort ? new Date(a.data_ultimo_retorno_sort).getTime() : 0;
        const dateB = b.data_ultimo_retorno_sort ? new Date(b.data_ultimo_retorno_sort).getTime() : 0;
        return dateB - dateA;
      });

    return {
      territoriosAtivos: ativos,
      territoriosConcluidosEstornados: concluidosEstornados,
    };
  }, [territorios, buscaTerritorio]);

  // Histórico filtrado
  const historicoFiltrado = useMemo(() => {
    if (!buscaHistorico.trim()) return historico;
    const term = buscaHistorico.toLowerCase();
    return historico.filter(
      (h) =>
        h.publicador.toLowerCase().includes(term) ||
        h.territorio_numero.toString().includes(term) ||
        (h.territorio_localidade && h.territorio_localidade.toLowerCase().includes(term)) ||
        h.acao.toLowerCase().includes(term) ||
        h.responsavel.toLowerCase().includes(term) ||
        (h.observacao && h.observacao.toLowerCase().includes(term))
    );
  }, [historico, buscaHistorico]);

  // -------------------------------------------------------------
  // HANDLERS: DESIGNAÇÃO
  // -------------------------------------------------------------
  const handleOpenDesignarModal = (sol: SolicitacaoTerritorio) => {
    setDesignandoSolicitacao(sol);
    setSelectedTerritorioIdParaDesignar(sol.territorio_id || '');
    setDesignacaoError('');
  };

  const handleConfirmarDesignacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designandoSolicitacao) return;

    if (!selectedTerritorioIdParaDesignar) {
      setDesignacaoError('Por favor, selecione um território.');
      return;
    }

    const ter = territorios.find((t) => t.id === selectedTerritorioIdParaDesignar);
    if (!ter || (!isStatusDisponivel(ter.status) && !isStatusSolicitado(ter.status))) {
      setDesignacaoError('O território selecionado não está disponível para designação.');
      return;
    }

    const resp = responsavelDesignacaoNome.trim() || 'Irmão Responsável';
    const num = ter.numero;
    const pubNome = designandoSolicitacao.nome_publicador;
    const solId = designandoSolicitacao.id;
    const terId = selectedTerritorioIdParaDesignar;

    setDesignandoSolicitacao(null);
    setSelectedTerritorioIdParaDesignar('');
    setDesignacaoError('');
    onNotification(`Território Nº ${num} designado para ${pubNome}.`);

    await designarTerritorioParaSolicitacao(solId, terId, resp);
    onDataChange();
  };

  const handleConfirmarCancelamento = async () => {
    if (!solicitacaoParaCancelar) return;
    const resp = responsavelDesignacaoNome.trim() || 'Irmão Responsável';
    const solId = solicitacaoParaCancelar.id;
    const publicadorNome = solicitacaoParaCancelar.nome_publicador;
    setSolicitacaoParaCancelar(null);
    onNotification(`Solicitação de ${publicadorNome} cancelada. O território foi liberado.`);

    await cancelarSolicitacaoTerritorio(solId, resp);
    onDataChange();
  };

  // -------------------------------------------------------------
  // HANDLERS: TRANSFERÊNCIA
  // -------------------------------------------------------------
  const handleOpenAnalisarTransferencia = (tr: TransferenciaTerritorio) => {
    setAnalisandoTransferencia(tr);
    setIsConfirmingRecusa(false);
    setRecusaMotivo('');
  };

  const handleAprovarTransferencia = async () => {
    if (!analisandoTransferencia) return;
    const resp = responsavelDecisaoNome.trim() || 'Irmão Responsável';
    const trId = analisandoTransferencia.id;
    const terNum = analisandoTransferencia.territorio_numero;
    const novoPub = analisandoTransferencia.novo_publicador;
    setAnalisandoTransferencia(null);
    onNotification(`Transferência aprovada! O Território Nº ${terNum} agora está vinculado a ${novoPub}.`);

    await aprovarTransferencia(trId, resp);
    onDataChange();
  };

  const handleRecusarTransferencia = async () => {
    if (!analisandoTransferencia) return;
    const resp = responsavelDecisaoNome.trim() || 'Irmão Responsável';
    const trId = analisandoTransferencia.id;
    const terNum = analisandoTransferencia.territorio_numero;
    setAnalisandoTransferencia(null);
    setIsConfirmingRecusa(false);
    onNotification(`Transferência do Território Nº ${terNum} recusada. O território permanece com o publicador atual.`);

    await recusarTransferencia(trId, resp);
    onDataChange();
  };

  // -------------------------------------------------------------
  // HANDLERS: CADASTRO / EDIÇÃO DE TERRITÓRIOS
  // -------------------------------------------------------------
  const handleOpenNovoTerritorio = () => {
    setEditingTerritorioId(null);
    setFormData({
      numero: '',
      localidade: '',
      descricao: '',
      observacao: '',
      mapa_url: '',
    });
    setFormError('');
    setIsFormTerritorioOpen(true);
  };

  const handleOpenEditarTerritorio = (ter: Territorio) => {
    setEditingTerritorioId(ter.id);
    setFormData({
      numero: String(ter.numero),
      localidade: ter.localidade,
      descricao: ter.descricao,
      observacao: ter.observacao || '',
      mapa_url: ter.mapa_url,
    });
    setFormError('');
    setIsFormTerritorioOpen(true);
  };

  const handleSalvarTerritorio = async (e: React.FormEvent) => {
    e.preventDefault();

    const numVal = parseInt(formData.numero, 10);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError('Informe um número válido para o território (maior que zero).');
      return;
    }

    const duplicado = territorios.find(
      (t) => t.numero === numVal && t.id !== editingTerritorioId
    );
    if (duplicado) {
      setFormError(`Já existe um território cadastrado com o número ${numVal}.`);
      return;
    }

    if (!formData.localidade.trim()) {
      setFormError('A localidade é obrigatória.');
      return;
    }

    if (!formData.descricao.trim()) {
      setFormError('A descrição do território é obrigatória.');
      return;
    }

    if (!formData.mapa_url.trim()) {
      setFormError('O link do mapa (Google Drive ou Google Maps) é obrigatório.');
      return;
    }

    const currentItem = editingTerritorioId
      ? territorios.find((t) => t.id === editingTerritorioId)
      : null;

    const itemSalvar: Territorio = {
      id: editingTerritorioId || String(Date.now()),
      numero: numVal,
      localidade: formData.localidade.trim(),
      descricao: formData.descricao.trim(),
      observacao: formData.observacao.trim() || undefined,
      mapa_url: formData.mapa_url.trim(),
      status: currentItem ? currentItem.status : 'Disponível',
      designado_para: currentItem?.designado_para,
      data_ultima_designacao: currentItem?.data_ultima_designacao,
      hora_ultima_designacao: currentItem?.hora_ultima_designacao,
      responsavel_designacao: currentItem?.responsavel_designacao,
      solicitado_por: currentItem?.solicitado_por,
      solicitacao_id: currentItem?.solicitacao_id,
      data_conclusao: currentItem?.data_conclusao,
      data_estorno: currentItem?.data_estorno,
      motivo_estorno: currentItem?.motivo_estorno,
      data_ultimo_retorno_sort: currentItem?.data_ultimo_retorno_sort,
      created_at: currentItem ? currentItem.created_at : new Date().toISOString(),
    };

    setIsFormTerritorioOpen(false);
    setFormError('');
    onNotification(`Território Nº ${numVal} salvo com sucesso!`);

    await saveStoredTerritorio(itemSalvar);
    onDataChange();
  };

  const handleConfirmarExclusaoTerritorio = async () => {
    if (!deletingTerritorio) return;
    const num = deletingTerritorio.numero;
    const targetId = deletingTerritorio.id;
    setDeletingTerritorio(null);
    onNotification(`Território Nº ${num} excluído.`);

    await deleteStoredTerritorio(targetId);
    onDataChange();
  };

  // -------------------------------------------------------------
  // HANDLERS: TORNAR DISPONÍVEL / NOVO CICLO
  // -------------------------------------------------------------
  const handleConfirmarTornarDisponivel = async () => {
    if (!tornandoDisponivelItem) return;
    const resp = responsavelDisponibilizarNome.trim() || 'Irmão Responsável';
    const num = tornandoDisponivelItem.numero;
    const targetId = tornandoDisponivelItem.id;
    setTornandoDisponivelItem(null);
    onNotification(`Território Nº ${num} disponibilizado para novo ciclo.`);

    await tornarTerritorioDisponivel(targetId, resp);
    onDataChange();
  };

  const handleConfirmarNovoCicloLote = async () => {
    if (selecionadosParaNovoCiclo.length === 0) return;
    const resp = responsavelDisponibilizarNome.trim() || 'Irmão Responsável';
    const ids = [...selecionadosParaNovoCiclo];
    setSelecionadosParaNovoCiclo([]);
    setIsNovoCicloModalOpen(false);
    onNotification(`${ids.length} territórios disponibilizados para novo ciclo.`);

    await tornarTerritoriosDisponiveisEmLote(ids, resp);
    onDataChange();
  };

  const toggleSelectNovoCiclo = (id: string) => {
    setSelecionadosParaNovoCiclo((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // -------------------------------------------------------------
  // FUNÇÃO AUXILIAR PARA COR DO STATUS
  // -------------------------------------------------------------
  const renderStatusBadge = (status: string) => {
    if (isStatusDisponivel(status)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:border-emerald-800/60 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
          Disponível
        </span>
      );
    }
    if (isStatusSolicitado(status)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:border-amber-800/60 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Solicitado
        </span>
      );
    }
    if (isStatusDesignado(status)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200 dark:bg-blue-950/70 dark:border-blue-800/60 dark:text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          Designado
        </span>
      );
    }
    if (isStatusConcluido(status)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200 dark:bg-purple-950/70 dark:border-purple-800/60 dark:text-purple-300">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400" />
          Concluído
        </span>
      );
    }
    if (isStatusEstornado(status)) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:border-amber-800/60 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
          Estornado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* NAVEGAÇÃO DE ABAS DO PAINEL ADMINISTRATIVO */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-1">
          {/* 1. SOLICITAÇÕES */}
          <button
            id="tab-admin-solicitacoes"
            type="button"
            onClick={() => setActiveTab('solicitacoes')}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'solicitacoes'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>SOLICITAÇÕES</span>
            {pendentesSolicitacoesCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendentesSolicitacoesCount}
              </span>
            )}
          </button>

          {/* 2. TRANSFERÊNCIAS */}
          <button
            id="tab-admin-transferencias"
            type="button"
            onClick={() => setActiveTab('transferencias')}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'transferencias'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Share2 className="h-4 w-4" />
            <span>TRANSFERÊNCIAS</span>
            {pendentesTransferenciasCount > 0 && (
              <span className="rounded-full bg-blue-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {pendentesTransferenciasCount}
              </span>
            )}
          </button>

          {/* 3. TERRITÓRIOS */}
          <button
            id="tab-admin-territorios"
            type="button"
            onClick={() => setActiveTab('territorios')}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'territorios'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Map className="h-4 w-4" />
            <span>TERRITÓRIOS</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {territorios.length}
            </span>
          </button>

          {/* 4. HISTÓRICO */}
          <button
            id="tab-admin-historico"
            type="button"
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'historico'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>HISTÓRICO</span>
          </button>
        </nav>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO DA ABA 1: SOLICITAÇÕES */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'solicitacoes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Solicitações de Território
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Publicadores aguardando designação manual pelo responsável.
              </p>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
              Territórios disponíveis para designação: <strong>{territoriosDisponiveis.length}</strong>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">DATA</th>
                    <th className="px-4 py-3">PUBLICADOR</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3 text-right">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {solicitacoes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhuma solicitação pendente.
                      </td>
                    </tr>
                  ) : (
                    solicitacoes.map((sol) => (
                      <tr key={sol.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {sol.data_solicitacao} às {sol.hora_solicitacao}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          {sol.nome_publicador}
                        </td>
                        <td className="px-4 py-3">
                          {sol.status === 'Pendente' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pendente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300">
                              Designado (Nº {sol.territorio_numero})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sol.status === 'Pendente' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                id={`btn-designar-solicitacao-${sol.id}`}
                                type="button"
                                onClick={() => handleOpenDesignarModal(sol)}
                                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                DESIGNAR
                              </button>
                              <button
                                id={`btn-cancelar-solicitacao-${sol.id}`}
                                type="button"
                                onClick={() => setSolicitacaoParaCancelar(sol)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                CANCELAR
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              Atendido em {sol.data_designacao}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO DA ABA 2: TRANSFERÊNCIAS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'transferencias' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Solicitações de Transferência (Compartilhamento)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Publicadores que solicitaram repassar seus territórios a outro irmão. O território permanece vinculado até aprovação.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">DATA</th>
                    <th className="px-4 py-3">TERRITÓRIO</th>
                    <th className="px-4 py-3">PUBLICADOR ATUAL</th>
                    <th className="px-4 py-3">NOVO IRMÃO</th>
                    <th className="px-4 py-3">STATUS</th>
                    <th className="px-4 py-3 text-right">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {transferencias.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhuma solicitação de transferência registrada.
                      </td>
                    </tr>
                  ) : (
                    transferencias.map((tr) => (
                      <tr key={tr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {tr.data_solicitacao} às {tr.hora_solicitacao}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          Território Nº {tr.territorio_numero}
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                          {tr.publicador_atual}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">
                          {tr.novo_publicador}
                        </td>
                        <td className="px-4 py-3">
                          {tr.status === 'Aguardando aprovação' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-300">
                              <Clock className="h-3 w-3" />
                              Aguardando aprovação
                            </span>
                          ) : tr.status === 'Aprovada' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Aprovada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300">
                              Recusada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tr.status === 'Aguardando aprovação' ? (
                            <button
                              id={`btn-analisar-transferencia-${tr.id}`}
                              type="button"
                              onClick={() => handleOpenAnalisarTransferencia(tr)}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                            >
                              ANALISAR
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              Decidido em {tr.data_decisao}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO DA ABA 3: CADASTRO E LISTA DOS TERRITÓRIOS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'territorios' && (
        <div className="space-y-6">
          {/* Barra de ações superiores */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscaTerritorio}
                onChange={(e) => setBuscaTerritorio(e.target.value)}
                placeholder="Buscar por número, localidade, publicador..."
                className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              {territoriosConcluidosEstornados.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelecionadosParaNovoCiclo(territoriosConcluidosEstornados.map((t) => t.id));
                    setIsNovoCicloModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Iniciar Novo Ciclo em Lote ({territoriosConcluidosEstornados.length})
                </button>
              )}

              <button
                id="btn-cadastrar-novo-territorio"
                type="button"
                onClick={handleOpenNovoTerritorio}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar Território
              </button>
            </div>
          </div>

          {/* Legenda visual dos status */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Status:</span>
            {renderStatusBadge('Disponível')}
            {renderStatusBadge('Designado')}
            {renderStatusBadge('Concluído')}
            {renderStatusBadge('Estornado')}
            <span className="ml-auto text-[11px] text-slate-500 italic">
              Concluídos e Estornados aguardam a ação do responsável para novo ciclo.
            </span>
          </div>

          {/* GRUPO 1: TERRITÓRIOS ATIVOS (Disponível e Designado) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Territórios Ativos / em Trabalho</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  {territoriosAtivos.length}
                </span>
              </h4>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-3 w-16">Nº</th>
                      <th className="px-4 py-3">LOCALIDADE</th>
                      <th className="px-4 py-3">DESCRIÇÃO</th>
                      <th className="px-3 py-3">STATUS</th>
                      <th className="px-4 py-3">PUBLICADOR ATUAL</th>
                      <th className="px-3 py-3 text-center">MAPA</th>
                      <th className="px-3 py-3 text-right">AÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {territoriosAtivos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                          Nenhum território ativo encontrado.
                        </td>
                      </tr>
                    ) : (
                      territoriosAtivos.map((ter) => (
                        <tr key={ter.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">
                            {ter.numero}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            {ter.localidade}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {ter.descricao}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {renderStatusBadge(ter.status)}
                          </td>
                          <td className="px-4 py-3">
                            {ter.status === 'Designado' ? (
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {ter.designado_para}
                                </span>
                                {ter.data_ultima_designacao && (
                                  <span className="block text-[10px] text-slate-500">
                                    desde {ter.data_ultima_designacao}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Disponível</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => window.open(ter.mapa_url, '_blank')}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                              ABRIR MAPA
                            </button>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditarTerritorio(ter)}
                                title="Editar território"
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTerritorio(ter)}
                                title="Excluir território"
                                className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* GRUPO 2: TERRITÓRIOS CONCLUÍDOS E ESTORNADOS (SEMPRE ABAIXO DOS ATIVOS) */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Territórios Concluídos e Estornados (Aguardando Novo Ciclo)</span>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-900 dark:bg-purple-950 dark:text-purple-300">
                    {territoriosConcluidosEstornados.length}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Permanecem fora da disponibilidade até que o responsável decida torná-los disponíveis. Ordenados pelo retorno mais recente.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-purple-200/80 bg-white shadow-xs dark:border-purple-900/60 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-purple-100 bg-purple-50/50 font-semibold uppercase tracking-wider text-purple-900 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300">
                    <tr>
                      <th className="px-3 py-3 w-16">Nº</th>
                      <th className="px-4 py-3">LOCALIDADE</th>
                      <th className="px-4 py-3">STATUS</th>
                      <th className="px-4 py-3">ÚLTIMO PUBLICADOR</th>
                      <th className="px-4 py-3">DATA CONCLUSÃO/RETORNO</th>
                      <th className="px-3 py-3 text-center">MAPA</th>
                      <th className="px-4 py-3 text-right">AÇÃO DO RESPONSÁVEL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100/60 dark:divide-purple-950/40">
                    {territoriosConcluidosEstornados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-500 dark:text-slate-400">
                          Nenhum território concluído ou estornado no momento.
                        </td>
                      </tr>
                    ) : (
                      territoriosConcluidosEstornados.map((ter) => (
                        <tr key={ter.id} className="hover:bg-purple-50/20 dark:hover:bg-purple-950/20">
                          <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">
                            {ter.numero}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                            {ter.localidade}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {renderStatusBadge(ter.status)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {ter.designado_para || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {ter.status === 'Concluído' ? (
                              <span>Concluído em: {ter.data_conclusao || '-'}</span>
                            ) : (
                              <div>
                                <span>Estornado em: {ter.data_estorno || '-'}</span>
                                {ter.motivo_estorno && (
                                  <span className="block text-[10px] text-amber-700 dark:text-amber-400 italic">
                                    Motivo: {ter.motivo_estorno}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => window.open(ter.mapa_url, '_blank')}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <ExternalLink className="h-3 w-3" />
                              MAPA
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setTornandoDisponivelItem(ter);
                                setResponsavelDisponibilizarNome('');
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              TORNAR DISPONÍVEL
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONTEÚDO DA ABA 4: HISTÓRICO PERMANENTE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'historico' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Histórico Permanente de Movimentações
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro imutável de solicitações, designações, transferências, conclusões, estornos e ciclos.
              </p>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                placeholder="Filtrar histórico..."
                className="w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">DATA / HORA</th>
                    <th className="px-4 py-3">AÇÃO</th>
                    <th className="px-4 py-3">PUBLICADOR</th>
                    <th className="px-3 py-3">TERRITÓRIO</th>
                    <th className="px-4 py-3">RESPONSÁVEL</th>
                    <th className="px-4 py-3">OBSERVAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {historicoFiltrado.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Nenhum registro no histórico.
                      </td>
                    </tr>
                  ) : (
                    historicoFiltrado.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {h.data}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                              h.acao.includes('Designação')
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : h.acao.includes('Conclusão')
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : h.acao.includes('Estorno')
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : h.acao.includes('Transferência')
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : h.acao.includes('Cancel')
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {h.acao}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                          {h.publicador}
                        </td>
                        <td className="px-3 py-3">
                          {h.territorio_numero > 0 ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Nº {h.territorio_numero} {h.territorio_localidade ? `(${h.territorio_localidade})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {h.responsavel}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-sm truncate">
                          {h.observacao || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ESCOLHA E CONFIRMAÇÃO DA DESIGNAÇÃO */}
      {/* ------------------------------------------------------------- */}
      {designandoSolicitacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Designar Território
              </h4>
              <button
                type="button"
                onClick={() => setDesignandoSolicitacao(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmarDesignacao} className="mt-4 space-y-4">
              <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                <p>
                  <strong>Publicador:</strong> {designandoSolicitacao.nome_publicador}
                </p>
                <p className="mt-1 text-slate-500">
                  Solicitado em: {designandoSolicitacao.data_solicitacao} às {designandoSolicitacao.hora_solicitacao}
                </p>
              </div>

              <div>
                <label
                  htmlFor="select-territorio-designar"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  SELECIONE O TERRITÓRIO
                </label>
                {territoriosParaDesignar.length === 0 ? (
                  <div className="mt-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300">
                    <p className="font-semibold">Nenhum território disponível no momento!</p>
                    <p className="mt-1">
                      Para designar, vá até a aba "TERRITÓRIOS" e utilize a ação <em>"Tornar Disponível"</em> em um território concluído ou cadastre novos.
                    </p>
                  </div>
                ) : (
                  <select
                    id="select-territorio-designar"
                    required
                    value={selectedTerritorioIdParaDesignar}
                    onChange={(e) => setSelectedTerritorioIdParaDesignar(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">-- Escolha o território --</option>
                    {territoriosParaDesignar.map((ter) => (
                      <option key={ter.id} value={ter.id}>
                        Nº {ter.numero} — {ter.localidade} ({ter.descricao}){isStatusSolicitado(ter.status) ? ' [Solicitado]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedTerritorioParaDesignarObj && (
                <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-900 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300 space-y-1">
                  <p className="font-bold text-sm">
                    Confirmar designação?
                  </p>
                  <p><strong>Publicador:</strong> {designandoSolicitacao.nome_publicador}</p>
                  <p><strong>Território:</strong> Nº {selectedTerritorioParaDesignarObj.numero}</p>
                  <p><strong>Localidade:</strong> {selectedTerritorioParaDesignarObj.localidade}</p>
                </div>
              )}

              <div>
                <label
                  htmlFor="nome-responsavel-designacao-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  NOME DO RESPONSÁVEL
                </label>
                <input
                  id="nome-responsavel-designacao-input"
                  type="text"
                  value={responsavelDesignacaoNome}
                  onChange={(e) => setResponsavelDesignacaoNome(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {designacaoError && (
                <p className="text-xs text-red-600 dark:text-red-400">{designacaoError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDesignandoSolicitacao(null)}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  CANCELAR
                </button>
                <button
                  id="btn-confirmar-designacao-final"
                  type="submit"
                  disabled={territoriosDisponiveis.length === 0 || !selectedTerritorioIdParaDesignar}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  CONFIRMAR DESIGNAÇÃO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONFIRMAÇÃO PARA CANCELAR SOLICITAÇÃO */}
      {/* ------------------------------------------------------------- */}
      {solicitacaoParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Cancelar esta solicitação?
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSolicitacaoParaCancelar(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300 border border-slate-200 dark:border-slate-800 space-y-1">
                <p>
                  <strong>Publicador:</strong> {solicitacaoParaCancelar.nome_publicador}
                </p>
                <p className="text-slate-500">
                  Solicitado em: {solicitacaoParaCancelar.data_solicitacao} às {solicitacaoParaCancelar.hora_solicitacao}
                </p>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                A solicitação será encerrada e removida das solicitações pendentes sem designar nenhum território, sendo registrada como cancelada no histórico.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                id="btn-voltar-cancelar-solicitacao"
                type="button"
                onClick={() => setSolicitacaoParaCancelar(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                VOLTAR
              </button>
              <button
                id="btn-confirmar-cancelar-solicitacao"
                type="button"
                onClick={handleConfirmarCancelamento}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-800"
              >
                <XCircle className="h-3.5 w-3.5" />
                CANCELAR SOLICITAÇÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ANÁLISE DE TRANSFERÊNCIA */}
      {/* ------------------------------------------------------------- */}
      {analisandoTransferencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-600" />
                Analisar Transferência
              </h4>
              <button
                type="button"
                onClick={() => setAnalisandoTransferencia(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-md bg-slate-50 p-3.5 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-300 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <p>
                  <strong>Território:</strong> Nº {analisandoTransferencia.territorio_numero}
                  {analisandoTransferencia.territorio_localidade ? ` (${analisandoTransferencia.territorio_localidade})` : ''}
                </p>
                <p>
                  <strong>Publicador atual:</strong> {analisandoTransferencia.publicador_atual}
                </p>
                <p className="text-blue-700 dark:text-blue-400 font-semibold">
                  <strong>Novo irmão sugerido:</strong> {analisandoTransferencia.novo_publicador}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Solicitado em: {analisandoTransferencia.data_solicitacao} às {analisandoTransferencia.hora_solicitacao}
                </p>
              </div>

              <div>
                <label
                  htmlFor="resp-decisao-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  NOME DO RESPONSÁVEL
                </label>
                <input
                  id="resp-decisao-input"
                  type="text"
                  value={responsavelDecisaoNome}
                  onChange={(e) => setResponsavelDecisaoNome(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="rounded-md bg-blue-50 p-2.5 text-xs text-blue-900 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300">
                Se aprovada, o território passa diretamente para o novo irmão e permanece <strong>DESIGNADO</strong> (nunca passa por "Disponível"). Se recusada, permanece com o publicador atual.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  id="btn-recusar-transferencia"
                  type="button"
                  onClick={handleRecusarTransferencia}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300"
                >
                  RECUSAR
                </button>
                <button
                  id="btn-aprovar-transferencia"
                  type="button"
                  onClick={handleAprovarTransferencia}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  <Check className="h-3.5 w-3.5" />
                  APROVAR TRANSFERÊNCIA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CADASTRO / EDIÇÃO DE TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      {isFormTerritorioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTerritorioId ? 'Editar Território' : 'Cadastrar Território'}
              </h4>
              <button
                type="button"
                onClick={() => setIsFormTerritorioOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarTerritorio} className="mt-4 space-y-3.5">
              <div>
                <label htmlFor="input-numero-territorio" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  NÚMERO DO TERRITÓRIO *
                </label>
                <input
                  id="input-numero-territorio"
                  type="number"
                  min="1"
                  max="36"
                  required
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="Ex: 1 a 36"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="input-localidade-territorio" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  LOCALIDADE *
                </label>
                <input
                  id="input-localidade-territorio"
                  type="text"
                  required
                  value={formData.localidade}
                  onChange={(e) => setFormData({ ...formData, localidade: e.target.value })}
                  placeholder="Ex: Vila Cisper / Jd. Danfer"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="input-descricao-territorio" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  DESCRIÇÃO *
                </label>
                <textarea
                  id="input-descricao-territorio"
                  rows={2}
                  required
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Rua A até Rua B, travessas 1 a 4..."
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="input-observacao-territorio" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  OBSERVAÇÃO (OPCIONAL)
                </label>
                <input
                  id="input-observacao-territorio"
                  type="text"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Ex: Casas com cães bravos, condomínio fechado, etc."
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="input-mapa-url-territorio" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  LINK DO MAPA (GOOGLE DRIVE OU GOOGLE MAPS) *
                </label>
                <input
                  id="input-mapa-url-territorio"
                  type="url"
                  required
                  value={formData.mapa_url}
                  onChange={(e) => setFormData({ ...formData, mapa_url: e.target.value })}
                  placeholder="https://drive.google.com/... ou https://maps.google.com/..."
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormTerritorioOpen(false)}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-territorio-form"
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  SALVAR TERRITÓRIO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: CONFIRMAÇÃO DE EXCLUSÃO DE TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      {deletingTerritorio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Excluir Território Nº {deletingTerritorio.numero}?
              </h4>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Esta ação removerá o território do cadastro. O histórico de designações passadas permanecerá intacto.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTerritorio(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusaoTerritorio}
                className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: TORNAR DISPONÍVEL (INDIVIDUAL) */}
      {/* ------------------------------------------------------------- */}
      {tornandoDisponivelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Tornar Território Nº {tornandoDisponivelItem.numero} Disponível?
              </h4>
            </div>

            <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                <strong>Localidade:</strong> {tornandoDisponivelItem.localidade}
              </p>
              <p>
                <strong>Status atual:</strong> {tornandoDisponivelItem.status} (Último publicador: {tornandoDisponivelItem.designado_para || '-'})
              </p>
              <div className="rounded-md bg-slate-50 p-2.5 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                Ao disponibilizar para novo ciclo, a designação atual será removida e o território poderá ser designado novamente. <strong>O histórico de trabalhos anteriores será totalmente preservado.</strong>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="resp-disponibilizar-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nome do Responsável
              </label>
              <input
                id="resp-disponibilizar-input"
                type="text"
                value={responsavelDisponibilizarNome}
                onChange={(e) => setResponsavelDisponibilizarNome(e.target.value)}
                placeholder="Seu nome"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTornandoDisponivelItem(null)}
                className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-tornar-disponivel"
                type="button"
                onClick={handleConfirmarTornarDisponivel}
                className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                CONFIRMAR DISPONIBILIZAÇÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: INICIAR NOVO CICLO EM LOTE */}
      {/* ------------------------------------------------------------- */}
      {isNovoCicloModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-purple-600" />
                Iniciar Novo Ciclo de Territórios
              </h4>
              <button
                type="button"
                onClick={() => setIsNovoCicloModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Selecione os territórios concluídos/estornados que deseja disponibilizar novamente para designação:
            </p>

            <div className="mt-3 max-h-56 overflow-y-auto space-y-1.5 rounded-md border border-slate-200 p-2 dark:border-slate-800">
              {territoriosConcluidosEstornados.map((ter) => {
                const checked = selecionadosParaNovoCiclo.includes(ter.id);
                return (
                  <label
                    key={ter.id}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer ${
                      checked ? 'bg-purple-50 dark:bg-purple-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelectNovoCiclo(ter.id)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-bold text-slate-900 dark:text-white">
                        Nº {ter.numero}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {ter.localidade}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {ter.status}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-3">
              <label htmlFor="resp-lote-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nome do Responsável
              </label>
              <input
                id="resp-lote-input"
                type="text"
                value={responsavelDisponibilizarNome}
                onChange={(e) => setResponsavelDisponibilizarNome(e.target.value)}
                placeholder="Seu nome"
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNovoCicloModalOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarNovoCicloLote}
                disabled={selecionadosParaNovoCiclo.length === 0}
                className="rounded-md bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                DISPONIBILIZAR ({selecionadosParaNovoCiclo.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
