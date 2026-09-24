// Service Worker oficial para Firebase Cloud Messaging (FCM) e Web Push
// PWA Congregação Vila Cisper

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Tentar carregar scripts compat do Firebase (se suportado e conectado)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  if (typeof firebase !== 'undefined') {
    firebase.initializeApp({
      apiKey: "AIzaSyA8gx5sG_p2NsH_cFkx1dLBX-maZf6Evt0",
      authDomain: "gestao-de-transporte-d642e.firebaseapp.com",
      projectId: "gestao-de-transporte-d642e",
      storageBucket: "gestao-de-transporte-d642e.firebasestorage.app",
      messagingSenderId: "420980581997",
      appId: "1:420980581997:web:b5b08961d50a5102dfc164"
    });

    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const title =
        payload.notification?.title || payload.data?.title || 'Nova solicitação de território';
      const body =
        payload.notification?.body || payload.data?.body || 'Um irmão solicitou um território.';
      const url =
        payload.data?.url || '/?screen=territorios&tab=solicitacoes';
      const tag =
        payload.data?.tag || ('solicitacao-' + (payload.data?.solicitacaoId || 'novo'));

      return self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag,
        renotify: true,
        vibrate: [250, 100, 250],
        data: { url },
      });
    });
  }
} catch (e) {
  // Scripts compat offline ou indisponíveis; o listener nativo 'push' abaixo garantirá o recebimento
}

// Listener nativo do evento 'push' (Web Push Protocol / FCM Web Push)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Nova solicitação de território';
  const body = data.body || 'Um irmão solicitou um território.';
  const tag = data.tag || 'solicitacao-territorio';
  const url = data.url || '/?screen=territorios&tab=solicitacoes';

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [250, 100, 250],
    tag,
    renotify: true,
    requireInteraction: true,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ação ao tocar na notificação: abre diretamente a área de solicitações de território do Painel do Responsável
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    '/?screen=territorios&tab=solicitacoes';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se houver uma janela aberta do app, foca nela e navega para a URL
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Se o app estiver fechado, abre uma nova janela diretamente na tela de solicitações
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
