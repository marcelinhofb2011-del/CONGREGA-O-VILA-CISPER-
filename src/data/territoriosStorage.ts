import { firebaseSync } from './firebaseSyncService';

// Armazenamento e gerenciamento permanente de Territórios, Solicitações, Transferências e Histórico

export type StatusTerritorio = 'Disponível' | 'Solicitado' | 'Designado' | 'Concluído' | 'Estornado';
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
  solicitado_por?: string; // Nome do publicador quando solicitado
  solicitacao_id?: string; // ID da solicitação pendente
  data_solicitacao?: string; // DD/MM/AAAA
  hora_solicitacao?: string; // HH:mm
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

// Helpers para normalização e validação de status
export function isStatusDisponivel(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'disponível' || s === 'disponivel' || s === 'available';
}

export function isStatusSolicitado(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'solicitado' || s === 'requested';
}

export function isStatusDesignado(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'designado' || s === 'assigned';
}

export function isStatusConcluido(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'concluído' || s === 'concluido' || s === 'completed';
}

export function isStatusEstornado(status?: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return s === 'estornado' || s === 'returned';
}

// Chaves de armazenamento local
export const STORAGE_KEY_TERRITORIOS = 'vila_cisper_territorios_lista';
export const STORAGE_KEY_SOLICITACOES = 'vila_cisper_territorios_solicitacoes';
export const STORAGE_KEY_TRANSFERENCIAS = 'vila_cisper_territorios_transferencias';
export const STORAGE_KEY_HISTORICO = 'vila_cisper_territorios_historico';
export const STORAGE_KEY_ADMIN_SENHA = 'vila_cisper_admin_senha';
export const STORAGE_KEY_PUBLICADOR_ATIVO = 'vila_cisper_publicador_ativo';
export const SESSION_KEY_ADMIN_AUTH = 'vila_cisper_admin_auth_session';
export const STORAGE_KEY_ADMIN_PERSISTED = 'vila_cisper_admin_auth_persisted';

// Senha padrão inicial caso o responsável ainda não tenha alterado
const SENHA_PADRAO_INICIAL = 'cisper2026';

export function formatarDataHoje(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

export function formatarHoraHoje(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function formatarDataHoraHoje(): string {
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
      localStorage.setItem(STORAGE_KEY_ADMIN_PERSISTED, 'true');
    } else {
      sessionStorage.removeItem(SESSION_KEY_ADMIN_AUTH);
      localStorage.removeItem(STORAGE_KEY_ADMIN_PERSISTED);
    }
  } catch {
    // sessionStorage indisponível
  }
}

export function isAdminAuthenticated(): boolean {
  try {
    return (
      sessionStorage.getItem(SESSION_KEY_ADMIN_AUTH) === 'true' ||
      localStorage.getItem(STORAGE_KEY_ADMIN_PERSISTED) === 'true'
    );
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

export async function saveStoredTerritorio(item: Territorio): Promise<Territorio[]> {
  const current = getStoredTerritorios();
  const index = current.findIndex((t) => t.id === item.id);
  const now = new Date().toISOString();

  let updatedItem: Territorio;
  let updatedList: Territorio[];

  if (index >= 0) {
    updatedItem = {
      ...item,
      updated_at: now,
    };
    updatedList = [...current];
    updatedList[index] = updatedItem;
  } else {
    updatedItem = {
      ...item,
      created_at: item.created_at || now,
      updated_at: now,
    };
    updatedList = [...current, updatedItem];
  }

  localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(updatedList));
  await firebaseSync.saveTerritorio(updatedItem);
  return updatedList;
}

export async function deleteStoredTerritorio(id: string): Promise<Territorio[]> {
  const current = getStoredTerritorios();
  const updated = current.filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(updated));
  await firebaseSync.deleteTerritorio(id);
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

export async function createSolicitacao(
  nomePublicador: string,
  territorioId?: string
): Promise<SolicitacaoTerritorio | null> {
  const nomeLimpo = nomePublicador.trim();
  setActivePublicador(nomeLimpo);

  // Executa transação atômica no Firebase:
  // 1. Cria a solicitação pendente no Firestore
  // 2. Se um território foi selecionado, muda o status dele para "Solicitado" imediatamente
  // 3. Registra no histórico do Firestore
  const nova = await firebaseSync.executeSolicitacaoBatch(nomeLimpo, territorioId);
  return nova;
}

// Designar território para uma solicitação (AÇÃO EXCLUSIVA DO RESPONSÁVEL)
export async function designarTerritorioParaSolicitacao(
  solicitacaoId: string,
  territorioId: string,
  responsavelNome: string
): Promise<boolean> {
  return await firebaseSync.executeDesignacaoBatch(
    solicitacaoId,
    territorioId,
    responsavelNome
  );
}

// Cancelar solicitação sem designar território (AÇÃO DO RESPONSÁVEL)
export async function cancelarSolicitacaoTerritorio(
  solicitacaoId: string,
  responsavelNome?: string
): Promise<boolean> {
  return await firebaseSync.executeCancelamentoSolicitacaoBatch(
    solicitacaoId,
    responsavelNome
  );
}

// -------------------------------------------------------------
// Ações do Publicador em "Meu Território"
// -------------------------------------------------------------

// CONCLUIR: Trabalho de pregação finalizado pelo publicador
export async function concluirTerritorioPublicador(
  territorioId: string,
  publicadorNome: string
): Promise<boolean> {
  return await firebaseSync.executeConclusaoBatch(territorioId, publicadorNome);
}

// ESTORNAR: Publicador não pôde continuar e devolve o território
// REGRA: Transação atômica no Firebase:
// 1. Encerra a designação atual
// 2. Remove o vínculo ativo com o publicador (designado_para = null)
// 3. Altera o estado do território imediatamente para "Disponível"
// 4. Registra no histórico que houve um estorno
// 5. Atualiza imediatamente todas as telas em tempo real
export async function estornarTerritorioPublicador(
  territorioId: string,
  publicadorNome: string,
  motivo?: string
): Promise<boolean> {
  return await firebaseSync.executeEstornoBatch(territorioId, publicadorNome, motivo);
}

// COMPARTILHAR: Gera solicitação de transferência para o responsável
// IMPORTANTE: O território continua vinculado ao publicador atual e NÃO fica disponível!
export async function solicitarCompartilhamento(
  territorioId: string,
  publicadorAtual: string,
  novoPublicador: string
): Promise<TransferenciaTerritorio | null> {
  return await firebaseSync.executeSolicitarTransferenciaBatch(
    territorioId,
    publicadorAtual,
    novoPublicador
  );
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

export async function aprovarTransferencia(
  transferenciaId: string,
  responsavelNome: string
): Promise<boolean> {
  return await firebaseSync.executeTransferenciaAprovadaBatch(transferenciaId, responsavelNome);
}

export async function recusarTransferencia(
  transferenciaId: string,
  responsavelNome: string
): Promise<boolean> {
  return await firebaseSync.executeTransferenciaRecusadaBatch(transferenciaId, responsavelNome);
}

// -------------------------------------------------------------
// Ação Manual do Responsável: TORNAR DISPONÍVEL (Novo Ciclo)
// -------------------------------------------------------------
export async function tornarTerritorioDisponivel(
  territorioId: string,
  responsavelNome: string
): Promise<boolean> {
  return await firebaseSync.executeTornarDisponivelBatch(territorioId, responsavelNome);
}

export async function tornarTerritoriosDisponiveisEmLote(
  territorioIds: string[],
  responsavelNome: string
): Promise<boolean> {
  return await firebaseSync.executeTornarDisponivelLoteBatch(territorioIds, responsavelNome);
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

export async function saveStoredHistorico(item: HistoricoTerritorio): Promise<HistoricoTerritorio[]> {
  const current = getStoredHistorico();
  const updated = [item, ...current];
  localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(updated));
  await firebaseSync.saveHistorico(item);
  return updated;
}
