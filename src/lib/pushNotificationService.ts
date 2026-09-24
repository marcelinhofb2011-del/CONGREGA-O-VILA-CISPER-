import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported as isMessagingSupported } from 'firebase/messaging';
import { app, db } from './firebase';
import { VAPID_PUBLIC_KEY } from './vapidConfig';
import { SolicitacaoTerritorio } from '../data/territoriosStorage';

export const PUSH_TOKENS_COLLECTION = 'fcm_tokens_responsaveis';
const STORAGE_KEY_PUSH_ENABLED = 'vila_cisper_push_enabled';
const STORAGE_KEY_DEVICE_ID = 'vila_cisper_push_device_id';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
    if (!id) {
      id = 'dev-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
    }
    return id;
  } catch {
    return 'dev-temp-' + Date.now();
  }
}

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getPushPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function isDevicePushEnabled(): boolean {
  try {
    return (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted' &&
      localStorage.getItem(STORAGE_KEY_PUSH_ENABLED) === 'true'
    );
  } catch {
    return false;
  }
}

/**
 * Retorna mensagem de status clara baseada no estado de permissão do navegador
 */
export function getPushPermissionStatusMessage(permission?: NotificationPermission | 'unsupported'): string {
  const perm = permission || getPushPermissionStatus();
  if (perm === 'granted') {
    return 'Notificações autorizadas neste dispositivo.';
  }
  if (perm === 'denied') {
    return 'Notificações bloqueadas neste dispositivo.';
  }
  if (perm === 'default') {
    return 'Permissão de notificações ainda não definida.';
  }
  return 'Notificações não são suportadas neste navegador.';
}

/**
 * Solicita a permissão de notificação pelo mecanismo universal do navegador (Promise + Callback fallback)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  // Se já foi definida no navegador
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }

  try {
    let callbackPermission: NotificationPermission | undefined;
    const reqResult = Notification.requestPermission((p) => {
      callbackPermission = p;
    });

    if (reqResult && typeof reqResult.then === 'function') {
      const res = await reqResult;
      if (res) return res;
    }

    if (callbackPermission) {
      return callbackPermission;
    }
  } catch (err) {
    console.warn('Erro ao chamar Notification.requestPermission:', err);
  }

  return Notification.permission;
}

export interface PushRegistrationResult {
  success: boolean;
  permission: NotificationPermission | 'unsupported';
  message: string;
  fcmToken?: string;
  error?: string;
}

/**
 * Sequência completa de autorização e registro:
 * 1. Permissão do navegador (Notification.requestPermission)
 * 2. Avaliação de Notification.permission
 * 3. Service Worker e Firebase Cloud Messaging (FCM)
 * 4. Obtenção do token FCM do dispositivo
 * 5. Registro do dispositivo no Firestore
 */
export async function registerResponsiblePushDevice(
  responsavelNome?: string
): Promise<PushRegistrationResult> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      permission: 'unsupported',
      message: 'Este navegador ou dispositivo não possui suporte a notificações push.',
    };
  }

  try {
    // 1. Solicitar a permissão pelo mecanismo correto do navegador/PWA
    const permission = await requestNotificationPermission();

    // 2. Se a permissão estiver como "denied", informar bloqueio
    if (permission === 'denied') {
      return {
        success: false,
        permission: 'denied',
        message: 'Notificações bloqueadas neste dispositivo.',
      };
    }

    // Se o usuário dispensou sem selecionar
    if (permission === 'default') {
      return {
        success: false,
        permission: 'default',
        message: 'Permissão de notificações ainda não definida.',
      };
    }

    // 3. Se Notification.permission === "granted", considerar a autorização como concedida
    // e prosseguir para registrar o dispositivo e obter o token FCM
    let registration: ServiceWorkerRegistration | undefined;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.error('Erro técnico ao registrar Service Worker para notificações:', swErr);
      return {
        success: false,
        permission: 'granted',
        message: 'As notificações foram autorizadas, mas este dispositivo ainda não foi registrado para recebê-las.',
        error: swErr instanceof Error ? swErr.message : String(swErr),
      };
    }

    // 4. Obter token do Firebase Cloud Messaging (FCM)
    let fcmToken: string | null = null;
    let tokenError: any = null;

    try {
      const messagingSupported = await isMessagingSupported();
      if (messagingSupported) {
        const messaging = getMessaging(app);
        fcmToken = await getToken(messaging, {
          vapidKey: VAPID_PUBLIC_KEY,
          serviceWorkerRegistration: registration,
        });
      }
    } catch (err: any) {
      tokenError = err;
      console.error('Erro técnico ao obter token FCM do dispositivo:', err);
    }

    // 5. Obter ou criar inscrição Web Push (PushManager nativo)
    let subscription: PushSubscription | null = null;
    try {
      if (registration.pushManager) {
        subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any,
          });
        }
      }
    } catch (pushErr: any) {
      console.error('Erro técnico ao registrar PushSubscription do navegador:', pushErr);
      if (!tokenError) tokenError = pushErr;
    }

    // 6. Verificar se foi possível obter token FCM ou credencial Push
    if (!fcmToken && !subscription) {
      console.error('Não foi possível obter credencial de Push/FCM para este dispositivo:', tokenError);
      return {
        success: false,
        permission: 'granted',
        message: 'As notificações foram autorizadas, mas este dispositivo ainda não foi registrado para recebê-las.',
        error: tokenError?.message || 'Token FCM ou PushSubscription não disponível.',
      };
    }

    const subJson = subscription ? subscription.toJSON() : null;
    const deviceId = getOrCreateDeviceId();

    // 7. Gravar a autorização e o token no Firestore na coleção dos responsáveis autorizados
    const docRef = doc(db, PUSH_TOKENS_COLLECTION, deviceId);
    await setDoc(docRef, {
      deviceId,
      fcmToken: fcmToken || (subJson?.endpoint || null),
      endpoint: subJson?.endpoint || null,
      keys: subJson?.keys || null,
      role: 'responsavel',
      responsavelNome: (responsavelNome && responsavelNome.trim()) || 'Responsável por Territórios',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      permission: 'granted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    localStorage.setItem(STORAGE_KEY_PUSH_ENABLED, 'true');

    return {
      success: true,
      permission: 'granted',
      fcmToken: fcmToken || undefined,
      message: 'Notificações autorizadas neste dispositivo.',
    };
  } catch (err: any) {
    console.error('Erro técnico geral ao registrar dispositivo do responsável:', err);
    const currentPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    if (currentPermission === 'granted') {
      return {
        success: false,
        permission: 'granted',
        message: 'As notificações foram autorizadas, mas este dispositivo ainda não foi registrado para recebê-las.',
        error: err?.message || String(err),
      };
    }
    return {
      success: false,
      permission: currentPermission,
      message: currentPermission === 'denied'
        ? 'Notificações bloqueadas neste dispositivo.'
        : 'Permissão de notificações ainda não definida.',
      error: err?.message || String(err),
    };
  }
}

/**
 * Desativar notificações neste dispositivo
 */
export async function disableResponsiblePushDevice(): Promise<void> {
  try {
    const deviceId = getOrCreateDeviceId();
    await deleteDoc(doc(db, PUSH_TOKENS_COLLECTION, deviceId));
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
    }
  } catch (err) {
    console.warn('Erro ao desativar inscrição push:', err);
  } finally {
    localStorage.removeItem(STORAGE_KEY_PUSH_ENABLED);
  }
}

/**
 * Envia notificação Push para todos os aparelhos dos responsáveis registrados quando um irmão faz solicitação
 */
export async function dispatchPushNotificationToResponsaveis(
  solicitacao: SolicitacaoTerritorio
): Promise<{ success: boolean; count: number }> {
  try {
    // 1. Buscar todas as assinaturas dos responsáveis gravadas no Firestore
    const snapshot = await getDocs(collection(db, PUSH_TOKENS_COLLECTION));
    if (snapshot.empty) {
      return { success: true, count: 0 };
    }

    const subscriptions: any[] = [];
    const docIds: string[] = [];

    snapshot.forEach((d) => {
      const data = d.data();
      if (data && (data.endpoint || data.fcmToken)) {
        subscriptions.push({
          docId: d.id,
          endpoint: data.endpoint || data.fcmToken,
          keys: data.keys,
          fcmToken: data.fcmToken,
        });
        docIds.push(d.id);
      }
    });

    if (subscriptions.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Chamar o endpoint da API backend para despachar as notificações via Web Push / FCM
    const payload = {
      solicitacaoId: solicitacao.id,
      nomePublicador: solicitacao.nome_publicador,
      subscriptions,
    };

    const response = await fetch('/api/notify-solicitacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn('API de notificações retornou status:', response.status);
      return { success: false, count: 0 };
    }

    const resData = await response.json();

    // 3. Se houver assinaturas expiradas (código 410 / 404), limpar do banco
    if (Array.isArray(resData.expiredDocIds) && resData.expiredDocIds.length > 0) {
      for (const id of resData.expiredDocIds) {
        try {
          await deleteDoc(doc(db, PUSH_TOKENS_COLLECTION, id));
        } catch {
          // ignora erro de limpeza
        }
      }
    }

    return { success: true, count: resData.sentCount || 0 };
  } catch (err) {
    console.warn('Erro ao despachar notificação push para responsáveis:', err);
    return { success: false, count: 0 };
  }
}

/**
 * Envia uma notificação de teste para verificar o funcionamento do Push no aparelho
 */
export async function sendTestNotificationToResponsible(): Promise<{ success: boolean; message: string }> {
  try {
    const dummy: SolicitacaoTerritorio = {
      id: 'teste-' + Date.now(),
      nome_publicador: 'Publicador (Notificação de Teste)',
      data_solicitacao: 'Hoje',
      hora_solicitacao: 'Agora',
      status: 'Pendente',
      created_at: new Date().toISOString(),
    };

    const res = await dispatchPushNotificationToResponsaveis(dummy);

    // Se o service worker estiver ativo, exibe notificação local de teste caso esteja com permissão
    if ('serviceWorker' in navigator && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          reg.showNotification('Nova solicitação de território (Teste)', {
            body: 'Publicador (Notificação de Teste) solicitou um território.',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: 'teste-' + Date.now(),
            data: { url: '/?screen=territorios&tab=solicitacoes' },
          });
        }
      } catch (localErr) {
        console.warn('Tentativa de notificação local de teste:', localErr);
      }
    }

    return {
      success: true,
      message: `Notificação push enviada! Dispositivos alcançados: ${res.count}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Falha ao disparar notificação de teste: ' + (err?.message || String(err)),
    };
  }
}
