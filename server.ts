process.env.DISABLE_HMR = 'true';

import http from 'http';
import express from 'express';
import webPush from 'web-push';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './src/lib/vapidConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Web Push com as credenciais VAPID
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Armazenamento em memória para deduplicação de notificações recentes (evita duplicar alertas)
const sentNotificationsCache = new Map<string, number>();

// Limpeza periódica de cache de deduplicação a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of sentNotificationsCache.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      sentNotificationsCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// Endpoint para verificação de saúde da API
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint para consulta da chave pública VAPID
app.get('/api/vapid-public-key', (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Endpoint para envio de notificações Push aos dispositivos dos responsáveis autorizados
app.post('/api/notify-solicitacao', async (req, res) => {
  try {
    const { solicitacaoId, nomePublicador, subscriptions } = req.body;

    if (!nomePublicador || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sentCount: 0, message: 'Nenhuma assinatura a notificar.' });
    }

    const solId = solicitacaoId ? String(solicitacaoId) : Date.now().toString();

    // Verificação de deduplicação: Se esta solicitação já disparou notificação nos últimos minutos, não duplica
    const cacheKey = `solicitacao_${solId}`;
    if (sentNotificationsCache.has(cacheKey)) {
      return res.status(200).json({
        success: true,
        sentCount: 0,
        message: 'Notificação já enviada anteriormente para esta solicitação.',
      });
    }
    sentNotificationsCache.set(cacheKey, Date.now());

    const notificationPayload = JSON.stringify({
      title: 'Nova solicitação de território',
      body: `${nomePublicador.trim()} solicitou um território.`,
      tag: `solicitacao-${solId}`,
      url: '/?screen=territorios&tab=solicitacoes',
      solicitacaoId: solId,
      timestamp: Date.now(),
    });

    let sentCount = 0;
    const expiredDocIds: string[] = [];

    // Enviar em paralelo para cada dispositivo de responsável
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          if (!sub.endpoint || !sub.keys) {
            return;
          }
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: sub.keys,
          };
          await webPush.sendNotification(pushSubscription, notificationPayload);
          sentCount++;
        } catch (err: any) {
          // Status 404 (Not Found) ou 410 (Gone) indica assinatura cancelada ou expirada pelo navegador
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            if (sub.docId) expiredDocIds.push(sub.docId);
          } else {
            console.warn('Falha no envio Web Push para endpoint:', sub.endpoint, err?.message || err);
          }
        }
      })
    );

    res.json({
      success: true,
      sentCount,
      expiredDocIds,
    });
  } catch (err: any) {
    console.error('Erro na rota /api/notify-solicitacao:', err);
    res.status(500).json({ success: false, error: err?.message || 'Erro interno' });
  }
});

// Inicialização do servidor Vite / Estáticos
async function startServer() {
  if (!isProduction) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Servidor Congregação Vila Cisper ouvindo na porta ${PORT}`);
  });
}

startServer();
