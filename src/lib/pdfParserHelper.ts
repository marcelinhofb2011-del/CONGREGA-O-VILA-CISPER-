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
 * Limpa nomes de irmãos removendo cabeçalhos de seções, horários ou sufixos residuais
 */
export function cleanNome(nome: string): string {
  if (!nome) return '';
  return nome
    .split(/\n/)[0]
    .replace(/(?:FAÇA\s+SEU|NOSSA\s+VIDA|TESOUROS|Salão\s+principal|\d+:\d+|\(.*?\)|Dirigente|Leitor|Presidente|Cântico|Oração).*/gi, '')
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
 * Detecta meses citados no texto ou no nome do arquivo (com suporte a variações e erros de digitação comuns como Outibro)
 */
export function detectMonthsFromText(text: string, fileName?: string): string[] {
  const detectados = new Set<string>();
  const combined = `${fileName || ''}\n${text}`;
  const tNorm = normalizarTexto(combined);

  for (let i = 0; i < MESES_NOMES.length; i++) {
    const nomeNorm = normalizarTexto(MESES_NOMES[i]);
    if (tNorm.includes(nomeNorm)) {
      const regexAno = new RegExp(`${nomeNorm}[^\\d]{0,10}(202\\d)`, 'i');
      const matchAno = tNorm.match(regexAno);
      const ano = matchAno ? matchAno[1] : '2026';
      detectados.add(`${MESES_NOMES[i]} ${ano}`);
    }
  }

  // Tratamento especial para erro comum de digitação "outibro"
  if (tNorm.includes('outibro') && !detectados.has('Outubro 2026')) {
    detectados.add('Outubro 2026');
  }

  if (detectados.size === 0) {
    const matchMesNum = tNorm.match(/(?:^|\D)(0?[1-9]|1[0-2])[\/\-](202\d)(?:\D|$)/);
    if (matchMesNum) {
      const idx = parseInt(matchMesNum[1], 10) - 1;
      const ano = matchMesNum[2];
      detectados.add(`${MESES_NOMES[idx]} ${ano}`);
    }
  }

  if (detectados.size === 0) {
    detectados.add('Outubro 2026');
  }

  return Array.from(detectados);
}

// ============================================================================
// 1. PARSER OFICIAL PARA PROGRAMAÇÃO NOSSA VIDA E MINISTÉRIO (S-140-T 11/23)
// ============================================================================

export function parseVidaMinisterioFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const semanas: any[] = [];

  // Padrão de cabeçalho semanal: "5-11 DE OUTUBRO", "12-18 DE OUTUBRO", "19-25 DE OUTUBRO", "26 DE OUTIBRO A 1 DE NOVEMBRO"
  const weekHeaderRegex =
    /(?:^|\n)(\d{1,2}(?:\s*[\-–]\s*\d{1,2})?\s+DE\s+[A-ZÇ]+(?:\s+A\s+\d{1,2}\s+DE\s+[A-ZÇ]+)?)(?:\s+Presidente:\s*([^\n]+))?/gi;

  const weekMatches: { index: number; periodo: string; presidente: string }[] = [];
  let mWeek: RegExpExecArray | null;
  while ((mWeek = weekHeaderRegex.exec(text)) !== null) {
    weekMatches.push({
      index: mWeek.index,
      periodo: mWeek[1].trim().toUpperCase(),
      presidente: (mWeek[2] || '').trim(),
    });
  }

  // Se não encontrou pelo formato "X-Y DE MÊS", tenta formato flexível
  if (weekMatches.length === 0) {
    const flexRegex = /(?:^|\n)(\d{1,2}\s*[\-–]\s*\d{1,2}\s+[^\n]+)/gi;
    let mFlex: RegExpExecArray | null;
    while ((mFlex = flexRegex.exec(text)) !== null) {
      if (!/c[âa]ntico/i.test(mFlex[1])) {
        weekMatches.push({
          index: mFlex.index,
          periodo: mFlex[1].trim().toUpperCase(),
          presidente: '',
        });
      }
    }
  }

  for (let i = 0; i < weekMatches.length; i++) {
    const start = weekMatches[i].index;
    const end = i + 1 < weekMatches.length ? weekMatches[i + 1].index : text.length;
    const block = text.slice(start, end);
    const rawPeriodo = weekMatches[i].periodo;

    // Converte o período e normaliza erros de digitação (ex: OUTIBRO -> OUTUBRO)
    const periodo = rawPeriodo.replace(/OUTIBRO/g, 'OUTUBRO');

    // Extrai o primeiro dia da semana
    const mDia = periodo.match(/(\d{1,2})/);
    const diaNum = mDia ? parseInt(mDia[1], 10) : (i + 1) * 7;
    let mesNum = 10;
    if (/novembro/i.test(periodo) && !/outubro/i.test(periodo)) mesNum = 11;
    else if (/setembro/i.test(periodo)) mesNum = 9;
    else if (/dezembro/i.test(periodo)) mesNum = 12;

    const diaStr = String(diaNum).padStart(2, '0');
    const mesStr = String(mesNum).padStart(2, '0');
    const dataReferencia = `2026-${mesStr}-${diaStr}`;

    // Presidente
    let presidente = weekMatches[i].presidente;
    if (!presidente) {
      const mPres = block.match(/Presidente:\s*([^\n]+)/i);
      if (mPres) presidente = mPres[1].trim();
    }

    // Oração Inicial (procura na linha de Cântico e Oração inicial)
    let oracaoInicial = presidente;
    const mOracaoIni = block.match(/C[âa]ntico\s+Ora[çc][ãa]o:\s*([^\n]+)/i) ||
      block.match(/Ora[çc][ãa]o\s+inicial:\s*([^\n]+)/i);
    if (mOracaoIni && mOracaoIni[1]) {
      oracaoInicial = mOracaoIni[1].trim();
    }

    // Oração Final (última menção de "Oração: Nome" no bloco)
    let oracaoFinal = '';
    const oracoesMatches = [...block.matchAll(/Ora[çc][ãa]o:\s*([^\n]+)/gi)];
    if (oracoesMatches.length > 1) {
      oracaoFinal = oracoesMatches[oracoesMatches.length - 1][1].trim();
    } else {
      const mOracaoFim = block.match(/Ora[çc][ãa]o\s+final:\s*([^\n]+)/i);
      if (mOracaoFim) oracaoFinal = mOracaoFim[1].trim();
    }

    // Cânticos (se números forem informados)
    const canticosNums: number[] = [];
    const regCant = /C[âa]ntico\s+(\d{1,3})/gi;
    let mC: RegExpExecArray | null;
    while ((mC = regCant.exec(block)) !== null) {
      canticosNums.push(parseInt(mC[1], 10));
    }
    const canticoInicial = canticosNums[0] || '';
    const canticoMeio = canticosNums[1] || '';
    const canticoFinal = canticosNums[2] || canticosNums[canticosNums.length - 1] || '';

    // Tesouros da Palavra de Deus
    let discursoTesourosTitulo = 'Tesouros da Palavra de Deus';
    let discursoTesourosIrmao = '';
    const m1 = block.match(/1\.\s*([^\n\(]+?)\s*\(\s*10\s*min\s*\)\s*([^\n]+)/i);
    if (m1) {
      discursoTesourosTitulo = m1[1].trim();
      discursoTesourosIrmao = m1[2].trim();
    }

    let joiasEspirituaisIrmao = '';
    const m2 = block.match(/2\.\s*Joias espirituais\s*\(\s*10\s*min\s*\)\s*([^\n]+)/i);
    if (m2) {
      joiasEspirituaisIrmao = m2[1].trim();
    }

    let leituraBibliaIrmao = '';
    const m3 = block.match(/3\.\s*Leitura da B[íi]blia\s*\(\s*4\s*min\s*\)\s*([^\n]+)/i);
    if (m3) {
      leituraBibliaIrmao = m3[1].trim();
    }

    // Leitura Bíblica da Semana
    let leituraBiblica = '';
    const mLeit = block.match(/\b([A-ZÇ]{3,15}\s+\d+[\-–\d]*)\b/);
    if (mLeit) leituraBiblica = mLeit[1];

    // Faça Seu Melhor no Ministério e Nossa Vida Cristã
    const partesMinisterio: any[] = [];
    const partesVidaCrista: any[] = [];

    const regexMin = /(\d+)\.\s*([^\n\(]+?)\s*\(\s*(\d{1,2})\s*min\s*\)\s*([^\n]+)/gi;
    let pMatch: RegExpExecArray | null;
    let pIdx = 1;
    while ((pMatch = regexMin.exec(block)) !== null) {
      const num = parseInt(pMatch[1], 10);
      const respBruto = pMatch[4].trim();
      const titulo = pMatch[2].trim();
      const tempoMin = parseInt(pMatch[3], 10);
      let titular = respBruto;
      let ajudante = '';
      if (respBruto.includes('/')) {
        const s = respBruto.split('/');
        titular = s[0].trim();
        ajudante = s[1].trim();
      }

      if (/necessidades/i.test(titulo) || tempoMin >= 10) {
        partesVidaCrista.push({
          id: `pvc-${partesVidaCrista.length + 1}`,
          numero: num,
          titulo,
          tempoMin,
          designado: cleanNome(titular),
        });
      } else if (num >= 4 && num <= 7) {
        partesMinisterio.push({
          id: `pm-${pIdx++}`,
          numero: num,
          titulo,
          tempoMin,
          designado: cleanNome(titular),
          ajudante: cleanNome(ajudante),
          salao: 'Salão principal',
        });
      }
    }

    // Procura também Necessidades Locais sem formato de minutos explícito (ex: "7. Necessidades locais Geovane A.")
    const mNec = block.match(/(\d+)\.\s*(Necessidades [^\n\(]+?)(?:\s*\(\s*(\d{1,2})\s*min\s*\))?\s*([^\n]+)/i);
    if (mNec && !partesVidaCrista.some((p) => /necessidades/i.test(p.titulo))) {
      partesVidaCrista.push({
        id: `pvc-${partesVidaCrista.length + 1}`,
        numero: parseInt(mNec[1], 10) || 7,
        titulo: mNec[2].trim(),
        tempoMin: mNec[3] ? parseInt(mNec[3], 10) : 15,
        designado: cleanNome(mNec[4]),
      });
    }

    // Estudo Bíblico de Congregação (Dirigente e Leitor separados por barra '/')
    let estudoBiblicoDirigente = '';
    let estudoBiblicoLeitor = '';
    const mEstudo = block.match(
      /Estudo b[íi]blico de congrega[çc][ãa]o\s*\(\s*30\s*min\s*\)\s*(?:Dirigente\/leitor:)?\s*([^\n\/]+)\/([^\n]+)/i
    );
    if (mEstudo) {
      estudoBiblicoDirigente = cleanNome(mEstudo[1].replace(/Dirigente\/leitor:/i, ''));
      estudoBiblicoLeitor = cleanNome(mEstudo[2]);
    }

    semanas.push({
      id: `sem-${dataReferencia}`,
      periodo: periodo || `Semana ${i + 1}`,
      dataReferencia,
      dataReuniao: `${diaStr}/${mesStr}/2026`,
      leituraBiblica: leituraBiblica || 'LEITURA SEMANAL',
      ehVisita: /visita|circuito/i.test(block),
      presidente: cleanNome(presidente),
      canticoInicial: canticoInicial || '',
      oracaoInicial: cleanNome(oracaoInicial),
      comentariosIniciaisMin: 1,
      tesourosSalao: 'Salão principal',
      discursoTesourosTitulo: discursoTesourosTitulo || 'Tesouros da Palavra',
      discursoTesourosIrmao: cleanNome(discursoTesourosIrmao),
      discursoTesourosTempoMin: 10,
      joiasEspirituaisTitulo: 'Encontre joias espirituais',
      joiasEspirituaisIrmao: cleanNome(joiasEspirituaisIrmao),
      joiasEspirituaisTempoMin: 10,
      leituraBibliaIrmao: cleanNome(leituraBibliaIrmao),
      leituraBibliaTempoMin: 4,
      ministerioSalao: 'Salão principal',
      partesMinisterio,
      canticoMeio: canticoMeio || '',
      partesVidaCrista,
      estudoBiblicoTempoMin: 30,
      estudoBiblicoDirigente,
      estudoBiblicoLeitor,
      comentariosFinaisMin: 3,
      canticoFinal: canticoFinal || '',
      oracaoFinal: cleanNome(oracaoFinal),
      observacoesGerais: '',
    });
  }

  return { meses, semanas };
}

// ============================================================================
// 2. PARSER OFICIAL PARA ESCALA DE DESIGNAÇÕES (INDICADORES, SOM, VÍDEO, LEITOR)
// ============================================================================

export function parseDesignacoesFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const escala: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Lista canônica de nomes de irmãos da congregação para extração posicional
  const irmaosNomes = [
    'Danilo C.',
    'Danilo M.',
    'Danilo',
    'Pedro Mendes',
    'Pedro M.',
    'Pedro',
    'Vanderlei',
    'Hermes',
    'Mateus',
    'Guilherme',
    'Airton',
    'Silvani',
    'Leandro',
    'Samuel',
    'Vilson',
    'Edivaldo',
    'George',
    'Valdemir',
    'Hugo',
    'Gustavo',
    'Kleber',
    'Marcelo',
    'Geovane',
    'Dhiego',
    'Rafael',
    'Wilmar',
  ];

  function extractTokens(str: string): string[] {
    const result: string[] = [];
    let remaining = str.trim();
    while (remaining.length > 0) {
      let found = false;
      for (const name of irmaosNomes) {
        if (remaining.toLowerCase().startsWith(name.toLowerCase())) {
          result.push(name);
          remaining = remaining.slice(name.length).trim();
          found = true;
          break;
        }
      }
      if (!found) {
        const match = remaining.match(/^(\S+)\s*(.*)$/);
        if (match) {
          result.push(match[1]);
          remaining = match[2];
        } else {
          break;
        }
      }
    }
    return result;
  }

  let mesContexto = meses[0] || 'Outubro 2026';
  let idx = 0;

  for (const line of lines) {
    if (/outubro/i.test(line)) mesContexto = 'Outubro 2026';
    else if (/novembro/i.test(line)) mesContexto = 'Novembro 2026';
    else if (/dezembro/i.test(line)) mesContexto = 'Dezembro 2026';

    const m = line.match(/^(Quinta\-Feira|Domingo)\s+(\d{1,2}\/\d{1,2})\s+(.+)$/i);
    if (!m) continue;

    const diaSemana = m[1];
    const data = m[2];
    const restTokens = extractTokens(m[3]);
    const isQuinta = diaSemana.toLowerCase().includes('quinta');

    let indicador = '';
    let microfone = '';
    let leitor = '';
    let audio = '';
    let video = '';
    let presidencia = '';

    if (isQuinta) {
      // Quinta-feira: Interno, Externo, Mic 1, Mic 2, Áudio, Vídeo, (Presidência opcional)
      const ind1 = restTokens[0] || '';
      const ind2 = restTokens[1] || '';
      indicador = [ind1, ind2].filter(Boolean).join(' / ');
      const mic1 = restTokens[2] || '';
      const mic2 = restTokens[3] || '';
      microfone = [mic1, mic2].filter(Boolean).join(' / ');
      audio = restTokens[4] || '';
      video = restTokens[5] || '';
      presidencia = restTokens[6] || '';
    } else {
      // Domingo: Interno, Externo, Mic 1, Mic 2, Leitor, Áudio, Vídeo, Presidência
      const ind1 = restTokens[0] || '';
      const ind2 = restTokens[1] || '';
      indicador = [ind1, ind2].filter(Boolean).join(' / ');
      const mic1 = restTokens[2] || '';
      const mic2 = restTokens[3] || '';
      microfone = [mic1, mic2].filter(Boolean).join(' / ');
      leitor = restTokens[4] || '';
      audio = restTokens[5] || '';
      video = restTokens[6] || '';
      presidencia = restTokens[7] || '';
    }

    escala.push({
      id: `desig-pdf-${Date.now()}-${idx++}`,
      mes: mesContexto,
      mesChave: normalizarTexto(mesContexto).split(' ')[0],
      dia: `${diaSemana} ${data}`,
      indicador: indicador || '—',
      microfone: microfone || '—',
      leitor: leitor || '',
      audio: audio || '—',
      video: video || '—',
      presidencia: presidencia || '',
      observacao: '',
      ehEspecial: false,
    });
  }

  return { meses, escala };
}

// ============================================================================
// 3. PARSER OFICIAL PARA SERVIÇO DE CAMPO (DIRIGENTES E HORÁRIOS)
// ============================================================================

export function parseCampoFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const programacao: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let mesContexto = meses[0] || 'Outubro 2026';
  let idx = 0;

  for (const line of lines) {
    if (/^OUTUBRO/i.test(line)) {
      mesContexto = 'Outubro 2026';
      continue;
    } else if (/^NOVEMBRO/i.test(line)) {
      mesContexto = 'Novembro 2026';
      continue;
    } else if (/^DEZEMBRO/i.test(line)) {
      mesContexto = 'Dezembro 2026';
      continue;
    }

    // Formato de linha do documento: "03/10 Sábado Samuel" ou "04/10 Domingo Danilo (Todos os grupos no salão)"
    const m = line.match(/^(\d{1,2}\/\d{1,2})\s+(S[áa]bado|Domingo)\s+([A-Za-zÀ-ÿ\s\(\)\.\/\-]+)$/i);
    if (m) {
      const data = m[1];
      const resp = m[3].trim();
      let pontoEncontro = 'Salão do Reino';
      if (/no sal[ãa]o/i.test(resp)) {
        pontoEncontro = 'Salão do Reino (Todos os grupos)';
      } else if (/superintendente/i.test(resp)) {
        pontoEncontro = 'Ponto dos Grupos';
      } else if (/assembl[ée]ia/i.test(resp)) {
        pontoEncontro = 'Assembléia';
      }

      programacao.push({
        id: `campo-pdf-${Date.now()}-${idx++}`,
        mes: mesContexto,
        data,
        horario: '08:00',
        pontoEncontro,
        responsavel: resp,
      });
      continue;
    }

    // Linhas de meio de semana no topo: "Quarta Airton Sales 15:30", "Quinta Pedro Mendes 09:15"
    const mSemana = line.match(/^(Ter[çc]a|Quarta|Quinta|Sexta)\s+([A-Za-zÀ-ÿ\s]+?)\s+(\d{1,2}:\d{2})$/i);
    if (mSemana) {
      programacao.push({
        id: `campo-pdf-${Date.now()}-${idx++}`,
        mes: mesContexto,
        data: mSemana[1],
        horario: mSemana[3],
        pontoEncontro: mSemana[2].includes('Zoom') ? 'Reunião Virtual (Zoom)' : 'Salão do Reino',
        responsavel: mSemana[2].trim(),
      });
    }
  }

  return { meses, programacao };
}

// ============================================================================
// 4. PARSER OFICIAL PARA DISCURSO BÍBLICO (DISCURSOS PÚBLICOS)
// ============================================================================

export function parseDiscursosFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const discursos: any[] = [];

  // O documento estrutura os discursos por blocos:
  // DIA 04/10 TEMA: Será que um dia a terra vai ser limpa?
  // PRESIDENTE: Geovane Alves
  // LEITOR: Airton Sales
  const blocks = text.split(/(?=DIA\s+\d{1,2}\/\d{1,2})/i);
  let idx = 0;

  for (const b of blocks) {
    const mDia = b.match(/DIA\s+(\d{1,2}\/\d{1,2})/i);
    if (!mDia) continue;

    const data = mDia[1];
    const mTema = b.match(/TEMA:\s*([^\n]+)/i);
    const mPres = b.match(/PRESIDENTE:\s*([^\n]+)/i);
    const mLeit = b.match(/LEITOR:\s*([^\n]+)/i);

    const tema = mTema ? mTema[1].trim() : 'Discurso Público';
    const ehAssembleia = /assembl[ée]ia/i.test(tema);

    discursos.push({
      id: `disc-pdf-${Date.now()}-${idx++}`,
      mes: meses[0] || 'Outubro 2026',
      data,
      tema,
      numeroTema: '',
      orador: ehAssembleia ? 'Assembléia' : 'Orador Local / Visitante',
      congregacaoOrador: 'Vila Cisper',
      presidente: mPres ? mPres[1].trim() : '',
      leitor: mLeit ? mLeit[1].trim() : '',
      observacao: ehAssembleia ? 'Assembléia de Circuito' : '',
    });
  }

  return { meses, discursos };
}

// ============================================================================
// 5. PARSER OFICIAL PARA GRUPOS DE LIMPEZA DO SALÃO DO REINO
// ============================================================================

export function parseLimpezaFromText(text: string, fileName?: string) {
  const meses = detectMonthsFromText(text, fileName);
  const escalas: any[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let mesContexto = meses[0] || 'Outubro 2026';
  let idx = 0;

  for (const line of lines) {
    if (/^OUTUBRO/i.test(line)) {
      mesContexto = 'Outubro 2026';
      continue;
    } else if (/^NOVEMBRO/i.test(line)) {
      mesContexto = 'Novembro 2026';
      continue;
    } else if (/^DEZEMBRO/i.test(line)) {
      mesContexto = 'Dezembro 2026';
      continue;
    }

    if (/^DIAS\s+DIAS/i.test(line)) continue;

    // Formato de linha oficial:
    // 01/04 Quinta-Feira e Domingo GRUPO 1 SAMUEL / GEOVANE / HUGO
    // 8/11 Quinta-Feira e Domingo GRUPO 2 AIRTON E DHIEGO
    // 15/18 Assembléia Assembléia Assembléia
    const m = line.match(
      /^(\d{1,2}(?:\/\d{1,2})?)\s+(Quinta\-Feira\s+e\s+Domingo|Quinta\-Feira|Domingo|Assembl[ée]ia)\s+(GRUPO\s+\d+|Assembl[ée]ia)\s*(.*)$/i
    );

    if (m) {
      const dias = m[1];
      const diasSemana = m[2];
      const grupo = m[3];
      const responsaveis = m[4] ? m[4].trim() : grupo;
      const ehAssembleia = /assembl/i.test(diasSemana);

      escalas.push({
        id: `limp-pdf-${Date.now()}-${idx++}`,
        mes: mesContexto,
        mesChave: normalizarTexto(mesContexto).split(' ')[0],
        dias,
        diasSemana: ehAssembleia ? 'Assembléia' : diasSemana,
        grupo,
        responsaveis: responsaveis || 'Dirigentes do Grupo',
        observacao: ehAssembleia ? 'Assembléia de Circuito' : '',
        ehEspecial: ehAssembleia,
      });
    }
  }

  return { meses, escalas };
}
