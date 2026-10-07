process.env.DISABLE_HMR = 'true';

import http from 'http';
import express from 'express';
import webPush from 'web-push';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, createLogger } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './src/lib/vapidConfig.ts';
import {
  extractTextFromPdfBuffer,
  detectMonthsFromText,
  parseVidaMinisterioFromText,
  parseDesignacoesFromText,
  parseCampoFromText,
  parseDiscursosFromText,
  parseLimpezaFromText,
} from './src/lib/pdfParserHelper.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Web Push com as credenciais VAPID
webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Permitir payloads de até 30MB para importação segura de arquivos PDF base64
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

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

// Helper para processamento resiliente de programações congregacionais em PDF
async function handleParsePdfRequest(req: express.Request, res: express.Response, fallbackModulo?: string) {
  try {
    const rawBase64 = req.body.fileBase64 || req.body.pdfBase64 || '';
    const fileName = req.body.fileName || req.body.filename || 'programacao.pdf';
    const textManual = (req.body.textContent || '').trim();
    const modulo = req.body.modulo || fallbackModulo || 'vida-ministerio';

    if (!rawBase64 && !textManual) {
      return res.status(400).json({ success: false, error: 'Nenhum arquivo PDF ou texto foi enviado.' });
    }

    let cleanBase64 = '';
    let pdfBuffer: Buffer | null = null;
    let extractedText = '';

    if (rawBase64) {
      cleanBase64 = rawBase64.includes('base64,') ? rawBase64.split('base64,')[1] : rawBase64;
      try {
        pdfBuffer = Buffer.from(cleanBase64, 'base64');
        extractedText = await extractTextFromPdfBuffer(pdfBuffer);
      } catch (parseErr) {
        console.warn('[PDF] Falha ao extrair texto inicial do buffer:', parseErr);
      }
    }

    const fullText = (textManual ? `${textManual}\n${extractedText}` : extractedText).trim();

    // 1. Extração determinística imediata de alta confiabilidade
    let deterministicResult: any = null;
    if (modulo === 'vida-ministerio') {
      deterministicResult = parseVidaMinisterioFromText(fullText, fileName);
    } else if (modulo === 'designacoes') {
      deterministicResult = parseDesignacoesFromText(fullText, fileName);
    } else if (modulo === 'campo') {
      deterministicResult = parseCampoFromText(fullText, fileName);
    } else if (modulo === 'discursos') {
      deterministicResult = parseDiscursosFromText(fullText, fileName);
    } else if (modulo === 'limpeza') {
      deterministicResult = parseLimpezaFromText(fullText, fileName);
    }

    const hasDeterministicData =
      (modulo === 'vida-ministerio' && deterministicResult?.semanas?.length > 0) ||
      (modulo === 'designacoes' && deterministicResult?.escala?.length > 0) ||
      (modulo === 'campo' && deterministicResult?.programacao?.length > 0) ||
      (modulo === 'discursos' && deterministicResult?.discursos?.length > 0) ||
      (modulo === 'limpeza' && deterministicResult?.escalas?.length > 0);

    if (hasDeterministicData) {
      console.log(`[parse-pdf] Sucesso instantâneo via parser estruturado para ${modulo}!`);
      return res.json({
        success: true,
        modulo,
        ...deterministicResult,
        origem: 'parser-estruturado',
      });
    }

    // Função de limpeza para números de cântico
    const cleanSongNum = (val: any): number | string => {
      if (val === undefined || val === null) return '';
      if (typeof val === 'number') return val;
      const str = String(val).trim();
      const match = str.match(/\b\d+\b/);
      return match ? parseInt(match[0], 10) : str;
    };

    // 2. Se a chave da Gemini API estiver disponível, tenta refinamento inteligente
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const contentsList: any[] = [];
        if (cleanBase64) {
          contentsList.push({
            inlineData: { mimeType: 'application/pdf', data: cleanBase64 },
          });
        }
        if (fullText) {
          contentsList.push({
            text: `Conteúdo de texto extraído do documento:\n${fullText.slice(0, 15000)}`,
          });
        }

        let promptModulo = '';
        if (modulo === 'vida-ministerio') {
          promptModulo = `
Você é um assistente especialista na leitura do Formulário S-140-T e Apostila da Reunião Nossa Vida e Ministério Cristão das Testemunhas de Jeová.
Extraia todas as semanas de reunião contidas no documento.
Preste ATENÇÃO MÁXIMA na extração exata dos CÂNTICOS (inicial, do meio e final) e das ORAÇÕES (inicial e final).
Para CADA semana encontrada:
- id: Chave única (ex: "sem-2026-10-05")
- periodo: Período exato (ex: "5-11 DE OUTUBRO")
- dataReferencia: Início da semana ISO "YYYY-MM-DD" (ex: "2026-10-05")
- dataReuniao: Data da reunião (ex: "08/10/2026")
- leituraBiblica: Leitura bíblica (ex: "JEREMIAS 38-39")
- presidente: Nome do irmão presidente
- canticoInicial: Número do cântico inicial (ex: 74)
- oracaoInicial: Nome do irmão para oração inicial
- discursoTesourosTitulo: Título do discurso de 10 min
- discursoTesourosIrmao: Nome do irmão do discurso
- joiasEspirituaisTitulo: "Encontre joias espirituais"
- joiasEspirituaisIrmao: Nome do irmão das joias
- leituraBibliaIrmao: Nome do estudante da leitura da Bíblia
- partesMinisterio: Array com partes de Ministério [{ id: "pm-1", numero: 4, titulo: "...", tempoMin: 3, designado: "...", ajudante: "..." }]
- canticoMeio: Número do cântico do meio (ex: 128)
- partesVidaCrista: Array com partes de Nossa Vida Cristã [{ id: "pvc-1", numero: 8, titulo: "...", tempoMin: 15, designado: "..." }]
- estudoBiblicoDirigente: Nome do dirigente
- estudoBiblicoLeitor: Nome do leitor
- canticoFinal: Número do cântico final (ex: 143)
- oracaoFinal: Nome do irmão para oração final
Retorne EXCLUSIVAMENTE JSON no formato: { "meses": ["Outubro 2026"], "semanas": [...] }`;
        } else if (modulo === 'designacoes') {
          promptModulo = `
Você é um assistente especialista na leitura de escalas de reuniões congregacionais das Testemunhas de Jeová (Indicadores, Microfones Volantes, Som/Áudio e Vídeo, Leitor, Presidência).
Extraia todas as designações por reunião listadas:
Para CADA reunião:
- id: "desig-out-1"
- mes: "Outubro 2026"
- mesChave: "outubro"
- dia: Exibição do dia (ex: "Quinta-Feira 08/10", "Domingo 11/10")
- indicador: Nomes dos indicadores (ex: "Danilo / Hugo")
- microfone: Nomes nos microfones (ex: "Danilo Maia / Leandro")
- leitor: Leitor de Sentinela
- audio: Irmão no áudio/som
- video: Irmão no vídeo
- presidencia: Presidente da reunião
Retorne EXCLUSIVAMENTE JSON: { "meses": ["Outubro 2026"], "escala": [...] }`;
        } else if (modulo === 'campo') {
          promptModulo = `
Você é um assistente especialista na leitura de programações de Serviço de Campo das Testemunhas de Jeová.
Extraia todas as saídas de campo programadas:
Para CADA saída:
- id: "campo-out-1"
- data: "03/10/2026" ou "03/10"
- horario: Horário (ex: "08:00", "09:00", "15:30")
- pontoEncontro: Ponto de encontro (ex: "Salão do Reino", "Ponto dos Grupos")
- responsavel: Dirigente ou responsável
Retorne EXCLUSIVAMENTE JSON: { "meses": ["Outubro 2026"], "programacao": [...] }`;
        } else if (modulo === 'discursos') {
          promptModulo = `
Você é um assistente especialista na leitura de escalas de Discursos Públicos e Reuniões de Fim de Semana das Testemunhas de Jeová.
Extraia todos os discursos bíblicos programados:
Para CADA discurso:
- id: "disc-out-1"
- mes: "Outubro 2026"
- data: "04/10/2026" ou "04/10"
- tema: Título completo do discurso
- numeroTema: Número do esboço (ex: "185")
- orador: Nome do orador
- congregacaoOrador: Congregação (ex: "Vila Cisper")
- presidente: Nome do presidente
- leitor: Nome do leitor de A Sentinela
Retorne EXCLUSIVAMENTE JSON: { "meses": ["Outubro 2026"], "discursos": [...] }`;
        } else if (modulo === 'limpeza') {
          promptModulo = `
Você é um assistente especialista na leitura de escalas de limpeza de Salão do Reino das Testemunhas de Jeová.
Extraia todas as escalas de limpeza programadas:
Para CADA escala:
- id: "limp-out-1"
- mes: "Outubro 2026"
- mesChave: "outubro"
- dias: Intervalo de dias (ex: "7/11", "04/08", "21/25")
- diasSemana: "Quarta Feira e Domingo"
- grupo: "GRUPO 1", "GRUPO 2", etc.
- responsaveis: Nomes dos responsáveis (ex: "AIRTON E DHIEGO")
Retorne EXCLUSIVAMENTE JSON: { "meses": ["Outubro 2026"], "escalas": [...] }`;
        }

        contentsList.push({ text: promptModulo });

        const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
        for (const model of candidateModels) {
          try {
            console.log(`[parse-pdf] Processando documento com ${model}...`);
            const response = await ai.models.generateContent({
              model,
              contents: contentsList,
              config: {
                responseMimeType: 'application/json',
                abortSignal: AbortSignal.timeout(12000),
              },
            });

            const jsonText = response.text || '{}';
            let parsed: any;
            try {
              parsed = JSON.parse(jsonText);
            } catch {
              const cleaned = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
              const match = cleaned.match(/\{[\s\S]*\}/);
              if (match) parsed = JSON.parse(match[0]);
            }

            if (parsed) {
              if (modulo === 'vida-ministerio' && Array.isArray(parsed.semanas) && parsed.semanas.length > 0) {
                const semanasProcessadas = parsed.semanas.map((sem: any) => {
                  let canticoIni = cleanSongNum(sem.canticoInicial);
                  let oracaoIni = (sem.oracaoInicial || '').trim();
                  let canticoMeio = cleanSongNum(sem.canticoMeio);
                  let canticoFim = cleanSongNum(sem.canticoFinal);
                  let oracaoFim = (sem.oracaoFinal || '').trim();
                  let dataRef = (sem.dataReferencia || '').replace(/^2023-/, '2026-');
                  let semId = (sem.id || '').replace(/^sem-2023-/, 'sem-2026-');

                  return {
                    ...sem,
                    id: semId || sem.id,
                    dataReferencia: dataRef || sem.dataReferencia,
                    canticoInicial: canticoIni || sem.canticoInicial || '',
                    oracaoInicial: oracaoIni,
                    canticoMeio: canticoMeio || sem.canticoMeio || '',
                    canticoFinal: canticoFim || sem.canticoFinal || '',
                    oracaoFinal: oracaoFim,
                  };
                });
                return res.json({
                  success: true,
                  modulo,
                  meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : detectMonthsFromText(fullText, fileName),
                  semanas: semanasProcessadas,
                });
              } else if (modulo === 'designacoes' && Array.isArray(parsed.escala) && parsed.escala.length > 0) {
                return res.json({
                  success: true,
                  modulo,
                  meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : detectMonthsFromText(fullText, fileName),
                  escala: parsed.escala,
                });
              } else if (modulo === 'campo' && Array.isArray(parsed.programacao) && parsed.programacao.length > 0) {
                return res.json({
                  success: true,
                  modulo,
                  meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : detectMonthsFromText(fullText, fileName),
                  programacao: parsed.programacao,
                });
              } else if (modulo === 'discursos' && Array.isArray(parsed.discursos) && parsed.discursos.length > 0) {
                return res.json({
                  success: true,
                  modulo,
                  meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : detectMonthsFromText(fullText, fileName),
                  discursos: parsed.discursos,
                });
              } else if (modulo === 'limpeza' && Array.isArray(parsed.escalas) && parsed.escalas.length > 0) {
                return res.json({
                  success: true,
                  modulo,
                  meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : detectMonthsFromText(fullText, fileName),
                  escalas: parsed.escalas,
                });
              }
            }
          } catch (modelErr: any) {
            console.log(`[parse-pdf] Resposta temporária com ${model}:`, modelErr?.status || modelErr?.message);
          }
        }
      } catch (aiErr) {
        console.warn('[parse-pdf] Falha de IA, recorrendo ao parser determinístico:', aiErr);
      }
    }

    // 3. Fallback determinístico garantido se a IA falhar ou estiver com alta demanda
    if (deterministicResult) {
      if (modulo === 'vida-ministerio' && deterministicResult.semanas?.length > 0) {
        return res.json({
          success: true,
          modulo,
          meses: deterministicResult.meses,
          semanas: deterministicResult.semanas,
          origem: 'parser-estruturado',
        });
      } else if (modulo === 'designacoes' && deterministicResult.escala?.length > 0) {
        return res.json({
          success: true,
          modulo,
          meses: deterministicResult.meses,
          escala: deterministicResult.escala,
          origem: 'parser-estruturado',
        });
      } else if (modulo === 'campo' && deterministicResult.programacao?.length > 0) {
        return res.json({
          success: true,
          modulo,
          meses: deterministicResult.meses,
          programacao: deterministicResult.programacao,
          origem: 'parser-estruturado',
        });
      } else if (modulo === 'discursos' && deterministicResult.discursos?.length > 0) {
        return res.json({
          success: true,
          modulo,
          meses: deterministicResult.meses,
          discursos: deterministicResult.discursos,
          origem: 'parser-estruturado',
        });
      } else if (modulo === 'limpeza' && deterministicResult.escalas?.length > 0) {
        return res.json({
          success: true,
          modulo,
          meses: deterministicResult.meses,
          escalas: deterministicResult.escalas,
          origem: 'parser-estruturado',
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: `Não foi possível extrair a programação de ${modulo} do PDF. Verifique se o arquivo possui texto legível ou tente novamente.`,
    });
  } catch (err: any) {
    console.error('Erro geral no endpoint PDF:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Falha ao processar o arquivo PDF da programação.',
    });
  }
}

// Rotas da API para importação de programações congregacionais em PDF
app.post('/api/parse-schedule-pdf', (req, res) => handleParsePdfRequest(req, res));
app.post('/api/parse-s140t-pdf', (req, res) => handleParsePdfRequest(req, res, 'vida-ministerio'));
app.post('/api/parse-pdf', (req, res) => handleParsePdfRequest(req, res));

// Inicialização do servidor Vite / Estáticos
async function startServer() {
  if (!isProduction) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const customLogger = createLogger();
    const origError = customLogger.error;
    customLogger.error = (msg, options) => {
      if (typeof msg === 'string' && (msg.includes('WebSocket') || msg.includes('ws') || msg.includes('hmr') || msg.includes('vite-hmr') || msg.includes('[vite]'))) return;
      origError(msg, options);
    };
    const origWarn = customLogger.warn;
    customLogger.warn = (msg, options) => {
      if (typeof msg === 'string' && (msg.includes('WebSocket') || msg.includes('ws') || msg.includes('hmr') || msg.includes('vite-hmr') || msg.includes('[vite]'))) return;
      origWarn(msg, options);
    };

    const vite = await createViteServer({
      customLogger,
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
