import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const firebaseSync = {
  async saveItem(col: string, id: string, data: any) {
    try {
      const ref = doc(db, col, id);
      await setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e) {
      console.warn('Firebase sync failed (using local):', e);
      return false;
    }
  },

  async saveAllCampo(items: any[]) {
    try {
      const ref = doc(db, 'programacoes_campo', 'geral');
      await setDoc(ref, { items, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firebase sync campo failed:', e);
    }
  },

  async saveAllDesignacoes(items: any[]) {
    try {
      const ref = doc(db, 'designacoes', 'geral');
      await setDoc(ref, { items, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firebase sync designacoes failed:', e);
    }
  },

  async saveAllDiscursos(items: any[]) {
    try {
      const ref = doc(db, 'discursos_publicos', 'geral');
      await setDoc(ref, { items, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firebase sync discursos failed:', e);
    }
  },

  async saveAllLimpeza(items: any[]) {
    try {
      const ref = doc(db, 'escalas_limpeza', 'geral');
      await setDoc(ref, { items, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firebase sync limpeza failed:', e);
    }
  },

  async saveAllAvisos(items: any[]) {
    try {
      const ref = doc(db, 'avisos', 'geral');
      await setDoc(ref, { items, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('Firebase sync avisos failed:', e);
    }
  },
};
