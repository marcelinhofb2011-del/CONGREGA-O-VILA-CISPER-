import { firebaseSync } from './firebaseSyncService';

export interface AvisoItem {
  id: string;
  titulo: string;
  conteudo: string;
  data: string;
  categoria?: 'geral' | 'reuniao' | 'campo' | 'visita';
  importante?: boolean;
}

export const STORAGE_KEY_AVISOS = 'vila_cisper_avisos_quadro';

export const AVISOS_INICIAIS: AvisoItem[] = [
  {
    id: 'aviso-1',
    titulo: 'Visita do Superintendente de Circuito',
    conteudo: 'A visita do superintendente de circuito à congregação Vila Cisper acontecerá no mês de Outubro. Todos os publicadores e pioneiros estão convidados a participar com zelo em todas as atividades.',
    data: '28/09/2026',
    categoria: 'visita',
    importante: true,
  },
  {
    id: 'aviso-2',
    titulo: 'Novo Horário das Saídas de Campo',
    conteudo: 'Lembramos a todos os irmãos que o horário oficial das Saídas de Campo está configurado para às 08:00 no Salão do Reino.',
    data: '25/09/2026',
    categoria: 'campo',
    importante: false,
  },
  {
    id: 'aviso-3',
    titulo: 'Limpeza Geral do Salão do Reino',
    conteudo: 'Neste próximo sábado haverá uma limpeza detalhada com o grupo escalado. Agradecemos a colaboração de todos.',
    data: '20/09/2026',
    categoria: 'geral',
    importante: false,
  },
];

export function getStoredAvisos(): AvisoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVISOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(AVISOS_INICIAIS));
      return AVISOS_INICIAIS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : AVISOS_INICIAIS;
  } catch {
    return AVISOS_INICIAIS;
  }
}

export function saveAvisoItem(item: AvisoItem) {
  try {
    const current = getStoredAvisos();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: AvisoItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(updated));
    firebaseSync.saveAllAvisos(updated);
    window.dispatchEvent(new CustomEvent('avisos-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteAvisoItem(id: string) {
  try {
    const current = getStoredAvisos();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(updated));
    firebaseSync.saveAllAvisos(updated);
    window.dispatchEvent(new CustomEvent('avisos-updated', { detail: updated }));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
