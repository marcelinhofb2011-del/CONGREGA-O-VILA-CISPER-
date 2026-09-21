import * as XLSX from 'xlsx';

/**
 * Utilitários para Importação de Planilhas (Excel / CSV / Google Sheets)
 * Suporta leitura direta de arquivos .xlsx, .xls, .csv, .tsv e copiar & colar do Excel/Sheets.
 */

export interface ParsedRowResult<T> {
  item: T;
  raw: string[];
  isValid: boolean;
  warnings: string[];
}

/**
 * Lê diretamente um arquivo de planilha (Excel .xlsx, .xls ou arquivo de texto .csv, .tsv)
 * Suporta múltiplas abas/planilhas do Excel de uma só vez.
 */
export async function readSpreadsheetFile(file: File): Promise<string[][]> {
  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      dateNF: 'dd/mm/yyyy',
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];

    const todasLinhas: string[][] = [];

    // Se tiver mais de uma aba no arquivo Excel
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) continue;

      const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        defval: '',
        raw: false,
        dateNF: 'dd/mm/yyyy',
      });

      const cleanRows = rawRows
        .map((r) =>
          Array.isArray(r)
            ? r.map((c) => (c !== null && c !== undefined ? String(c).trim() : ''))
            : []
        )
        .filter((r) => r.some((c) => c.length > 0));

      if (cleanRows.length === 0) continue;

      // Se houver múltiplas abas e o nome da aba for um mês (ex: "Janeiro", "Fevereiro", "Fev"),
      // insere uma linha indicadora do mês da aba para guiar o leitor
      const mesAba = detectarMes(sheetName, '');
      if (workbook.SheetNames.length > 1 && mesAba) {
        todasLinhas.push([mesAba]);
      }

      todasLinhas.push(...cleanRows);
    }

    return todasLinhas;
  } else {
    const text = await file.text();
    return parseDelimitedText(text);
  }
}

/**
 * Faz o parse de texto com delimitador inteligente (tabulação de Excel copiado, ponto-e-vírgula ou vírgula)
 */
export function parseDelimitedText(text: string): string[][] {
  if (!text || !text.trim()) return [];

  // Normalizar quebras de linha
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result: string[][] = [];

  // Detectar delimitador baseado nas primeiras linhas preenchidas
  let detectedDelimiter = '\t'; // Padrão de copiar/colar do Excel
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes('\t')) {
      detectedDelimiter = '\t';
      break;
    } else if (line.includes(';')) {
      detectedDelimiter = ';';
      break;
    } else if (line.includes(',')) {
      detectedDelimiter = ',';
      break;
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const row: string[] = [];
    let insideQuotes = false;
    let currentField = '';

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      const nextChar = rawLine[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // pular quote escapado
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === detectedDelimiter && !insideQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(currentField.trim());

    // Se linha não vazia, adiciona
    if (row.some((cell) => cell.length > 0)) {
      result.push(row);
    }
  }

  return result;
}

/**
 * Converte array de objetos ou matriz em CSV compatível com Excel pt-BR (ponto e vírgula e BOM)
 */
export function generateCsv(headers: string[], rows: (string | number | boolean | undefined | null)[][]): string {
  const escapeCell = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes(',')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(';');
  const dataLines = rows.map((r) => r.map(escapeCell).join(';'));

  // \uFEFF adiciona o Byte Order Mark (BOM) para o Excel abrir direto com acentos perfeitos
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Faz download de texto ou CSV no navegador
 */
export function downloadBrowserFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Nomes e chaves de meses em português
 */
export const LISTA_MESES_PADRAO = [
  'Janeiro 2026',
  'Fevereiro 2026',
  'Março 2026',
  'Abril 2026',
  'Maio 2026',
  'Junho 2026',
  'Julho 2026',
  'Agosto 2026',
  'Setembro 2026',
  'Outubro 2026',
  'Novembro 2026',
  'Dezembro 2026',
];

export const MESES_NOMES_BASE = [
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

export function normalizarMesChave(mes: string): string {
  return mes
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * Extrai dia, mês (1-12), ano e texto formatado a partir de células com data
 * Exemplos aceitos: "04/01", "07/01/2026", "24/01/26", "4/1", "2026-01-04"
 */
export function extrairInfoData(texto: string): { dia: number; mes: number; ano?: number; textoFormatado: string } | null {
  if (!texto || !texto.trim()) return null;
  const t = texto.trim();

  // Formato brasileiro: DD/MM/YYYY ou DD/MM/YY ou DD/MM
  const matchBR = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (matchBR) {
    const d = parseInt(matchBR[1], 10);
    const m = parseInt(matchBR[2], 10);
    let a: number | undefined;
    if (matchBR[3]) {
      a = parseInt(matchBR[3], 10);
      if (a < 100) a += 2000;
    }
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return {
        dia: d,
        mes: m,
        ano: a,
        textoFormatado: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}${a ? `/${a}` : ''}`,
      };
    }
  }

  // Formato ISO: YYYY-MM-DD
  const matchISO = t.match(/\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
  if (matchISO) {
    const a = parseInt(matchISO[1], 10);
    const m = parseInt(matchISO[2], 10);
    const d = parseInt(matchISO[3], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return {
        dia: d,
        mes: m,
        ano: a,
        textoFormatado: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`,
      };
    }
  }

  return null;
}

/**
 * Verifica se um texto é um dia da semana (ex: Domingo, Quarta-Feira, Sábado, etc.)
 */
export function ehDiaSemana(texto: string): boolean {
  if (!texto || !texto.trim()) return false;
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return (
    t.startsWith('domingo') ||
    t.startsWith('segunda') ||
    t.startsWith('terca') ||
    t.startsWith('quarta') ||
    t.startsWith('quinta') ||
    t.startsWith('sexta') ||
    t.startsWith('sabado') ||
    t === 'dom' ||
    t === 'seg' ||
    t === 'ter' ||
    t === 'qua' ||
    t === 'qui' ||
    t === 'sex' ||
    t === 'sab'
  );
}

/**
 * Detecta o nome do mês a partir do texto de coluna de mês ou da data
 */
export function detectarMes(texto: string, fallback = 'Janeiro 2026'): string {
  if (!texto || !texto.trim()) return fallback;
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const anoMatch = texto.match(/\b(202\d)\b/);
  const ano = anoMatch ? anoMatch[1] : '2026';

  if (t.includes('janeiro') || t.includes('jan/') || t.startsWith('jan')) return `Janeiro ${ano}`;
  if (t.includes('fevereiro') || t.includes('fev/') || t.startsWith('fev')) return `Fevereiro ${ano}`;
  if (t.includes('marco') || t.includes('mar/') || t.startsWith('mar')) return `Março ${ano}`;
  if (t.includes('abril') || t.includes('abr/') || t.startsWith('abr')) return `Abril ${ano}`;
  if (t.includes('maio') || t.includes('mai/') || t.startsWith('mai')) return `Maio ${ano}`;
  if (t.includes('junho') || t.includes('jun/') || t.startsWith('jun')) return `Junho ${ano}`;
  if (t.includes('julho') || t.includes('jul/') || t.startsWith('jul')) return `Julho ${ano}`;
  if (t.includes('agosto') || t.includes('ago/') || t.startsWith('ago')) return `Agosto ${ano}`;
  if (t.includes('setembro') || t.includes('set/') || t.startsWith('set')) return `Setembro ${ano}`;
  if (t.includes('outubro') || t.includes('out/') || t.startsWith('out')) return `Outubro ${ano}`;
  if (t.includes('novembro') || t.includes('nov/') || t.startsWith('nov')) return `Novembro ${ano}`;
  if (t.includes('dezembro') || t.includes('dez/') || t.startsWith('dez')) return `Dezembro ${ano}`;

  // Se tiver formato de data como 04/01, 15/02/2026, 04/08
  const infoData = extrairInfoData(texto);
  if (infoData && infoData.mes >= 1 && infoData.mes <= 12) {
    const anoFinal = infoData.ano ? String(infoData.ano) : ano;
    return `${MESES_NOMES_BASE[infoData.mes - 1]} ${anoFinal}`;
  }

  return fallback;
}

/**
 * Modelos padrão para download de exemplo
 */
export const MODELOS_PLANILHA = {
  designacoes: {
    nome: 'Modelo_Escala_Designacoes_Reunioes.csv',
    cabecalhos: ['Mês', 'Dia/Data', 'Indicador', 'Microfone Volante', 'Leitor da Sentinela', 'Áudio', 'Vídeo', 'Presidência', 'Observação'],
    linhasExemplo: [
      ['Janeiro 2026', 'Domingo 04/01', 'Danilo Cardoso / Hugo', 'Danilo Maia / Leandro', 'Vilson', 'Gustavo', 'Dhiego', '', ''],
      ['Janeiro 2026', 'Quarta-Feira 07/01', 'Samuel / Hermes', 'Silvani / Pedro', '', 'Valdemir', 'Marcelo', '', ''],
      ['Janeiro 2026', 'Domingo 11/01', 'Vilson / Pedro', 'George / Danilo Maia', 'Samuel', 'Hermes', 'Gustavo', 'Marcelo', ''],
      ['Janeiro 2026', 'Quarta-Feira 21/01', 'Assembleia', 'Assembleia', '', 'Assembleia', 'Assembleia', '', 'Assembleia de Circuito'],
    ],
  },
  campo: {
    nome: 'Modelo_Escala_Servico_de_Campo.csv',
    cabecalhos: ['Mês', 'Data', 'Dia da Semana', 'Dirigente', 'Observação'],
    linhasExemplo: [
      ['Janeiro', '03/01', 'Sábado', 'Dhiego', ''],
      ['Janeiro', '04/01', 'Domingo', 'Samuel (Todos os grupos no salão)', ''],
      ['Janeiro', '10/01', 'Sábado', 'Hermes', ''],
      ['Janeiro', '11/01', 'Domingo', 'Superintendente do Grupo', ''],
      ['Janeiro', '24/01', 'Sábado', 'Assembléia de Circuito', 'Não haverá arranjo regular no salão'],
    ],
  },
  discurso: {
    nome: 'Modelo_Escala_Discurso_Biblico.csv',
    cabecalhos: ['Mês', 'Data', 'Tema do Discurso', 'Orador', 'Presidente da Reunião', 'Leitor de A Sentinela', 'Observação'],
    linhasExemplo: [
      ['Setembro', '06/09', 'Mostre que vc apoia o direito de Jeová governar', 'Orador Local / Visitante', 'Marcelo Ferreira', 'Danilo Cardoso', ''],
      ['Setembro', '13/09', 'Onde encontrar ajuda em tempos de aflição?', 'Orador Convidado', 'Dhiego', 'Hermes Bertucci', ''],
      ['Setembro', '20/09', 'Visita do Viajante', 'Superintendente de Circuito', 'Danilo Cardoso', '', 'Visita Especial'],
    ],
  },
  limpeza: {
    nome: 'Modelo_Escala_Limpeza_Salao.csv',
    cabecalhos: ['Mês', 'Dias', 'Dias da Semana', 'Grupo', 'Responsáveis', 'Observação'],
    linhasExemplo: [
      ['Janeiro', '4', 'Quarta Feira e Domingo', 'GRUPO 2', 'AIRTON E DHIEGO', ''],
      ['Janeiro', '7/11', 'Quarta Feira e Domingo', 'GRUPO 1', 'SAMUEL E GEOVANE', ''],
      ['Janeiro', '14/18', 'Quarta Feira e Domingo', 'GRUPO 3', 'KLEBER E LEANDRO', ''],
      ['Janeiro', '21/25', 'Quarta Feira e Domingo', 'GRUPO 4', 'FERNANDO E MARCELO', 'Assembléia'],
    ],
  },
};

export function gerarModeloCsvExemplo(modulo: 'designacoes' | 'campo' | 'discurso' | 'limpeza'): string {
  const mod = MODELOS_PLANILHA[modulo];
  return generateCsv(mod.cabecalhos, mod.linhasExemplo);
}

