export interface Territorio {
  id: string;
  numero: number | string;
  nome?: string;
  bairro?: string;
  totalQuadras?: number;
  localidade?: string;
  descricao?: string;
  observacao?: string;
  observacoes?: string;
  mapa_url?: string;
  status: 'disponivel' | 'designado' | 'em_trabalho' | 'Disponível' | 'Designado' | 'Concluído' | 'Estornado' | 'Solicitado' | string;
  designadoPara?: string;
  designado_para?: string;
  dataDesignacao?: string;
  data_ultima_designacao?: string;
  hora_ultima_designacao?: string;
  responsavel_designacao?: string;
  solicitado_por?: string;
  solicitacao_id?: string;
  dataConclusao?: string;
  data_conclusao?: string;
  data_estorno?: string;
  motivo_estorno?: string;
  data_ultimo_retorno_sort?: string;
  created_at?: string;
}

export interface SolicitacaoTerritorio {
  id: string;
  nome_publicador: string;
  data_solicitacao: string;
  hora_solicitacao: string;
  status: 'Pendente' | 'Designado' | 'Cancelada' | string;
  territorio_id?: string;
  territorio_numero?: number;
  data_designacao?: string;
  responsavel?: string;
  created_at?: string;
}

export interface TransferenciaTerritorio {
  id: string;
  data_solicitacao: string;
  hora_solicitacao: string;
  territorio_id: string;
  territorio_numero: number;
  territorio_localidade?: string;
  publicador_atual: string;
  novo_publicador: string;
  status: 'Aguardando aprovação' | 'Aprovada' | 'Recusada' | string;
  data_decisao?: string;
  responsavel_decisao?: string;
  created_at?: string;
}

export interface HistoricoTerritorio {
  id: string;
  data: string;
  acao: string;
  publicador: string;
  territorio_id?: string;
  territorio_numero: number;
  territorio_localidade?: string;
  responsavel: string;
  observacao?: string;
  status?: string;
  created_at?: string;
}

export const STORAGE_KEY_ADMIN_AUTH = 'vila_cisper_admin_auth';
export const STORAGE_KEY_TERRITORIOS = 'vila_cisper_territorios_data';
export const STORAGE_KEY_SOLICITACOES = 'vila_cisper_solicitacoes_data';
export const STORAGE_KEY_TRANSFERENCIAS = 'vila_cisper_transferencias_data';
export const STORAGE_KEY_HISTORICO = 'vila_cisper_historico_data';
export const STORAGE_KEY_ACTIVE_PUBLICADOR = 'vila_cisper_active_publicador';

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
  } catch {
    return false;
  }
}

export function setAdminAuthenticated(auth: boolean): void {
  try {
    if (auth) {
      sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    }
  } catch (e) {
    console.error(e);
  }
}

export function verifyAdminPassword(password: string): boolean {
  const senhasValidas = ['67744', 'admin', 'vilacisper'];
  return senhasValidas.includes(password.trim());
}

export function getActivePublicador(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_PUBLICADOR) || '';
  } catch {
    return '';
  }
}

export function setActivePublicador(nome: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PUBLICADOR, nome.trim());
  } catch (e) {
    console.warn('Erro ao salvar publicador ativo:', e);
  }
}

export function isStatusDisponivel(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'disponível' || s === 'disponivel';
}

export function isStatusSolicitado(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'solicitado';
}

export function isStatusDesignado(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'designado' || s === 'em_trabalho' || s === 'em trabalho';
}

export function isStatusConcluido(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'concluído' || s === 'concluido';
}

export function isStatusEstornado(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'estornado';
}

function normalizeTerritorio(t: any): Territorio {
  const localidade = t.localidade || t.nome || `Território ${t.numero}`;
  const nome = t.nome || t.localidade || `Território ${t.numero}`;
  const descricao = t.descricao || t.observacoes || t.observacao || `Quadras da região ${localidade}`;
  const designado = t.designado_para || t.designadoPara || undefined;
  const dataDesig = t.data_ultima_designacao || t.dataDesignacao || undefined;
  const dataConc = t.data_conclusao || t.dataConclusao || undefined;
  const obs = t.observacao || t.observacoes || undefined;
  const mapaUrl = t.mapa_url || 'https://maps.google.com/?q=Vila+Cisper+Sao+Paulo';

  return {
    ...t,
    id: String(t.id),
    numero: t.numero,
    nome,
    localidade,
    descricao,
    bairro: t.bairro || 'Vila Cisper',
    totalQuadras: t.totalQuadras || 6,
    status: t.status || 'Disponível',
    designadoPara: designado,
    designado_para: designado,
    dataDesignacao: dataDesig,
    data_ultima_designacao: dataDesig,
    dataConclusao: dataConc,
    data_conclusao: dataConc,
    observacao: obs,
    observacoes: obs,
    mapa_url: mapaUrl,
  };
}

export const TERRITORIOS_INICIAIS: Territorio[] = [
  {
    id: 'ter-01',
    numero: 1,
    nome: 'Vila Cisper - Centro',
    localidade: 'Vila Cisper - Centro',
    bairro: 'Vila Cisper',
    descricao: 'Quadras centrais próximas à praça principal',
    totalQuadras: 6,
    status: 'Designado',
    designadoPara: 'Hermes B.',
    designado_para: 'Hermes B.',
    dataDesignacao: '15/09/2026',
    data_ultima_designacao: '15/09/2026',
    mapa_url: 'https://maps.google.com/?q=Vila+Cisper+Sao+Paulo',
  },
  {
    id: 'ter-02',
    numero: 2,
    nome: 'Vila Cisper - Alto',
    localidade: 'Vila Cisper - Alto',
    bairro: 'Vila Cisper',
    descricao: 'Parte alta residencial da Vila Cisper',
    totalQuadras: 8,
    status: 'Disponível',
    mapa_url: 'https://maps.google.com/?q=Vila+Cisper+Sao+Paulo',
  },
  {
    id: 'ter-03',
    numero: 3,
    nome: 'Jardim Danfer - Parte 1',
    localidade: 'Jardim Danfer - Parte 1',
    bairro: 'Jd. Danfer',
    descricao: 'Divisa do Danfer com ruas principais',
    totalQuadras: 7,
    status: 'Designado',
    designadoPara: 'Dhiego',
    designado_para: 'Dhiego',
    dataDesignacao: '20/09/2026',
    data_ultima_designacao: '20/09/2026',
    mapa_url: 'https://maps.google.com/?q=Jardim+Danfer+Sao+Paulo',
  },
  {
    id: 'ter-04',
    numero: 4,
    nome: 'Jardim Danfer - Parte 2',
    localidade: 'Jardim Danfer - Parte 2',
    bairro: 'Jd. Danfer',
    descricao: 'Ruas residenciais internas do Jardim Danfer',
    totalQuadras: 5,
    status: 'Disponível',
    mapa_url: 'https://maps.google.com/?q=Jardim+Danfer+Sao+Paulo',
  },
  {
    id: 'ter-05',
    numero: 5,
    nome: 'Engenheiro Goulart - Leste',
    localidade: 'Engenheiro Goulart - Leste',
    bairro: 'Eng. Goulart',
    descricao: 'Região leste de Engenheiro Goulart',
    totalQuadras: 9,
    status: 'Designado',
    designadoPara: 'Samuel',
    designado_para: 'Samuel',
    dataDesignacao: '01/09/2026',
    data_ultima_designacao: '01/09/2026',
    mapa_url: 'https://maps.google.com/?q=Engenheiro+Goulart+Sao+Paulo',
  },
  {
    id: 'ter-06',
    numero: 6,
    nome: 'Jardim Keralux - Norte',
    localidade: 'Jardim Keralux - Norte',
    bairro: 'Jd. Keralux',
    descricao: 'Região norte de Jardim Keralux',
    totalQuadras: 10,
    status: 'Disponível',
    mapa_url: 'https://maps.google.com/?q=Jardim+Keralux+Sao+Paulo',
  },
];

export function getStoredTerritorios(): Territorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TERRITORIOS);
    if (!raw) {
      const normalizados = TERRITORIOS_INICIAIS.map(normalizeTerritorio);
      localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(normalizados));
      return normalizados;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizeTerritorio);
    }
    return TERRITORIOS_INICIAIS.map(normalizeTerritorio);
  } catch {
    return TERRITORIOS_INICIAIS.map(normalizeTerritorio);
  }
}

export function saveTerritorio(ter: Territorio) {
  try {
    const normalizado = normalizeTerritorio(ter);
    const list = getStoredTerritorios();
    const idx = list.findIndex((t) => t.id === normalizado.id);
    let updated: Territorio[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = normalizado;
    } else {
      updated = [normalizado, ...list];
    }
    localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(updated));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveStoredTerritorio(item: Territorio): Promise<void> {
  saveTerritorio(item);
}

export async function deleteStoredTerritorio(id: string): Promise<void> {
  try {
    const list = getStoredTerritorios();
    const updated = list.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao deletar território:', err);
  }
}

export function getStoredSolicitacoes(): SolicitacaoTerritorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredSolicitacoes(list: SolicitacaoTerritorio[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar solicitações:', e);
  }
}

export function getStoredTransferencias(): TransferenciaTerritorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSFERENCIAS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredTransferencias(list: TransferenciaTerritorio[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar transferências:', e);
  }
}

export function getStoredHistorico(): HistoricoTerritorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORICO);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredHistorico(list: HistoricoTerritorio[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar histórico:', e);
  }
}

function registrarHistorico(novoItem: Omit<HistoricoTerritorio, 'id' | 'created_at'>): void {
  const lista = getStoredHistorico();
  const registro: HistoricoTerritorio = {
    ...novoItem,
    id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    created_at: new Date().toISOString(),
  };
  saveStoredHistorico([registro, ...lista]);
}

export async function createSolicitacao(
  nomePublicador: string,
  territorioNumero?: number
): Promise<SolicitacaoTerritorio> {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR');
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const novaSol: SolicitacaoTerritorio = {
    id: 'sol-' + Date.now(),
    nome_publicador: nomePublicador.trim(),
    data_solicitacao: dataFormatada,
    hora_solicitacao: horaFormatada,
    status: 'Pendente',
    territorio_numero: territorioNumero,
    created_at: agora.toISOString(),
  };

  const lista = getStoredSolicitacoes();
  saveStoredSolicitacoes([novaSol, ...lista]);

  registrarHistorico({
    data: `${dataFormatada} às ${horaFormatada}`,
    acao: 'Solicitação de Território',
    publicador: nomePublicador.trim(),
    territorio_numero: territorioNumero || 0,
    responsavel: 'Sistema',
    observacao: 'Solicitação registrada pelo publicador',
  });

  try {
    const { dispatchPushNotificationToResponsaveis } = await import('../lib/pushNotificationService');
    dispatchPushNotificationToResponsaveis(novaSol).catch(() => {});
  } catch {
    // ignorar falha não impeditiva de notificação push
  }

  return novaSol;
}

export async function cancelarSolicitacaoTerritorio(
  solId: string,
  responsavelNome: string
): Promise<void> {
  const lista = getStoredSolicitacoes();
  const sol = lista.find((s) => s.id === solId);
  const atualizadas = lista.map((s) =>
    s.id === solId ? { ...s, status: 'Cancelada', responsavel: responsavelNome } : s
  );
  saveStoredSolicitacoes(atualizadas);

  if (sol) {
    const agora = new Date();
    registrarHistorico({
      data: `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      acao: 'Cancelamento de Solicitação',
      publicador: sol.nome_publicador,
      territorio_numero: sol.territorio_numero || 0,
      responsavel: responsavelNome,
      observacao: 'Solicitação cancelada',
    });
  }
}

export async function designarTerritorioParaSolicitacao(
  solId: string,
  terId: string,
  responsavelNome: string
): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Atualizar a solicitação
  const solicitacoes = getStoredSolicitacoes();
  const sol = solicitacoes.find((s) => s.id === solId);
  if (!sol) return;

  const solAtualizadas = solicitacoes.map((s) =>
    s.id === solId
      ? {
          ...s,
          status: 'Designado',
          data_designacao: dataHoje,
          responsavel: responsavelNome,
          territorio_id: terId,
        }
      : s
  );
  saveStoredSolicitacoes(solAtualizadas);

  // 2. Atualizar o território
  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === terId);
  if (!ter) return;

  const terAtualizado: Territorio = {
    ...ter,
    status: 'Designado',
    designadoPara: sol.nome_publicador,
    designado_para: sol.nome_publicador,
    dataDesignacao: dataHoje,
    data_ultima_designacao: dataHoje,
    hora_ultima_designacao: horaHoje,
    responsavel_designacao: responsavelNome,
    solicitado_por: sol.nome_publicador,
    solicitacao_id: solId,
    dataConclusao: undefined,
    data_conclusao: undefined,
    data_estorno: undefined,
    motivo_estorno: undefined,
  };
  saveTerritorio(terAtualizado);

  // 3. Registrar Histórico
  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Designação de Território',
    publicador: sol.nome_publicador,
    territorio_id: terId,
    territorio_numero: Number(ter.numero) || 0,
    territorio_localidade: ter.localidade || ter.nome,
    responsavel: responsavelNome,
    observacao: `Designado para ${sol.nome_publicador}`,
  });
}

export async function aprovarTransferencia(trId: string, responsavelNome: string): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const transferencias = getStoredTransferencias();
  const tr = transferencias.find((t) => t.id === trId);
  if (!tr) return;

  const trAtualizadas = transferencias.map((t) =>
    t.id === trId
      ? {
          ...t,
          status: 'Aprovada',
          data_decisao: dataHoje,
          responsavel_decisao: responsavelNome,
        }
      : t
  );
  saveStoredTransferencias(trAtualizadas);

  // Transferir o território para o novo publicador
  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === tr.territorio_id || Number(t.numero) === tr.territorio_numero);
  if (ter) {
    const terAtualizado: Territorio = {
      ...ter,
      status: 'Designado',
      designadoPara: tr.novo_publicador,
      designado_para: tr.novo_publicador,
      dataDesignacao: dataHoje,
      data_ultima_designacao: dataHoje,
      hora_ultima_designacao: horaHoje,
      responsavel_designacao: responsavelNome,
    };
    saveTerritorio(terAtualizado);
  }

  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Transferência de Território (Aprovada)',
    publicador: `${tr.publicador_atual} ➔ ${tr.novo_publicador}`,
    territorio_id: tr.territorio_id,
    territorio_numero: tr.territorio_numero,
    responsavel: responsavelNome,
    observacao: `Transferência de ${tr.publicador_atual} para ${tr.novo_publicador} aprovada`,
  });
}

export async function recusarTransferencia(trId: string, responsavelNome: string): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const transferencias = getStoredTransferencias();
  const tr = transferencias.find((t) => t.id === trId);
  if (!tr) return;

  const trAtualizadas = transferencias.map((t) =>
    t.id === trId
      ? {
          ...t,
          status: 'Recusada',
          data_decisao: dataHoje,
          responsavel_decisao: responsavelNome,
        }
      : t
  );
  saveStoredTransferencias(trAtualizadas);

  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Transferência de Território (Recusada)',
    publicador: tr.publicador_atual,
    territorio_id: tr.territorio_id,
    territorio_numero: tr.territorio_numero,
    responsavel: responsavelNome,
    observacao: `Transferência recusada pelo responsável`,
  });
}

export async function tornarTerritorioDisponivel(
  targetId: string,
  responsavelNome: string
): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === targetId);
  if (!ter) return;

  const terAtualizado: Territorio = {
    ...ter,
    status: 'Disponível',
    designadoPara: undefined,
    designado_para: undefined,
    data_ultima_designacao: undefined,
    dataDesignacao: undefined,
    responsavel_designacao: undefined,
    dataConclusao: undefined,
    data_conclusao: undefined,
    data_estorno: undefined,
    motivo_estorno: undefined,
    data_ultimo_retorno_sort: new Date().toISOString(),
  };
  saveTerritorio(terAtualizado);

  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Disponibilização para Novo Ciclo',
    publicador: ter.designado_para || ter.designadoPara || 'Geral',
    territorio_id: targetId,
    territorio_numero: Number(ter.numero) || 0,
    territorio_localidade: ter.localidade || ter.nome,
    responsavel: responsavelNome,
    observacao: 'Território liberado para novo ciclo de trabalho',
  });
}

export async function tornarTerritoriosDisponiveisEmLote(
  ids: string[],
  responsavelNome: string
): Promise<void> {
  for (const id of ids) {
    await tornarTerritorioDisponivel(id, responsavelNome);
  }
}

export async function concluirTerritorioPublicador(
  targetId: string,
  publicadorNome: string
): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === targetId);
  if (!ter) return;

  const terAtualizado: Territorio = {
    ...ter,
    status: 'Concluído',
    dataConclusao: dataHoje,
    data_conclusao: dataHoje,
    data_ultimo_retorno_sort: new Date().toISOString(),
  };
  saveTerritorio(terAtualizado);

  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Conclusão de Território',
    publicador: publicadorNome,
    territorio_id: targetId,
    territorio_numero: Number(ter.numero) || 0,
    territorio_localidade: ter.localidade || ter.nome,
    responsavel: 'Publicador',
    observacao: `Trabalho de campo concluído por ${publicadorNome}`,
  });
}

export async function estornarTerritorioPublicador(
  targetId: string,
  publicadorNome: string,
  motivo: string
): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === targetId);
  if (!ter) return;

  const terAtualizado: Territorio = {
    ...ter,
    status: 'Estornado',
    data_estorno: dataHoje,
    motivo_estorno: motivo || 'Devolvido pelo publicador',
    data_ultimo_retorno_sort: new Date().toISOString(),
  };
  saveTerritorio(terAtualizado);

  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Estorno de Território',
    publicador: publicadorNome,
    territorio_id: targetId,
    territorio_numero: Number(ter.numero) || 0,
    territorio_localidade: ter.localidade || ter.nome,
    responsavel: 'Publicador',
    observacao: `Motivo: ${motivo || 'Devolvido sem concluir'}`,
  });
}

export async function solicitarCompartilhamento(
  targetId: string,
  publicadorAtual: string,
  novoPublicador: string
): Promise<void> {
  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');
  const horaHoje = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const territorios = getStoredTerritorios();
  const ter = territorios.find((t) => t.id === targetId);
  const num = ter ? Number(ter.numero) : 0;

  const novaTr: TransferenciaTerritorio = {
    id: 'tr-' + Date.now(),
    data_solicitacao: dataHoje,
    hora_solicitacao: horaHoje,
    territorio_id: targetId,
    territorio_numero: num,
    publicador_atual: publicadorAtual.trim(),
    novo_publicador: novoPublicador.trim(),
    status: 'Aguardando aprovação',
    created_at: agora.toISOString(),
  };

  const lista = getStoredTransferencias();
  saveStoredTransferencias([novaTr, ...lista]);

  registrarHistorico({
    data: `${dataHoje} às ${horaHoje}`,
    acao: 'Pedido de Transferência',
    publicador: `${publicadorAtual} ➔ ${novoPublicador}`,
    territorio_id: targetId,
    territorio_numero: num,
    responsavel: 'Sistema',
    observacao: `Aguardando aprovação do responsável`,
  });
}
