import React, { useState, useEffect } from 'react';
import {
  Map,
  Send,
  ExternalLink,
  CheckCircle2,
  Share2,
  RotateCcw,
  Clock,
  User,
  X,
  XCircle,
} from 'lucide-react';
import {
  Territorio,
  SolicitacaoTerritorio,
  TransferenciaTerritorio,
  getActivePublicador,
  setActivePublicador,
  createSolicitacao,
  cancelarSolicitacaoTerritorio,
  concluirTerritorioPublicador,
  estornarTerritorioPublicador,
  solicitarCompartilhamento,
  isStatusDesignado,
} from '../../data/territoriosStorage';

interface PublicadorTerritoriosViewProps {
  territorios: Territorio[];
  solicitacoes: SolicitacaoTerritorio[];
  transferencias: TransferenciaTerritorio[];
  onDataChange: () => void;
  onNotification: (msg: string) => void;
}

export const PublicadorTerritoriosView: React.FC<PublicadorTerritoriosViewProps> = ({
  territorios,
  solicitacoes,
  transferencias,
  onDataChange,
  onNotification,
}) => {
  // Publicador ativo identificado neste dispositivo
  const [activePublicador, setActivePublicadorState] = useState<string>('');
  const [isSolicitarModalOpen, setIsSolicitarModalOpen] = useState<boolean>(false);
  const [nomePublicadorInput, setNomePublicadorInput] = useState<string>('');
  const [solicitarError, setSolicitarError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modais de ação em "Meu Território"
  const [concluirTerritorioTarget, setConcluirTerritorioTarget] = useState<Territorio | null>(null);
  const [estornarTerritorioTarget, setEstornarTerritorioTarget] = useState<Territorio | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState<string>('');
  const [compartilharTerritorioTarget, setCompartilharTerritorioTarget] = useState<Territorio | null>(null);
  const [nomeNovoIrmao, setNomeNovoIrmao] = useState<string>('');
  const [compartilharError, setCompartilharError] = useState<string>('');

  // Inicializar publicador ativo
  useEffect(() => {
    const saved = getActivePublicador();
    if (saved) {
      setActivePublicadorState(saved);
      setNomePublicadorInput(saved);
    }
  }, []);

  // Encontrar territórios atualmente designados para o publicador ativo
  const meusTerritorios = React.useMemo(() => {
    if (!activePublicador.trim()) return [];
    const nomeNormalizado = activePublicador.trim().toLowerCase();
    return territorios.filter(
      (t) =>
        isStatusDesignado(t.status) &&
        t.designado_para &&
        t.designado_para.trim().toLowerCase() === nomeNormalizado
    );
  }, [territorios, activePublicador]);

  // Verificar se há solicitação pendente para este publicador
  const solicitacaoPendente = React.useMemo(() => {
    if (!activePublicador.trim()) return null;
    const nomeNormalizado = activePublicador.trim().toLowerCase();
    return solicitacoes.find(
      (s) =>
        s.status === 'Pendente' &&
        s.nome_publicador.trim().toLowerCase() === nomeNormalizado
    );
  }, [solicitacoes, activePublicador]);

  // Verificar transferências aguardando aprovação para os territórios do publicador
  const transferenciasPendentes = React.useMemo(() => {
    if (!activePublicador.trim()) return [];
    const nomeNormalizado = activePublicador.trim().toLowerCase();
    return transferencias.filter(
      (tr) =>
        tr.status === 'Aguardando aprovação' &&
        tr.publicador_atual.trim().toLowerCase() === nomeNormalizado
    );
  }, [transferencias, activePublicador]);

  // Abrir modal de solicitação
  const handleOpenSolicitar = () => {
    setNomePublicadorInput(activePublicador);
    setSolicitarError('');
    setIsSolicitarModalOpen(true);
  };

  // Enviar solicitação de território (apenas nome, sem lista de territórios ou escolhas)
  const handleSolicitarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nomePublicadorInput.trim();
    if (!nomeLimpo) {
      setSolicitarError('Por favor, informe seu nome completo.');
      return;
    }

    setIsSubmitting(true);
    setActivePublicador(nomeLimpo);
    setActivePublicadorState(nomeLimpo);
    setIsSolicitarModalOpen(false);
    setSolicitarError('');

    try {
      await createSolicitacao(nomeLimpo);
      onNotification('Solicitação de território enviada ao responsável com sucesso!');
      onDataChange();
    } catch (err) {
      console.error('Erro ao enviar solicitação:', err);
      onNotification('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancelar solicitação pendente do publicador
  const handleCancelarMinhaSolicitacao = async () => {
    if (!solicitacaoPendente) return;
    const solId = solicitacaoPendente.id;
    await cancelarSolicitacaoTerritorio(solId, activePublicador);
    onNotification('Sua solicitação de território foi cancelada.');
    onDataChange();
  };

  // ABRIR MAPA
  const handleAbrirMapa = (url: string) => {
    if (!url || !url.trim()) {
      alert('Nenhum link de mapa foi configurado pelo responsável para este território.');
      return;
    }
    window.open(url.trim(), '_blank', 'noopener,noreferrer');
  };

  // CONCLUIR TERRITÓRIO
  const handleConfirmarConclusao = async () => {
    if (!concluirTerritorioTarget) return;
    const targetId = concluirTerritorioTarget.id;
    setConcluirTerritorioTarget(null);
    onNotification('Território concluído. O registro foi enviado ao responsável.');
    await concluirTerritorioPublicador(targetId, activePublicador);
    onDataChange();
  };

  // ESTORNAR TERRITÓRIO
  const handleConfirmarEstorno = async () => {
    if (!estornarTerritorioTarget) return;
    const targetId = estornarTerritorioTarget.id;
    const motivo = motivoEstorno;
    setEstornarTerritorioTarget(null);
    setMotivoEstorno('');
    onNotification('Território devolvido ao responsável.');
    await estornarTerritorioPublicador(targetId, activePublicador, motivo);
    onDataChange();
  };

  // COMPARTILHAR TERRITÓRIO
  const handleEnviarCompartilhamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compartilharTerritorioTarget) return;
    const novoLimpo = nomeNovoIrmao.trim();
    if (!novoLimpo) {
      setCompartilharError('Por favor, informe o nome do irmão que continuará o trabalho.');
      return;
    }

    const targetId = compartilharTerritorioTarget.id;
    setCompartilharTerritorioTarget(null);
    setNomeNovoIrmao('');
    setCompartilharError('');
    onNotification('Solicitação de transferência enviada ao responsável.');
    await solicitarCompartilhamento(targetId, activePublicador, novoLimpo);
    onDataChange();
  };

  // =========================================================================
  // CASO 1: O PUBLICADOR TEM TERRITÓRIO ATUALMENTE DESIGNADO
  // =========================================================================
  if (meusTerritorios.length > 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Map className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              MEU TERRITÓRIO
            </h3>
            {activePublicador && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Designado para: <strong>{activePublicador}</strong>
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            {meusTerritorios.map((ter) => {
              const transfPendente = transferenciasPendentes.find(
                (tr) => tr.territorio_id === ter.id
              );

              return (
                <div
                  key={ter.id}
                  id={`meu-territorio-${ter.numero}`}
                  className="rounded-lg border border-blue-200 bg-white p-5 shadow-xs dark:border-blue-900/60 dark:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center rounded-md bg-blue-100 px-3 py-1 text-sm font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-200">
                          Território Nº {ter.numero}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded dark:bg-emerald-950/60 dark:text-emerald-300">
                          Trabalho Ativo
                        </span>
                      </div>

                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Localidade:
                        </span>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">
                          {ter.localidade}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Descrição:
                        </span>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {ter.descricao}
                        </p>
                      </div>

                      {ter.observacao && (
                        <div>
                          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Observação:
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                            {ter.observacao}
                          </p>
                        </div>
                      )}

                      {ter.data_ultima_designacao && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 pt-1">
                          Designado em: {ter.data_ultima_designacao}
                          {ter.responsavel_designacao ? ` por ${ter.responsavel_designacao}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0">
                      <button
                        id={`btn-abrir-mapa-${ter.numero}`}
                        type="button"
                        onClick={() => handleAbrirMapa(ter.mapa_url)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        ABRIR MAPA
                      </button>

                      <button
                        id={`btn-concluir-${ter.numero}`}
                        type="button"
                        onClick={() => setConcluirTerritorioTarget(ter)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        CONCLUIR
                      </button>

                      <button
                        id={`btn-compartilhar-${ter.numero}`}
                        type="button"
                        onClick={() => {
                          setCompartilharTerritorioTarget(ter);
                          setNomeNovoIrmao('');
                          setCompartilharError('');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <Share2 className="h-3.5 w-3.5 text-slate-500" />
                        COMPARTILHAR
                      </button>

                      <button
                        id={`btn-estornar-${ter.numero}`}
                        type="button"
                        onClick={() => {
                          setEstornarTerritorioTarget(ter);
                          setMotivoEstorno('');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        ESTORNAR
                      </button>
                    </div>
                  </div>

                  {transfPendente && (
                    <div className="mt-4 rounded-md bg-blue-50 p-2.5 text-xs text-blue-900 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>
                          Solicitação de transferência para <strong>{transfPendente.novo_publicador}</strong> enviada. Aguardando responsável.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAIS DE CONCLUIR, ESTORNAR E COMPARTILHAR */}
        {concluirTerritorioTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Confirmar conclusão do território?
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                    Território Nº {concluirTerritorioTarget.numero} ({concluirTerritorioTarget.localidade}).
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    O território sairá da sua tela e você poderá solicitar um novo território a qualquer momento.
                  </p>
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConcluirTerritorioTarget(null)}
                      className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                    >
                      CANCELAR
                    </button>
                    <button
                      id="btn-confirmar-conclusao"
                      type="button"
                      onClick={handleConfirmarConclusao}
                      className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      CONFIRMAR CONCLUSÃO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {estornarTerritorioTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Devolver território ao responsável?
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Território Nº {estornarTerritorioTarget.numero} ({estornarTerritorioTarget.localidade}).
                  </p>
                  <div className="mt-3">
                    <label htmlFor="motivo-estorno-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Motivo (opcional):
                    </label>
                    <input
                      id="motivo-estorno-input"
                      type="text"
                      value={motivoEstorno}
                      onChange={(e) => setMotivoEstorno(e.target.value)}
                      placeholder="Ex: Não poderei trabalhar no fim de semana"
                      className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEstornarTerritorioTarget(null);
                        setMotivoEstorno('');
                      }}
                      className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                    >
                      CANCELAR
                    </button>
                    <button
                      id="btn-confirmar-estorno"
                      type="button"
                      onClick={handleConfirmarEstorno}
                      className="rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition"
                    >
                      CONFIRMAR DEVOLUÇÃO
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {compartilharTerritorioTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-blue-600" />
                  Compartilhar território
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setCompartilharTerritorioTarget(null);
                    setNomeNovoIrmao('');
                    setCompartilharError('');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEnviarCompartilhamento} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="input-novo-irmao" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    NOME DO IRMÃO
                  </label>
                  <input
                    id="input-novo-irmao"
                    type="text"
                    required
                    value={nomeNovoIrmao}
                    onChange={(e) => setNomeNovoIrmao(e.target.value)}
                    placeholder="Nome completo do irmão"
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  {compartilharError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{compartilharError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompartilharTerritorioTarget(null);
                      setNomeNovoIrmao('');
                      setCompartilharError('');
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-enviar-compartilhamento"
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    ENVIAR
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // CASO 2: O PUBLICADOR NÃO TEM TERRITÓRIO DESIGNADO (EXTREMAMENTE SIMPLES)
  // Somente o botão de solicitação. Sem listas, sem números, sem histórico.
  // =========================================================================
  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <Map className="h-7 w-7" />
        </div>

        <h3 className="text-xl font-black uppercase tracking-wide text-slate-900 dark:text-white">
          Territórios
        </h3>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
          Solicite um território para realizar o trabalho de pregação.
        </p>

        {/* Se já houver solicitação pendente aguardando o responsável */}
        {solicitacaoPendente ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-left dark:border-amber-900/60 dark:bg-amber-950/40 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900/80 dark:text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                  Solicitação enviada ao responsável
                </span>
                <p className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  Publicador: {solicitacaoPendente.nome_publicador}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Enviado em {solicitacaoPendente.data_solicitacao} às {solicitacaoPendente.hora_solicitacao}.
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Aguardando o irmão responsável efetuar a designação.
                </p>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2 border-t border-amber-200/80 dark:border-amber-900/50">
              <button
                type="button"
                onClick={handleCancelarMinhaSolicitacao}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-400 transition"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar solicitação
              </button>
            </div>
          </div>
        ) : (
          /* Botão Único de Solicitação */
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              id="btn-solicitar-territorio"
              type="button"
              onClick={handleOpenSolicitar}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 transition"
            >
              <Send className="h-4 w-4" />
              <span>SOLICITAR TERRITÓRIO</span>
            </button>

            {activePublicador && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <User className="h-3.5 w-3.5" />
                <span>Publicador:</span>
                <strong className="text-slate-800 dark:text-slate-200">{activePublicador}</strong>
                <button
                  type="button"
                  onClick={handleOpenSolicitar}
                  className="text-blue-600 hover:underline dark:text-blue-400 ml-1"
                >
                  (trocar)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL SIMPLES: SOLICITAR TERRITÓRIO (APENAS NOME DO PUBLICADOR) */}
      {isSolicitarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                Solicitar Território
              </h4>
              <button
                type="button"
                onClick={() => setIsSolicitarModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSolicitarSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="input-nome-publicador"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Seu Nome Completo
                </label>
                <input
                  id="input-nome-publicador"
                  type="text"
                  required
                  autoFocus
                  value={nomePublicadorInput}
                  onChange={(e) => setNomePublicadorInput(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                {solicitarError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{solicitarError}</p>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sua solicitação será enviada imediatamente ao irmão responsável para designação.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSolicitarModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-solicitar"
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-blue-800 disabled:opacity-50 transition"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Enviando...' : 'SOLICITAR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
