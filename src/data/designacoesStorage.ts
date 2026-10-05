import { firebaseSync } from './firebaseSyncService';

export interface DesignacaoItem {
  id: string;
  data: string; // DD/MM/AAAA (ex: "01/10/2026")
  diaSemana: 'Quinta-feira' | 'Domingo' | 'Sábado' | 'Terça-feira';
  tipoReuniao: 'Meio de Semana' | 'Fim de Semana';
  audioVideo: string;
  indicadorEntrada: string;
  indicadorAuditorio: string;
  microfone1: string;
  microfone2: string;
  palco?: string;
  oracaoInicial?: string;
  oracaoFinal?: string;
  leitorSentinela?: string;
  presidente?: string;
  observacoes?: string;
}

export const STORAGE_KEY_DESIGNACOES = 'vila_cisper_designacoes_reuniao';

export const DESIGNACOES_INICIAIS: DesignacaoItem[] = [
  {
    id: 'desig-2026-09-17',
    data: '17/09/2026',
    diaSemana: 'Quinta-feira',
    tipoReuniao: 'Meio de Semana',
    audioVideo: 'Pedro Mendes',
    indicadorEntrada: 'Airton',
    indicadorAuditorio: 'Valdemir',
    microfone1: 'Hugo C.',
    microfone2: 'Vitor Fraga',
    palco: 'Samuel',
  },
  {
    id: 'desig-2026-09-20',
    data: '20/09/2026',
    diaSemana: 'Domingo',
    tipoReuniao: 'Fim de Semana',
    audioVideo: 'Vitor Fraga',
    indicadorEntrada: 'Fernando',
    indicadorAuditorio: 'Kleber S.',
    microfone1: 'Pedro M.',
    microfone2: 'Hugo C.',
    leitorSentinela: 'Dhiego',
    presidente: 'Marcelo F.',
  },
  {
    id: 'desig-2026-09-24',
    data: '24/09/2026',
    diaSemana: 'Quinta-feira',
    tipoReuniao: 'Meio de Semana',
    audioVideo: 'Pedro Mendes',
    indicadorEntrada: 'Hermes B.',
    indicadorAuditorio: 'Vilson M.',
    microfone1: 'Airton',
    microfone2: 'Danilo C.',
    palco: 'Samuel',
  },
  {
    id: 'desig-2026-09-27',
    data: '27/09/2026',
    diaSemana: 'Domingo',
    tipoReuniao: 'Fim de Semana',
    audioVideo: 'Hugo C.',
    indicadorEntrada: 'Marcelo F.',
    indicadorAuditorio: 'Geovane',
    microfone1: 'Vitor Fraga',
    microfone2: 'Pedro M.',
    leitorSentinela: 'Samuel',
    presidente: 'Danilo C.',
  },
  {
    id: 'desig-2026-10-01',
    data: '01/10/2026',
    diaSemana: 'Quinta-feira',
    tipoReuniao: 'Meio de Semana',
    audioVideo: 'Vitor Fraga',
    indicadorEntrada: 'Valdemir',
    indicadorAuditorio: 'Airton',
    microfone1: 'Pedro Mendes',
    microfone2: 'Hugo C.',
    palco: 'Danilo C.',
  },
  {
    id: 'desig-2026-10-04',
    data: '04/10/2026',
    diaSemana: 'Domingo',
    tipoReuniao: 'Fim de Semana',
    audioVideo: 'Pedro Mendes',
    indicadorEntrada: 'Vilson M.',
    indicadorAuditorio: 'Fernando',
    microfone1: 'Danilo C.',
    microfone2: 'Hugo C.',
    leitorSentinela: 'Hugo C.',
    presidente: 'Kleber S.',
  },
  {
    id: 'desig-2026-10-08',
    data: '08/10/2026',
    diaSemana: 'Quinta-feira',
    tipoReuniao: 'Meio de Semana',
    audioVideo: 'Pedro Mendes',
    indicadorEntrada: 'Geovane',
    indicadorAuditorio: 'Hermes B.',
    microfone1: 'Vitor Fraga',
    microfone2: 'Airton',
    palco: 'Samuel',
  },
  {
    id: 'desig-2026-10-11',
    data: '11/10/2026',
    diaSemana: 'Domingo',
    tipoReuniao: 'Fim de Semana',
    audioVideo: 'Hugo C.',
    indicadorEntrada: 'Samuel',
    indicadorAuditorio: 'Marcelo F.',
    microfone1: 'Pedro M.',
    microfone2: 'Valdemir',
    leitorSentinela: 'Dhiego',
    presidente: 'Hugo C.',
  },
];

export function getStoredDesignacoes(): DesignacaoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DESIGNACOES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(DESIGNACOES_INICIAIS));
      return DESIGNACOES_INICIAIS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DESIGNACOES_INICIAIS;
  } catch {
    return DESIGNACOES_INICIAIS;
  }
}

export function saveDesignacaoItem(item: DesignacaoItem) {
  try {
    const current = getStoredDesignacoes();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: DesignacaoItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(updated));
    firebaseSync.saveAllDesignacoes(updated);
    window.dispatchEvent(new CustomEvent('designacoes-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteDesignacaoItem(id: string) {
  try {
    const current = getStoredDesignacoes();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(updated));
    firebaseSync.saveAllDesignacoes(updated);
    window.dispatchEvent(new CustomEvent('designacoes-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface EscalaDesignacaoItem {
  id: string;
  mes: string;
  mesChave: string;
  dia: string;
  indicador: string;
  microfone: string;
  leitor: string;
  audio: string;
  video: string;
  presidencia: string;
  observacao: string;
  ehEspecial: boolean;
}

export const STORAGE_KEY_ESCALA_DESIGNACOES = 'vila_cisper_escala_designacoes_mensal';

export function getStoredEscalaDesignacoes(): EscalaDesignacaoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ESCALA_DESIGNACOES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao carregar escala de designações:', e);
  }
  return getStoredDesignacoes().map((d) => ({
    id: d.id,
    mes: 'Outubro 2026',
    mesChave: 'outubro',
    dia: `${d.diaSemana} ${d.data}`,
    indicador: [d.indicadorEntrada, d.indicadorAuditorio].filter(Boolean).join(' / '),
    microfone: [d.microfone1, d.microfone2].filter(Boolean).join(' / '),
    leitor: d.leitorSentinela || '',
    audio: d.audioVideo || '',
    video: d.audioVideo || '',
    presidencia: d.presidente || '',
    observacao: d.observacoes || '',
    ehEspecial: false,
  }));
}

export function saveBulkEscalaDesignacoes(
  newItems: EscalaDesignacaoItem[],
  mode: 'append' | 'replace_month' | 'replace_all' | string = 'append',
  targetMonthKey?: string | string[]
) {
  try {
    const current = getStoredEscalaDesignacoes();
    let updated: EscalaDesignacaoItem[];
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
          return { ...item, id: `desig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
        }
        return item;
      });
      updated = [...current, ...filteredNew];
    }
    localStorage.setItem(STORAGE_KEY_ESCALA_DESIGNACOES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('designacoes-updated', { detail: updated }));
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveStoredEscalaItem(
  item: EscalaDesignacaoItem
): Promise<{ success: boolean; data?: EscalaDesignacaoItem[]; error?: string }> {
  try {
    const current = getStoredEscalaDesignacoes();
    const index = current.findIndex((i) => i.id === item.id);
    let updated: EscalaDesignacaoItem[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_ESCALA_DESIGNACOES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('designacoes-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('designacoes-firebase-updated', { detail: updated }));
    try {
      await firebaseSync.saveBatchCollection(
        'escala_designacoes_mensal',
        updated,
        STORAGE_KEY_ESCALA_DESIGNACOES,
        'designacoes-firebase-updated'
      );
    } catch (e) {
      console.warn('Erro ao salvar escala no Firebase:', e);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStoredEscalaItem(
  id: string
): Promise<{ success: boolean; data?: EscalaDesignacaoItem[]; error?: string }> {
  try {
    const current = getStoredEscalaDesignacoes();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_ESCALA_DESIGNACOES, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('designacoes-updated', { detail: updated }));
    window.dispatchEvent(new CustomEvent('designacoes-firebase-updated', { detail: updated }));
    try {
      await firebaseSync.saveBatchCollection(
        'escala_designacoes_mensal',
        updated,
        STORAGE_KEY_ESCALA_DESIGNACOES,
        'designacoes-firebase-updated'
      );
    } catch (e) {
      console.warn('Erro ao excluir item da escala no Firebase:', e);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


