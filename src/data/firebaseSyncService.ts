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
  SolicitacaoTerritorio,
  TransferenciaTerritorio,
  HistoricoTerritorio,
  STORAGE_KEY_TERRITORIOS,
  STORAGE_KEY_SOLICITACOES,
  STORAGE_KEY_TRANSFERENCIAS,
  STORAGE_KEY_HISTORICO,
  getStoredTerritorios,
  getStoredSolicitacoes,
  getStoredTransferencias,
  getStoredHistorico,
  isAdminAuthenticated,
  formatarDataHoje,
  formatarHoraHoje,
  formatarDataHoraHoje,
} from './territoriosStorage';
import { STORAGE_KEY_DESIGNACOES } from './designacoesStorage';
import { STORAGE_KEY_CAMPO_FDS, STORAGE_KEY_CAMPO_PROGRAMACAO } from './campoStorage';
import { STORAGE_KEY_DISCURSOS } from './discursoStorage';
import { STORAGE_KEY_LIMPEZA_ESCALAS } from './limpezaStorage';
import { STORAGE_KEY_AVISOS, isTestOrDemoAviso } from './avisosStorage';
import { dispatchPushNotificationToResponsaveis } from '../lib/pushNotificationService';

// Coleções do Firestore
export const COLLECTIONS = {
  S140T: 'semanas_s140t',
  TERRITORIOS: 'territorios',
  SOLICITACOES: 'solicitacoes_territorios',
  TRANSFERENCIAS: 'transferencias_territorios',
  HISTORICO: 'historico_territorios',
  DESIGNACOES: 'designacoes_reuniao',
  DISCURSOS: 'discursos_publicos',
  CAMPO: 'servico_campo',
  CAMPO_PROGRAMACAO: 'servico_campo_programacao',
  LIMPEZA: 'escalas_limpeza',
  ASSISTENCIA: 'registros_assistencia',
  AVISOS: 'avisos_quadro',
} as const;

export type SyncStatus = 'connecting' | 'connected' | 'offline' | 'error';

function isGenericSampleDoc(collectionName: string, docData: any): boolean {
  if (!docData) return false;
  const id = String(docData.id || '').toLowerCase();
  if (collectionName === COLLECTIONS.DESIGNACOES) {
    if (docData.mesChave === 'abril' && (String(docData.indicador).includes('Pedro / Fernando') || String(docData.microfone).includes('Vanderlei'))) return true;
  }
  if (collectionName === COLLECTIONS.DISCURSOS) {
    if (String(docData.mes).toLowerCase().includes('abril') && String(docData.tema).includes('verdadeira religião')) return true;
  }
  if (collectionName === COLLECTIONS.LIMPEZA) {
    if (String(docData.grupo).includes('DANILO E VILSON') || String(docData.grupo).includes('SAMUEL / GEOVANE')) return true;
  }
  if (collectionName === COLLECTIONS.S140T) {
    if (id.startsWith('s140t-2026-04-')) return true;
  }
  if (collectionName === COLLECTIONS.AVISOS) {
    return isTestOrDemoAviso(docData);
  }
  return false;
}

/**
 * Sanitiza objetos recursivamente para o Firestore, removendo qualquer campo 'undefined'
 * para evitar que o SDK do Cloud Firestore rejeite a gravação.
 */
export function cleanForFirestore<T>(input: T): T {
  if (input === null || input === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanForFirestore(item) : item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        clean[key] = typeof value === 'object' && value !== null ? cleanForFirestore(value) : value;
      }
    }
    return clean as T;
  }
  return input;
}

class FirebaseSyncManager {
  private status: SyncStatus = 'connecting';
  private listeners: Array<(status: SyncStatus) => void> = [];
  private unsubscribers: Array<() => void> = [];

  // Caches em memória em tempo real para o módulo de Territórios
  private territoriosCache: Territorio[] = [];
  private solicitacoesCache: SolicitacaoTerritorio[] = [];
  private transferenciasCache: TransferenciaTerritorio[] = [];
  private historicoCache: HistoricoTerritorio[] = [];

  // Listeners diretos de componentes
  private territoriosListeners: Array<(lista: Territorio[]) => void> = [];
  private solicitacoesListeners: Array<(lista: SolicitacaoTerritorio[]) => void> = [];
  private transferenciasListeners: Array<(lista: TransferenciaTerritorio[]) => void> = [];
  private historicoListeners: Array<(lista: HistoricoTerritorio[]) => void> = [];

  constructor() {
    try {
      this.territoriosCache = getStoredTerritorios();
      this.solicitacoesCache = getStoredSolicitacoes();
      this.transferenciasCache = getStoredTransferencias();
      this.historicoCache = getStoredHistorico();
    } catch {
      // ignore
    }
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

  public onTerritoriosChange(callback: (lista: Territorio[]) => void): () => void {
    this.territoriosListeners.push(callback);
    if (this.territoriosCache.length > 0) {
      callback(this.territoriosCache);
    } else {
      const stored = getStoredTerritorios();
      if (stored.length > 0) {
        this.territoriosCache = stored;
        callback(stored);
      }
    }
    return () => {
      this.territoriosListeners = this.territoriosListeners.filter((cb) => cb !== callback);
    };
  }

  public onSolicitacoesChange(callback: (lista: SolicitacaoTerritorio[]) => void): () => void {
    this.solicitacoesListeners.push(callback);
    if (this.solicitacoesCache.length > 0) {
      callback(this.solicitacoesCache);
    } else {
      const stored = getStoredSolicitacoes();
      if (stored.length > 0) {
        this.solicitacoesCache = stored;
        callback(stored);
      }
    }
    return () => {
      this.solicitacoesListeners = this.solicitacoesListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Força uma consulta direta ao Cloud Firestore para obter as solicitações mais recentes em tempo real.
   */
  public async refreshSolicitacoes(): Promise<SolicitacaoTerritorio[]> {
    try {
      const colRef = collection(db, COLLECTIONS.SOLICITACOES);
      const snapshot = await getDocs(colRef);
      const lista: SolicitacaoTerritorio[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as SolicitacaoTerritorio;
        if (item && item.id) {
          lista.push(item);
        }
      });
      lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      this.solicitacoesCache = lista;
      try {
        localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(lista));
      } catch {}
      this.solicitacoesListeners.forEach((cb) => {
        try { cb(lista); } catch (e) { console.error('Erro no listener de solicitações:', e); }
      });
      window.dispatchEvent(new CustomEvent('solicitacoes-firebase-updated', { detail: lista }));
      return lista;
    } catch (err) {
      console.warn('Aviso: erro ao atualizar solicitações do Firestore:', err);
      return this.solicitacoesCache;
    }
  }

  public onTransferenciasChange(callback: (lista: TransferenciaTerritorio[]) => void): () => void {
    this.transferenciasListeners.push(callback);
    if (this.transferenciasCache.length > 0) {
      callback(this.transferenciasCache);
    }
    return () => {
      this.transferenciasListeners = this.transferenciasListeners.filter((cb) => cb !== callback);
    };
  }

  public onHistoricoChange(callback: (lista: HistoricoTerritorio[]) => void): () => void {
    this.historicoListeners.push(callback);
    if (this.historicoCache.length > 0) {
      callback(this.historicoCache);
    }
    return () => {
      this.historicoListeners = this.historicoListeners.filter((cb) => cb !== callback);
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

    window.addEventListener('online', () => {
      this.setStatus('connecting');
    });
    window.addEventListener('offline', () => {
      this.setStatus('offline');
    });

    try {
      this.syncS140T();
      this.syncTerritorios();
      this.syncSolicitacoes();
      this.syncTransferencias();
      this.syncHistorico();
      this.syncGenericCollection(COLLECTIONS.DESIGNACOES, STORAGE_KEY_DESIGNACOES, 'designacoes-firebase-updated');
      this.syncGenericCollection(COLLECTIONS.DISCURSOS, STORAGE_KEY_DISCURSOS, 'discursos-firebase-updated');
      this.syncGenericCollection(COLLECTIONS.CAMPO, STORAGE_KEY_CAMPO_FDS, 'campo-firebase-updated');
      this.syncGenericCollection(COLLECTIONS.CAMPO_PROGRAMACAO, STORAGE_KEY_CAMPO_PROGRAMACAO, 'campo-programacao-firebase-updated');
      this.syncGenericCollection(COLLECTIONS.LIMPEZA, STORAGE_KEY_LIMPEZA_ESCALAS, 'limpeza-firebase-updated');
      this.syncGenericCollection(COLLECTIONS.ASSISTENCIA, 'assistencia_vilacisper_data', 'assistencia-firebase-updated');
      this.syncGenericCollection(COLLECTIONS.AVISOS, STORAGE_KEY_AVISOS, 'avisos-firebase-updated');
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
        if (!snapshot.metadata.fromCache) {
          this.setStatus('connected');
        }

        if (snapshot.empty) {
          if (snapshot.metadata.fromCache) {
            return;
          }
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

        let semanasFinais = semanas.filter((s) => !s.id.startsWith('s140t-2026-04-'));
        if (semanasFinais.length === 0) {
          const dadosLocaisRaw = localStorage.getItem(STORAGE_KEY_S140T);
          let locais: S140TSemana[] = [];
          try {
            if (dadosLocaisRaw) locais = JSON.parse(dadosLocaisRaw);
          } catch {}
          semanasFinais = Array.isArray(locais) && locais.length > 0 ? locais : S140T_DADOS_PADRAO;

          // Faz seed automático no Firestore para nunca deixar vazio na nuvem
          try {
            const batch = writeBatch(db);
            for (const sem of semanasFinais) {
              const docRef = doc(db, COLLECTIONS.S140T, sem.id);
              batch.set(docRef, sem);
            }
            batch.commit().catch(() => {});
          } catch {}
        }

        semanasFinais.sort((a, b) => (a.dataReferencia || '').localeCompare(b.dataReferencia || ''));
        localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(semanasFinais));
        window.dispatchEvent(new CustomEvent('s140t-firebase-updated', { detail: semanasFinais }));
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
        if (!snapshot.metadata.fromCache) {
          this.setStatus('connected');
        }

        if (snapshot.empty) {
          if (snapshot.metadata.fromCache) {
            return;
          }
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

        lista.sort((a, b) => Number(a.numero) - Number(b.numero));
        this.territoriosCache = lista;
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(lista));
        this.territoriosListeners.forEach((cb) => {
          try {
            cb(lista);
          } catch (e) {
            console.error('Erro no listener de territórios:', e);
          }
        });
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
    const current = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
    const idx = current.findIndex((item) => item.id === t.id);
    const updated = idx >= 0 ? current.map((item) => (item.id === t.id ? t : item)) : [...current, t];
    this.territoriosCache = updated;
    try {
      localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(updated));
    } catch {}
    this.territoriosListeners.forEach((cb) => {
      try { cb(updated); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: updated }));

    try {
      const docRef = doc(db, COLLECTIONS.TERRITORIOS, t.id);
      await setDoc(docRef, {
        ...t,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao salvar território no Firestore:', err);
    }
  }

  public async deleteTerritorio(id: string): Promise<void> {
    const current = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
    const updated = current.filter((t) => t.id !== id);
    this.territoriosCache = updated;
    try {
      localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(updated));
    } catch {}
    this.territoriosListeners.forEach((cb) => {
      try { cb(updated); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: updated }));

    try {
      const docRef = doc(db, COLLECTIONS.TERRITORIOS, id);
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao excluir território no Firestore:', err);
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
  // Solicitações de Território em Tempo Real
  // ==========================================
  private syncSolicitacoes() {
    const colRef = collection(db, COLLECTIONS.SOLICITACOES);
    let initialLoadDone = false;

    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        if (!snapshot.metadata.fromCache) {
          this.setStatus('connected');
        }

        if (snapshot.empty) {
          if (snapshot.metadata.fromCache) {
            return;
          }
          const localRaw = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
          let localDados: SolicitacaoTerritorio[] = [];
          if (localRaw) {
            try {
              localDados = JSON.parse(localRaw);
            } catch {
              // ignore
            }
          }
          if (Array.isArray(localDados) && localDados.length > 0) {
            try {
              const batch = writeBatch(db);
              for (const s of localDados) {
                const docRef = doc(db, COLLECTIONS.SOLICITACOES, s.id);
                batch.set(docRef, s, { merge: true });
              }
              await batch.commit();
            } catch (seedErr) {
              console.warn('Erro ao sincronizar solicitações locais para o Firestore:', seedErr);
            }
            this.solicitacoesCache = localDados;
          } else {
            this.solicitacoesCache = [];
          }
          initialLoadDone = true;
          this.solicitacoesListeners.forEach((cb) => {
            try {
              cb(this.solicitacoesCache);
            } catch (e) {
              console.error('Erro no listener de solicitações:', e);
            }
          });
          window.dispatchEvent(new CustomEvent('solicitacoes-firebase-updated', { detail: this.solicitacoesCache }));
          return;
        }

        const lista: SolicitacaoTerritorio[] = [];
        snapshot.forEach((docSnap) => {
          lista.push(docSnap.data() as SolicitacaoTerritorio);
        });

        lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.solicitacoesCache = lista;

        // Se após a carga inicial houver nova solicitação Pendente criada e este aparelho for do responsável
        if (initialLoadDone) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const novaSol = change.doc.data() as SolicitacaoTerritorio;
              if (novaSol.status === 'Pendente') {
                this.notifyLocalResponsibleIfActive(novaSol);
              }
            }
          });
        }
        initialLoadDone = true;

        localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(lista));
        this.solicitacoesListeners.forEach((cb) => {
          try {
            cb(lista);
          } catch (e) {
            console.error('Erro no listener de solicitações:', e);
          }
        });
        window.dispatchEvent(new CustomEvent('solicitacoes-firebase-updated', { detail: lista }));
      },
      (error) => {
        console.warn('Falha no listener Firestore Solicitações:', error);
        this.setStatus('offline');
      }
    );

    this.unsubscribers.push(unsub);
  }

  private notifyLocalResponsibleIfActive(sol: SolicitacaoTerritorio) {
    if (!isAdminAuthenticated()) return;
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const title = 'Nova solicitação de território';
        const options: NotificationOptions = {
          body: `${sol.nome_publicador} solicitou um território.`,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `solicitacao-${sol.id}`,
        };
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              ...options,
              data: { url: '/?screen=territorios&tab=solicitacoes' },
            });
          }).catch(() => {
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      }
    } catch {
      // ignore
    }
  }

  public async saveSolicitacao(sol: SolicitacaoTerritorio, dispararPush = true): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.SOLICITACOES, sol.id);
      await setDoc(docRef, cleanForFirestore(sol), { merge: true });
      this.setStatus('connected');

      // Disparar push notification aos responsáveis se for solicitação nova pendente
      if (dispararPush && sol.status === 'Pendente') {
        dispatchPushNotificationToResponsaveis(sol).catch((err) => {
          console.warn('Erro ao despachar push para responsáveis:', err);
        });
      }
    } catch (err) {
      console.warn('Erro ao salvar solicitação no Firestore:', err);
    }
  }

  public async deleteSolicitacao(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.SOLICITACOES, id);
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao excluir solicitação no Firestore:', err);
    }
  }

  // ==========================================
  // Transferências de Território em Tempo Real
  // ==========================================
  private syncTransferencias() {
    const colRef = collection(db, COLLECTIONS.TRANSFERENCIAS);
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const lista: TransferenciaTerritorio[] = [];
        snapshot.forEach((d) => lista.push(d.data() as TransferenciaTerritorio));
        lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.transferenciasCache = lista;
        localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(lista));
        this.transferenciasListeners.forEach((cb) => {
          try {
            cb(lista);
          } catch (e) {
            console.error('Erro no listener de transferências:', e);
          }
        });
        window.dispatchEvent(new CustomEvent('transferencias-firebase-updated', { detail: lista }));
      },
      (error) => console.warn('Falha no listener Transferências:', error)
    );
    this.unsubscribers.push(unsub);
  }

  public async saveTransferencia(tr: TransferenciaTerritorio): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.TRANSFERENCIAS, tr.id);
      await setDoc(docRef, tr);
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao salvar transferência no Firestore:', err);
    }
  }

  public async deleteTransferencia(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.TRANSFERENCIAS, id);
      await deleteDoc(docRef);
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao excluir transferência no Firestore:', err);
    }
  }

  // ==========================================
  // Histórico de Territórios em Tempo Real
  // ==========================================
  private syncHistorico() {
    const colRef = collection(db, COLLECTIONS.HISTORICO);
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const lista: HistoricoTerritorio[] = [];
        snapshot.forEach((d) => lista.push(d.data() as HistoricoTerritorio));
        lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.historicoCache = lista;
        localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(lista));
        this.historicoListeners.forEach((cb) => {
          try {
            cb(lista);
          } catch (e) {
            console.error('Erro no listener de histórico:', e);
          }
        });
        window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: lista }));
      },
      (error) => console.warn('Falha no listener Histórico:', error)
    );
    this.unsubscribers.push(unsub);
  }

  public async saveHistorico(h: HistoricoTerritorio): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.HISTORICO, h.id);
      await setDoc(docRef, h);
      this.setStatus('connected');
    } catch (err) {
      console.warn('Erro ao salvar histórico no Firestore:', err);
    }
  }

  // =========================================================================
  // TRANSAÇÕES ATÔMICAS DO MÓDULO DE TERRITÓRIOS (FONTE ÚNICA DA VERDADE)
  // =========================================================================

  /**
   * 1. Publicador solicita território:
   * Cria a solicitação no Firestore e sincroniza localmente.
   * Se um território foi escolhido, atualiza o status dele para "Solicitado".
   * Registra a solicitação no histórico permanente.
   */
  public async executeSolicitacaoBatch(
    nomePublicador: string,
    territorioId?: string
  ): Promise<SolicitacaoTerritorio | null> {
    const nomeLimpo = nomePublicador.trim();
    const now = new Date();
    const dataHoje = formatarDataHoje();
    const horaHoje = formatarHoraHoje();
    const solId = String(Date.now());

    let terObj: Territorio | undefined;
    if (territorioId) {
      terObj = this.territoriosCache.find((t) => t.id === territorioId);
      if (!terObj) {
        const stored = getStoredTerritorios();
        terObj = stored.find((t) => t.id === territorioId);
      }
    }

    const nova: SolicitacaoTerritorio = {
      id: solId,
      nome_publicador: nomeLimpo,
      data_solicitacao: dataHoje,
      hora_solicitacao: horaHoje,
      status: 'Pendente',
      territorio_id: terObj ? terObj.id : undefined,
      territorio_numero: terObj ? terObj.numero : undefined,
      created_at: now.toISOString(),
    };

    // 1. Atualização Otimista Imediata de Solicitações
    const currentSolList = this.solicitacoesCache.length > 0 ? this.solicitacoesCache : getStoredSolicitacoes();
    const novaListaSol = [nova, ...currentSolList.filter((s) => s.id !== solId)];
    this.solicitacoesCache = novaListaSol;
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(novaListaSol));
    } catch (err) {
      console.warn('Erro ao salvar solicitacao no localStorage:', err);
    }
    this.solicitacoesListeners.forEach((cb) => {
      try { cb(novaListaSol); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('solicitacoes-firebase-updated', { detail: novaListaSol }));

    // 2. Se um território foi selecionado, marca como Solicitado imediatamente
    let terAtualizado: Territorio | undefined;
    if (terObj) {
      terAtualizado = {
        ...terObj,
        status: 'Solicitado',
        solicitado_por: nomeLimpo,
        solicitacao_id: solId,
        data_solicitacao: dataHoje,
        hora_solicitacao: horaHoje,
        updated_at: now.toISOString(),
      };
      const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
      const novaListaTer = currentTerList.map((t) => (t.id === terObj!.id ? terAtualizado! : t));
      this.territoriosCache = novaListaTer;
      try {
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
      } catch (err) {
        console.warn('Erro ao salvar territorio no localStorage:', err);
      }
      this.territoriosListeners.forEach((cb) => {
        try { cb(novaListaTer); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));
    }

    // 3. Atualização no Histórico
    const histId = String(Date.now() + 1);
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: terObj?.id,
      territorio_numero: terObj ? terObj.numero : 0,
      territorio_localidade: terObj?.localidade,
      publicador: nomeLimpo,
      acao: 'Solicitação',
      status: 'Solicitado',
      responsavel: 'Publicador',
      data: `${dataHoje} às ${horaHoje}`,
      observacao: terObj
        ? `Solicitação do Território Nº ${terObj.numero} (${terObj.localidade}) enviada ao responsável.`
        : 'Solicitação de território enviada ao responsável.',
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 4. Gravação no Firestore DIRETA, IMEDIATA e SANITIZADA (nunca falha por undefined)
    try {
      const cleanNova = cleanForFirestore(nova);
      const solRef = doc(db, COLLECTIONS.SOLICITACOES, solId);
      await setDoc(solRef, cleanNova, { merge: true });

      if (terObj && terAtualizado) {
        try {
          const cleanTer = cleanForFirestore(terAtualizado);
          const terRef = doc(db, COLLECTIONS.TERRITORIOS, terObj.id);
          await setDoc(terRef, cleanTer, { merge: true });
        } catch (tErr) {
          console.warn('Aviso: falha ao sincronizar território solicitado:', tErr);
        }
      }

      try {
        const cleanHist = cleanForFirestore(histItem);
        const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
        await setDoc(histRef, cleanHist, { merge: true });
      } catch (hErr) {
        console.warn('Aviso: falha ao sincronizar histórico da solicitação:', hErr);
      }

      this.setStatus('connected');
    } catch (firestoreErr) {
      console.error('Erro crítico ao gravar solicitação no Firestore:', firestoreErr);
      this.setStatus('offline');
      // Tentativa de emergência
      try {
        const solRef = doc(db, COLLECTIONS.SOLICITACOES, solId);
        await setDoc(solRef, cleanForFirestore(nova));
      } catch (retryErr) {
        console.error('Falha no fallback de gravação da solicitação:', retryErr);
      }
    }

    // 5. Notifica responsáveis via push se habilitado
    dispatchPushNotificationToResponsaveis(nova).catch((pushErr) => {
      console.warn('Erro ao despachar push para responsáveis:', pushErr);
    });

    return nova;
  }

  /**
   * 2. Responsável designa território:
   * Altera status do território para "Designado" com o publicador vinculado.
   * Marca a solicitação como "Designado" (sai imediatamente da lista de pendentes).
   * Registra a designação no histórico permanente.
   */
  public async executeDesignacaoBatch(
    solicitacaoId: string,
    territorioId: string,
    responsavelNome: string,
    publicadorNomeOverride?: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHoje = formatarDataHoje();
    const horaHoje = formatarHoraHoje();

    const sol = this.solicitacoesCache.find((s) => s.id === solicitacaoId) ||
      getStoredSolicitacoes().find((s) => s.id === solicitacaoId);
    const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
      getStoredTerritorios().find((t) => t.id === territorioId);

    const publicadorNome = (publicadorNomeOverride || sol?.nome_publicador || '').trim();
    const respLimpo = responsavelNome.trim() || 'Irmão Responsável';

    // 1. Atualizar Território
    let terAtualizado: Territorio | undefined;
    if (ter) {
      terAtualizado = {
        ...ter,
        status: 'Designado',
        designado_para: publicadorNome,
        data_ultima_designacao: dataHoje,
        hora_ultima_designacao: horaHoje,
        responsavel_designacao: respLimpo,
        solicitado_por: null,
        solicitacao_id: null,
        data_conclusao: null,
        data_estorno: null,
        motivo_estorno: null,
        data_ultimo_retorno_sort: null,
        updated_at: now.toISOString(),
      };
      const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
      const novaListaTer = currentTerList.map((t) => (t.id === territorioId ? terAtualizado! : t));
      this.territoriosCache = novaListaTer;
      try {
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
      } catch (err) {
        console.warn('Erro ao salvar territorios no localStorage:', err);
      }
      this.territoriosListeners.forEach((cb) => {
        try { cb(novaListaTer); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));
    }

    // 2. Atualizar Solicitação (marca como Designado)
    let solAtualizada: SolicitacaoTerritorio | undefined;
    if (solicitacaoId) {
      const currentSolList = this.solicitacoesCache.length > 0 ? this.solicitacoesCache : getStoredSolicitacoes();
      const novaListaSol = currentSolList.map((s) => {
        if (s.id === solicitacaoId) {
          solAtualizada = {
            ...s,
            status: 'Designado',
            territorio_id: territorioId,
            territorio_numero: ter ? ter.numero : 0,
            data_designacao: dataHoje,
            responsavel: respLimpo,
          };
          return solAtualizada;
        }
        return s;
      });
      this.solicitacoesCache = novaListaSol;
      try {
        localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(novaListaSol));
      } catch (err) {
        console.warn('Erro ao salvar solicitacoes no localStorage:', err);
      }
      this.solicitacoesListeners.forEach((cb) => {
        try { cb(novaListaSol); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('solicitacoes-firebase-updated', { detail: novaListaSol }));
    }

    // 3. Atualizar Histórico
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: territorioId,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador: publicadorNome,
      acao: 'Designação',
      status: 'Designado',
      responsavel: respLimpo,
      data: `${dataHoje} às ${horaHoje}`,
      observacao: `Designado para ${publicadorNome}`,
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 4. Gravação no Firestore com merge: true
    try {
      const batch = writeBatch(db);
      if (terAtualizado) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
        batch.set(terRef, cleanForFirestore(terAtualizado), { merge: true });
      }
      if (solAtualizada) {
        const solRef = doc(db, COLLECTIONS.SOLICITACOES, solicitacaoId);
        batch.set(solRef, cleanForFirestore(solAtualizada), { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, cleanForFirestore(histItem), { merge: true });

      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao gravar designação no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 3. Publicador estorna território:
   * Encerra a designação atual.
   * Remove o vínculo ativo com o publicador (designado_para = null).
   * Altera imediatamente o estado do território para "Disponível".
   * Registra no histórico permanente.
   */
  public async executeEstornoBatch(
    territorioId: string,
    publicadorNome: string,
    motivo?: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHora = formatarDataHoraHoje();

    const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
      getStoredTerritorios().find((t) => t.id === territorioId);

    // 1. Atualizar Território
    let terAtualizado: Territorio | undefined;
    if (ter) {
      terAtualizado = {
        ...ter,
        status: 'Disponível',
        designado_para: null,
        responsavel_designacao: null,
        data_ultima_designacao: null,
        hora_ultima_designacao: null,
        solicitado_por: null,
        solicitacao_id: null,
        data_estorno: dataHora,
        motivo_estorno: motivo?.trim() || null,
        data_conclusao: null,
        data_ultimo_retorno_sort: null,
        updated_at: now.toISOString(),
      };
      const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
      const novaListaTer = currentTerList.map((t) => (t.id === territorioId ? terAtualizado! : t));
      this.territoriosCache = novaListaTer;
      try {
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
      } catch (err) {
        console.warn('Erro ao salvar territorios no localStorage:', err);
      }
      this.territoriosListeners.forEach((cb) => {
        try { cb(novaListaTer); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));
    }

    // 2. Atualizar Histórico
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: territorioId,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador: publicadorNome.trim() || ter?.designado_para || 'Publicador',
      acao: 'Estorno',
      status: 'Disponível',
      responsavel: 'Publicador',
      data: dataHora,
      observacao: motivo?.trim()
        ? `Devolvido ao responsável. Motivo: ${motivo.trim()}`
        : 'Devolvido ao responsável antes da conclusão.',
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 3. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      if (terAtualizado) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
        batch.set(terRef, cleanForFirestore(terAtualizado), { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, cleanForFirestore(histItem), { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao gravar estorno no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 4. Publicador conclui território:
   * Altera status do território para "Concluído" e desvincula do publicador.
   * Registra a conclusão no histórico permanente.
   */
  public async executeConclusaoBatch(
    territorioId: string,
    publicadorNome: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHora = formatarDataHoraHoje();

    const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
      getStoredTerritorios().find((t) => t.id === territorioId);

    // 1. Atualizar Território (zera vínculo do publicador e marca como Concluído)
    let terAtualizado: Territorio | undefined;
    if (ter) {
      terAtualizado = {
        ...ter,
        status: 'Concluído',
        designado_para: null,
        data_conclusao: dataHora,
        data_ultimo_retorno_sort: now.toISOString(),
        solicitado_por: null,
        solicitacao_id: null,
        updated_at: now.toISOString(),
      };
      const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
      const novaListaTer = currentTerList.map((t) => (t.id === territorioId ? terAtualizado! : t));
      this.territoriosCache = novaListaTer;
      try {
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
      } catch (err) {
        console.warn('Erro ao salvar territorios no localStorage:', err);
      }
      this.territoriosListeners.forEach((cb) => {
        try { cb(novaListaTer); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));
    }

    // 2. Atualizar Histórico
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: territorioId,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador: publicadorNome.trim() || ter?.designado_para || 'Publicador',
      acao: 'Conclusão',
      status: 'Concluído',
      responsavel: 'Publicador',
      data: dataHora,
      observacao: 'Trabalho de pregação concluído pelo publicador. Aguarda decisão do responsável.',
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 3. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      if (terAtualizado) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
        batch.set(terRef, cleanForFirestore(terAtualizado), { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, cleanForFirestore(histItem), { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao gravar conclusão no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 5. Responsável cancela solicitação:
   * Marca solicitação como Cancelada.
   * Se havia território vinculado ou solicitado, devolve o território para "Disponível".
   * Registra no histórico.
   */
  public async executeCancelamentoSolicitacaoBatch(
    solicitacaoId: string,
    responsavelNome?: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHoje = formatarDataHoje();
    const horaHoje = formatarHoraHoje();
    const respLimpo = responsavelNome?.trim() || 'Irmão Responsável';

    const sol = this.solicitacoesCache.find((s) => s.id === solicitacaoId) ||
      getStoredSolicitacoes().find((s) => s.id === solicitacaoId);

    // 1. Atualizar Solicitação para Cancelada
    let solAtualizada: SolicitacaoTerritorio | undefined;
    const currentSolList = this.solicitacoesCache.length > 0 ? this.solicitacoesCache : getStoredSolicitacoes();
    const novaListaSol = currentSolList.map((s) => {
      if (s.id === solicitacaoId) {
        solAtualizada = { ...s, status: 'Cancelada' };
        return solAtualizada;
      }
      return s;
    });
    this.solicitacoesCache = novaListaSol;
    try {
      localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(novaListaSol));
    } catch (err) {
      console.warn('Erro ao salvar solicitacoes no localStorage:', err);
    }
    this.solicitacoesListeners.forEach((cb) => {
      try { cb(novaListaSol); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('solicitacoes-firebase-updated', { detail: novaListaSol }));

    // 2. Se havia território vinculado à solicitação, restaura para Disponível
    let ter: Territorio | undefined;
    if (sol?.territorio_id) {
      ter = this.territoriosCache.find((t) => t.id === sol.territorio_id);
    }
    if (!ter && sol) {
      ter = this.territoriosCache.find(
        (t) => t.solicitacao_id === solicitacaoId || (t.status === 'Solicitado' && t.solicitado_por === sol.nome_publicador)
      );
    }

    let terAtualizado: Territorio | undefined;
    if (ter) {
      terAtualizado = {
        ...ter,
        status: 'Disponível',
        solicitado_por: null,
        solicitacao_id: null,
        updated_at: now.toISOString(),
      };
      const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
      const novaListaTer = currentTerList.map((t) => (t.id === ter!.id ? terAtualizado! : t));
      this.territoriosCache = novaListaTer;
      try {
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
      } catch (err) {
        console.warn('Erro ao salvar territorios no localStorage:', err);
      }
      this.territoriosListeners.forEach((cb) => {
        try { cb(novaListaTer); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));
    }

    // 3. Atualizar Histórico
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: ter?.id,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador: sol ? sol.nome_publicador : 'Publicador',
      acao: 'Solicitação Cancelada',
      status: 'Cancelada',
      responsavel: respLimpo,
      data: `${dataHoje} às ${horaHoje}`,
      observacao: 'Solicitação cancelada. Território liberado para designação.',
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 4. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      if (solAtualizada) {
        const solRef = doc(db, COLLECTIONS.SOLICITACOES, solicitacaoId);
        batch.set(solRef, cleanForFirestore(solAtualizada), { merge: true });
      }
      if (terAtualizado) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, terAtualizado.id);
        batch.set(terRef, cleanForFirestore(terAtualizado), { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, cleanForFirestore(histItem), { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao gravar cancelamento no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 6. Responsável torna território disponível (Novo Ciclo):
   * Altera status para "Disponível" e limpa vínculos anteriores.
   */
  public async executeTornarDisponivelBatch(
    territorioId: string,
    responsavelNome: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHora = formatarDataHoraHoje();
    const respLimpo = responsavelNome.trim() || 'Irmão Responsável';

    const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
      getStoredTerritorios().find((t) => t.id === territorioId);
    const anteriorPublicador = ter?.designado_para;

    // 1. Atualizar Território
    let terAtualizado: Territorio | undefined;
    if (ter) {
      terAtualizado = {
        ...ter,
        status: 'Disponível',
        designado_para: null,
        responsavel_designacao: null,
        data_ultima_designacao: null,
        hora_ultima_designacao: null,
        data_conclusao: null,
        data_estorno: null,
        motivo_estorno: null,
        solicitado_por: null,
        solicitacao_id: null,
        data_ultimo_retorno_sort: null,
        updated_at: now.toISOString(),
      };
      const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
      const novaListaTer = currentTerList.map((t) => (t.id === territorioId ? terAtualizado! : t));
      this.territoriosCache = novaListaTer;
      try {
        localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
      } catch (err) {
        console.warn('Erro ao salvar territorios no localStorage:', err);
      }
      this.territoriosListeners.forEach((cb) => {
        try { cb(novaListaTer); } catch (e) { console.error(e); }
      });
      window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));
    }

    // 2. Atualizar Histórico
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: territorioId,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador: anteriorPublicador || '-',
      acao: 'Disponibilizado para Novo Ciclo',
      status: 'Disponível',
      responsavel: respLimpo,
      data: dataHora,
      observacao: 'Território liberado manualmente pelo responsável para novas designações.',
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 3. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      if (terAtualizado) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
        batch.set(terRef, terAtualizado, { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, histItem, { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao disponibilizar território no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 7. Responsável torna múltiplos territórios disponíveis em lote:
   */
  public async executeTornarDisponivelLoteBatch(
    territorioIds: string[],
    responsavelNome: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHora = formatarDataHoraHoje();
    const respLimpo = responsavelNome.trim() || 'Irmão Responsável';

    // 1. Atualizar Territórios localmente
    const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
    const novosHistItens: HistoricoTerritorio[] = [];
    const idSet = new Set(territorioIds);

    const novaListaTer = currentTerList.map((ter, idx) => {
      if (idSet.has(ter.id)) {
        novosHistItens.push({
          id: String(Date.now() + idx),
          territorio_id: ter.id,
          territorio_numero: ter.numero,
          territorio_localidade: ter.localidade,
          publicador: ter.designado_para || '-',
          acao: 'Disponibilizado para Novo Ciclo',
          status: 'Disponível',
          responsavel: respLimpo,
          data: dataHora,
          observacao: 'Território liberado em lote para novas designações.',
          created_at: now.toISOString(),
        });
        return {
          ...ter,
          status: 'Disponível' as const,
          designado_para: null,
          responsavel_designacao: null,
          data_ultima_designacao: null,
          hora_ultima_designacao: null,
          data_conclusao: null,
          data_estorno: null,
          motivo_estorno: null,
          solicitado_por: null,
          solicitacao_id: null,
          data_ultimo_retorno_sort: null,
          updated_at: now.toISOString(),
        };
      }
      return ter;
    });

    this.territoriosCache = novaListaTer;
    try {
      localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
    } catch (err) {
      console.warn('Erro ao salvar territorios no localStorage:', err);
    }
    this.territoriosListeners.forEach((cb) => {
      try { cb(novaListaTer); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));

    // 2. Atualizar Histórico localmente
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [...novosHistItens, ...currentHistList];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 3. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      for (const ter of novaListaTer) {
        if (idSet.has(ter.id)) {
          const terRef = doc(db, COLLECTIONS.TERRITORIOS, ter.id);
          batch.set(terRef, ter, { merge: true });
        }
      }
      for (const hist of novosHistItens) {
        const histRef = doc(db, COLLECTIONS.HISTORICO, hist.id);
        batch.set(histRef, hist, { merge: true });
      }
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao disponibilizar lote no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 8. Publicador solicita compartilhamento (transferência):
   */
  public async executeSolicitarTransferenciaBatch(
    territorioId: string,
    publicadorAtual: string,
    novoPublicador: string
  ): Promise<TransferenciaTerritorio | null> {
    const now = new Date();
    const dataHoje = formatarDataHoje();
    const horaHoje = formatarHoraHoje();
    const transfId = String(Date.now());

    const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
      getStoredTerritorios().find((t) => t.id === territorioId);

    const nova: TransferenciaTerritorio = {
      id: transfId,
      territorio_id: territorioId,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador_atual: publicadorAtual.trim(),
      novo_publicador: novoPublicador.trim(),
      data_solicitacao: dataHoje,
      hora_solicitacao: horaHoje,
      status: 'Aguardando aprovação',
      created_at: now.toISOString(),
    };

    // 1. Atualizar Transferências localmente
    const currentTrList = this.transferenciasCache.length > 0 ? this.transferenciasCache : getStoredTransferencias();
    const novaListaTr = [nova, ...currentTrList.filter((tr) => tr.id !== transfId)];
    this.transferenciasCache = novaListaTr;
    try {
      localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(novaListaTr));
    } catch (err) {
      console.warn('Erro ao salvar transferencias no localStorage:', err);
    }
    this.transferenciasListeners.forEach((cb) => {
      try { cb(novaListaTr); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('transferencias-firebase-updated', { detail: novaListaTr }));

    // 2. Histórico
    const histId = String(Date.now() + 1);
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: territorioId,
      territorio_numero: ter ? ter.numero : 0,
      territorio_localidade: ter?.localidade,
      publicador: publicadorAtual.trim(),
      acao: 'Compartilhamento Solicitado',
      status: 'Aguardando aprovação',
      responsavel: 'Publicador',
      data: `${dataHoje} às ${horaHoje}`,
      observacao: `Solicitada transferência para o irmão ${novoPublicador.trim()}`,
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 3. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      const transfRef = doc(db, COLLECTIONS.TRANSFERENCIAS, transfId);
      batch.set(transfRef, nova, { merge: true });
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, histItem, { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao solicitar transferência no Firestore:', err);
      this.setStatus('offline');
    }

    return nova;
  }

  /**
   * 9. Responsável aprova transferência:
   */
  public async executeTransferenciaAprovadaBatch(
    transferenciaId: string,
    responsavelNome: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHora = formatarDataHoraHoje();
    const dataHoje = formatarDataHoje();
    const horaHoje = formatarHoraHoje();
    const respLimpo = responsavelNome.trim() || 'Irmão Responsável';

    const transf = this.transferenciasCache.find((t) => t.id === transferenciaId) ||
      getStoredTransferencias().find((t) => t.id === transferenciaId);
    if (!transf) return false;

    // 1. Atualizar Transferência localmente
    let transfAtualizada: TransferenciaTerritorio | undefined;
    const currentTrList = this.transferenciasCache.length > 0 ? this.transferenciasCache : getStoredTransferencias();
    const novaListaTr = currentTrList.map((tr) => {
      if (tr.id === transferenciaId) {
        transfAtualizada = {
          ...tr,
          status: 'Aprovada',
          responsavel: respLimpo,
          data_decisao: dataHora,
        };
        return transfAtualizada;
      }
      return tr;
    });
    this.transferenciasCache = novaListaTr;
    try {
      localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(novaListaTr));
    } catch (err) {
      console.warn('Erro ao salvar transferencias no localStorage:', err);
    }
    this.transferenciasListeners.forEach((cb) => {
      try { cb(novaListaTr); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('transferencias-firebase-updated', { detail: novaListaTr }));

    // 2. Atualizar Território localmente
    const currentTerList = this.territoriosCache.length > 0 ? this.territoriosCache : getStoredTerritorios();
    let terAtualizado: Territorio | undefined;
    const novaListaTer = currentTerList.map((t) => {
      if (t.id === transf.territorio_id) {
        terAtualizado = {
          ...t,
          status: 'Designado',
          designado_para: transf.novo_publicador,
          data_ultima_designacao: dataHoje,
          hora_ultima_designacao: horaHoje,
          responsavel_designacao: respLimpo,
          updated_at: now.toISOString(),
        };
        return terAtualizado;
      }
      return t;
    });
    this.territoriosCache = novaListaTer;
    try {
      localStorage.setItem(STORAGE_KEY_TERRITORIOS, JSON.stringify(novaListaTer));
    } catch (err) {
      console.warn('Erro ao salvar territorios no localStorage:', err);
    }
    this.territoriosListeners.forEach((cb) => {
      try { cb(novaListaTer); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('territorios-firebase-updated', { detail: novaListaTer }));

    // 3. Atualizar Histórico localmente
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: transf.territorio_id,
      territorio_numero: transf.territorio_numero,
      territorio_localidade: transf.territorio_localidade,
      publicador: transf.novo_publicador,
      acao: 'Transferência Aprovada',
      status: 'Designado',
      responsavel: respLimpo,
      data: dataHora,
      observacao: `Transferido de ${transf.publicador_atual} para ${transf.novo_publicador}`,
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 4. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      if (transfAtualizada) {
        const transfRef = doc(db, COLLECTIONS.TRANSFERENCIAS, transferenciaId);
        batch.set(transfRef, transfAtualizada, { merge: true });
      }
      if (terAtualizado) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, transf.territorio_id);
        batch.set(terRef, terAtualizado, { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, histItem, { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao aprovar transferência no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  /**
   * 10. Responsável recusa transferência:
   */
  public async executeTransferenciaRecusadaBatch(
    transferenciaId: string,
    responsavelNome: string
  ): Promise<boolean> {
    const now = new Date();
    const dataHora = formatarDataHoraHoje();
    const respLimpo = responsavelNome.trim() || 'Irmão Responsável';

    const transf = this.transferenciasCache.find((t) => t.id === transferenciaId) ||
      getStoredTransferencias().find((t) => t.id === transferenciaId);
    if (!transf) return false;

    // 1. Atualizar Transferência localmente
    let transfAtualizada: TransferenciaTerritorio | undefined;
    const currentTrList = this.transferenciasCache.length > 0 ? this.transferenciasCache : getStoredTransferencias();
    const novaListaTr = currentTrList.map((tr) => {
      if (tr.id === transferenciaId) {
        transfAtualizada = {
          ...tr,
          status: 'Recusada',
          responsavel: respLimpo,
          data_decisao: dataHora,
        };
        return transfAtualizada;
      }
      return tr;
    });
    this.transferenciasCache = novaListaTr;
    try {
      localStorage.setItem(STORAGE_KEY_TRANSFERENCIAS, JSON.stringify(novaListaTr));
    } catch (err) {
      console.warn('Erro ao salvar transferencias no localStorage:', err);
    }
    this.transferenciasListeners.forEach((cb) => {
      try { cb(novaListaTr); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('transferencias-firebase-updated', { detail: novaListaTr }));

    // 2. Histórico
    const histId = String(Date.now());
    const histItem: HistoricoTerritorio = {
      id: histId,
      territorio_id: transf.territorio_id,
      territorio_numero: transf.territorio_numero,
      territorio_localidade: transf.territorio_localidade,
      publicador: transf.publicador_atual,
      acao: 'Transferência Recusada',
      status: 'Recusada',
      responsavel: respLimpo,
      data: dataHora,
      observacao: `Pedido de transferência para ${transf.novo_publicador} foi recusado pelo responsável.`,
      created_at: now.toISOString(),
    };
    const currentHistList = this.historicoCache.length > 0 ? this.historicoCache : getStoredHistorico();
    const novaListaHist = [histItem, ...currentHistList.filter((h) => h.id !== histId)];
    this.historicoCache = novaListaHist;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novaListaHist));
    } catch (err) {
      console.warn('Erro ao salvar historico no localStorage:', err);
    }
    this.historicoListeners.forEach((cb) => {
      try { cb(novaListaHist); } catch (e) { console.error(e); }
    });
    window.dispatchEvent(new CustomEvent('historico-firebase-updated', { detail: novaListaHist }));

    // 3. Gravação no Firestore
    try {
      const batch = writeBatch(db);
      if (transfAtualizada) {
        const transfRef = doc(db, COLLECTIONS.TRANSFERENCIAS, transferenciaId);
        batch.set(transfRef, transfAtualizada, { merge: true });
      }
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      batch.set(histRef, histItem, { merge: true });
      await batch.commit();
      this.setStatus('connected');
    } catch (err) {
      console.warn('Aviso: Falha ao recusar transferência no Firestore:', err);
      this.setStatus('offline');
    }

    return true;
  }

  // ==========================================
  // Sincronização de Coleção Genérica
  // ==========================================
  private syncGenericCollection(collectionName: string, localStorageKey: string, customEventName?: string) {
    const colRef = collection(db, collectionName);
    const eventName = customEventName || `${collectionName}-firebase-updated`;

    const unsub = onSnapshot(
      colRef,
      async (snapshot) => {
        if (!snapshot.metadata.fromCache) {
          this.setStatus('connected');
        }

        if (snapshot.empty) {
          if (snapshot.metadata.fromCache) {
            return;
          }
          // Para coleções como Avisos: se o Firestore está vazio ou todos foram excluídos,
          // reflete a exclusão limpando o cache local e notificando em tempo real todos os celulares!
          if (collectionName === COLLECTIONS.AVISOS) {
            localStorage.setItem(localStorageKey, JSON.stringify([]));
            window.dispatchEvent(new CustomEvent(eventName, { detail: [] }));
            return;
          }

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
                  batch.set(docRef, cleanForFirestore(item));
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
          const docData = { id: d.id, ...d.data() };
          // Se for mensagem de teste ou fictícia na coleção de avisos, remove do Firestore
          if (collectionName === COLLECTIONS.AVISOS && isTestOrDemoAviso(docData)) {
            try {
              deleteDoc(d.ref).catch(() => {});
            } catch {
              // ignore
            }
            return;
          }
          items.push(docData);
        });

        const itensFinais = items.filter((it: any) => !isGenericSampleDoc(collectionName, it));

        localStorage.setItem(localStorageKey, JSON.stringify(itensFinais));
        window.dispatchEvent(new CustomEvent(eventName, { detail: itensFinais }));
      },
      (error) => {
        console.warn(`Falha no listener de ${collectionName}:`, error);
      }
    );

    this.unsubscribers.push(unsub);
  }

  /**
   * Salva um lote inteiro de itens em uma coleção do Firestore,
   * removendo documentos órfãos e atualizando localStorage e UI simultaneamente em tempo real.
   */
  public async saveBatchCollection(
    collectionName: string,
    items: any[],
    localStorageKey: string,
    customEventName: string
  ): Promise<void> {
    try {
      // 1. Atualiza imediatamente o cache local e despacha evento para a UI
      localStorage.setItem(localStorageKey, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(customEventName, { detail: items }));

      // 2. Sincroniza com o Firestore
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      const currentIds = new Set(items.map((it) => String(it.id)));

      const operations: Array<(b: any) => void> = [];

      // Deleta documentos antigos que não estão mais no novo conjunto (exclusão real no Firestore)
      snapshot.forEach((docSnap) => {
        if (!currentIds.has(docSnap.id)) {
          operations.push((b) => b.delete(docSnap.ref));
        }
      });

      // Grava / atualiza todos os itens atuais com limpeza de campos undefined
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = String(item.id || `item-${Date.now()}-${i}`);
        const docRef = doc(db, collectionName, id);
        const cleaned = cleanForFirestore({
          ...item,
          id,
          atualizadoEm: new Date().toISOString(),
        });
        operations.push((b) => b.set(docRef, cleaned));
      }

      // Executa em lotes seguros de 400 operações para evitar limites do Firestore
      const CHUNK_SIZE = 400;
      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const chunk = operations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((op) => op(batch));
        await batch.commit();
      }

      this.setStatus('connected');
    } catch (err) {
      console.warn(`Erro ao sincronizar lote de ${collectionName} no Firebase:`, err);
    }
  }

  public async saveAllS140T(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.S140T,
      items,
      STORAGE_KEY_S140T,
      's140t-firebase-updated'
    );
  }

  public async saveAllDesignacoes(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.DESIGNACOES,
      items,
      STORAGE_KEY_DESIGNACOES,
      'designacoes-firebase-updated'
    );
  }

  public async saveAllCampo(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.CAMPO,
      items,
      STORAGE_KEY_CAMPO_FDS,
      'campo-firebase-updated'
    );
  }

  public async saveAllCampoProgramacao(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.CAMPO_PROGRAMACAO,
      items,
      STORAGE_KEY_CAMPO_PROGRAMACAO,
      'campo-programacao-firebase-updated'
    );
  }

  public async saveAllDiscursos(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.DISCURSOS,
      items,
      STORAGE_KEY_DISCURSOS,
      'discursos-firebase-updated'
    );
  }

  public async saveAllLimpeza(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.LIMPEZA,
      items,
      STORAGE_KEY_LIMPEZA_ESCALAS,
      'limpeza-firebase-updated'
    );
  }

  public async saveAllAssistencia(items: any[]): Promise<void> {
    return this.saveBatchCollection(
      COLLECTIONS.ASSISTENCIA,
      items,
      'assistencia_vilacisper_data',
      'assistencia-firebase-updated'
    );
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
