// Utilitários para classificação de programações em Atual, Futura e Passada (Histórico)
// Usado em Designações, Vida e Ministério, Serviço de Campo, Limpeza e Discurso Público.

import { parseItemDate, parseMesAno } from './dateUtils';
import { S140TSemana } from '../data/s140tStorage';

export type ModoVisualizacao = 'proximas' | 'historico';
export type SituacaoProgramacao = 'atual' | 'futura' | 'passada';

/**
 * Retorna o início do dia (00:00:00.000) de uma data de referência (padrão: hoje)
 */
export function getInicioDoDia(d: Date = new Date()): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/**
 * Retorna o fim do dia (23:59:59.999) de uma data de referência
 */
export function getFimDoDia(d: Date = new Date()): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

/**
 * Extrai o intervalo de datas (início e fim) de uma programação baseada em dia/dias e mês.
 * Trata tanto dias únicos ("Quinta 01/10", "20/09", "15/10/2026")
 * quanto intervalos de dias ("03 a 09", "10 a 16", "7/11", "14/18").
 */
export function extrairIntervaloData(
  diaOrDiasStr: string,
  mesStr?: string
): { inicio: Date; fim: Date } | null {
  if (!diaOrDiasStr) return null;
  const texto = diaOrDiasStr.trim();

  // Caso 1: Formato ISO YYYY-MM-DD
  const isoMatch = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return {
      inicio: new Date(y, m, d, 0, 0, 0, 0),
      fim: new Date(y, m, d, 23, 59, 59, 999),
    };
  }

  // Caso 2: Formato com data completa DD/MM/AAAA ou DD/MM
  const ddmmyyyyMatch = texto.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (ddmmyyyyMatch) {
    const d = parseInt(ddmmyyyyMatch[1], 10);
    const m = parseInt(ddmmyyyyMatch[2], 10) - 1;
    let y = ddmmyyyyMatch[3] ? parseInt(ddmmyyyyMatch[3], 10) : undefined;
    if (!y && mesStr) {
      const ym = mesStr.match(/\d{4}/);
      if (ym) y = parseInt(ym[0], 10);
    }
    const ano = y || new Date().getFullYear();
    return {
      inicio: new Date(ano, m, d, 0, 0, 0, 0),
      fim: new Date(ano, m, d, 23, 59, 59, 999),
    };
  }

  // Caso 3: Padrão numérico com mês textual explícito (ex: "03 a 09", "10 a 16", "4", "28" em "Janeiro 2026")
  if (mesStr) {
    const { month, year } = parseMesAno(mesStr);
    const nums = texto.match(/\d+/g);
    if (nums && nums.length > 0) {
      const dInicio = Math.min(Math.max(parseInt(nums[0], 10), 1), 31);
      const dFim = Math.min(Math.max(parseInt(nums[nums.length - 1], 10), 1), 31);
      return {
        inicio: new Date(year, month, Math.min(dInicio, dFim), 0, 0, 0, 0),
        fim: new Date(year, month, Math.max(dInicio, dFim), 23, 59, 59, 999),
      };
    }
  }

  // Caso 4: Fallback utilizando parseItemDate padrão
  const parsed = parseItemDate(diaOrDiasStr, mesStr);
  if (parsed) {
    const d = new Date(parsed);
    return {
      inicio: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0),
      fim: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
    };
  }

  return null;
}

/**
 * Determina a situação de uma programação com base na data atual:
 * - 'passada': o término do dia/período já ocorreu antes de hoje.
 * - 'atual': a data ou período abrange o dia de hoje.
 * - 'futura': a data ainda vai chegar depois de hoje.
 */
export function classificarSituacaoData(
  intervalo: { inicio: Date; fim: Date } | null,
  dataBase: Date = new Date()
): SituacaoProgramacao {
  if (!intervalo) return 'futura'; // Em caso de dúvida, não esconde
  const hoje = getInicioDoDia(dataBase);
  const hojeFim = getFimDoDia(dataBase);

  if (intervalo.fim.getTime() < hoje.getTime()) {
    return 'passada';
  }
  if (intervalo.inicio.getTime() <= hojeFim.getTime() && intervalo.fim.getTime() >= hoje.getTime()) {
    return 'atual';
  }
  return 'futura';
}

/**
 * Classifica a semana da Reunião Vida e Ministério (S-140-T).
 * Uma semana vai de segunda a domingo.
 * Se a semana já passou (domingo < hoje), é 'passada'.
 * Se hoje está dentro da semana (segunda <= hoje <= domingo), é 'atual'.
 * Se a semana ainda não começou (segunda > hoje), é 'futura'.
 */
export function classificarSemanaS140T(
  semana: S140TSemana,
  dataBase: Date = new Date()
): SituacaoProgramacao {
  const hoje = getInicioDoDia(dataBase);

  // Extrai dataReferencia (YYYY-MM-DD)
  if (semana.dataReferencia && /^\d{4}-\d{2}-\d{2}$/.test(semana.dataReferencia)) {
    const [y, m, d] = semana.dataReferencia.split('-').map(Number);
    const seg = new Date(y, m - 1, d, 0, 0, 0, 0);
    const dom = new Date(y, m - 1, d + 6, 23, 59, 59, 999);

    if (dom.getTime() < hoje.getTime()) {
      return 'passada';
    }
    if (seg.getTime() <= hoje.getTime() && dom.getTime() >= hoje.getTime()) {
      return 'atual';
    }
    return 'futura';
  }

  // Fallback via datas em texto
  const intervalo = extrairIntervaloData(semana.dataReuniao || semana.periodo || '');
  return classificarSituacaoData(intervalo, dataBase);
}

/**
 * Helper para extrair rótulo de mês/ano para filtro do histórico (ex: "Setembro 2026", "Outubro 2026")
 */
export function extrairRotuloMesAno(dataOuMes: string, mesAux?: string): string {
  if (mesAux && mesAux.trim()) {
    return mesAux.trim();
  }
  const mesesNomes = [
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
  const intervalo = extrairIntervaloData(dataOuMes, mesAux);
  if (intervalo) {
    const m = mesesNomes[intervalo.inicio.getMonth()];
    const a = intervalo.inicio.getFullYear();
    return `${m} ${a}`;
  }
  return 'Geral';
}
