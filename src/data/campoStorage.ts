export interface CampoDiaSemanaItem {
  diaSemana: string;
  dirigente: string;
  horario: string;
  localOuNota?: string;
}

import { firebaseSync } from './firebaseSyncService';
import { getHorarioSaidaDeCampo } from './horariosReunioesStorage';

export interface CampoFimDeSemanaItem {
  id: string;
  mes: string;
  mesChave: string;
  data: string;
  diaSemana: 'Sábado' | 'Domingo';
  dirigente: string;
  observacao?: string;
  ehEspecial?: boolean;
}

export interface CampoGrupo {
  id: string;
  nomeGrupo: string;
  diaData: string;
  horario: string;
  local: string;
  responsavel: string;
  observacao?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export const STORAGE_KEY_CAMPO_FDS = 'vila_cisper_campo_fds_2026';

export const CAMPO_FDS_CANONICO: CampoFimDeSemanaItem[] = [
  { id: 'c-jan-1', mes: 'Janeiro', mesChave: 'janeiro', data: '03/01', diaSemana: 'Sábado', dirigente: 'Dhiego' },
  { id: 'c-jan-2', mes: 'Janeiro', mesChave: 'janeiro', data: '04/01', diaSemana: 'Domingo', dirigente: 'Samuel (Todos os grupos no salão)' },
  { id: 'c-jan-3', mes: 'Janeiro', mesChave: 'janeiro', data: '10/01', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-jan-4', mes: 'Janeiro', mesChave: 'janeiro', data: '11/01', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jan-5', mes: 'Janeiro', mesChave: 'janeiro', data: '17/01', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-jan-6', mes: 'Janeiro', mesChave: 'janeiro', data: '18/01', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jan-7', mes: 'Janeiro', mesChave: 'janeiro', data: '24/01', diaSemana: 'Sábado', dirigente: 'Assembléia de Circuito', ehEspecial: true },
  { id: 'c-jan-8', mes: 'Janeiro', mesChave: 'janeiro', data: '25/01', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jan-9', mes: 'Janeiro', mesChave: 'janeiro', data: '31/01', diaSemana: 'Sábado', dirigente: 'Fernando' },
  { id: 'c-fev-1', mes: 'Fevereiro', mesChave: 'fevereiro', data: '01/02', diaSemana: 'Domingo', dirigente: 'Kleber (Todos os grupos no salão)' },
  { id: 'c-fev-2', mes: 'Fevereiro', mesChave: 'fevereiro', data: '07/02', diaSemana: 'Sábado', dirigente: 'Kleber' },
  { id: 'c-fev-3', mes: 'Fevereiro', mesChave: 'fevereiro', data: '08/02', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-fev-4', mes: 'Fevereiro', mesChave: 'fevereiro', data: '14/02', diaSemana: 'Sábado', dirigente: 'Geovane' },
  { id: 'c-fev-5', mes: 'Fevereiro', mesChave: 'fevereiro', data: '15/02', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-fev-6', mes: 'Fevereiro', mesChave: 'fevereiro', data: '21/02', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-fev-7', mes: 'Fevereiro', mesChave: 'fevereiro', data: '22/02', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-fev-8', mes: 'Fevereiro', mesChave: 'fevereiro', data: '28/02', diaSemana: 'Sábado', dirigente: 'Vilson' },
];

export function getStoredCampoFds(): CampoFimDeSemanaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPO_FDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(CAMPO_FDS_CANONICO));
      return CAMPO_FDS_CANONICO;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CAMPO_FDS_CANONICO;
  } catch {
    return CAMPO_FDS_CANONICO;
  }
}

export function saveStoredCampoFdsItem(item: CampoFimDeSemanaItem) {
  try {
    const current = getStoredCampoFds();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: CampoFimDeSemanaItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(updated));
    firebaseSync.saveAllCampo(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteStoredCampoFdsItem(id: string) {
  try {
    const current = getStoredCampoFds();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(updated));
    firebaseSync.saveAllCampo(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function saveBulkCampoFds(
  newItems: CampoFimDeSemanaItem[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonthKey?: string | string[]
) {
  try {
    const current = getStoredCampoFds();
    let updated: CampoFimDeSemanaItem[];
    if (mode === 'replace_all') {
      updated = [...newItems];
    } else if (mode === 'replace_month' && targetMonthKey) {
      const keys = Array.isArray(targetMonthKey) ? new Set(targetMonthKey) : new Set([targetMonthKey]);
      const filtered = current.filter((item) => !keys.has(item.mesChave));
      updated = [...filtered, ...newItems];
    } else {
      const existingIds = new Set(current.map((i) => i.id));
      const filteredNew = newItems.map((item) => {
        if (existingIds.has(item.id)) {
          return { ...item, id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
        }
        return item;
      });
      updated = [...current, ...filteredNew];
    }
    localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(updated));
    firebaseSync.saveAllCampo(updated);
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// =========================================================================
// MÓDULO SERVIÇO DE CAMPO (PROGRAMAÇÃO OFICIAL)
// Campos: Data, Horário, Ponto de encontro, Irmão responsável
// =========================================================================

export interface CampoProgramacao {
  id: string;
  data: string; // Ex: '26/09/2026' ou '26/09'
  horario: string; // Ex: '08:00'
  pontoEncontro: string; // Ex: 'Salão do Reino'
  responsavel: string; // Ex: 'Dhiego'
}

export const STORAGE_KEY_CAMPO_PROGRAMACAO = 'vila_cisper_campo_programacao_2026';

export const CAMPO_PROGRAMACAO_INICIAL: CampoProgramacao[] = [
  {
    id: 'prog-campo-1',
    data: '26/09/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Dhiego',
  },
  {
    id: 'prog-campo-2',
    data: '27/09/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Marcelo',
  },
  {
    id: 'prog-campo-3',
    data: '03/10/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Samuel',
  },
  {
    id: 'prog-campo-4',
    data: '04/10/2026',
    horario: '08:00',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Danilo',
  },
  {
    id: 'prog-campo-5',
    data: '10/10/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Hermes',
  },
  {
    id: 'prog-campo-6',
    data: '11/10/2026',
    horario: '08:00',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Kleber',
  },
  {
    id: 'prog-campo-7',
    data: '17/10/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Airton',
  },
  {
    id: 'prog-campo-8',
    data: '18/10/2026',
    horario: '08:00',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Vilson',
  },
  {
    id: 'prog-campo-9',
    data: '24/10/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Marcelo',
  },
  {
    id: 'prog-campo-10',
    data: '25/10/2026',
    horario: '08:00',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Geovane',
  },
  {
    id: 'prog-campo-11',
    data: '31/10/2026',
    horario: '08:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Kleber',
  },
];

export const CANONICAL_CAMPO_SAMPLE_IDS = new Set(
  CAMPO_PROGRAMACAO_INICIAL.map((i) => i.id)
);

export function isCanonicalSampleCampo(item: CampoProgramacao): boolean {
  if (!item) return false;
  if (CANONICAL_CAMPO_SAMPLE_IDS.has(item.id)) return true;
  if (/^prog-campo-(1[0-1]|[1-9])$/.test(item.id)) return true;
  return false;
}

export function getStoredCampoProgramacao(): CampoProgramacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPO_PROGRAMACAO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(CAMPO_PROGRAMACAO_INICIAL));
      return CAMPO_PROGRAMACAO_INICIAL;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return CAMPO_PROGRAMACAO_INICIAL;
  } catch {
    return CAMPO_PROGRAMACAO_INICIAL;
  }
}

export async function saveStoredCampoProgramacao(item: CampoProgramacao): Promise<{
  success: boolean;
  data?: CampoProgramacao[];
  error?: string;
}> {
  try {
    const current = getStoredCampoProgramacao();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: CampoProgramacao[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('campo-programacao-firebase-updated', { detail: updated }));
    if ((firebaseSync as any).saveAllCampoProgramacao) {
      await (firebaseSync as any).saveAllCampoProgramacao(updated);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStoredCampoProgramacao(id: string): Promise<{
  success: boolean;
  data?: CampoProgramacao[];
  error?: string;
}> {
  try {
    const current = getStoredCampoProgramacao();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('campo-programacao-firebase-updated', { detail: updated }));
    if ((firebaseSync as any).saveAllCampoProgramacao) {
      await (firebaseSync as any).saveAllCampoProgramacao(updated);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveBulkCampoProgramacao(
  newItems: CampoProgramacao[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonthKeys?: string[]
): Promise<{ success: boolean; data?: CampoProgramacao[]; error?: string; count?: number }> {
  try {
    const current = getStoredCampoProgramacao();
    const cleanedCurrent = current.filter((item) => !isCanonicalSampleCampo(item));
    let updated: CampoProgramacao[];

    if (mode === 'replace_all') {
      updated = [...newItems];
    } else if (mode === 'replace_month' && targetMonthKeys && targetMonthKeys.length > 0) {
      const monthsSet = new Set(targetMonthKeys.map((k) => k.toLowerCase()));
      const filtered = cleanedCurrent.filter((item) => {
        const partes = item.data.split('/');
        if (partes.length >= 2) {
          const mesNum = parseInt(partes[1], 10);
          const nomes = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
          const nomeMes = nomes[mesNum - 1] || '';
          return !Array.from(monthsSet).some((m) => m.includes(nomeMes));
        }
        return true;
      });
      updated = [...filtered, ...newItems];
    } else {
      const map = new Map<string, CampoProgramacao>();
      cleanedCurrent.forEach((it) => map.set(`${it.data}_${it.horario}`, it));
      newItems.forEach((it) => map.set(`${it.data}_${it.horario}`, it));
      updated = Array.from(map.values());
    }

    localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('campo-programacao-firebase-updated', { detail: updated }));
    if ((firebaseSync as any).saveAllCampoProgramacao) {
      await (firebaseSync as any).saveAllCampoProgramacao(updated);
    }
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar serviço de campo em lote.' };
  }
}
