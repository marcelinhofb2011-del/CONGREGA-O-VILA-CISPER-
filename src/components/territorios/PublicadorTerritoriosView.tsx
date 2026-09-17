import React, { useState, useEffect } from 'react';
import {
  Map,
  Send,
  ExternalLink,
  CheckCircle2,
  Share2,
  RotateCcw,
  AlertCircle,
  Clock,
  User,
  X,
  FileText,
} from 'lucide-react';
import {
  Territorio,
  SolicitacaoTerritorio,
  TransferenciaTerritorio,
  getActivePublicador,
  setActivePublicador,
  createSolicitacao,
  concluirTerritorioPublicador,
  estornarTerritorioPublicador,
  solicitarCompartilhamento,
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
  const [editPublicadorInput, setEditPublicadorInput] = useState<string>('');
  const [isEditingPublicador, setIsEditingPublicador] = useState<boolean>(false);

  // Formulário de solicitação
  const [isSolicitarOpen, setIsSolicitarOpen] = useState<boolean>(false);
  const [nomePublicadorInput, setNomePublicadorInput] = useState<string>('');
  const [solicitarFeedback, setSolicitarFeedback] = useState<string>('');
  const [solicitarError, setSolicitarError] = useState<string>('');

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
      setEditPublicadorInput(saved);
    }
  }, []);

  // Encontrar territórios atualmente designados para o publicador ativo
  const meusTerritorios = React.useMemo(() => {
    if (!activePublicador.trim()) return [];
    const nomeNormalizado = activePublicador.trim().toLowerCase();
    return territorios.filter(
      (t) => t.status === 'Designado' && t.designado_para && t.designado_para.trim().toLowerCase() === nomeNormalizado
    );
  }, [territorios, activePublicador]);

  // Verificar se há solicitação pendente para este publicador
  const solicitacaoPendente = React.useMemo(() => {
    if (!activePublicador.trim()) return null;
    const nomeNormalizado = activePublicador.trim().toLowerCase();
    return solicitacoes.find(
      (s) => s.status === 'Pendente' && s.nome_publicador.trim().toLowerCase() === nomeNormalizado
    );
  }, [solicitacoes, activePublicador]);

  // Verificar transferências aguardando aprovação para os territórios do publicador
  const transferenciasPendentes = React.useMemo(() => {
    if (!activePublicador.trim()) return [];
    const nomeNormalizado = activePublicador.trim().toLowerCase();
    return transferencias.filter(
      (tr) => tr.status === 'Aguardando aprovação' && tr.publicador_atual.trim().toLowerCase() === nomeNormalizado
    );
  }, [transferencias, activePublicador]);

  // Enviar solicitação de território
  const handleSolicitarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nomePublicadorInput.trim();
    if (!nomeLimpo) {
      setSolicitarError('Por favor, informe seu nome completo.');
      return;
    }

    createSolicitacao(nomeLimpo);
    setActivePublicador(nomeLimpo);
    setActivePublicadorState(nomeLimpo);
    setEditPublicadorInput(nomeLimpo);
    setNomePublicadorInput('');
    setSolicitarError('');
    setIsSolicitarOpen(false);
    setSolicitarFeedback('Solicitação enviada ao responsável.');
    onNotification('Solicitação de território enviada ao responsável com sucesso!');
    onDataChange();
  };

  // Trocar / Identificar publicador ativo
  const handleSalvarPublicadorAtivo = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = editPublicadorInput.trim();
    setActivePublicador(nomeLimpo);
    setActivePublicadorState(nomeLimpo);
    setIsEditingPublicador(false);
    if (nomeLimpo) {
      onNotification(`Publicador atualizado para: ${nomeLimpo}`);
    }
  };

  // ABRIR MAPA
  const handleAbrirMapa = (url: string) => {
    if (!url || !url.trim()) {
      alert('Nenhum link de mapa foi configurado pelo responsável para este território.');
      return;
    }
    window.open(url.trim(), '_blank', 'noopener,noreferrer');
  };

  // CONCLUIR
  const handleConfirmarConclusao = () => {
    if (!concluirTerritorioTarget) return;
    concluirTerritorioPublicador(concluirTerritorioTarget.id, activePublicador);
    setConcluirTerritorioTarget(null);
    onNotification(`Território nº ${concluirTerritorioTarget.numero} concluído. O registro foi enviado ao responsável.`);
    onDataChange();
  };

  // ESTORNAR
  const handleConfirmarEstorno = () => {
    if (!estornarTerritorioTarget) return;
    estornarTerritorioPublicador(estornarTerritorioTarget.id, activePublicador, motivoEstorno);
    setEstornarTerritorioTarget(null);
    setMotivoEstorno('');
    onNotification(`Território nº ${estornarTerritorioTarget.numero} estornado e devolvido ao responsável.`);
    onDataChange();
  };

  // COMPARTILHAR
  const handleEnviarCompartilhamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compartilharTerritorioTarget) return;
    const novoLimpo = nomeNovoIrmao.trim();
    if (!novoLimpo) {
      setCompartilharError('Por favor, informe o nome do irmão que continuará o trabalho.');
      return;
    }

    solicitarCompartilhamento(compartilharTerritorioTarget.id, activePublicador, novoLimpo);
    setCompartilharTerritorioTarget(null);
    setNomeNovoIrmao('');
    setCompartilharError('');
    onNotification('Solicitação de transferência enviada ao responsável para análise.');
    onDataChange();
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* SEÇÃO 1: ÁREA PÚBLICA — SOLICITAR TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Map className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            TERRITÓRIOS
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Solicite um território para realizar o trabalho de pregação.
          </p>

          {/* Botão para abrir o formulário */}
          {!isSolicitarOpen ? (
            <div className="mt-5">
              <button
                id="btn-solicitar-territorio"
                type="button"
                onClick={() => {
                  setIsSolicitarOpen(true);
                  if (activePublicador) {
                    setNomePublicadorInput(activePublicador);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Send className="h-4 w-4" />
                SOLICITAR TERRITÓRIO
              </button>
            </div>
          ) : (
            <form onSubmit={handleSolicitarSubmit} className="mt-6 text-left border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="space-y-4">
                <div>
                  <label htmlFor="input-nome-publicador" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    NOME DO PUBLICADOR
                  </label>
                  <input
                    id="input-nome-publicador"
                    type="text"
                    required
                    value={nomePublicadorInput}
                    onChange={(e) => setNomePublicadorInput(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden focus:ring-1 focus:ring-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
                  />
                  {solicitarError && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{solicitarError}</p>
                  )}
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    O irmão responsável receberá seu pedido e designará o território adequado.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSolicitarOpen(false);
                      setSolicitarError('');
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    id="btn-confirmar-solicitar"
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <Send className="h-3.5 w-3.5" />
                    SOLICITAR
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Feedback de solicitação enviada */}
          {solicitarFeedback && (
            <div className="mt-4 rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800/80 dark:text-emerald-300">
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{solicitarFeedback}</span>
              </div>
            </div>
          )}

          {/* Aviso de solicitação pendente para este publicador */}
          {solicitacaoPendente && !solicitarFeedback && (
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:border-amber-800/80 dark:text-amber-300">
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>
                  Você possui uma solicitação enviada em <strong>{solicitacaoPendente.data_solicitacao} às {solicitacaoPendente.hora_solicitacao}</strong> aguardando designação do responsável.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Identificador sutil do Publicador neste dispositivo */}
        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>Publicador neste dispositivo:</span>
              {isEditingPublicador ? (
                <form onSubmit={handleSalvarPublicadorAtivo} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editPublicadorInput}
                    onChange={(e) => setEditPublicadorInput(e.target.value)}
                    placeholder="Seu nome"
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="rounded bg-slate-900 px-2 py-0.5 font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPublicador(false)}
                    className="rounded px-1.5 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <strong className="text-slate-800 dark:text-slate-200">
                  {activePublicador || 'Não informado'}
                </strong>
              )}
            </div>
            {!isEditingPublicador && (
              <button
                type="button"
                onClick={() => setIsEditingPublicador(true)}
                className="text-slate-600 hover:text-slate-900 underline underline-offset-2 dark:text-slate-400 dark:hover:text-white"
              >
                {activePublicador ? 'Trocar ou consultar outro nome' : 'Informar meu nome'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEÇÃO 2: MEU TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      {meusTerritorios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Map className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              MEU TERRITÓRIO
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Designado para: <strong>{activePublicador}</strong>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-1">
            {meusTerritorios.map((ter) => {
              // Checar se há transferência pendente para este território
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

                    {/* BOTÕES DO MEU TERRITÓRIO:
                        1. ABRIR MAPA
                        2. CONCLUIR
                        3. COMPARTILHAR
                        4. ESTORNAR
                    */}
                    <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 pt-2 sm:pt-0">
                      {/* 1. ABRIR MAPA */}
                      <button
                        id={`btn-abrir-mapa-${ter.numero}`}
                        type="button"
                        onClick={() => handleAbrirMapa(ter.mapa_url)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        ABRIR MAPA
                      </button>

                      {/* 2. CONCLUIR */}
                      <button
                        id={`btn-concluir-${ter.numero}`}
                        type="button"
                        onClick={() => setConcluirTerritorioTarget(ter)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        CONCLUIR
                      </button>

                      {/* 3. COMPARTILHAR */}
                      <button
                        id={`btn-compartilhar-${ter.numero}`}
                        type="button"
                        onClick={() => {
                          setCompartilharTerritorioTarget(ter);
                          setNomeNovoIrmao('');
                          setCompartilharError('');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Share2 className="h-3.5 w-3.5 text-slate-500" />
                        COMPARTILHAR
                      </button>

                      {/* 4. ESTORNAR */}
                      <button
                        id={`btn-estornar-${ter.numero}`}
                        type="button"
                        onClick={() => {
                          setEstornarTerritorioTarget(ter);
                          setMotivoEstorno('');
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-950"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        ESTORNAR
                      </button>
                    </div>
                  </div>

                  {/* Aviso de transferência pendente de aprovação */}
                  {transfPendente && (
                    <div className="mt-4 rounded-md bg-blue-50 p-2.5 text-xs text-blue-900 border border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>
                          Solicitação de transferência para o irmão <strong>{transfPendente.novo_publicador}</strong> enviada em {transfPendente.data_solicitacao}. Aguardando análise do responsável.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: CONCLUIR TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      {concluirTerritorioTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Deseja marcar este território como concluído?
                </h4>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                  Território Nº {concluirTerritorioTarget.numero} ({concluirTerritorioTarget.localidade}).
                </p>
                <div className="mt-3 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                  <p>
                    O território sairá de <em>"Meu território"</em> e será enviado para o painel do responsável com o registro de conclusão.
                  </p>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300">
                    O território aguardará a decisão do responsável para ser disponibilizado novamente.
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConcluirTerritorioTarget(null)}
                    className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    CANCELAR
                  </button>
                  <button
                    id="btn-confirmar-conclusao"
                    type="button"
                    onClick={handleConfirmarConclusao}
                    className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ESTORNAR TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      {estornarTerritorioTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Deseja devolver este território ao responsável?
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
                    placeholder="Ex: Não poderei trabalhar no fim de semana, viagem, etc."
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="mt-3 rounded-md bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:border-amber-900 dark:text-amber-300">
                  O território será retirado de sua visualização e aguardará a decisão do responsável para o próximo ciclo.
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEstornarTerritorioTarget(null);
                      setMotivoEstorno('');
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    CANCELAR
                  </button>
                  <button
                    id="btn-confirmar-estorno"
                    type="button"
                    onClick={handleConfirmarEstorno}
                    className="rounded-md bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                  >
                    CONFIRMAR ESTORNO
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: COMPARTILHAR TERRITÓRIO */}
      {/* ------------------------------------------------------------- */}
      {compartilharTerritorioTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-600" />
                Compartilhar este território com outro irmão
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
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Território Nº {compartilharTerritorioTarget.numero} ({compartilharTerritorioTarget.localidade}).
              </p>

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
                  placeholder="Ex: Carlos Alberto"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                {compartilharError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{compartilharError}</p>
                )}
              </div>

              <div className="rounded-md bg-blue-50 p-2.5 text-xs text-blue-900 border border-blue-200 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300">
                Uma solicitação de transferência será gerada para o irmão responsável aprovar. Até que ele aprove, o território continua vinculado a você e não fica disponível.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompartilharTerritorioTarget(null);
                    setNomeNovoIrmao('');
                    setCompartilharError('');
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  id="btn-enviar-compartilhamento"
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <Send className="h-3.5 w-3.5" />
                  ENVIAR SOLICITAÇÃO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
