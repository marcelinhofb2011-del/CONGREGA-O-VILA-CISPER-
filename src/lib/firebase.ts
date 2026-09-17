import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialização segura do Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Inicialização do Firestore usando o databaseId provisionado
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Habilita persistência offline do Firestore no navegador quando disponível
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Múltiplas abas abertas simultaneamente
        console.warn('Persistência Firestore em múltiplas abas: fallback para memória');
      } else if (err.code === 'unimplemented') {
        // Navegador sem suporte a IndexedDB
        console.warn('Navegador sem suporte a persistência IndexedDB');
      }
    });
  } catch {
    // Silencioso se já inicializado
  }
}

export { app, auth, db };
