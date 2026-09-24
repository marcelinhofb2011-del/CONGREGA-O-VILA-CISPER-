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
} as const;

export type SyncStatus = 'connecting' | 'connected' | 'offline' | 'error';

function isGenericSampleDoc(collectionName: string, docData: any): boolean {
  if (!docData) return false;
  const id = String(docData.id || '').toLowerCase();
  if (collectionName === COLLECTIONS.DESIGNACOES) {
    if (/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-\d+$/.test(id)) return true;
    if (docData.mesChave === 'abril' && (String(docData.indicador).includes('Pedro / Fernando') || String(docData.microfone).includes('Vanderlei'))) return true;
  }
  if (collectionName === COLLECTIONS.DISCURSOS) {
    if (/^disc-(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-\d+$/.test(id)) return true;
    if (String(docData.mes).toLowerCase().includes('abril') && String(docData.tema).includes('verdadeira religião')) return true;
  }
  if (collectionName === COLLECTIONS.LIMPEZA) {
    if (/^limp-(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-\d+$/.test(id)) return true;
    if (String(docData.grupo).includes('DANILO E VILSON') || String(docData.grupo).includes('SAMUEL / GEOVANE')) return true;
  }
  if (collectionName === COLLECTIONS.CAMPO_PROGRAMACAO) {
    if (/^prog-campo-(1[0-1]|[1-9])$/.test(id)) return true;
  }
  if (collectionName === COLLECTIONS.CAMPO) {
    if (/^c-(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-\d+$/.test(id)) return true;
  }
  if (collectionName === COLLECTIONS.S140T) {
    if (id.startsWith('s140t-2026-04-')) return true;
  }
  return false;
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
      if (stored.length > 0) callback(stored);
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
      if (stored.length > 0) callback(stored);
    }
    return () => {
      this.solicitacoesListeners = this.solicitacoesListeners.filter((cb) => cb !== callback);
    };
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

        const temSemanasReais = semanas.some((s) => !s.id.startsWith('s140t-2026-04-') && !s.id.startsWith('sem-2026-'));
        let semanasFinais = semanas;
        if (temSemanasReais) {
          semanasFinais = semanas.filter((s) => !s.id.startsWith('s140t-2026-04-'));
          const docsParaPurgar = snapshot.docs.filter((d) => d.id.startsWith('s140t-2026-04-'));
          if (docsParaPurgar.length > 0) {
            const batch = writeBatch(db);
            docsParaPurgar.forEach((d) => batch.delete(d.ref));
            batch.commit().catch(() => {});
          }
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

        lista.sort((a, b) => a.numero - b.numero);
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

  public async deleteTerritorio(id: string): Promise<void> {
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
          if (localRaw) {
            try {
              const dados: SolicitacaoTerritorio[] = JSON.parse(localRaw);
              if (Array.isArray(dados) && dados.length > 0) {
                const batch = writeBatch(db);
                for (const s of dados) {
                  const docRef = doc(db, COLLECTIONS.SOLICITACOES, s.id);
                  batch.set(docRef, s);
                }
                await batch.commit();
              }
            } catch {
              // ignore
            }
          }
          initialLoadDone = true;
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
      await setDoc(docRef, sol);
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
   * Cria a solicitação no Firestore.
   * Se um território foi escolhido, atualiza o status dele para "Solicitado".
   * Registra a solicitação no histórico permanente.
   */
  public async executeSolicitacaoBatch(
    nomePublicador: string,
    territorioId?: string
  ): Promise<SolicitacaoTerritorio | null> {
    try {
      const batch = writeBatch(db);
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
        nome_publicador: nomePublicador.trim(),
        data_solicitacao: dataHoje,
        hora_solicitacao: horaHoje,
        status: 'Pendente',
        territorio_id: terObj ? terObj.id : undefined,
        territorio_numero: terObj ? terObj.numero : undefined,
        created_at: now.toISOString(),
      };

      const solRef = doc(db, COLLECTIONS.SOLICITACOES, solId);
      batch.set(solRef, nova);

      if (terObj) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, terObj.id);
        batch.update(terRef, {
          status: 'Solicitado',
          solicitado_por: nomePublicador.trim(),
          solicitacao_id: solId,
          data_solicitacao: dataHoje,
          hora_solicitacao: horaHoje,
          updated_at: now.toISOString(),
        });
      }

      const histId = String(Date.now() + 1);
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      const histItem: HistoricoTerritorio = {
        id: histId,
        territorio_id: terObj?.id,
        territorio_numero: terObj ? terObj.numero : 0,
        territorio_localidade: terObj?.localidade,
        publicador: nomePublicador.trim(),
        acao: 'Solicitação',
        status: 'Solicitado',
        responsavel: 'Publicador',
        data: `${dataHoje} às ${horaHoje}`,
        observacao: terObj
          ? `Solicitação do Território Nº ${terObj.numero} (${terObj.localidade}) enviada ao responsável.`
          : 'Solicitação de território enviada ao responsável.',
        created_at: now.toISOString(),
      };
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');

      // Notifica responsáveis via push se habilitado
      dispatchPushNotificationToResponsaveis(nova).catch((pushErr) => {
        console.warn('Erro ao despachar push para responsáveis:', pushErr);
      });

      return nova;
    } catch (err) {
      console.error('Erro ao executar batch de solicitação no Firestore:', err);
      return null;
    }
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
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHoje = formatarDataHoje();
      const horaHoje = formatarHoraHoje();

      const sol = this.solicitacoesCache.find((s) => s.id === solicitacaoId) ||
        getStoredSolicitacoes().find((s) => s.id === solicitacaoId);
      const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
        getStoredTerritorios().find((t) => t.id === territorioId);

      const publicadorNome = (publicadorNomeOverride || sol?.nome_publicador || '').trim();

      const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
      batch.update(terRef, {
        status: 'Designado',
        designado_para: publicadorNome,
        data_ultima_designacao: dataHoje,
        hora_ultima_designacao: horaHoje,
        responsavel_designacao: responsavelNome.trim(),
        solicitado_por: null,
        solicitacao_id: null,
        data_conclusao: null,
        data_estorno: null,
        motivo_estorno: null,
        data_ultimo_retorno_sort: null,
        updated_at: now.toISOString(),
      });

      if (solicitacaoId) {
        const solRef = doc(db, COLLECTIONS.SOLICITACOES, solicitacaoId);
        batch.update(solRef, {
          status: 'Designado',
          territorio_id: territorioId,
          territorio_numero: ter ? ter.numero : 0,
          data_designacao: dataHoje,
          responsavel: responsavelNome.trim(),
        });
      }

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      const histItem: HistoricoTerritorio = {
        id: histId,
        territorio_id: territorioId,
        territorio_numero: ter ? ter.numero : 0,
        territorio_localidade: ter?.localidade,
        publicador: publicadorNome,
        acao: 'Designação',
        status: 'Designado',
        responsavel: responsavelNome.trim() || 'Responsável',
        data: `${dataHoje} às ${horaHoje}`,
        observacao: `Designado para ${publicadorNome}`,
        created_at: now.toISOString(),
      };
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao executar batch de designação no Firestore:', err);
      return false;
    }
  }

  /**
   * 3. Publicador estorna território:
   * Encerra a designação atual.
   * Remove o vínculo ativo com o publicador (designado_para = null).
   * Altera imediatamente o estado do território para "Disponível".
   * Registra no histórico permanente.
   * Ambas as telas atualizam em tempo real via snapshot do Firestore.
   */
  public async executeEstornoBatch(
    territorioId: string,
    publicadorNome: string,
    motivo?: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHora = formatarDataHoraHoje();

      const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
        getStoredTerritorios().find((t) => t.id === territorioId);

      const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
      batch.update(terRef, {
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
      });

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
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
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao executar batch de estorno no Firestore:', err);
      return false;
    }
  }

  /**
   * 4. Publicador conclui território:
   * Altera status do território para "Concluído".
   * Registra a conclusão no histórico permanente.
   */
  public async executeConclusaoBatch(
    territorioId: string,
    publicadorNome: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHora = formatarDataHoraHoje();

      const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
        getStoredTerritorios().find((t) => t.id === territorioId);

      const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
      batch.update(terRef, {
        status: 'Concluído',
        data_conclusao: dataHora,
        data_ultimo_retorno_sort: now.toISOString(),
        solicitado_por: null,
        solicitacao_id: null,
        updated_at: now.toISOString(),
      });

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
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
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao executar batch de conclusão no Firestore:', err);
      return false;
    }
  }

  /**
   * 5. Responsável cancela solicitação:
   * Marca solicitação como Cancelada (ou remove).
   * Se havia território vinculado ou solicitado, devolve o território para "Disponível".
   * Registra no histórico.
   */
  public async executeCancelamentoSolicitacaoBatch(
    solicitacaoId: string,
    responsavelNome?: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHoje = formatarDataHoje();
      const horaHoje = formatarHoraHoje();

      const sol = this.solicitacoesCache.find((s) => s.id === solicitacaoId) ||
        getStoredSolicitacoes().find((s) => s.id === solicitacaoId);

      const solRef = doc(db, COLLECTIONS.SOLICITACOES, solicitacaoId);
      batch.update(solRef, { status: 'Cancelada' });

      // Se havia território vinculado à solicitação, restaura para Disponível
      let ter: Territorio | undefined;
      if (sol?.territorio_id) {
        ter = this.territoriosCache.find((t) => t.id === sol.territorio_id);
      }
      if (!ter && sol) {
        ter = this.territoriosCache.find(
          (t) => t.solicitacao_id === solicitacaoId || (t.status === 'Solicitado' && t.solicitado_por === sol.nome_publicador)
        );
      }

      if (ter) {
        const terRef = doc(db, COLLECTIONS.TERRITORIOS, ter.id);
        batch.update(terRef, {
          status: 'Disponível',
          solicitado_por: null,
          solicitacao_id: null,
          updated_at: now.toISOString(),
        });
      }

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      const histItem: HistoricoTerritorio = {
        id: histId,
        territorio_id: ter?.id,
        territorio_numero: ter ? ter.numero : 0,
        territorio_localidade: ter?.localidade,
        publicador: sol ? sol.nome_publicador : 'Publicador',
        acao: 'Solicitação Cancelada',
        status: 'Cancelada',
        responsavel: responsavelNome?.trim() || 'Irmão Responsável',
        data: `${dataHoje} às ${horaHoje}`,
        observacao: 'Solicitação cancelada pelo responsável. Território liberado.',
        created_at: now.toISOString(),
      };
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao executar cancelamento no Firestore:', err);
      return false;
    }
  }

  /**
   * 6. Responsável torna território disponível (Novo Ciclo):
   * Altera status para "Disponível" e limpa vínculos anteriores.
   */
  public async executeTornarDisponivelBatch(
    territorioId: string,
    responsavelNome: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHora = formatarDataHoraHoje();

      const ter = this.territoriosCache.find((t) => t.id === territorioId) ||
        getStoredTerritorios().find((t) => t.id === territorioId);
      const anteriorPublicador = ter?.designado_para;

      const terRef = doc(db, COLLECTIONS.TERRITORIOS, territorioId);
      batch.update(terRef, {
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
      });

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      const histItem: HistoricoTerritorio = {
        id: histId,
        territorio_id: territorioId,
        territorio_numero: ter ? ter.numero : 0,
        territorio_localidade: ter?.localidade,
        publicador: anteriorPublicador || '-',
        acao: 'Disponibilizado para Novo Ciclo',
        status: 'Disponível',
        responsavel: responsavelNome.trim() || 'Responsável',
        data: dataHora,
        observacao: 'Território liberado manualmente pelo responsável para novas designações.',
        created_at: now.toISOString(),
      };
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao disponibilizar território no Firestore:', err);
      return false;
    }
  }

  /**
   * 7. Responsável torna múltiplos territórios disponíveis em lote:
   */
  public async executeTornarDisponivelLoteBatch(
    territorioIds: string[],
    responsavelNome: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHora = formatarDataHoraHoje();

      for (let i = 0; i < territorioIds.length; i++) {
        const id = territorioIds[i];
        const ter = this.territoriosCache.find((t) => t.id === id) ||
          getStoredTerritorios().find((t) => t.id === id);

        const terRef = doc(db, COLLECTIONS.TERRITORIOS, id);
        batch.update(terRef, {
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
        });

        const histId = String(Date.now() + i);
        const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
        const histItem: HistoricoTerritorio = {
          id: histId,
          territorio_id: id,
          territorio_numero: ter ? ter.numero : 0,
          territorio_localidade: ter?.localidade,
          publicador: ter?.designado_para || '-',
          acao: 'Disponibilizado para Novo Ciclo',
          status: 'Disponível',
          responsavel: responsavelNome.trim() || 'Responsável',
          data: dataHora,
          observacao: 'Território liberado em lote para novas designações.',
          created_at: now.toISOString(),
        };
        batch.set(histRef, histItem);
      }

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao disponibilizar lote no Firestore:', err);
      return false;
    }
  }

  /**
   * 8. Publicador solicita compartilhamento (transferência):
   */
  public async executeSolicitarTransferenciaBatch(
    territorioId: string,
    publicadorAtual: string,
    novoPublicador: string
  ): Promise<TransferenciaTerritorio | null> {
    try {
      const batch = writeBatch(db);
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

      const transfRef = doc(db, COLLECTIONS.TRANSFERENCIAS, transfId);
      batch.set(transfRef, nova);

      const histId = String(Date.now() + 1);
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
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
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return nova;
    } catch (err) {
      console.error('Erro ao solicitar transferência no Firestore:', err);
      return null;
    }
  }

  /**
   * 9. Responsável aprova transferência:
   */
  public async executeTransferenciaAprovadaBatch(
    transferenciaId: string,
    responsavelNome: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHora = formatarDataHoraHoje();
      const dataHoje = formatarDataHoje();
      const horaHoje = formatarHoraHoje();

      const transf = this.transferenciasCache.find((t) => t.id === transferenciaId) ||
        getStoredTransferencias().find((t) => t.id === transferenciaId);
      if (!transf) return false;

      const transfRef = doc(db, COLLECTIONS.TRANSFERENCIAS, transferenciaId);
      batch.update(transfRef, {
        status: 'Aprovada',
        responsavel: responsavelNome.trim() || 'Responsável',
        data_decisao: dataHora,
      });

      const terRef = doc(db, COLLECTIONS.TERRITORIOS, transf.territorio_id);
      batch.update(terRef, {
        status: 'Designado',
        designado_para: transf.novo_publicador,
        data_ultima_designacao: dataHoje,
        hora_ultima_designacao: horaHoje,
        responsavel_designacao: responsavelNome.trim(),
        updated_at: now.toISOString(),
      });

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      const histItem: HistoricoTerritorio = {
        id: histId,
        territorio_id: transf.territorio_id,
        territorio_numero: transf.territorio_numero,
        territorio_localidade: transf.territorio_localidade,
        publicador: transf.novo_publicador,
        acao: 'Transferência Aprovada',
        status: 'Designado',
        responsavel: responsavelNome.trim() || 'Responsável',
        data: dataHora,
        observacao: `Transferido de ${transf.publicador_atual} para ${transf.novo_publicador}`,
        created_at: now.toISOString(),
      };
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao aprovar transferência no Firestore:', err);
      return false;
    }
  }

  /**
   * 10. Responsável recusa transferência:
   */
  public async executeTransferenciaRecusadaBatch(
    transferenciaId: string,
    responsavelNome: string
  ): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      const now = new Date();
      const dataHora = formatarDataHoraHoje();

      const transf = this.transferenciasCache.find((t) => t.id === transferenciaId) ||
        getStoredTransferencias().find((t) => t.id === transferenciaId);
      if (!transf) return false;

      const transfRef = doc(db, COLLECTIONS.TRANSFERENCIAS, transferenciaId);
      batch.update(transfRef, {
        status: 'Recusada',
        responsavel: responsavelNome.trim() || 'Responsável',
        data_decisao: dataHora,
      });

      const histId = String(Date.now());
      const histRef = doc(db, COLLECTIONS.HISTORICO, histId);
      const histItem: HistoricoTerritorio = {
        id: histId,
        territorio_id: transf.territorio_id,
        territorio_numero: transf.territorio_numero,
        territorio_localidade: transf.territorio_localidade,
        publicador: transf.publicador_atual,
        acao: 'Transferência Recusada',
        status: 'Recusada',
        responsavel: responsavelNome.trim() || 'Responsável',
        data: dataHora,
        observacao: `Pedido de transferência para ${transf.novo_publicador} foi recusado pelo responsável.`,
        created_at: now.toISOString(),
      };
      batch.set(histRef, histItem);

      await batch.commit();
      this.setStatus('connected');
      return true;
    } catch (err) {
      console.error('Erro ao recusar transferência no Firestore:', err);
      return false;
    }
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
          items.push({ id: d.id, ...d.data() });
        });

        // Se houver registros reais não-amostra, descarta amostras e purga do Firestore
        const temRegistrosReais = items.some((it: any) => !isGenericSampleDoc(collectionName, it));
        let itensFinais = items;
        if (temRegistrosReais) {
          itensFinais = items.filter((it: any) => !isGenericSampleDoc(collectionName, it));

          // Purga do Firestore de forma assíncrona para que nunca mais reapareçam
          const docsParaPurgar = snapshot.docs.filter((d) => isGenericSampleDoc(collectionName, { id: d.id, ...d.data() }));
          if (docsParaPurgar.length > 0) {
            const batch = writeBatch(db);
            docsParaPurgar.forEach((d) => batch.delete(d.ref));
            batch.commit().catch(() => {});
          }
        }

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

      // Deleta documentos antigos que não estão mais no novo conjunto
      snapshot.forEach((docSnap) => {
        if (!currentIds.has(docSnap.id)) {
          operations.push((b) => b.delete(docSnap.ref));
        }
      });

      // Grava / atualiza todos os itens atuais
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const id = String(item.id || `item-${Date.now()}-${i}`);
        const docRef = doc(db, collectionName, id);
        operations.push((b) => b.set(docRef, { ...item, id, atualizadoEm: new Date().toISOString() }));
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
