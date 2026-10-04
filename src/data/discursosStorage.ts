import { firebaseSync } from './firebaseSyncService';

export interface DiscursoPublicoItem {
  id: string;
  data: string; // DD/MM/AAAA (ex: "04/10/2026")
  temaNumero: number | string;
  temaTitulo: string;
  orador: string;
  congregacao: string;
  presidente: string;
  leitorSentinela?: string;
  observacoes?: string;
}

export const STORAGE_KEY_DISCURSOS = 'vila_cisper_discursos_publicos';

export const DISCURSOS_INICIAIS: DiscursoPublicoItem[] = [
  {
    id: 'disc-2026-09-13',
    data: '13/09/2026',
    temaNumero: 45,
    temaTitulo: 'Ande no caminho que conduz à vida eterna',
    orador: 'Carlos Eduardo',
    congregacao: 'Jardim Penha',
    presidente: 'Hermes B.',
    leitorSentinela: 'Dhiego',
  },
  {
    id: 'disc-2026-09-20',
    data: '20/09/2026',
    temaNumero: 18,
    temaTitulo: 'Faça de Jeová a sua fortaleza',
    orador: 'Marcos Vinicius',
    congregacao: 'Parque Boturussu',
    presidente: 'Marcelo F.',
    leitorSentinela: 'Pedro M.',
  },
  {
    id: 'disc-2026-09-27',
    data: '27/09/2026',
    temaNumero: 162,
    temaTitulo: 'Seja liberto deste mundo em trevas',
    orador: 'Robson Santos',
    congregacao: 'Ermelino Matarazzo',
    presidente: 'Danilo C.',
    leitorSentinela: 'Samuel',
  },
  {
    id: 'disc-2026-10-04',
    data: '04/10/2026',
    temaNumero: 91,
    temaTitulo: 'A presença e o domínio do Messias',
    orador: 'Antonio Carlos',
    congregacao: 'Vila Paranaguá',
    presidente: 'Kleber S.',
    leitorSentinela: 'Hugo C.',
  },
  {
    id: 'disc-2026-10-11',
    data: '11/10/2026',
    temaNumero: 33,
    temaTitulo: 'O que o Reino de Deus fará pela humanidade?',
    orador: 'Renato Oliveira',
    congregacao: 'São Miguel Paulista',
    presidente: 'Hugo C.',
    leitorSentinela: 'Dhiego',
  },
  {
    id: 'disc-2026-10-18',
    data: '18/10/2026',
    temaNumero: 104,
    temaTitulo: 'Pais, vocês estão construindo com materiais resistentes ao fogo?',
    orador: 'Fernando Dias',
    congregacao: 'Vila Silvia',
    presidente: 'Geovane',
    leitorSentinela: 'Vitor Fraga',
  },
];

export function getStoredDiscursos(): DiscursoPublicoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCURSOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(DISCURSOS_INICIAIS));
      return DISCURSOS_INICIAIS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DISCURSOS_INICIAIS;
  } catch {
    return DISCURSOS_INICIAIS;
  }
}

export function saveDiscursoItem(item: DiscursoPublicoItem) {
  try {
    const current = getStoredDiscursos();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: DiscursoPublicoItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(updated));
    firebaseSync.saveAllDiscursos(updated);
    window.dispatchEvent(new CustomEvent('discursos-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteDiscursoItem(id: string) {
  try {
    const current = getStoredDiscursos();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_DISCURSOS, JSON.stringify(updated));
    firebaseSync.saveAllDiscursos(updated);
    window.dispatchEvent(new CustomEvent('discursos-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
