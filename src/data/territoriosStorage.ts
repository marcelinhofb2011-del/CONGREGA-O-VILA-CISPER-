import { firebaseSync } from './firebaseSyncService';

// Armazenamento e gerenciamento permanente de Territórios, Solicitações, Transferências e Histórico

export type StatusTerritorio = 'Disponível' | 'Designado' | 'Concluído' | 'Estornado';
export type StatusSolicitacao = 'Pendente' | 'Designado' | 'Cancelada';
export type StatusTransferencia = 'Aguardando aprovação' | 'Aprovada' | 'Recusada';

export interface Territorio {
  id: string;
  numero: number;
  localidade: string;
  descricao: string;
  observacao?: string;
  mapa_url: string; // Link Google Drive / Google Maps
  status: StatusTerritorio;
  designado_para?: string; // Nome do publicador quando designado
  data_ultima_designacao?: string; // DD/MM/AAAA
  hora_ultima_designacao?: string; // HH:mm
  responsavel_designacao?: string; // Nome do responsável que designou
  data_conclusao?: string; // DD/MM/AAAA HH:mm
  data_estorno?: string; // DD/MM/AAAA HH:mm
  motivo_estorno?: string;
  data_ultimo_retorno_sort?: string; // ISO string para ordenação dos concluídos/estornados
  created_at: string;
  updated_at?: string;
}

export interface SolicitacaoTerritorio {
  id: string;
  nome_publicador: string;
  data_solicitacao: string; // DD/MM/AAAA
  hora_solicitacao: string; // HH:mm
  status: StatusSolicitacao;
  territorio_id?: string;
  territorio_numero?: number;
  data_designacao?: string;
  responsavel?: string;
  created_at: string;
}

export interface TransferenciaTerritorio {
  id: string;
  territorio_id: string;
  territorio_numero: number;
  territorio_localidade?: string;
  publicador_atual: string;
  novo_publicador: string;
  data_solicitacao: string; // DD/MM/AAAA
  hora_solicitacao: string; // HH:mm
  status: StatusTransferencia;
  responsavel?: string;
  data_decisao?: string;
  created_at: string;
}

export interface HistoricoTerritorio {
  id: string;
  territorio_id?: string;
  territorio_numero: number;
  territorio_localidade?: string;
  publicador: string;
  acao: string; // 'Solicitação', 'Designação', 'Conclusão', 'Estorno', 'Compartilhamento Solicitado', 'Transferência Aprovada', 'Transferência Recusada', 'Disponibilizado para Novo Ciclo'
  status: string;
  responsavel: string;
  data: string; // DD/MM/AAAA HH:mm
  observacao?: string;
  created_at: string;
}

// Chaves de armazenamento local
export const STORAGE_KEY_TERRITORIOS = 'vila_cisper_territorios_lista';
const STORAGE_KEY_SOLICITACOES = 'vila_cisper_territorios_solicitacoes';
const STORAGE_KEY_TRANSFERENCIAS = 'vila_cisper_territorios_transferencias';
const STORAGE_KEY_HISTORICO = 'vila_cisper_territorios_historico';
const STORAGE_KEY_ADMIN_SENHA = 'vila_cisper_admin_senha';
const STORAGE_KEY_PUBLICADOR_ATIVO = 'vila_cisper_publicador_ativo';
const SESSION_KEY_ADMIN_AUTH = 'vila_cisper_admin_auth_session';

// Senha padrão inicial caso o responsável ainda não tenha alterado
const SENHA_PADRAO_INICIAL = 'cisper2026';

function formatarDataHoje(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function formatarHoraHoje(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatarDataHoraHoje(): string {
  return `${formatarDataHoje()} às ${formatarHoraHoje()}`;
}

// -------------------------------------------------------------
// Identificação do Publicador Ativo no Dispositivo
// -------------------------------------------------------------
export function getActivePublicador(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_PUBLICADOR_ATIVO) || '';
  } catch {
    return '';
  }
}

export function setActivePublicador(nome: string): void {
  try {
    if (nome.trim()) {
      localStorage.setItem(STORAGE_KEY_PUBLICADOR_ATIVO, nome.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_PUBLICADOR_ATIVO);
    }
  } catch {
    // LocalStorage indisponível
  }
}

// -------------------------------------------------------------
// Autenticação Administrativa (SOMENTE para os responsáveis)
// -------------------------------------------------------------
export function getAdminPassword(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADMIN_SENHA);
    return saved && saved.trim() ? saved.trim() : SENHA_PADRAO_INICIAL;
  } catch {
    return SENHA_PADRAO_INICIAL;
  }
}

export function verifyAdminPassword(input: string): boolean {
  const current = getAdminPassword();
  return input.trim() === current;
}

export function setAdminAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      sessionStorage.setItem(SESSION_KEY_ADMIN_AUTH, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEY_ADMIN_AUTH);
    }
  } catch {
    // sessionStorage indisponível
  }
}

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY_ADMIN_AUTH) === 'true';
  } catch {
    return false;
  }
}

export function updateAdminPassword(oldPass: string, newPass: string): { success: boolean; error?: string } {
  if (!verifyAdminPassword(oldPass)) {
    return { success: false, error: 'Senha atual incorreta.' };
  }
  if (!newPass || newPass.trim().length < 4) {
    return { success: false, error: 'A nova senha deve ter pelo menos 4 caracteres.' };
  }
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_SENHA, newPass.trim());
    return { success: true };
  } catch {
    return { success: false, error: 'Erro ao salvar a nova senha.' };
  }
}

// -------------------------------------------------------------
// Gerenciamento de Territórios
// -------------------------------------------------------------
export function getStoredTerritorios(): Territorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TERRITORIOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function persistAndSyncTerritorios(territorios: Territorio[]): void {
  localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(territorios));
  firebaseSync.saveAllTerritorios(territorios);
}

export function saveStoredTerritorio(item: Territorio): Territorio[] {
  const current = getStoredTerritorios();
  const index = current.findIndex((t) => t.id === item.id);
  const now = new Date().toISOString();

  let updated: Territorio[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = {
      ...item,
      updated_at: now,
    };
  } else {
    updated = [
      ...current,
      {
        ...item,
        created_at: item.created_at || now,
        updated_at: now,
      },
    ];
  }

  persistAndSyncTerritorios(updated);
  return updated;
}

export function deleteStoredTerritorio(id: string): Territorio[] {
  const current = getStoredTerritorios();
  const updated = current.filter((t) => t.id !== id);
  persistAndSyncTerritorios(updated);
  return updated;
}

// -------------------------------------------------------------
// Solicitações de Território (Feitas por publicadores)
// -------------------------------------------------------------
export function getStoredSolicitacoes(): SolicitacaoTerritorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export function createSolicitacao(nomePublicador: string): SolicitacaoTerritorio[] {
  const current = getStoredSolicitacoes();
  const now = new Date();
  const dataHoje = formatarDataHoje();
  const horaHoje = formatarHoraHoje();

  const nova: SolicitacaoTerritorio = {
    id: String(Date.now()),
    nome_publicador: nomePublicador.trim(),
    data_solicitacao: dataHoje,
    hora_solicitacao: horaHoje,
    status: 'Pendente',
    created_at: now.toISOString(),
  };

  const updated = [nova, ...current];
  localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(updated));

  // Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now() + 1),
    territorio_numero: 0,
    publicador: nomePublicador.trim(),
    acao: 'Solicitação',
    status: 'Pendente',
    responsavel: 'Publicador',
    data: `${dataHoje} às ${horaHoje}`,
    observacao: 'Solicitação de território enviada ao responsável.',
    created_at: now.toISOString(),
  };
  saveStoredHistorico(historicoItem);

  // Lembrar publicador ativo neste dispositivo
  setActivePublicador(nomePublicador.trim());

  return updated;
}

// Designar território para uma solicitação (AÇÃO EXCLUSIVA DO RESPONSÁVEL)
export function designarTerritorioParaSolicitacao(
  solicitacaoId: string,
  territorioId: string,
  responsavelNome: string
): { solicitacoes: SolicitacaoTerritorio[]; territorios: Territorio[]; historico: HistoricoTerritorio[] } {
  const solicitacoes = getStoredSolicitacoes();
  const territorios = getStoredTerritorios();
  const now = new Date();
  const dataHojeBR = formatarDataHoje();
  const horaHojeBR = formatarHoraHoje();

  const solIndex = solicitacoes.findIndex((s) => s.id === solicitacaoId);
  const terIndex = territorios.findIndex((t) => t.id === territorioId);

  if (solIndex === -1 || terIndex === -1) {
    return { solicitacoes, territorios, historico: getStoredHistorico() };
  }

  const sol = solicitacoes[solIndex];
  const ter = territorios[terIndex];

  // Somente territórios marcados como Disponível podem ser escolhidos!
  if (ter.status !== 'Disponível') {
    return { solicitacoes, territorios, historico: getStoredHistorico() };
  }

  // 1. Atualizar a solicitação
  solicitacoes[solIndex] = {
    ...sol,
    status: 'Designado',
    territorio_id: ter.id,
    territorio_numero: ter.numero,
    data_designacao: dataHojeBR,
    responsavel: responsavelNome.trim(),
  };
  localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(solicitacoes));

  // 2. Atualizar o território para "Designado"
  territorios[terIndex] = {
    ...ter,
    status: 'Designado',
    designado_para: sol.nome_publicador,
    data_ultima_designacao: dataHojeBR,
    hora_ultima_designacao: horaHojeBR,
    responsavel_designacao: responsavelNome.trim(),
    data_conclusao: undefined,
    data_estorno: undefined,
    motivo_estorno: undefined,
    data_ultimo_retorno_sort: undefined,
    updated_at: now.toISOString(),
  };
  persistAndSyncTerritorios(territorios);

  // 3. Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_id: ter.id,
    territorio_numero: ter.numero,
    territorio_localidade: ter.localidade,
    publicador: sol.nome_publicador,
    acao: 'Designação',
    status: 'Designado',
    responsavel: responsavelNome.trim() || 'Responsável',
    data: `${dataHojeBR} às ${horaHojeBR}`,
    observacao: `Designado para ${sol.nome_publicador}`,
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { solicitacoes, territorios, historico: updatedHistorico };
}

// Cancelar solicitação sem designar nenhum território (AÇÃO DO RESPONSÁVEL)
export function cancelarSolicitacaoTerritorio(
  solicitacaoId: string,
  responsavelNome?: string
): { solicitacoes: SolicitacaoTerritorio[]; historico: HistoricoTerritorio[] } {
  const solicitacoes = getStoredSolicitacoes();
  const solIndex = solicitacoes.findIndex((s) => s.id === solicitacaoId);

  if (solIndex === -1) {
    return { solicitacoes, historico: getStoredHistorico() };
  }

  const sol = solicitacoes[solIndex];
  const now = new Date();
  const dataHojeBR = formatarDataHoje();
  const horaHojeBR = formatarHoraHoje();

  // 1. Remover a solicitação da lista de solicitações pendentes
  const updatedSolicitacoes = solicitacoes.filter((s) => s.id !== solicitacaoId);
  localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(updatedSolicitacoes));

  // 2. Registrar a solicitação como Cancelada no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_numero: 0,
    publicador: sol.nome_publicador,
    acao: 'Solicitação Cancelada',
    status: 'Cancelada',
    responsavel: (responsavelNome && responsavelNome.trim()) || 'Irmão Responsável',
    data: `${dataHojeBR} às ${horaHojeBR}`,
    observacao: 'Solicitação cancelada pelo responsável sem designação de território.',
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { solicitacoes: updatedSolicitacoes, historico: updatedHistorico };
}

// -------------------------------------------------------------
// Ações do Publicador em "Meu Território"
// -------------------------------------------------------------

// CONCLUIR: Trabalho de pregação finalizado pelo publicador
// IMPORTANTE: Concluído NÃO significa Disponível! Aguarda decisão do responsável.
export function concluirTerritorioPublicador(
  territorioId: string,
  publicadorNome: string
): { territorios: Territorio[]; historico: HistoricoTerritorio[] } {
  const territorios = getStoredTerritorios();
  const index = territorios.findIndex((t) => t.id === territorioId);

  if (index === -1) {
    return { territorios, historico: getStoredHistorico() };
  }

  const ter = territorios[index];
  const now = new Date();
  const dataHora = formatarDataHoraHoje();

  territorios[index] = {
    ...ter,
    status: 'Concluído',
    data_conclusao: dataHora,
    data_ultimo_retorno_sort: now.toISOString(),
    updated_at: now.toISOString(),
  };
  persistAndSyncTerritorios(territorios);

  // Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_id: ter.id,
    territorio_numero: ter.numero,
    territorio_localidade: ter.localidade,
    publicador: publicadorNome.trim() || ter.designado_para || 'Publicador',
    acao: 'Conclusão',
    status: 'Concluído',
    responsavel: 'Publicador',
    data: dataHora,
    observacao: 'Trabalho de pregação concluído pelo publicador. Aguarda decisão do responsável.',
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { territorios, historico: updatedHistorico };
}

// ESTORNAR: Publicador não pôde continuar e devolve o território
// IMPORTANTE: Estornado NÃO significa Disponível! Aguarda decisão do responsável.
export function estornarTerritorioPublicador(
  territorioId: string,
  publicadorNome: string,
  motivo?: string
): { territorios: Territorio[]; historico: HistoricoTerritorio[] } {
  const territorios = getStoredTerritorios();
  const index = territorios.findIndex((t) => t.id === territorioId);

  if (index === -1) {
    return { territorios, historico: getStoredHistorico() };
  }

  const ter = territorios[index];
  const now = new Date();
  const dataHora = formatarDataHoraHoje();

  territorios[index] = {
    ...ter,
    status: 'Estornado',
    data_estorno: dataHora,
    motivo_estorno: motivo?.trim() || undefined,
    data_ultimo_retorno_sort: now.toISOString(),
    updated_at: now.toISOString(),
  };
  persistAndSyncTerritorios(territorios);

  // Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_id: ter.id,
    territorio_numero: ter.numero,
    territorio_localidade: ter.localidade,
    publicador: publicadorNome.trim() || ter.designado_para || 'Publicador',
    acao: 'Estorno',
    status: 'Estornado',
    responsavel: 'Publicador',
    data: dataHora,
    observacao: motivo?.trim() ? `Motivo informado: ${motivo.trim()}` : 'Devolvido ao responsável sem motivo especificado.',
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { territorios, historico: updatedHistorico };
}

// COMPARTILHAR: Gera solicitação de transferência para o responsável
// IMPORTANTE: O território continua vinculado ao publicador atual e NÃO fica disponível!
export function solicitarCompartilhamento(
  territorioId: string,
  publicadorAtual: string,
  novoPublicador: string
): { transferencias: TransferenciaTerritorio[]; historico: HistoricoTerritorio[] } {
  const currentTransf = getStoredTransferencias();
  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === territorioId);
  const now = new Date();
  const dataHoje = formatarDataHoje();
  const horaHoje = formatarHoraHoje();

  const nova: TransferenciaTerritorio = {
    id: String(Date.now()),
    territorio_id: territorioId,
    territorio_numero: ter ? ter.numero : 0,
    territorio_localidade: ter?.localidade,
    publicador_atual: publicadorAtual.trim(),
    novo_publicador: novoPublicador.trim(),
    data_solicitacao: dataHoje,
    hora_solicitacao: horaHoje,
    status: 'Aguardando aprovação',
    created_at: now.toISOString(),
  };

  const updatedTransf = [nova, ...currentTransf];
  localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(updatedTransf));

  // Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now() + 1),
    territorio_id: territorioId,
    territorio_numero: ter ? ter.numero : 0,
    territorio_localidade: ter?.localidade,
    publicador: publicadorAtual.trim(),
    acao: 'Compartilhamento Solicitado',
    status: 'Aguardando aprovação',
    responsavel: 'Publicador',
    data: `${dataHoje} às ${horaHoje}`,
    observacao: `Solicitada transferência para o irmão ${novoPublicador.trim()}`,
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { transferencias: updatedTransf, historico: updatedHistorico };
}

// -------------------------------------------------------------
// Gerenciamento de Transferências (Área do Responsável)
// -------------------------------------------------------------
export function getStoredTransferencias(): TransferenciaTerritorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSFERENCIAS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export function aprovarTransferencia(
  transferenciaId: string,
  responsavelNome: string
): { transferencias: TransferenciaTerritorio[]; territorios: Territorio[]; historico: HistoricoTerritorio[] } {
  const transferencias = getStoredTransferencias();
  const territorios = getStoredTerritorios();
  const tIndex = transferencias.findIndex((t) => t.id === transferenciaId);

  if (tIndex === -1) {
    return { transferencias, territorios, historico: getStoredHistorico() };
  }

  const transf = transferencias[tIndex];
  const now = new Date();
  const dataHora = formatarDataHoraHoje();

  // 1. Atualizar transferência
  transferencias[tIndex] = {
    ...transf,
    status: 'Aprovada',
    responsavel: responsavelNome.trim() || 'Responsável',
    data_decisao: dataHora,
  };
  localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(transferencias));

  // 2. Atualizar território (mantém como DESIGNADO, NÃO passa por Disponível!)
  const terIndex = territorios.findIndex((t) => t.id === transf.territorio_id);
  if (terIndex >= 0) {
    territorios[terIndex] = {
      ...territorios[terIndex],
      status: 'Designado',
      designado_para: transf.novo_publicador,
      data_ultima_designacao: formatarDataHoje(),
      hora_ultima_designacao: formatarHoraHoje(),
      responsavel_designacao: responsavelNome.trim(),
      updated_at: now.toISOString(),
    };
    persistAndSyncTerritorios(territorios);
  }

  // 3. Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_id: transf.territorio_id,
    territorio_numero: transf.territorio_numero,
    territorio_localidade: transf.territorio_localidade,
    publicador: transf.novo_publicador,
    acao: 'Transferência Aprovada',
    status: 'Designado',
    responsavel: responsavelNome.trim() || 'Responsável',
    data: dataHora,
    observacao: `Transferido de ${transf.publicador_atual} para ${transf.novo_publicador}`,
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { transferencias, territorios, historico: updatedHistorico };
}

export function recusarTransferencia(
  transferenciaId: string,
  responsavelNome: string
): { transferencias: TransferenciaTerritorio[]; territorios: Territorio[]; historico: HistoricoTerritorio[] } {
  const transferencias = getStoredTransferencias();
  const territorios = getStoredTerritorios();
  const tIndex = transferencias.findIndex((t) => t.id === transferenciaId);

  if (tIndex === -1) {
    return { transferencias, territorios, historico: getStoredHistorico() };
  }

  const transf = transferencias[tIndex];
  const dataHora = formatarDataHoraHoje();

  // Atualizar transferência como recusada
  transferencias[tIndex] = {
    ...transf,
    status: 'Recusada',
    responsavel: responsavelNome.trim() || 'Responsável',
    data_decisao: dataHora,
  };
  localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(transferencias));

  // O território permanece com o publicador atual, sem alteração

  // Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_id: transf.territorio_id,
    territorio_numero: transf.territorio_numero,
    territorio_localidade: transf.territorio_localidade,
    publicador: transf.publicador_atual,
    acao: 'Transferência Recusada',
    status: 'Recusada',
    responsavel: responsavelNome.trim() || 'Responsável',
    data: dataHora,
    observacao: `Pedido de transferência para ${transf.novo_publicador} foi recusado pelo responsável.`,
    created_at: new Date().toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { transferencias, territorios, historico: updatedHistorico };
}

// -------------------------------------------------------------
// Ação Manual do Responsável: TORNAR DISPONÍVEL (Novo Ciclo)
// -------------------------------------------------------------
export function tornarTerritorioDisponivel(
  territorioId: string,
  responsavelNome: string
): { territorios: Territorio[]; historico: HistoricoTerritorio[] } {
  const territorios = getStoredTerritorios();
  const index = territorios.findIndex((t) => t.id === territorioId);

  if (index === -1) {
    return { territorios, historico: getStoredHistorico() };
  }

  const ter = territorios[index];
  const now = new Date();
  const dataHora = formatarDataHoraHoje();
  const anteriorPublicador = ter.designado_para;

  territorios[index] = {
    ...ter,
    status: 'Disponível',
    designado_para: undefined,
    data_ultima_designacao: undefined,
    hora_ultima_designacao: undefined,
    responsavel_designacao: undefined,
    data_conclusao: undefined,
    data_estorno: undefined,
    motivo_estorno: undefined,
    data_ultimo_retorno_sort: undefined,
    updated_at: now.toISOString(),
  };
  persistAndSyncTerritorios(territorios);

  // Registrar no histórico permanente
  const historicoItem: HistoricoTerritorio = {
    id: String(Date.now()),
    territorio_id: ter.id,
    territorio_numero: ter.numero,
    territorio_localidade: ter.localidade,
    publicador: anteriorPublicador || '-',
    acao: 'Disponibilizado para Novo Ciclo',
    status: 'Disponível',
    responsavel: responsavelNome.trim() || 'Responsável',
    data: dataHora,
    observacao: 'Território liberado manualmente pelo responsável para novas designações.',
    created_at: now.toISOString(),
  };
  const updatedHistorico = saveStoredHistorico(historicoItem);

  return { territorios, historico: updatedHistorico };
}

// -------------------------------------------------------------
// Histórico Permanente de Territórios
// -------------------------------------------------------------
export function getStoredHistorico(): HistoricoTerritorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORICO);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export function saveStoredHistorico(item: HistoricoTerritorio): HistoricoTerritorio[] {
  const current = getStoredHistorico();
  const updated = [item, ...current];
  localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(updated));
  return updated;
}
