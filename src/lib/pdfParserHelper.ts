import { PDFParse } from 'pdf-parse';

// Lista canônica de nomes dos meses em português
export const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function normalizarTexto(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai texto bruto diretamente dos bytes do PDF usando pdf-parse
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const parser: any = new (PDFParse as any)(new Uint8Array(buffer));
    if (typeof parser.load === 'function') {
      await parser.load();
    }
    const textRes: any = typeof parser.getText === 'function' ? await parser.getText() : '';
    if (typeof textRes === 'string') return textRes.trim();
    if (textRes && typeof textRes.text === 'string') return String(textRes.text).trim();
    return '';
  } catch (err: any) {
    console.warn('[pdfParserHelper] Falha ao extrair texto com PDFParse:', err?.message || err);
    return '';
  }
}

/**
 * Detecta meses citados no texto ou no nome do arquivo
 */
export function detectMonthsFromText(text: string, fileName?: string): string[] {
  const detectados = new Set<string>();
  const combined = `${fileName || ''}\n${text}`;
  const tNorm = normalizarTexto(combined);

  for (let i = 0; i < MESES_NOMES.length; i++) {
    const nomeNorm = normalizarTexto(MESES_NOMES[i]);
    if (tNorm.includes(nomeNorm)) {
      // Tenta achar o ano próximo ao mês (ex: Outubro 2026)
      const regexAno = new RegExp(`${nomeNorm}[^\\d]{0,10}(202\\d)`, 'i');
      const matchAno = tNorm.match(regexAno);
      const ano = matchAno ? matchAno[1] : '2026';
      detectados.add(`${MESES_NOMES[i]} ${ano}`);
    }
  }

  if (detectados.size === 0) {
    // Tenta achar datas numéricas (ex: 10/2026)
    const matchMesNum = tNorm.match(/(?:^|\D)(0?[1-9]|1[0-2])[\/\-](202\d)(?:\D|$)/);
    if (matchMesNum) {
      const idx = parseInt(matchMesNum[1], 10) - 1;
      const ano = matchMesNum[2];
      detectados.add(`${MESES_NOMES[idx]} ${ano}`);
    }
  }

  if (detectados.size === 0) {
    const mesAtual = new Date().getMonth();
    detectados.add(`${MESES_NOMES[mesAtual]} 2026`);
  }

  return Array.from(detectados);
}

// ============================================================================
// 1. PARSER DETERMINÍSTICO PARA VIDA E MINISTÉRIO (S-140-T E APOSTILA)
// ============================================================================

export function parseVidaMinisterioFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const semanas: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Divide o texto em blocos semanais
  // Padrões de semanas: "5-11 DE OUTUBRO", "5-11 de Outubro", "SEMANA DE 5 A 11", etc.
  const regexInicioSemana =
    /(?:^|\b)(\d{1,2}\s*[\-–aA]\s*\d{1,2}\s+de\s+[a-zç]+(?:\s+de\s+\d{4})?|\d{1,2}\s*[\-–]\s*\d{1,2}\s+[A-ZÇ]+)/i;

  interface BlocoSemana {
    periodo: string;
    linhas: string[];
  }

  const blocos: BlocoSemana[] = [];
  let blocoAtual: BlocoSemana | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(regexInicioSemana);

    // Também verifica se a linha tem indicação explícita como "Semana:" ou data bíblica
    if (match && !/c[âa]ntico/i.test(line) && !/discurso/i.test(line)) {
      if (blocoAtual && blocoAtual.linhas.length > 0) {
        blocos.push(blocoAtual);
      }
      blocoAtual = {
        periodo: match[1].toUpperCase(),
        linhas: [line],
      };
    } else if (blocoAtual) {
      blocoAtual.linhas.push(line);
    }
  }

  if (blocoAtual && blocoAtual.linhas.length > 0) {
    blocos.push(blocoAtual);
  }

  // Se não encontrou blocos por título de semana, tenta blocos por Cântico inicial ou cria bloco único
  if (blocos.length === 0 && lines.length > 0) {
    blocos.push({
      periodo: lines[0].slice(0, 40) || 'Programação Semanal',
      linhas: lines,
    });
  }

  // Processa cada bloco semanal
  blocos.forEach((bloco, idx) => {
    const textoBloco = bloco.linhas.join('\n');

    // 1. Período e Data de Referência
    const periodo = bloco.periodo.toUpperCase();
    let dataReferencia = '2026-10-05';

    // Extrai o primeiro número de dia e o mês para montar YYYY-MM-DD
    const matchDia = periodo.match(/(\d{1,2})/);
    const diaNum = matchDia ? parseInt(matchDia[1], 10) : (idx + 1) * 7;
    let mesNum = 10;
    for (let m = 0; m < MESES_NOMES.length; m++) {
      if (normalizarTexto(periodo).includes(normalizarTexto(MESES_NOMES[m]))) {
        mesNum = m + 1;
        break;
      }
    }
    const diaStr = String(diaNum).padStart(2, '0');
    const mesStr = String(mesNum).padStart(2, '0');
    dataReferencia = `2026-${mesStr}-${diaStr}`;

    // 2. Leitura Bíblica
    let leituraBiblica = '';
    const matchLeitura = textoBloco.match(
      /(?:leitura\s+b[íi]blica|leitura|livro|bíblia)[\s:]*([A-ZÇ\d\s\-–]+(?:\d+[\-–\d]*))/i
    ) || textoBloco.match(/\b([A-ZÇ]{3,15}\s+\d+[\-–\d]*)\b/);
    if (matchLeitura && matchLeitura[1]) {
      leituraBiblica = matchLeitura[1].trim();
    }

    // 3. Cânticos (inicial, meio, final)
    const canticosEncontrados: number[] = [];
    const regexCantico = /(?:c[âa]ntico|cant\.?)\s*(\d{1,3})/gi;
    let mCant: RegExpExecArray | null;
    while ((mCant = regexCantico.exec(textoBloco)) !== null) {
      const num = parseInt(mCant[1], 10);
      if (num > 0 && num <= 160 && !canticosEncontrados.includes(num)) {
        canticosEncontrados.push(num);
      }
    }

    const canticoInicial = canticosEncontrados[0] || '';
    const canticoMeio = canticosEncontrados[1] || '';
    const canticoFinal = canticosEncontrados[2] || canticosEncontrados[canticosEncontrados.length - 1] || '';

    // 4. Orações e Presidente
    let presidente = '';
    let oracaoInicial = '';
    let oracaoFinal = '';

    const matchPres = textoBloco.match(/(?:presidente|presid[êe]ncia)[\s:]*([A-Za-zÀ-ÿ\s\.\-]+?)(?:\n|$|,|\()/i);
    if (matchPres && matchPres[1]) {
      presidente = matchPres[1].trim();
    }

    const matchOracaoIni = textoBloco.match(/(?:ora[çc][ãa]o\s+inicial|ora[çc][ãa]o\s+de\s+abertura)[\s:]*([A-Za-zÀ-ÿ\s\.\-]+?)(?:\n|$|,|\()/i);
    if (matchOracaoIni && matchOracaoIni[1]) {
      oracaoInicial = matchOracaoIni[1].trim();
    } else if (presidente) {
      oracaoInicial = presidente;
    }

    const matchOracaoFim = textoBloco.match(/(?:ora[çc][ãa]o\s+final|ora[çc][ãa]o\s+de\s+encerramento)[\s:]*([A-Za-zÀ-ÿ\s\.\-]+?)(?:\n|$|,|\()/i);
    if (matchOracaoFim && matchOracaoFim[1]) {
      oracaoFinal = matchOracaoFim[1].trim();
    }

    // 5. Partes de Tesouros
    let discursoTesourosTitulo = 'Tesouros da Palavra de Deus';
    let discursoTesourosIrmao = '';
    let joiasEspirituaisIrmao = '';
    let leituraBibliaIrmao = '';

    const matchTesouros = textoBloco.match(/(?:1\.\s*|discurso[:\s]*)([^\n\(\)]+)\s*\(\s*10\s*min\s*\)[\s:\-]*([A-Za-zÀ-ÿ\s\.\-]+)?/i);
    if (matchTesouros) {
      if (matchTesouros[1]) discursoTesourosTitulo = matchTesouros[1].trim();
      if (matchTesouros[2]) discursoTesourosIrmao = matchTesouros[2].trim();
    }

    const matchJoias = textoBloco.match(/(?:2\.\s*|joias\s+espirituais[:\s]*)([^\n\(\)]+)?\s*\(\s*10\s*min\s*\)[\s:\-]*([A-Za-zÀ-ÿ\s\.\-]+)?/i);
    if (matchJoias && matchJoias[2]) {
      joiasEspirituaisIrmao = matchJoias[2].trim();
    }

    const matchLeituraB = textoBloco.match(/(?:3\.\s*|leitura\s+da\s+b[íi]blia[:\s]*)([^\n\(\)]+)?\s*\(\s*4\s*min\s*\)[\s:\-]*([A-Za-zÀ-ÿ\s\.\-]+)?/i);
    if (matchLeituraB && matchLeituraB[2]) {
      leituraBibliaIrmao = matchLeituraB[2].trim();
    }

    // 6. Faça Seu Melhor no Ministério
    const partesMinisterio: any[] = [];
    const regexParteMin = /(\d+)\.\s*([^\n\(\)]+?)\s*\(\s*(\d{1,2})\s*min\s*\)[\s:\-]*([A-Za-zÀ-ÿ\s\.\-\/]+)?/gi;
    let mParte: RegExpExecArray | null;
    let pIdx = 1;
    while ((mParte = regexParteMin.exec(textoBloco)) !== null) {
      const num = parseInt(mParte[1], 10);
      const titulo = mParte[2].trim();
      const tempo = parseInt(mParte[3], 10);
      const respBruto = mParte[4] ? mParte[4].trim() : '';

      // Separa titular e ajudante (ex: "Carlos / Pedro" ou "Maria e Ana")
      let designado = respBruto;
      let ajudante = '';
      if (respBruto.includes('/')) {
        const parts = respBruto.split('/');
        designado = parts[0].trim();
        ajudante = parts[1].trim();
      } else if (/\s+e\s+/i.test(respBruto)) {
        const parts = respBruto.split(/\s+e\s+/i);
        designado = parts[0].trim();
        ajudante = parts[1].trim();
      }

      if (num >= 4 && num <= 7) {
        partesMinisterio.push({
          id: `pm-${pIdx++}`,
          numero: num,
          titulo: titulo || `Designação ${num}`,
          tempoMin: tempo || 4,
          designado: designado || '',
          ajudante: ajudante || '',
          salao: 'Salão principal',
        });
      }
    }

    // Se não encontrou partes 4-7 estruturadas, cria as partes padrão da reunião
    if (partesMinisterio.length === 0) {
      partesMinisterio.push(
        { id: 'pm-1', numero: 4, titulo: 'Iniciando conversas', tempoMin: 3, designado: '', ajudante: '', salao: 'Salão principal' },
        { id: 'pm-2', numero: 5, titulo: 'Cultivando o interesse', tempoMin: 4, designado: '', ajudante: '', salao: 'Salão principal' },
        { id: 'pm-3', numero: 6, titulo: 'Fazendo discípulos', tempoMin: 5, designado: '', ajudante: '', salao: 'Salão principal' }
      );
    }

    // 7. Nossa Vida Cristã e Estudo Bíblico
    const partesVidaCrista: any[] = [];
    let estudoBiblicoDirigente = '';
    let estudoBiblicoLeitor = '';

    const matchEstudo = textoBloco.match(/(?:estudo\s+b[íi]blico(?:\s+de\s+congrega[çc][ãa]o)?)[\s:]*([^\n]+)/i);
    if (matchEstudo && matchEstudo[1]) {
      const resp = matchEstudo[1].trim();
      if (resp.includes('/')) {
        const parts = resp.split('/');
        estudoBiblicoDirigente = parts[0].trim();
        estudoBiblicoLeitor = parts[1].trim();
      } else {
        estudoBiblicoDirigente = resp;
      }
    }

    semanas.push({
      id: `sem-${dataReferencia}`,
      periodo: periodo || `Semana ${idx + 1}`,
      dataReferencia,
      dataReuniao: `${diaStr}/${mesStr}/2026`,
      leituraBiblica: leituraBiblica || 'LEITURA SEMANAL',
      ehVisita: /visita|circuito/i.test(textoBloco),
      presidente: presidente || '',
      canticoInicial: canticoInicial || '',
      oracaoInicial: oracaoInicial || '',
      comentariosIniciaisMin: 1,
      tesourosSalao: 'Salão principal',
      discursoTesourosTitulo: discursoTesourosTitulo || 'Tesouros da Palavra',
      discursoTesourosIrmao: discursoTesourosIrmao || '',
      discursoTesourosTempoMin: 10,
      joiasEspirituaisTitulo: 'Encontre joias espirituais',
      joiasEspirituaisIrmao: joiasEspirituaisIrmao || '',
      joiasEspirituaisTempoMin: 10,
      leituraBibliaIrmao: leituraBibliaIrmao || '',
      leituraBibliaTempoMin: 4,
      ministerioSalao: 'Salão principal',
      partesMinisterio,
      canticoMeio: canticoMeio || '',
      partesVidaCrista,
      estudoBiblicoTempoMin: 30,
      estudoBiblicoDirigente: estudoBiblicoDirigente || '',
      estudoBiblicoLeitor: estudoBiblicoLeitor || '',
      comentariosFinaisMin: 3,
      canticoFinal: canticoFinal || '',
      oracaoFinal: oracaoFinal || '',
      observacoesGerais: '',
    });
  });

  return { meses, semanas };
}

// ============================================================================
// 2. PARSER DETERMINÍSTICO PARA DESIGNAÇÕES
// ============================================================================

export function parseDesignacoesFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const escala: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Procura linhas com datas: "08/10", "Quinta-feira 08/10", "11/10", "Domingo 11/10"
  const regexData = /(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)/;

  let currentItem: any = null;
  let idx = 0;

  for (const line of lines) {
    const matchData = line.match(regexData);
    const temDiaSemana = /quinta|domingo|s[áa]bado|quarta|ter[çc]a/i.test(line);

    if (matchData && (temDiaSemana || line.length < 50)) {
      if (currentItem) {
        escala.push(currentItem);
      }
      const dataStr = matchData[1];
      const diaTexto = temDiaSemana ? line : `Reunião ${dataStr}`;
      currentItem = {
        id: `desig-pdf-${Date.now()}-${idx++}`,
        mes: meses[0] || 'Outubro 2026',
        mesChave: normalizarTexto(meses[0] || 'outubro').split(' ')[0],
        dia: diaTexto,
        indicador: '',
        microfone: '',
        leitor: '',
        audio: '',
        video: '',
        presidencia: '',
        observacao: '',
        ehEspecial: /assembleia|congresso|especial/i.test(line),
      };
      continue;
    }

    if (currentItem) {
      if (/indicador/i.test(line)) {
        currentItem.indicador = line.replace(/indicador(?:es)?[:\s]*/i, '').trim();
      } else if (/microfone/i.test(line)) {
        currentItem.microfone = line.replace(/microfone(?:s)?[:\s]*/i, '').trim();
      } else if (/leitor/i.test(line)) {
        currentItem.leitor = line.replace(/leitor[:\s]*/i, '').trim();
      } else if (/[áa]udio|som/i.test(line)) {
        currentItem.audio = line.replace(/(?:[áa]udio|som)[:\s]*/i, '').trim();
      } else if (/v[íi]deo/i.test(line)) {
        currentItem.video = line.replace(/v[íi]deo[:\s]*/i, '').trim();
      } else if (/presidente|presid[êe]ncia/i.test(line)) {
        currentItem.presidencia = line.replace(/(?:presidente|presid[êe]ncia)[:\s]*/i, '').trim();
      }
    }
  }

  if (currentItem) {
    escala.push(currentItem);
  }

  return { meses, escala };
}

// ============================================================================
// 3. PARSER DETERMINÍSTICO PARA SERVIÇO DE CAMPO
// ============================================================================

export function parseCampoFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const programacao: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const regexData = /(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)/;
  let idx = 0;

  for (const line of lines) {
    const matchData = line.match(regexData);
    if (matchData) {
      // Extrai horário se presente (ex: "08:00", "09:00", "09h00")
      const matchHora = line.match(/(\d{1,2})[:h](\d{2})/i);
      const horario = matchHora ? `${matchHora[1].padStart(2, '0')}:${matchHora[2]}` : '08:00';

      // Ponto de encontro
      let pontoEncontro = 'Salão do Reino';
      if (/ponto\s+dos\s+grupos/i.test(line)) pontoEncontro = 'Ponto dos Grupos';
      else if (/pra[çc]a|coreto/i.test(line)) pontoEncontro = 'Praça';

      // Responsável
      let responsavel = '';
      const matchResp = line.match(/(?:dirigente|respons[áa]vel|irm[ãa]o)[:\s]*([A-Za-zÀ-ÿ\s]+)/i);
      if (matchResp) {
        responsavel = matchResp[1].trim();
      } else {
        // Pega as últimas palavras da linha se não tiver rótulo
        const partes = line.split(/[\-\–\|]/);
        if (partes.length > 1) {
          responsavel = partes[partes.length - 1].trim();
        }
      }

      programacao.push({
        id: `campo-pdf-${Date.now()}-${idx++}`,
        data: matchData[1],
        horario,
        pontoEncontro,
        responsavel: responsavel || 'Dirigente Designado',
      });
    }
  }

  return { meses, programacao };
}

// ============================================================================
// 4. PARSER DETERMINÍSTICO PARA DISCURSO PÚBLICO
// ============================================================================

export function parseDiscursosFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const discursos: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const regexData = /(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)/;
  let currentItem: any = null;
  let idx = 0;

  for (const line of lines) {
    const matchData = line.match(regexData);
    if (matchData && (line.length < 60 || /domingo|s[áa]bado/i.test(line))) {
      if (currentItem) {
        discursos.push(currentItem);
      }
      currentItem = {
        id: `disc-pdf-${Date.now()}-${idx++}`,
        mes: meses[0] || 'Outubro 2026',
        data: matchData[1],
        tema: '',
        numeroTema: '',
        orador: '',
        congregacaoOrador: 'Vila Cisper',
        presidente: '',
        leitor: '',
        observacao: '',
      };
      continue;
    }

    if (currentItem) {
      if (/tema|t[íi]tulo/i.test(line)) {
        currentItem.tema = line.replace(/(?:tema|t[íi]tulo)[:\s]*/i, '').trim();
      } else if (/n[ºo°]\.?|esbo[çc]o/i.test(line)) {
        const matchNum = line.match(/\b(\d{1,3})\b/);
        if (matchNum) currentItem.numeroTema = matchNum[1];
      } else if (/orador/i.test(line)) {
        currentItem.orador = line.replace(/orador[:\s]*/i, '').trim();
      } else if (/congrega[çc][ãa]o/i.test(line)) {
        currentItem.congregacaoOrador = line.replace(/congrega[çc][ãa]o[:\s]*/i, '').trim();
      } else if (/presidente/i.test(line)) {
        currentItem.presidente = line.replace(/presidente[:\s]*/i, '').trim();
      } else if (/leitor/i.test(line)) {
        currentItem.leitor = line.replace(/leitor[:\s]*/i, '').trim();
      } else if (!currentItem.tema && line.length > 10) {
        currentItem.tema = line;
      }
    }
  }

  if (currentItem) {
    discursos.push(currentItem);
  }

  return { meses, discursos };
}

// ============================================================================
// 5. PARSER DETERMINÍSTICO PARA GRUPOS DE LIMPEZA
// ============================================================================

export function parseLimpezaFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const escalas: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let idx = 0;
  for (const line of lines) {
    const matchGrupo = line.match(/(?:grupo\s*(\d{1,2})|grupo\s+([A-Za-z]+))/i);
    const matchDias = line.match(/(\d{1,2}(?:\s*[\/\-aA]\s*\d{1,2})?)/);

    if (matchGrupo || matchDias) {
      const grupoNome = matchGrupo ? `Grupo ${matchGrupo[1] || matchGrupo[2]}` : `Grupo ${idx + 1}`;
      const dias = matchDias ? matchDias[1] : `Semana ${idx + 1}`;

      // Extrai responsáveis se citado na linha
      let responsaveis = '';
      const matchResp = line.match(/(?:respons[áa]ve[il]s?|superintendente)[:\s]*([A-Za-zÀ-ÿ\s\.\,\/e]+)/i);
      if (matchResp) {
        responsaveis = matchResp[1].trim();
      } else {
        const partes = line.split(/[\-\–\|:]/);
        if (partes.length > 2) {
          responsaveis = partes[partes.length - 1].trim();
        }
      }

      escalas.push({
        id: `limp-pdf-${Date.now()}-${idx++}`,
        mes: meses[0] || 'Outubro 2026',
        mesChave: normalizarTexto(meses[0] || 'outubro').split(' ')[0],
        dias,
        diasSemana: 'Quarta Feira e Domingo',
        grupo: grupoNome,
        responsaveis: responsaveis || 'Dirigentes do Grupo',
        observacao: '',
        ehEspecial: /geral|especial|assembleia/i.test(line),
      });
    }
  }

  return { meses, escalas };
}
