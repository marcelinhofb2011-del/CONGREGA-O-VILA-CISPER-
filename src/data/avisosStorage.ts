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

export const AVISOS_CANONICOS: AvisoItem[] = [
  {
    id: 'aviso-1',
    titulo: 'Horário das Reuniões da Congregação Vila Cisper',
    conteudo: 'Lembramos a todos os irmãos e visitantes que nossas reuniões ocorrem pontualmente: Reunião de Meio de Semana às Quintas-feiras às 20:00, e Reunião de Fim de Semana aos Domingos às 18:00.',
    categoria: 'Reunião',
    dataPublicacao: '01/09/2026',
    fixado: true,
    autor: 'Corpo de Anciãos',
  },
  {
    id: 'aviso-2',
    titulo: 'Chegada com Antecedência para Irmãos Designados',
    conteudo: 'Os irmãos designados para microfones volantes, indicadores, som e vídeo devem chegar com pelo menos 20 minutos de antecedência para os testes de áudio e organização do Salão.',
    categoria: 'Importante',
    dataPublicacao: '05/09/2026',
    fixado: true,
    autor: 'Superintendente de Serviço',
  },
  {
    id: 'aviso-3',
    titulo: 'Arranjos para o Serviço de Campo no Fim de Semana',
    conteudo: 'As saídas de campo aos sábados e domingos contam com dirigentes designados. Consulte a seção "Serviço de Campo" para conferir os pontos de encontro e horários de cada grupo.',
    categoria: 'Campo',
    dataPublicacao: '10/09/2026',
    fixado: false,
    autor: 'Comissão de Serviço',
  },
  {
    id: 'aviso-4',
    titulo: 'Limpeza Semanal do Salão do Reino',
    conteudo: 'A limpeza do Salão do Reino é realizada com amor e dedicação pelos grupos em rodízio semanal. Confira na seção "Limpeza" qual grupo está encarregado nesta semana.',
    categoria: 'Limpeza',
    dataPublicacao: '12/09/2026',
    fixado: false,
    autor: 'Coordenação do Salão',
  },
];

export function getStoredAvisos(): AvisoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVISOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(AVISOS_CANONICOS));
      return AVISOS_CANONICOS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return AVISOS_CANONICOS;
  } catch {
    return AVISOS_CANONICOS;
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
