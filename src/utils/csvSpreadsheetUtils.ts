/**
 * Utilitários para Importação e Exportação de Planilhas (Excel / CSV / Google Sheets)
 * Suporta copiar & colar direto (TSV), arquivos CSV delimitados por vírgula ou ponto-e-vírgula,
 * e download com BOM UTF-8 para compatibilidade perfeita com o Microsoft Excel.
 */

export interface ParsedRowResult<T> {
  item: T;
  raw: string[];
  isValid: boolean;
  warnings: string[];
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
 * Gera nomes e chaves de meses em português
 */
export function normalizarMesChave(mes: string): string {
  return mes
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
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

