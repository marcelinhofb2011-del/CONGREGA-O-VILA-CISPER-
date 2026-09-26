process.env.DISABLE_HMR = 'true';

import http from 'http';
import express from 'express';
import webPush from 'web-push';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './src/lib/vapidConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Web Push com as credenciais VAPID
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const ai = new GoogleGenAI();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Endpoint para interpretação inteligente de arquivo PDF de Vida e Ministério (S-140-T)
app.post('/api/parse-s140t-pdf', async (req, res) => {
  try {
    const { pdfBase64, textContent, filename } = req.body;

    if (!pdfBase64 && !textContent) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum documento PDF ou conteúdo de texto foi fornecido para interpretação.',
      });
    }

    const systemPrompt = `Você é um assistente especialista em formulários congregacionais das Testemunhas de Jeová, especificamente a reunião "Nossa Vida e Ministério Cristão" (formulário S-140-T ou apostila mensal de congregação).
Analise o arquivo PDF ou texto fornecido e extraia a programação semanal completa com todas as designações.

Retorne EXATAMENTE um array JSON com objetos seguindo a seguinte estrutura para cada semana:
[
  {
    "id": "sem-AAAA-MM-DD",
    "periodo": "D-D DE MÊS",
    "dataReuniao": "Quarta-feira, DD de Mês",
    "leituraBiblica": "LIVRO CAP-CAP",
    "ehVisita": false,
    "dataReferencia": "AAAA-MM-DD",
    "presidente": "Nome do Irmão",
    "canticoInicial": 1,
    "oracaoInicial": "Nome do Irmão",
    "comentariosIniciaisMin": 1,
    "tesourosSalao": "Salão principal",
    "discursoTesourosTitulo": "Tema do discurso de 10 min",
    "discursoTesourosTempoMin": 10,
    "discursoTesourosIrmao": "Nome do Irmão",
    "joiasEspirituaisTitulo": "Encontre Joias Espirituais",
    "joiasEspirituaisIrmao": "Nome do Irmão",
    "joiasEspirituaisTempoMin": 10,
    "leituraBibliaIrmao": "Nome do Irmão",
    "leituraBibliaTempoMin": 4,
    "ministerioSalao": "Salão principal",
    "partesMinisterio": [
      {
        "id": "pm-1",
        "numero": 4,
        "titulo": "Iniciando conversas",
        "tempoMin": 3,
        "designado": "Nome do Estudante",
        "ajudante": "Nome do Ajudante",
        "salao": "Salão principal"
      }
    ],
    "canticoMeio": 128,
    "partesVidaCrista": [
      {
        "id": "pvc-1",
        "numero": 7,
        "titulo": "Tema da parte",
        "tempoMin": 15,
        "designado": "Nome do Irmão"
      }
    ],
    "estudoBiblicoTempoMin": 30,
    "estudoBiblicoDirigente": "Nome do Dirigente",
    "estudoBiblicoLeitor": "Nome do Leitor",
    "comentariosFinaisMin": 3,
    "canticoFinal": 143,
    "oracaoFinal": "Nome do Irmão",
    "observacoesGerais": ""
  }
]

Orientações cruciais:
1. "dataReferencia" DEVE ser uma data válida no formato YYYY-MM-DD representando a segunda-feira da semana ou dia da reunião, permitindo ordenação cronológica.
2. Não invente dados: se algum campo não estiver preenchido no PDF, deixe como string vazia "".
3. Extraia todas as semanas presentes no documento.
4. Responda SOMENTE o array JSON, sem markdown ou explicações adicionais.`;

    let contentsParts: any[] = [];

    if (pdfBase64) {
      let rawBase64 = String(pdfBase64);
      if (rawBase64.includes('base64,')) {
        rawBase64 = rawBase64.split('base64,')[1];
      }
      contentsParts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: rawBase64,
        },
      });
    }

    if (textContent) {
      contentsParts.push({
        text: `Conteúdo de texto extraído do documento:\n${textContent}`,
      });
    }

    contentsParts.push({
      text: systemPrompt,
    });

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: contentsParts,
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com modelo ${modelName} falhou, tentando próximo...`, err?.message || err);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Não foi possível processar a programação.');
    }

    let rawText = response.text || '';
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let semanasParsed: any[] = [];
    try {
      const parsed = JSON.parse(rawText);
      semanasParsed = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e: any) {
      console.error('Falha ao fazer parse do JSON do Gemini:', rawText);
      return res.status(500).json({
        success: false,
        error: 'O modelo retornou uma estrutura de dados inválida. Tente novamente ou verifique o arquivo.',
        raw: rawText.substring(0, 500),
      });
    }

    // Normalização e higienização dos campos
    const semanasLimpos = semanasParsed.map((sem: any, idx: number) => {
      const dataRef = sem.dataReferencia || `2026-10-${String(idx * 7 + 5).padStart(2, '0')}`;
      const id = sem.id || `sem-${dataRef}`;

      return {
        id,
        periodo: sem.periodo || 'PERÍODO A DEFINIR',
        dataReuniao: sem.dataReuniao || '',
        leituraBiblica: sem.leituraBiblica || '',
        ehVisita: Boolean(sem.ehVisita),
        dataReferencia: dataRef,
        presidente: sem.presidente || '',
        canticoInicial: sem.canticoInicial || '',
        oracaoInicial: sem.oracaoInicial || '',
        comentariosIniciaisMin: sem.comentariosIniciaisMin || 1,
        tesourosSalao: sem.tesourosSalao || 'Salão principal',
        discursoTesourosTitulo: sem.discursoTesourosTitulo || '',
        discursoTesourosTempoMin: sem.discursoTesourosTempoMin || 10,
        discursoTesourosIrmao: sem.discursoTesourosIrmao || '',
        joiasEspirituaisTitulo: sem.joiasEspirituaisTitulo || 'Encontre Joias Espirituais',
        joiasEspirituaisIrmao: sem.joiasEspirituaisIrmao || '',
        joiasEspirituaisTempoMin: sem.joiasEspirituaisTempoMin || 10,
        leituraBibliaIrmao: sem.leituraBibliaIrmao || '',
        leituraBibliaTempoMin: sem.leituraBibliaTempoMin || 4,
        ministerioSalao: sem.ministerioSalao || 'Salão principal',
        partesMinisterio: Array.isArray(sem.partesMinisterio)
          ? sem.partesMinisterio.map((pm: any, pIdx: number) => ({
              id: pm.id || `pm-${idx + 1}-${pIdx + 1}`,
              numero: pm.numero || pIdx + 4,
              titulo: pm.titulo || 'Parte do Ministério',
              tempoMin: pm.tempoMin || 3,
              designado: pm.designado || '',
              ajudante: pm.ajudante || '',
              salao: pm.salao || 'Salão principal',
            }))
          : [],
        canticoMeio: sem.canticoMeio || '',
        partesVidaCrista: Array.isArray(sem.partesVidaCrista)
          ? sem.partesVidaCrista.map((pvc: any, pvcIdx: number) => ({
              id: pvc.id || `pvc-${idx + 1}-${pvcIdx + 1}`,
              numero: pvc.numero || 7,
              titulo: pvc.titulo || 'Nossa Vida Cristã',
              tempoMin: pvc.tempoMin || 15,
              designado: pvc.designado || '',
            }))
          : [],
        estudoBiblicoTempoMin: sem.estudoBiblicoTempoMin || 30,
        estudoBiblicoDirigente: sem.estudoBiblicoDirigente || '',
        estudoBiblicoLeitor: sem.estudoBiblicoLeitor || '',
        comentariosFinaisMin: sem.comentariosFinaisMin || 3,
        canticoFinal: sem.canticoFinal || '',
        oracaoFinal: sem.oracaoFinal || '',
        observacoesGerais: sem.observacoesGerais || '',
      };
    });

    res.json({
      success: true,
      semanas: semanasLimpos,
      count: semanasLimpos.length,
      filename: filename || 'documento.pdf',
    });
  } catch (err: any) {
    console.error('Erro na extração do PDF de Vida e Ministério:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Falha ao processar e interpretar o documento PDF.',
    });
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
