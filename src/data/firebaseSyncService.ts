import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  S140TSemana,
  STORAGE_KEY_S140T,
  S140T_DADOS_PADRAO,
} from './s140tStorage';
import {
  Territorio,
  STORAGE_KEY_TERRITORIOS,
  getStoredTerritorios,
} from './territoriosStorage';

// Coleções do Firestore
export const COLLECTIONS = {
  S140T: 'semanas_s140t',
  TERRITORIOS: 'territorios',
  DESIGNACOES: 'designacoes_reuniao',
  DISCURSOS: 'discursos_publicos',
  CAMPO: 'servico_campo',
  LIMPEZA: 'escalas_limpeza',
  ASSISTENCIA: 'registros_assistencia',
} as const;

export type SyncStatus = 'connecting' | 'connected' | 'offline' | 'error';

class FirebaseSyncManager {
  private status: SyncStatus = 'connecting';
  private listeners: Array<(status: SyncStatus) => void> = [];
  private unsubscribers: Array<() => void> = [];

  constructor() {
    this.init();
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.status);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(status: SyncStatus) {
    if (this.status !== status) {
      this.status = status;
      this.listeners.forEach((cb) => cb(status));
    }
  }

  public init() {
    if (typeof window === 'undefined') return;

    try {
      this.syncS140T();
      this.syncTerritorios();
      this.syncGenericCollection(COLLECTIONS.DESIGNACOES, 'designacoes_vilacisper_data');
      this.syncGenericCollection(COLLECTIONS.DISCURSOS, 'discurso_vilacisper_data');
      this.syncGenericCollection(COLLECTIONS.CAMPO, 'campo_vilacisper_data');
      this.syncGenericCollection(COLLECTIONS.LIMPEZA, 'limpeza_vilacisper_data');
      this.syncGenericCollection(COLLECTIONS.ASSISTENCIA, 'assistencia_vilacisper_data');
    } catch (err) {
      console.warn('Erro ao inicializar listeners do Firebase:', err);
      this.setStatus('offline');
    }
  }

  // ==========================================
  // S-140-T: Reunião do Meio de Semana
  // ==========================================
  private syncS140T() {
    const colRef = collection(db, COLLECTIONS.S140T);

    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        this.setStatus('connected');

        if (snapshot.empty) {
          // Se a coleção estiver vazia no Firestore pela primeira vez, faz o seed inicial com o modelo oficial
          try {
            const batch = writeBatch(db);
            const dadosLocaisRaw = localStorage.getItem(STORAGE_KEY_S140T);
            const dadosParaSeed: S140TSemana[] = dadosLocaisRaw
              ? JSON.parse(dadosLocaisRaw)
              : S140T_DADOS_PADRAO;

            for (const sem of dadosParaSeed) {
              const docRef = doc(db, COLLECTIONS.S140T, sem.id);
              batch.set(docRef, sem);
            }
            await batch.commit();
          } catch (seedErr) {
            console.warn('Erro no seed inicial do S140T no Firestore:', seedErr);
          }
          return;
        }

        // Atualizar cache local com os documentos em tempo real da nuvem
        const semanas: S140TSemana[] = [];
        snapshot.forEach((docSnap) => {
          semanas.push(docSnap.data() as S140TSemana);
        });

        semanas.sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia));
        localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(semanas));
        window.dispatchEvent(new CustomEvent('s140t-firebase-updated', { detail: semanas }));
      },
      (error) => {
        console.warn('Falha no listener Firestore S140T:', error);
        this.setStatus('offline');
      }
    );

    this.unsubscribers.push(unsub);
  }

  public async saveS140TSemana(semana: S140TSemana): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.S140T, semana.id);
      await setDoc(docRef, {
        ...semana,
        atualizadoEm: new Date().toISOString(),
      });
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao salvar S140T no Firestore:', err);
      // Mantém fallback offline no localStorage
    }
  }

  public async deleteS140TSemana(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.S140T, id);
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao excluir S140T no Firestore:', err);
    }
  }

  public async resetS140TToOfficial(): Promise<void> {
    try {
      // Limpa documentos existentes e restaura os dados padrão no Firestore
      const colRef = collection(db, COLLECTIONS.S140T);
      const snapshot = await getDocs(colRef);
      const batch = writeBatch(db);

      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });

      for (const sem of S140T_DADOS_PADRAO) {
        const docRef = doc(db, COLLECTIONS.S140T, sem.id);
        batch.set(docRef, sem);
      }

      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao restaurar S140T no Firestore:', err);
    }
  }

  // ==========================================
  // Territórios e Mapas
  // ==========================================
  private syncTerritorios() {
    const colRef = collection(db, COLLECTIONS.TERRITORIOS);

    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        this.setStatus('connected');

        if (snapshot.empty) {
          // Seed inicial dos territórios
          try {
            const batch = writeBatch(db);
            const dadosLocaisRaw = localStorage.getItem(STORAGE_KEY_TERRITORIOS);
            const dadosParaSeed: Territorio[] = dadosLocaisRaw
              ? JSON.parse(dadosLocaisRaw)
              : getStoredTerritorios();

            for (const t of dadosParaSeed) {
              const docRef = doc(db, COLLECTIONS.TERRITORIOS, t.id);
              batch.set(docRef, t);
            }
            await batch.commit();
          } catch (seedErr) {
            console.warn('Erro no seed inicial de Territórios:', seedErr);
          }
          return;
        }

        const lista: Territorio[] = [];
        snapshot.forEach((docSnap) => {
          lista.push(docSnap.data() as Territorio);
        });

        lista.sort((a, b) => a.numero - b.numero);
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(lista));
        window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: lista }));
      },
      (error) => {
        console.warn('Falha no listener Firestore Territórios:', error);
        this.setStatus('offline');
      }
    );

    this.unsubscribers.push(unsub);
  }

  public async saveTerritorio(t: Territorio): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.TERRITORIOS, t.id);
      await setDoc(docRef, {
        ...t,
        updated_at: new Date().toISOString(),
      });
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao salvar território no Firestore:', err);
    }
  }

  public async saveAllTerritorios(lista: Territorio[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const t of lista) {
        const docRef = doc(db, COLLECTIONS.TERRITORIOS, t.id);
        batch.set(docRef, t);
      }
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao salvar lote de territórios:', err);
    }
  }

  // ==========================================
  // Sincronização de Coleção Genérica
  // ==========================================
  private syncGenericCollection(collectionName: string, localStorageKey: string) {
    const colRef = collection(db, collectionName);

    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        this.setStatus('connected');

        if (snapshot.empty) {
          const localRaw = localStorage.getItem(localStorageKey);
          if (localRaw) {
            try {
              const items = JSON.parse(localRaw);
              if (Array.isArray(items) && items.length > 0) {
                const batch = writeBatch(db);
                for (let i = 0; i < items.length; i++) {
                  const item = items[i];
                  const id = item.id || `item-${i + 1}`;
                  const docRef = doc(db, collectionName, String(id));
                  batch.set(docRef, item);
                }
                await batch.commit();
              }
            } catch {
              // Ignore
            }
          }
          return;
        }

        const items: unknown[] = [];
        snapshot.forEach((d) => {
          items.push(d.data());
        });

        localStorage.setItem(localStorageKey, JSON.stringify(items));
        window.dispatchEvent(
          new CustomEvent(`${collectionName}-firebase-updated`, { detail: items })
        );
      },
      (error) => {
        console.warn(`Falha no listener de ${collectionName}:`, error);
      }
    );

    this.unsubscribers.push(unsub);
  }

  public async saveGenericItem(collectionName: string, id: string, data: Record<string, unknown>): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { ...data, atualizadoEm: new Date().toISOString() });
      this.setStatus('connected');
    } catch (err) {
      console.warn(`Erro ao salvar item em ${collectionName}:`, err);
    }
  }

  public async deleteGenericItem(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (err) {
      console.warn(`Erro ao excluir item em ${collectionName}:`, err);
    }
  }

  public destroy() {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
  }
}

export const firebaseSync = new FirebaseSyncManager();
