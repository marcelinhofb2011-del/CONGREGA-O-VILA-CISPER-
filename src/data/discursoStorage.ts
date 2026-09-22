import { firebaseSync } from './firebaseSyncService';

export interface DiscursoBiblicoItem {
  id: string;
  mes?: string; // Ex: 'Setembro'
  data: string; // Ex: '06/09' ou '06/09/2026'
  tema: string; // Ex: 'Mostre que vc apoia o direito de Jeová governar'
  numeroTema?: string; // Número do cântico ou esboço se houver
  orador?: string; // Nome do orador
  congregacaoOrador?: string; // Ex: 'Vila Cisper', 'Convidado'
  presidente?: string; // Ex: 'Marcelo Ferreira'
  leitor?: string; // Ex: 'Danilo Cardoso'
  observacao?: string;
}

// Mantemos compatibilidade com DiscursoPublicoItem
export interface DiscursoPublicoItem {
  id: string;
  data: string;
  numero: string;
  tema: string;
  orador: string;
  presidente?: string;
  leitor?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export const STORAGE_KEY_DISCURSOS = 'vila_cisper_discurso_biblico_2026';

export const DISCURSOS_CANONICOS: DiscursoBiblicoItem[] = [
  {
    id: 'disc-set-1',
    mes: 'Setembro',
    data: '06/09',
    tema: 'Mostre que vc apoia o direito de Jeová governar',
    presidente: 'Marcelo Ferreira',
    leitor: 'Danilo Cardoso',
    orador: 'Orador Local / Visitante',
  },
  {
    id: 'disc-set-2',
    mes: 'Setembro',
    data: '13/09',
    tema: 'Onde encontrar ajuda em tempos de aflição?',
    presidente: 'Dhiego',
    leitor: 'Hermes Bertucci',
    orador: 'Orador Local / Visitante',
  },
  {
    id: 'disc-set-3',
    mes: 'Setembro',
    data: '20/09',
    tema: 'Visita do viajante',
    presidente: 'Danilo Cardoso',
    leitor: '',
    orador: 'Superintendente de Circuito',
    observacao: 'Visita do viajante',
  },
  {
    id: 'disc-set-4',
    mes: 'Setembro',
    data: '27/09',
    tema: 'Como a biblia pode ajudar você?',
    presidente: 'Hermes Bertucci',
    leitor: 'Geovane Alves',
    orador: 'Orador Local / Visitante',
  },
  // Outubro pré-populado
  {
    id: 'disc-out-1',
    mes: 'Outubro',
    data: '04/10',
    tema: 'Apeguem-se à sua integridade',
    presidente: 'Dhiego',
    leitor: 'Airton',
    orador: 'Orador Local / Visitante',
  },
  {
    id: 'disc-out-2',
    mes: 'Outubro',
    data: '11/10',
    tema: 'Será que Deus aceita todas as religiões?',
    presidente: 'Hermes',
    leitor: 'Silvani',
    orador: 'Orador Local / Visitante',
  },
  {
    id: 'disc-out-3',
    mes: 'Outubro',
    data: '18/10',
    tema: 'Assembléia de Circuito',
    presidente: 'Samuel',
    leitor: 'Marcelo',
    orador: 'Programa da Assembléia',
    observacao: 'Assembléia',
  },
  {
    id: 'disc-out-4',
    mes: 'Outubro',
    data: '25/10',
    tema: 'Como você pode vencer o mal com o bem?',
    presidente: 'Hugo',
    leitor: 'Geovane',
    orador: 'Orador Local / Visitante',
  },
];

export const IRMAOS_DISCURSO_ROSTER = [
  'Marcelo',
  'Dhiego',
  'Danilo',
  'Hermes',
  'Geovane',
  'Vilson',
  'Hugo',
  'Samuel',
  'Airton',
];

export const CANONICAL_DISCURSOS_SAMPLE_IDS = new Set(
  DISCURSOS_CANONICOS.map((i) => i.id)
);

export function getStoredDiscursosBiblicos(): DiscursoBiblicoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCURSOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(DISCURSOS_CANONICOS));
      return DISCURSOS_CANONICOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const temRegistrosReais = parsed.some((i) => !CANONICAL_DISCURSOS_SAMPLE_IDS.has(i.id));
      if (temRegistrosReais) {
        const limpos = parsed.filter((i) => !CANONICAL_DISCURSOS_SAMPLE_IDS.has(i.id));
        if (limpos.length > 0) {
          return limpos;
        }
      }
      return parsed;
    }
    return DISCURSOS_CANONICOS;
  } catch {
    return DISCURSOS_CANONICOS;
  }
}

export async function saveStoredDiscursoBiblico(item: DiscursoBiblicoItem): Promise<{ success: boolean; data?: DiscursoBiblicoItem[]; error?: string }> {
  try {
    const current = getStoredDiscursosBiblicos();
    const idx = current.findIndex((d) => d.id === item.id);
    let updated: DiscursoBiblicoItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('discursos-firebase-updated', { detail: updated }));
    await firebaseSync.saveAllDiscursos(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStoredDiscursoBiblico(id: string): Promise<{ success: boolean; data?: DiscursoBiblicoItem[]; error?: string }> {
  try {
    const current = getStoredDiscursosBiblicos();
    const updated = current.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('discursos-firebase-updated', { detail: updated }));
    await firebaseSync.saveAllDiscursos(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveBulkDiscursosBiblicos(
  newItems: DiscursoBiblicoItem[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonth?: string | string[]
): Promise<{ success: boolean; data?: DiscursoBiblicoItem[]; error?: string; count?: number }> {
  try {
    const current = getStoredDiscursosBiblicos();
    // Descarta dados de exemplo antigos do template ao importar dados reais
    const cleanedCurrent = current.filter((item) => !CANONICAL_DISCURSOS_SAMPLE_IDS.has(item.id));
    let updated: DiscursoBiblicoItem[];

    if (mode === 'replace_all') {
      updated = [...newItems];
    } else if (mode === 'replace_month' && targetMonth) {
      const monthList = Array.isArray(targetMonth) ? targetMonth.map((m) => m.toLowerCase()) : [targetMonth.toLowerCase()];
      const filtered = cleanedCurrent.filter((item) => {
        const itemMes = (item.mes || '').toLowerCase();
        return !monthList.some((m) => itemMes.includes(m) || m.includes(itemMes));
      });
      updated = [...filtered, ...newItems];
    } else {
      const map = new Map<string, DiscursoBiblicoItem>();
      cleanedCurrent.forEach((it) => map.set(it.data.trim(), it));
      newItems.forEach((it) => map.set(it.data.trim(), it));
      updated = Array.from(map.values());
    }

    localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('discursos-firebase-updated', { detail: updated }));
    await firebaseSync.saveAllDiscursos(updated);
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function resetDiscursosBiblicosToSample(): DiscursoBiblicoItem[] {
  localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(DISCURSOS_CANONICOS));
  firebaseSync.saveAllDiscursos(DISCURSOS_CANONICOS);
  return DISCURSOS_CANONICOS;
}

// Retrocompatibilidade
export function getStoredDiscursos(): DiscursoPublicoItem[] {
  return [];
}
export function saveStoredDiscurso(d: DiscursoPublicoItem): DiscursoPublicoItem[] {
  return [];
}
export function deleteStoredDiscurso(id: string): DiscursoPublicoItem[] {
  return [];
}
