process.env.DISABLE_HMR = 'true';

import http from 'http';
import express from 'express';
import webPush from 'web-push';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer, createLogger } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from './src/lib/vapidConfig.ts';

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

// Endpoint para importação e leitura de programações congregacionais em formato PDF
app.post('/api/parse-schedule-pdf', async (req, res) => {
  try {
    const { fileBase64, fileName, modulo } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ success: false, error: 'Arquivo PDF não enviado.' });
    }

    const cleanBase64 = fileBase64.includes('base64,')
      ? fileBase64.split('base64,')[1]
      : fileBase64;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Chave de processamento inteligente não configurada no servidor.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const pdfPart = {
      inlineData: {
        mimeType: 'application/pdf',
        data: cleanBase64,
      },
    };

    // Helper resiliente com tentativas (retries) e fallback entre modelos para evitar erros temporários de sobrecarga (503)
    async function executePromptWithFallback(prompt: string) {
      // Prioriza gemini-3.1-flash-lite por sua altíssima velocidade e disponibilidade, com fallback para gemini-3.8-flash e gemini-flash-latest
      const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let lastErr: any = null;
      const totalAttempts = 6;

      for (let attempt = 0; attempt < totalAttempts; attempt++) {
        const model = candidateModels[attempt % candidateModels.length];
        try {
          console.log(`[parse-schedule-pdf] Processando documento com ${model} (tentativa ${attempt + 1}/${totalAttempts})...`);
          const response = await ai.models.generateContent({
            model,
            contents: [pdfPart, { text: prompt }],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const jsonText = response.text || '{}';
          let parsed: any;
          try {
            parsed = JSON.parse(jsonText);
          } catch {
            const cleaned = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (match) {
              parsed = JSON.parse(match[0]);
            } else {
              throw new Error('Falha ao interpretar a estrutura JSON do documento.');
            }
          }
          return parsed;
        } catch (err: any) {
          lastErr = err;
          const statusOrCode = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 'indisponivel');
          console.log(`[parse-schedule-pdf] Resposta temporária com ${model} (${statusOrCode}). Alternando modelo...`);
          if (attempt < totalAttempts - 1) {
            const delay = Math.min(1000 * Math.pow(1.3, attempt) + Math.floor(Math.random() * 500), 3500);
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      const errMsg = lastErr?.message || '';
      if (
        errMsg.includes('503') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE')
      ) {
        throw new Error(
          'Os servidores de inteligência artificial estão temporariamente com alta demanda no momento. Por favor, clique em "Tentar novamente" em instantes.'
        );
      }
      throw lastErr || new Error('Falha ao processar o arquivo PDF com inteligência artificial.');
    }

    if (modulo === 'vida-ministerio') {
      const promptText = `
Você é um assistente especialista na leitura de documentos oficiais e formulários das Testemunhas de Jeová.
O documento PDF anexado contém a programação da Reunião Nossa Vida e Ministério Cristão (Formulário S-140-T, Apostila da Reunião ou folha de designações mensais da congregação).

Analise o PDF completo página por página e extraia detalhadamente todas as semanas de reunião nele contidas.
Preste ATENÇÃO MÁXIMA na extração exata dos CÂNTICOS (inicial, do meio e final) e das ORAÇÕES (inicial e final), pois eles são fundamentais na reunião.

Para CADA semana encontrada no PDF, extraia rigorosamente:
- id: Uma chave única baseada na data de referência (ex: "sem-2026-10-05" ou similar)
- periodo: Texto exato do período da semana (ex: "5-11 DE OUTUBRO", "12-18 DE OUTUBRO", etc.)
- dataReferencia: Data de início da semana em formato ISO "YYYY-MM-DD" (ex: "2026-10-05")
- dataReuniao: Data da reunião no meio de semana se informada (ex: "08/10/2026" ou "Quinta-feira, 8 de Outubro")
- leituraBiblica: Texto da leitura bíblica semanal (ex: "JEREMIAS 38-39")
- ehVisita: Booleano true apenas se for semana de visita do superintendente de circuito
- presidente: Nome do irmão presidente da reunião (ex: "Marcelo F.")

- canticoInicial: Número do CÂNTICO INICIAL da reunião (ex: 1, 74, 88). No PDF geralmente aparece como "Cântico 74 e oração", "Cântico inicial: 74", "Cântico: 74" ou "Cant. 74". Extraia apenas o número inteiro (ex: 74) ou texto limpo.
- oracaoInicial: Nome exato do irmão designado para a ORAÇÃO INICIAL (ex: "Marcelo F."). Procure no cabeçalho da semana, na linha "Oração inicial", "Oração de abertura", ou na indicação ao lado do Presidente ou após "Cântico XX e oração: [Nome]". Se a escala indicar que o Presidente profere a oração inicial, extraia o nome do Presidente. NUNCA deixe em branco se houver qualquer irmão designado.
- comentariosIniciaisMin: 1

- tesourosSalao: "Salão principal"
- discursoTesourosTitulo: Título do discurso de 10 minutos de Tesouros da Palavra de Deus
- discursoTesourosIrmao: Nome do irmão designado para o discurso
- discursoTesourosTempoMin: 10
- joiasEspirituaisTitulo: Título da parte de Joias Espirituais (padrão: "Encontre joias espirituais")
- joiasEspirituaisIrmao: Nome do irmão designado para as joias espirituais
- joiasEspirituaisTempoMin: 10
- leituraBibliaIrmao: Nome do estudante designado para a leitura da Bíblia
- leituraBibliaTempoMin: 4

- ministerioSalao: "Salão principal"
- partesMinisterio: Array com as designações da seção 'Faça Seu Melhor no Ministério'. Para cada parte:
  - id: Identificador único curto (ex: "pm-1", "pm-2")
  - numero: Número da parte conforme na apostila (ex: 4, 5, 6, 7)
  - titulo: Título da parte (ex: "Iniciando conversas", "Cultivando o interesse", "Fazendo discípulos", "Discurso")
  - tempoMin: Minutos da parte (ex: 3, 4, 5, 6)
  - designado: Nome do estudante titular
  - ajudante: Nome do ajudante (ou string vazia se não houver ajudante)
  - salao: "Salão principal"

- canticoMeio: Número do CÂNTICO DO MEIO da reunião (ex: 128, 121, 62). Localizado entre o final de 'Faça Seu Melhor no Ministério' e o início de 'Nossa Vida Cristã'. Aparece como "Cântico 128", "Cântico do meio: 128", ou na primeira linha de Nossa Vida Cristã. Extraia apenas o número inteiro ou texto limpo.

- partesVidaCrista: Array com as partes da seção 'Nossa Vida Cristã'. Para cada parte:
  - id: Identificador único curto (ex: "pvc-1", "pvc-2")
  - numero: Número da parte
  - titulo: Título da parte
  - tempoMin: Minutos da parte (ex: 15, 10)
  - designado: Nome do irmão designado
- estudoBiblicoTempoMin: 30
- estudoBiblicoDirigente: Nome do irmão dirigente do Estudo Bíblico de Congregação
- estudoBiblicoLeitor: Nome do irmão leitor do Estudo Bíblico de Congregação
- comentariosFinaisMin: 3

- canticoFinal: Número do CÂNTICO FINAL / de encerramento da reunião (ex: 143, 28, 150). Aparece no final do programa da semana após o Estudo Bíblico de Congregação, como "Cântico 143 e oração", "Cântico final: 143" ou "Cant. 143". Extraia apenas o número inteiro ou texto limpo.
- oracaoFinal: Nome exato do irmão designado para a ORAÇÃO FINAL / de encerramento (ex: "Wilmar M.", "Pedro Mendes"). Procure na linha "Oração final", "Oração de encerramento", ou após "Cântico XX e oração: [Nome]". NUNCA deixe em branco se houver irmão designado.
- observacoesGerais: Observações adicionais se houver

Extraia também uma lista dos nomes dos meses identificados no documento (ex: ["Outubro 2026"]).
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON, na seguinte estrutura:
{
  "meses": ["Outubro 2026"],
  "semanas": [
    ...
  ]
}
`;

      const parsed = await executePromptWithFallback(promptText);

      // Função auxiliar para limpar e extrair número puro de cântico
      const cleanSongNum = (val: any): number | string => {
        if (val === undefined || val === null) return '';
        if (typeof val === 'number') return val;
        const str = String(val).trim();
        const match = str.match(/\b\d+\b/);
        if (match) {
          const n = parseInt(match[0], 10);
          return isNaN(n) ? str : n;
        }
        return str;
      };

      // Pós-processamento refinado para garantir que cânticos e orações não sejam perdidos
      const rawSemanas = Array.isArray(parsed.semanas) ? parsed.semanas : [];
      const semanasProcessadas = rawSemanas.map((sem: any) => {
        let canticoIni = cleanSongNum(sem.canticoInicial);
        let oracaoIni = (sem.oracaoInicial || '').trim();
        let canticoMeio = cleanSongNum(sem.canticoMeio);
        let canticoFim = cleanSongNum(sem.canticoFinal);
        let oracaoFim = (sem.oracaoFinal || '').trim();

        // Se o modelo incluiu a oração no campo de cântico inicial (ex: "Cântico 74 e oração: Carlos")
        if (typeof sem.canticoInicial === 'string') {
          const matchOracao = sem.canticoInicial.match(/ora[çc][ãa]o\s*[:\-]?\s*([^,\.\n]+)/i);
          if (matchOracao && matchOracao[1] && !oracaoIni) {
            oracaoIni = matchOracao[1].trim();
          }
        }

        // Se o modelo incluiu a oração no campo de cântico final (ex: "Cântico 143 e oração: Wilmar M.")
        if (typeof sem.canticoFinal === 'string') {
          const matchOracao = sem.canticoFinal.match(/ora[çc][ãa]o\s*[:\-]?\s*([^,\.\n]+)/i);
          if (matchOracao && matchOracao[1] && !oracaoFim) {
            oracaoFim = matchOracao[1].trim();
          }
        }

        // Caso a oração inicial esteja vazia mas o presidente estiver preenchido com anotação de oração
        if (!oracaoIni && sem.presidente) {
          if (/ora[çc][ãa]o/i.test(sem.presidente)) {
            oracaoIni = sem.presidente.replace(/\s*\(.*?\)/g, '').trim();
          }
        }

        return {
          ...sem,
          canticoInicial: canticoIni || sem.canticoInicial || '',
          oracaoInicial: oracaoIni,
          canticoMeio: canticoMeio || sem.canticoMeio || '',
          canticoFinal: canticoFim || sem.canticoFinal || '',
          oracaoFinal: oracaoFim,
        };
      });

      return res.json({
        success: true,
        modulo: 'vida-ministerio',
        meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : ['Mês Detectado'],
        semanas: semanasProcessadas,
      });
    } else if (modulo === 'designacoes') {
      const promptText = `
Você é um assistente especialista na leitura de escalas de reuniões das Testemunhas de Jeová.
O documento PDF anexado contém a escala de designações congregacionais (Indicadores, Microfones Volantes, Leitor, Som/Áudio e Vídeo, Presidência).

Analise o PDF e extraia todas as reuniões e designações listadas:
Para CADA reunião/data:
- id: Identificador único curto (ex: "desig-out-1")
- mes: Nome do mês e ano (ex: "Outubro 2026")
- mesChave: Nome do mês em minúsculo sem acento (ex: "outubro")
- dia: Texto de exibição do dia da reunião (ex: "Quinta-Feira 08/10", "Domingo 11/10")
- indicador: Nomes dos irmãos indicadores (ex: "Danilo Cardoso / Hugo")
- microfone: Nomes dos irmãos no microfone volante (ex: "Danilo Maia / Leandro")
- leitor: Nome do irmão leitor (se constar, ou "")
- audio: Nome do irmão responsável pelo áudio/som
- video: Nome do irmão responsável pelo vídeo
- presidencia: Nome do presidente da reunião (se constar na escala, ou "")
- observacao: Observações (ex: "Assembleia", "Visita", etc., ou "")
- ehEspecial: Booleano true se for assembleia, congresso ou reunião especial

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON, na seguinte estrutura:
{
  "meses": ["Outubro 2026"],
  "escala": [
    ...
  ]
}
`;

      const parsed = await executePromptWithFallback(promptText);

      return res.json({
        success: true,
        modulo: 'designacoes',
        meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : ['Mês Detectado'],
        escala: Array.isArray(parsed.escala) ? parsed.escala : [],
      });
    } else if (modulo === 'campo') {
      const promptText = `
Você é um assistente especialista na leitura de escalas e programações congregacionais das Testemunhas de Jeová.
O documento PDF anexado contém a programação do Serviço de Campo (saídas de campo para pregação, testemunho público e ministério).

Analise o PDF completo e extraia todas as saídas de campo programadas:
Para CADA saída/data encontrada:
- id: Identificador único curto (ex: "campo-out-1", "campo-out-2")
- data: Data no formato "DD/MM/YYYY" ou "DD/MM" (ex: "03/10/2026" ou "03/10")
- horario: Horário da saída (ex: "08:00", "09:00", "09:15", "15:30"). Se não houver horário especificado na escala, use "08:00" como padrão.
- pontoEncontro: Ponto de encontro ou local de saída (ex: "Salão do Reino", "Ponto dos Grupos", ou endereço citado). Se não informado, use "Salão do Reino".
- responsavel: Nome do irmão dirigente ou responsável pela saída (ex: "Dhiego", "Marcelo", "Superintendente do Grupo").

Extraia também uma lista dos nomes dos meses identificados no documento (ex: ["Outubro 2026"]).
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON, na seguinte estrutura:
{
  "meses": ["Outubro 2026"],
  "programacao": [
    ...
  ]
}
`;

      const parsed = await executePromptWithFallback(promptText);

      return res.json({
        success: true,
        modulo: 'campo',
        meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : ['Mês Detectado'],
        programacao: Array.isArray(parsed.programacao) ? parsed.programacao : [],
      });
    } else if (modulo === 'discursos') {
      const promptText = `
Você é um assistente especialista na leitura de escalas de Discursos Públicos e Reuniões de Fim de Semana das Testemunhas de Jeová.
O documento PDF anexado contém a programação de Discursos Bíblicos / Discursos Públicos da congregação.

Analise o PDF completo e extraia todos os discursos bíblicos programados:
Para CADA discurso/data:
- id: Identificador único curto (ex: "disc-out-1", "disc-out-2")
- mes: Nome do mês e ano (ex: "Outubro 2026" ou "Outubro")
- data: Data no formato "DD/MM/YYYY" ou "DD/MM" (ex: "04/10/2026" ou "04/10")
- tema: Título completo ou tema do discurso bíblico (ex: "Apeguem-se à sua integridade", "Onde encontrar ajuda em tempos de aflição?")
- numeroTema: Número do tema ou esboço do discurso bíblico se constar (ex: "185", "34", ou "")
- orador: Nome do orador designado (ex: "Carlos Alberto", "Orador Local", "Visitante")
- congregacaoOrador: Congregação de origem do orador se informada (ex: "Vila Cisper", "Jardim Danfer", ou "")
- presidente: Nome do irmão presidente da reunião se constar na escala (ou "")
- leitor: Nome do irmão leitor de A Sentinela se constar na escala (ou "")
- observacao: Observações se houver (ex: "Visita do Superintendente de Circuito", "Assembleia", ou "")

Extraia também uma lista dos nomes dos meses identificados no documento (ex: ["Outubro 2026"]).
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON, na seguinte estrutura:
{
  "meses": ["Outubro 2026"],
  "discursos": [
    ...
  ]
}
`;

      const parsed = await executePromptWithFallback(promptText);

      return res.json({
        success: true,
        modulo: 'discursos',
        meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : ['Mês Detectado'],
        discursos: Array.isArray(parsed.discursos) ? parsed.discursos : [],
      });
    } else if (modulo === 'limpeza') {
      const promptText = `
Você é um assistente especialista na leitura de escalas de limpeza e conservação de Salões do Reino das Testemunhas de Jeová.
O documento PDF anexado contém a escala de grupos de limpeza congregacional.

Analise o PDF completo e extraia todas as escalas de limpeza programadas:
Para CADA escala/semana:
- id: Identificador único curto (ex: "limp-out-1", "limp-out-2")
- mes: Nome do mês (ex: "Outubro" ou "Outubro 2026")
- mesChave: Nome do mês em minúsculo sem acento (ex: "outubro")
- dias: Intervalo de dias ou dia da limpeza (ex: "7/11", "14/18", "04/08", "21/25" ou "04")
- diasSemana: Dias das reuniões ou frequência (ex: "Quarta Feira e Domingo" ou "Quinta Feira e Domingo")
- grupo: Nome ou número do grupo encarregado (ex: "GRUPO 1", "GRUPO 2", "GRUPO 3", "GRUPO 4")
- responsaveis: Nomes dos irmãos responsáveis ou superintendentes do grupo (ex: "AIRTON E DHIEGO", "SAMUEL E GEOVANE")
- observacao: Observações se houver (ex: "Assembleia", "Limpeza Geral", ou "")
- ehEspecial: Booleano true se for limpeza geral especial, assembleia ou congresso

Extraia também uma lista dos nomes dos meses identificados no documento (ex: ["Outubro 2026"]).
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON, na seguinte estrutura:
{
  "meses": ["Outubro 2026"],
  "escalas": [
    ...
  ]
}
`;

      const parsed = await executePromptWithFallback(promptText);

      return res.json({
        success: true,
        modulo: 'limpeza',
        meses: Array.isArray(parsed.meses) && parsed.meses.length > 0 ? parsed.meses : ['Mês Detectado'],
        escalas: Array.isArray(parsed.escalas) ? parsed.escalas : [],
      });
    } else {
      return res.status(400).json({ success: false, error: 'Módulo de importação não suportado para PDF.' });
    }
  } catch (err: any) {
    console.error('Erro no processamento do PDF:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao processar o arquivo PDF da programação.',
    });
  }
});

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
