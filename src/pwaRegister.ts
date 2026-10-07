import { registerSW } from 'virtual:pwa-register';

type UpdateCallback = (needRefresh: boolean) => void;
const listeners = new Set<UpdateCallback>();

let updateSWFunction: ((reloadPage?: boolean) => Promise<void>) | null = null;
let hasUpdate = false;

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    updateSWFunction = registerSW({
      immediate: true,
      onNeedRefresh() {
        hasUpdate = true;
        listeners.forEach((fn) => fn(true));
        console.log('[PWA] Nova versão detectada e pronta para ativação.');
      },
      onOfflineReady() {
        console.log('[PWA] Aplicativo pronto para uso offline.');
      },
      onRegisteredSW(_swUrl, r) {
        if (r) {
          // Checar se há atualizações a cada 10 minutos
          setInterval(() => {
            r.update().catch(() => {});
          }, 10 * 60 * 1000);
          // Checar se há atualizações ao retornar ao aplicativo
          window.addEventListener('focus', () => {
            r.update().catch(() => {});
          });
        }
      },
    });
  } catch (err) {
    console.warn('[PWA] Falha ao registrar Service Worker:', err);
  }
}

export function subscribePWAUpdate(callback: UpdateCallback) {
  listeners.add(callback);
  if (hasUpdate) callback(true);
  return () => {
    listeners.delete(callback);
  };
}

export function getHasUpdate() {
  return hasUpdate;
}

export async function forceUpdatePWA() {
  try {
    if (updateSWFunction) {
      await updateSWFunction(true);
    } else if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.update();
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  } catch (e) {
    console.error('Erro ao forçar atualização:', e);
  }
  window.location.reload();
}
