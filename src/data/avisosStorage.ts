import { firebaseSync } from './firebaseSyncService';

export interface AvisoItem {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: 'Geral' | 'Reunião' | 'Campo' | 'Limpeza' | 'Assembleia' | 'Importante';
  dataPublicacao: string;
  fixado?: boolean;
  autor?: string;
  ativo?: boolean; // Permite ao responsável desativar sem excluir
}

export const STORAGE_KEY_AVISOS = 'vila_cisper_avisos_quadro_2026';
export const STORAGE_KEY_AVISOS_VISUALIZADOS = 'vila_cisper_avisos_visualizados_v1';

/**
 * Obtém o conjunto de IDs de avisos já visualizados/confirmados neste dispositivo.
 * Persistente no localStorage para que fechar e abrir não repita o pop-up.
 */
export function getAvisosVisualizadosIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVISOS_VISUALIZADOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Registra que o usuário neste dispositivo clicou em "ENTENDI" para um aviso específico.
 */
export function marcarAvisoComoVisualizado(id: string): void {
  try {
    const visualizados = getAvisosVisualizadosIds();
    if (!visualizados.includes(id)) {
      const novaLista = [...visualizados, id];
      localStorage.setItem(STORAGE_KEY_AVISOS_VISUALIZADOS, JSON.stringify(novaLista));
      window.dispatchEvent(new CustomEvent('avisos-visualizados-updated', { detail: novaLista }));
    }
  } catch {
    // LocalStorage indisponível
  }
}

// Nenhuma mensagem padrão ou pré-escrita. Lista inicia vazia por padrão.
export const AVISOS_CANONICOS: AvisoItem[] = [];

// Identificadores de mensagens pré-escritas/demonstração que devem ser eliminadas se existirem no armazenamento
export const DEMO_AVISO_IDS = new Set(['aviso-1', 'aviso-2', 'aviso-3', 'aviso-4']);

export function getStoredAvisos(): AvisoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVISOS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filtra e remove definitivamente mensagens de demonstração/pré-escritas
      const limpa = parsed.filter(
        (item) => item && typeof item === 'object' && item.id && !DEMO_AVISO_IDS.has(item.id)
      );
      if (limpa.length !== parsed.length) {
        // Atualiza o armazenamento local removendo os itens de demonstração
        localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(limpa));
      }
      return limpa;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredAvisos(itens: AvisoItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(itens));
    window.dispatchEvent(new CustomEvent('avisos-firebase-updated', { detail: itens }));
    // Sincronizar com Firebase Firestore
    firebaseSync.saveBatchCollection('avisos_quadro', itens, STORAGE_KEY_AVISOS, 'avisos-firebase-updated').catch((err) => {
      console.warn('Erro ao sincronizar avisos com Firebase:', err);
    });
  } catch {
    // LocalStorage indisponível
  }
}

export function addAviso(aviso: Omit<AvisoItem, 'id' | 'dataPublicacao'>): AvisoItem {
  const lista = getStoredAvisos();
  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  
  const novo: AvisoItem = {
    ...aviso,
    id: `aviso-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    dataPublicacao: dataFormatada,
    ativo: aviso.ativo !== undefined ? aviso.ativo : true,
  };

  const novaLista = [novo, ...lista];
  saveStoredAvisos(novaLista);
  return novo;
}

export function updateAviso(aviso: AvisoItem): void {
  const lista = getStoredAvisos();
  const novaLista = lista.map((item) => (item.id === aviso.id ? aviso : item));
  saveStoredAvisos(novaLista);
}

export function toggleAtivoAviso(id: string): void {
  const lista = getStoredAvisos();
  const novaLista = lista.map((item) => {
    if (item.id === id) {
      const atual = item.ativo !== undefined ? item.ativo : true;
      return { ...item, ativo: !atual };
    }
    return item;
  });
  saveStoredAvisos(novaLista);
}

export function deleteAviso(id: string): void {
  const lista = getStoredAvisos();
  const novaLista = lista.filter((item) => item.id !== id);
  saveStoredAvisos(novaLista);
}
