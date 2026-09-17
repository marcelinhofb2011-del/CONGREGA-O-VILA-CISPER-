import { isAdminAuthenticated } from './territoriosStorage';

export interface AssistenciaItem {
  id: string;
  data: string; // Formato DD/MM/AAAA
  tipo: string; // 'Nossa Vida e Ministério Cristão' | 'Reunião de fim de semana' | 'Outra'
  assistencia: number; // Número inteiro >= 0
  observacao?: string; // Campo opcional de texto
  created_at: string; // ISO string
  updated_at?: string; // ISO string
}

const STORAGE_KEY_ASSISTENCIA = 'vila_cisper_assistencia_registros';

// Função interna para carregar os registros físicos do armazenamento
function carregarRegistrosInternos(): AssistenciaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSISTENCIA);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => ({
      id: String(item.id),
      data: String(item.data || ''),
      tipo: String(item.tipo || ''),
      assistencia:
        typeof item.assistencia === 'number'
          ? item.assistencia
          : typeof item.presentes === 'number'
          ? item.presentes
          : 0,
      observacao: item.observacao ? String(item.observacao) : undefined,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * CONSULTA DE REGISTROS — SOMENTE O RESPONSÁVEL
 * As permissões impedem que usuários comuns / publicadores consultem a lista de registros.
 */
export function getStoredAssistencia(): AssistenciaItem[] {
  if (!isAdminAuthenticated()) {
    return [];
  }
  return carregarRegistrosInternos();
}

/**
 * LANÇAMENTO DE ASSISTÊNCIA — ACESSO DO IRMÃO
 * Permite ao irmão registrar uma nova reunião. O registro fica armazenado.
 */
export function registrarNovaAssistencia(dados: {
  data: string;
  tipo: string;
  assistencia: number;
  observacao?: string;
}): { success: boolean; item?: AssistenciaItem; error?: string } {
  if (!dados.data || !dados.data.trim()) {
    return { success: false, error: 'A data é obrigatória.' };
  }
  if (!dados.tipo || !dados.tipo.trim()) {
    return { success: false, error: 'O tipo de reunião é obrigatório.' };
  }
  if (
    dados.assistencia === undefined ||
    dados.assistencia === null ||
    !Number.isInteger(dados.assistencia) ||
    dados.assistencia < 0
  ) {
    return { success: false, error: 'A assistência deve ser um número inteiro igual ou maior que zero.' };
  }

  const atuais = carregarRegistrosInternos();
  const now = new Date().toISOString();
  const novoItem: AssistenciaItem = {
    id: String(Date.now()),
    data: dados.data.trim(),
    tipo: dados.tipo.trim(),
    assistencia: dados.assistencia,
    observacao: dados.observacao?.trim() || undefined,
    created_at: now,
    updated_at: now,
  };

  const atualizados = [novoItem, ...atuais];
  localStorage.setItem(STORAGE_KEY_ASSISTENCIA, JSON.stringify(atualizados));
  return { success: true, item: novoItem };
}

/**
 * CORREÇÃO DE REGISTRO — SOMENTE O RESPONSÁVEL
 */
export function atualizarAssistencia(item: AssistenciaItem): { success: boolean; registros: AssistenciaItem[]; error?: string } {
  if (!isAdminAuthenticated()) {
    return {
      success: false,
      registros: [],
      error: 'Acesso negado: apenas o responsável tem permissão para alterar registros.',
    };
  }

  const atuais = carregarRegistrosInternos();
  const index = atuais.findIndex((a) => a.id === item.id);
  if (index === -1) {
    return {
      success: false,
      registros: atuais,
      error: 'Registro não encontrado.',
    };
  }

  const now = new Date().toISOString();
  atuais[index] = {
    ...item,
    observacao: item.observacao?.trim() || undefined,
    updated_at: now,
  };

  localStorage.setItem(STORAGE_KEY_ASSISTENCIA, JSON.stringify(atuais));
  return { success: true, registros: atuais };
}

/**
 * EXCLUSÃO DE REGISTRO — SOMENTE O RESPONSÁVEL
 */
export function deleteStoredAssistencia(id: string): { success: boolean; registros: AssistenciaItem[]; error?: string } {
  if (!isAdminAuthenticated()) {
    return {
      success: false,
      registros: [],
      error: 'Acesso negado: apenas o responsável tem permissão para excluir registros.',
    };
  }

  const atuais = carregarRegistrosInternos();
  const atualizados = atuais.filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY_ASSISTENCIA, JSON.stringify(atualizados));
  return { success: true, registros: atualizados };
}

// Compatibilidade
export function saveStoredAssistencia(item: AssistenciaItem): AssistenciaItem[] {
  if (item.id && carregarRegistrosInternos().some((r) => r.id === item.id)) {
    const res = atualizarAssistencia(item);
    return res.registros;
  }
  const res = registrarNovaAssistencia({
    data: item.data,
    tipo: item.tipo,
    assistencia: item.assistencia,
    observacao: item.observacao,
  });
  return res.success && isAdminAuthenticated() ? getStoredAssistencia() : [];
}


