import { firebaseSync } from './firebaseSyncService';

export interface LimpezaItem {
  id: string;
  semana: string; // Ex: "28/09/2026 a 04/10/2026"
  dataInicio: string; // DD/MM/AAAA
  dataFim: string; // DD/MM/AAAA
  grupoNumero: number;
  grupoNome: string;
  responsavel: string;
  membros?: string[];
  tarefas?: string[];
  observacao?: string;
}

export const STORAGE_KEY_LIMPEZA = 'vila_cisper_escalas_limpeza';

export const LIMPEZA_INICIAL: LimpezaItem[] = [
  {
    id: 'limp-2026-09-14',
    semana: '14/09/2026 a 20/09/2026',
    dataInicio: '14/09/2026',
    dataFim: '20/09/2026',
    grupoNumero: 1,
    grupoNome: 'Grupo 1',
    responsavel: 'Dhiego',
    membros: ['Dhiego', 'Maria Silva', 'Pedro M.', 'Cleonice'],
    tarefas: ['Auditório e Palco', 'Sanitários', 'Entrada e Calçada'],
  },
  {
    id: 'limp-2026-09-21',
    semana: '21/09/2026 a 27/09/2026',
    dataInicio: '21/09/2026',
    dataFim: '27/09/2026',
    grupoNumero: 2,
    grupoNome: 'Grupo 2',
    responsavel: 'Samuel',
    membros: ['Samuel', 'Ruth Mendes', 'Hugo C.', 'Tereza'],
    tarefas: ['Auditório e Palco', 'Sanitários', 'Entrada e Calçada'],
  },
  {
    id: 'limp-2026-09-28',
    semana: '28/09/2026 a 04/10/2026',
    dataInicio: '28/09/2026',
    dataFim: '04/10/2026',
    grupoNumero: 3,
    grupoNome: 'Grupo 3',
    responsavel: 'Hermes B.',
    membros: ['Hermes B.', 'Vilson M.', 'Airton', 'Valdemir'],
    tarefas: ['Auditório e Palco', 'Sanitários', 'Entrada e Calçada', 'Lixeira externa'],
  },
  {
    id: 'limp-2026-10-05',
    semana: '05/10/2026 a 11/10/2026',
    dataInicio: '05/10/2026',
    dataFim: '11/10/2026',
    grupoNumero: 4,
    grupoNome: 'Grupo 4',
    responsavel: 'Marcelo F.',
    membros: ['Marcelo F.', 'Geovane', 'Vitor Fraga', 'Fernando'],
    tarefas: ['Auditório e Palco', 'Sanitários', 'Entrada e Calçada'],
  },
  {
    id: 'limp-2026-10-12',
    semana: '12/10/2026 a 18/10/2026',
    dataInicio: '12/10/2026',
    dataFim: '18/10/2026',
    grupoNumero: 5,
    grupoNome: 'Grupo 5',
    responsavel: 'Kleber S.',
    membros: ['Kleber S.', 'Danilo C.', 'Pedro Mendes', 'Eliane'],
    tarefas: ['Auditório e Palco', 'Sanitários', 'Entrada e Calçada'],
  },
];

export function getStoredLimpeza(): LimpezaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIMPEZA);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LIMPEZA, JSON.stringify(LIMPEZA_INICIAL));
      return LIMPEZA_INICIAL;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : LIMPEZA_INICIAL;
  } catch {
    return LIMPEZA_INICIAL;
  }
}

export function saveLimpezaItem(item: LimpezaItem) {
  try {
    const current = getStoredLimpeza();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: LimpezaItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_LIMPEZA, JSON.stringify(updated));
    firebaseSync.saveAllLimpeza(updated);
    window.dispatchEvent(new CustomEvent('limpeza-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteLimpezaItem(id: string) {
  try {
    const current = getStoredLimpeza();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_LIMPEZA, JSON.stringify(updated));
    firebaseSync.saveAllLimpeza(updated);
    window.dispatchEvent(new CustomEvent('limpeza-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface LimpezaEscalaItem {
  id: string;
  mes: string;
  mesChave: string;
  dias: string;
  diasSemana: string;
  grupo: string;
  responsaveis: string;
  observacao: string;
  ehEspecial?: boolean;
}

export const STORAGE_KEY_LIMPEZA_ESCALAS = 'vila_cisper_limpeza_escalas_mensal';

export function getStoredLimpezaEscalas(): LimpezaEscalaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIMPEZA_ESCALAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar escala de limpeza:', e);
  }
  return getStoredLimpeza().map((l) => ({
    id: l.id,
    mes: 'Outubro 2026',
    mesChave: 'outubro',
    dias: l.semana,
    diasSemana: 'Quarta Feira e Domingo',
    grupo: l.grupoNome || `Grupo ${l.grupoNumero}`,
    responsaveis: l.responsavel,
    observacao: l.observacao || '',
  }));
}

export function saveBulkLimpezaEscala(
  newItems: LimpezaEscalaItem[],
  mode: 'append' | 'replace_month' | 'replace_all' | string = 'append',
  targetMonthKey?: string | string[]
) {
  try {
    const current = getStoredLimpezaEscalas();
    let updated: LimpezaEscalaItem[];
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
          return { ...item, id: `limp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
        }
        return item;
      });
      updated = [...current, ...filteredNew];
    }
    localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('limpeza-updated', { detail: updated }));
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface GrupoLimpezaMembros {
  id: string;
  nome?: string;
  nomeGrupo?: string;
  superintendentes?: string;
  membros?: string[];
}

export const GRUPOS_PADRAO: GrupoLimpezaMembros[] = [
  { id: 'g1', nomeGrupo: 'Grupo 1', superintendentes: 'Dhiego / Vitor Fraga', membros: ['Dhiego', 'Vitor Fraga', 'Pedro M.', 'Cleonice'] },
  { id: 'g2', nomeGrupo: 'Grupo 2', superintendentes: 'Samuel / Geovane', membros: ['Samuel', 'Geovane', 'Hugo C.', 'Tereza'] },
  { id: 'g3', nomeGrupo: 'Grupo 3', superintendentes: 'Hermes B. / Airton', membros: ['Hermes B.', 'Airton', 'Vilson M.', 'Valdemir'] },
  { id: 'g4', nomeGrupo: 'Grupo 4', superintendentes: 'Marcelo F. / Fernando', membros: ['Marcelo F.', 'Fernando', 'Danilo C.', 'Pedro Mendes'] },
];

export const STORAGE_KEY_GRUPOS_MEMBROS = 'vila_cisper_limpeza_grupos_membros';

export function getStoredGruposMembros(): GrupoLimpezaMembros[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GRUPOS_MEMBROS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar grupos de limpeza:', e);
  }
  return GRUPOS_PADRAO;
}

export async function saveStoredLimpezaEscala(
  item: LimpezaEscalaItem
): Promise<{ success: boolean; data?: LimpezaEscalaItem[]; error?: string }> {
  try {
    const current = getStoredLimpezaEscalas();
    const index = current.findIndex((i) => i.id === item.id);
    let updated: LimpezaEscalaItem[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('limpeza-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('limpeza-firebase-updated', { detail: updated }));
    try {
      await firebaseSync.saveBatchCollection(
        'escalas_limpeza_mensal',
        updated,
        STORAGE_KEY_LIMPEZA_ESCALAS,
        'limpeza-firebase-updated'
      );
    } catch (e) {
      console.warn('Erro ao salvar escala de limpeza no Firebase:', e);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStoredLimpezaEscala(
  id: string
): Promise<{ success: boolean; data?: LimpezaEscalaItem[]; error?: string }> {
  try {
    const current = getStoredLimpezaEscalas();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('limpeza-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('limpeza-firebase-updated', { detail: updated }));
    try {
      await firebaseSync.saveBatchCollection(
        'escalas_limpeza_mensal',
        updated,
        STORAGE_KEY_LIMPEZA_ESCALAS,
        'limpeza-firebase-updated'
      );
    } catch (e) {
      console.warn('Erro ao excluir item de limpeza no Firebase:', e);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

