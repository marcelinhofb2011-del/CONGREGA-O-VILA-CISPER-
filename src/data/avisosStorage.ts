import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { firebaseSync, cleanForFirestore } from './firebaseSyncService';

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
 * Valida se um item é uma mensagem de teste, demonstração ou gerada automaticamente por IA.
 * Utilizado para garantir que APENAS avisos reais criados pelo Responsável apareçam no Pop-up e na aba.
 */
export function isTestOrDemoAviso(item: any): boolean {
  if (!item || typeof item !== 'object') return true;
  const id = String(item.id || '').toLowerCase();
  const titulo = String(item.titulo || '').toLowerCase();
  const conteudo = String(item.conteudo || '').toLowerCase();
  const autor = String(item.autor || '').toLowerCase();

  // IDs artificiais de demonstração/teste
  if (
    id === 'aviso-1' ||
    id === 'aviso-2' ||
    id === 'aviso-3' ||
    id === 'aviso-4' ||
    id.includes('demo') ||
    id.includes('sample') ||
    id.includes('fake') ||
    id.includes('placeholder')
  ) {
    return true;
  }

  // Termos de teste e mensagens fictícias
  const termosTeste = [
    'teste',
    'testando',
    'aviso de teste',
    'mensagem de teste',
    'comunicado de teste',
    'exemplo',
    'demonstração',
    'lorem ipsum',
    'texto de teste',
    'sample notice',
  ];

  if (termosTeste.some((t) => titulo.includes(t) || conteudo.includes(t) || autor.includes(t))) {
    return true;
  }

  // Conteúdo deve ser real e não vazio
  if (!conteudo.trim()) {
    return true;
  }

  return false;
}

// Limpeza preventiva imediata de avisos de teste no carregamento do módulo
try {
  const rawLocal = localStorage.getItem(STORAGE_KEY_AVISOS);
  if (rawLocal) {
    const parsed = JSON.parse(rawLocal);
    if (Array.isArray(parsed)) {
      const purificados = parsed.filter((a) => !isTestOrDemoAviso(a));
      if (purificados.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(purificados));
      }
    }
  }
} catch {
  // Ignora se localStorage indisponível
}

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
 * Registra que o usuário neste dispositivo visualizou/confirmou o aviso.
 * Marca este aviso e todos os avisos ativos existentes para evitar pop-ups em sequência.
 * Cada aviso é exibido apenas uma vez por usuário.
 */
export function marcarAvisoComoVisualizado(id: string): void {
  try {
    const visualizados = getAvisosVisualizadosIds();
    const avisosAtuais = getStoredAvisos();
    // Agrupa o ID atual e todos os avisos já existentes no momento para nunca exibir em sequência
    const novaLista = Array.from(
      new Set([...visualizados, id, ...avisosAtuais.map((a) => a.id)])
    );
    localStorage.setItem(STORAGE_KEY_AVISOS_VISUALIZADOS, JSON.stringify(novaLista));
    window.dispatchEvent(
      new CustomEvent('avisos-visualizados-updated', { detail: novaLista })
    );
  } catch {
    // LocalStorage indisponível
  }
}

export function getStoredAvisos(): AvisoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AVISOS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Remove qualquer mensagem de teste ou fictícia
      const limpos = parsed.filter((item) => !isTestOrDemoAviso(item));
      if (limpos.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(limpos));
      }
      return limpos;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveStoredAvisos(itens: AvisoItem[]): void {
  try {
    // Filtra para garantir que apenas avisos reais sejam salvos e sincronizados
    const reais = itens.filter((it) => !isTestOrDemoAviso(it));
    localStorage.setItem(STORAGE_KEY_AVISOS, JSON.stringify(reais));
    window.dispatchEvent(new CustomEvent('avisos-firebase-updated', { detail: reais }));

    // Sincronizar coleção completa com Firebase Firestore (batch diff)
    firebaseSync
      .saveBatchCollection('avisos_quadro', reais, STORAGE_KEY_AVISOS, 'avisos-firebase-updated')
      .catch((err) => {
        console.warn('Erro ao sincronizar avisos com Firebase:', err);
      });
  } catch {
    // LocalStorage indisponível
  }
}

export function addAviso(aviso: Omit<AvisoItem, 'id' | 'dataPublicacao'>): AvisoItem {
  const lista = getStoredAvisos();
  const hoje = new Date();
  const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(
    hoje.getMonth() + 1
  ).padStart(2, '0')}/${hoje.getFullYear()}`;

  const novo: AvisoItem = {
    id: `aviso-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    titulo: (aviso.titulo || '').trim() || 'Aviso',
    conteudo: (aviso.conteudo || '').trim(),
    categoria: aviso.categoria || 'Geral',
    dataPublicacao: dataFormatada,
    ativo: aviso.ativo !== false,
    fixado: Boolean(aviso.fixado),
    autor: (aviso.autor || '').trim() || 'Responsável',
  };

  // Garante que não é mensagem de teste
  if (isTestOrDemoAviso(novo)) {
    return novo;
  }

  const novaLista = [novo, ...lista.filter((a) => a.id !== novo.id)];
  saveStoredAvisos(novaLista);

  // Gravação atômica imediata no Firestore para sincronizar instantaneamente com outros celulares
  try {
    const docRef = doc(db, 'avisos_quadro', novo.id);
    setDoc(
      docRef,
      cleanForFirestore({
        ...novo,
        atualizadoEm: new Date().toISOString(),
      })
    ).catch((err) => {
      console.warn('Erro na gravação individual do aviso no Firestore:', err);
    });
  } catch (err) {
    console.warn('Falha ao acionar gravação no Firestore:', err);
  }

  // Marca como visualizado no dispositivo do responsável que criou para não abrir pop-up nele mesmo
  marcarAvisoComoVisualizado(novo.id);

  return novo;
}

export function updateAviso(aviso: AvisoItem): void {
  const lista = getStoredAvisos();
  const limpo: AvisoItem = {
    ...aviso,
    titulo: (aviso.titulo || '').trim() || 'Aviso',
    conteudo: (aviso.conteudo || '').trim(),
    categoria: aviso.categoria || 'Geral',
    ativo: aviso.ativo !== false,
    fixado: Boolean(aviso.fixado),
    autor: (aviso.autor || '').trim() || 'Responsável',
  };

  if (isTestOrDemoAviso(limpo)) {
    return;
  }

  const novaLista = lista.map((item) => (item.id === limpo.id ? limpo : item));
  saveStoredAvisos(novaLista);

  // Atualização direta no Firestore
  try {
    const docRef = doc(db, 'avisos_quadro', limpo.id);
    setDoc(
      docRef,
      cleanForFirestore({
        ...limpo,
        atualizadoEm: new Date().toISOString(),
      })
    ).catch((err) => {
      console.warn('Erro ao atualizar aviso individual no Firestore:', err);
    });
  } catch (err) {
    console.warn('Falha ao atualizar aviso no Firestore:', err);
  }
}

export function toggleAtivoAviso(id: string): void {
  const lista = getStoredAvisos();
  let avisoAtualizado: AvisoItem | null = null;
  const novaLista = lista.map((item) => {
    if (item.id === id) {
      const atual = item.ativo !== false;
      avisoAtualizado = { ...item, ativo: !atual };
      return avisoAtualizado;
    }
    return item;
  });
  saveStoredAvisos(novaLista);

  if (avisoAtualizado) {
    try {
      const docRef = doc(db, 'avisos_quadro', id);
      setDoc(
        docRef,
        cleanForFirestore({
          ...avisoAtualizado,
          atualizadoEm: new Date().toISOString(),
        })
      ).catch((err) => {
        console.warn('Erro ao alternar status do aviso no Firestore:', err);
      });
    } catch {
      // ignore
    }
  }
}

export function deleteAviso(id: string): void {
  const lista = getStoredAvisos();
  const novaLista = lista.filter((item) => item.id !== id);
  saveStoredAvisos(novaLista);

  // Remoção atômica definitiva do documento no Firestore
  try {
    const docRef = doc(db, 'avisos_quadro', id);
    deleteDoc(docRef).catch((err) => {
      console.warn('Erro ao excluir documento de aviso no Firestore:', err);
    });
  } catch (err) {
    console.warn('Falha ao acionar exclusão de aviso no Firestore:', err);
  }
}
