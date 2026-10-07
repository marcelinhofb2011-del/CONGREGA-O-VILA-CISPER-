// Armazenamento e gerenciamento da Programação da Reunião do Meio de Semana (S-140-T)
// Congregação Vila Cisper - 67744

import { isAdminAuthenticated } from './territoriosStorage';
import { firebaseSync } from './firebaseSyncService';
import { parseItemDate, getMondayOfWeek, getSundayOfWeek } from '../utils/dateUtils';

export interface S140TMinisterioParte {
  id: string;
  numero: number;
  titulo: string;
  tempoMin: number;
  designado: string;
  ajudante?: string;
  salao?: string;
}

export interface S140TVidaCristaParte {
  id: string;
  numero?: number;
  titulo: string;
  tempoMin?: number;
  designado: string;
}

export interface S140TSemana {
  id: string;
  periodo: string; // Ex: "7-13 DE SETEMBRO"
  dataReuniao?: string; // Ex: "10/09/2026"
  leituraBiblica: string;
  ehVisita?: boolean;
  dataReferencia: string; // YYYY-MM-DD
  presidente: string;

  // Introdução
  canticoInicial: number | string;
  oracaoInicial: string;
  comentariosIniciaisMin?: number;

  // Tesouros da Palavra de Deus
  tesourosSalao?: string;
  discursoTesourosTitulo: string;
  discursoTesourosTempoMin?: number;
  discursoTesourosIrmao: string;
  joiasEspirituaisTitulo?: string;
  joiasEspirituaisIrmao: string;
  joiasEspirituaisTempoMin?: number;
  leituraBibliaIrmao: string;
  leituraBibliaTempoMin?: number;

  // Faça Seu Melhor no Ministério
  ministerioSalao?: string;
  partesMinisterio: S140TMinisterioParte[];

  // Nossa Vida Cristã
  canticoMeio: number | string;
  partesVidaCrista: S140TVidaCristaParte[];

  // Estudo bíblico de congregação
  estudoBiblicoTempoMin?: number;
  estudoBiblicoDirigente?: string;
  estudoBiblicoLeitor?: string;

  comentariosFinaisMin?: number;
  canticoFinal: number | string;
  oracaoFinal: string;

  observacoesGerais?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export const STORAGE_KEY_S140T = 'vila_cisper_programacao_s140t';

export const S140T_DADOS_PADRAO: S140TSemana[] = [
  {
    id: 'sem-2026-09-07',
    periodo: '7-13 DE SETEMBRO',
    leituraBiblica: 'JEREMIAS 32-33',
    ehVisita: false,
    dataReferencia: '2026-09-07',
    presidente: 'Marcelo F.',
    canticoInicial: 1,
    oracaoInicial: 'Marcelo F.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Meditar nas qualidades de Jeová fortalece a nossa fé',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Danilo C.',
    joiasEspirituaisIrmao: 'Hermes B.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Vitor Fraga',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-1-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Cleonice', ajudante: 'Maria Silva' },
      { id: 'pm-1-2', numero: 2, titulo: 'Cultivando o interesse', tempoMin: 4, designado: 'Ruth Mendes', ajudante: 'Tereza' },
      { id: 'pm-1-3', numero: 3, titulo: 'Fazendo discípulos', tempoMin: 5, designado: 'Hugo C.', ajudante: 'Vitor' },
    ],
    canticoMeio: 128,
    partesVidaCrista: [
      { id: 'pvc-1-1', titulo: 'Use seu tempo da melhor forma no ministério', tempoMin: 15, designado: 'Vilson M.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Geovane',
    estudoBiblicoLeitor: 'Pedro M',
    comentariosFinaisMin: 3,
    canticoFinal: 143,
    oracaoFinal: 'Wilmar M.',
  },
  {
    id: 'sem-2026-09-14',
    periodo: '14-20 DE SETEMBRO',
    leituraBiblica: 'JEREMIAS 34-36',
    ehVisita: false,
    dataReferencia: '2026-09-14',
    presidente: 'Kleber S.',
    canticoInicial: 25,
    oracaoInicial: 'Kleber S.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Obedeça a Jeová de todo o coração',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Hugo C.',
    joiasEspirituaisIrmao: 'Vilson M.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Pedro Mendes',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-2-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Lourdes', ajudante: 'Aparecida' },
      { id: 'pm-2-2', numero: 2, titulo: 'Explicando suas crenças', tempoMin: 5, designado: 'Danilo C.', ajudante: 'Samuel' },
    ],
    canticoMeio: 80,
    partesVidaCrista: [
      { id: 'pvc-2-1', titulo: 'Necessidades locais', tempoMin: 15, designado: 'Marcelo F.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Samuel',
    estudoBiblicoLeitor: 'Hugo C.',
    comentariosFinaisMin: 3,
    canticoFinal: 90,
    oracaoFinal: 'Hermes B.',
  },
  {
    id: 'sem-2026-09-28',
    periodo: '28 DE SETEMBRO A 4 DE OUTUBRO',
    leituraBiblica: 'JEREMIAS 37-39',
    ehVisita: false,
    dataReferencia: '2026-09-28',
    presidente: 'Danilo C.',
    canticoInicial: 10,
    oracaoInicial: 'Danilo C.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Confie na salvação de Jeová',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Marcelo F.',
    joiasEspirituaisIrmao: 'Geovane',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Dhiego',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-3-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Eliane', ajudante: 'Elizete' },
      { id: 'pm-3-2', numero: 2, titulo: 'Fazendo discípulos', tempoMin: 5, designado: 'Airton', ajudante: 'Valdemir' },
    ],
    canticoMeio: 110,
    partesVidaCrista: [
      { id: 'pvc-3-1', titulo: 'Como manter o zelo', tempoMin: 15, designado: 'Dhiego' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Kleber',
    estudoBiblicoLeitor: 'Danilo C.',
    comentariosFinaisMin: 3,
    canticoFinal: 115,
    oracaoFinal: 'Vilson M.',
  },
  {
    id: 'sem-2026-10-05',
    periodo: '5-11 DE OUTUBRO',
    leituraBiblica: 'JEREMIAS 40-43',
    ehVisita: false,
    dataReferencia: '2026-10-05',
    presidente: 'Hugo C.',
    canticoInicial: 42,
    oracaoInicial: 'Hugo C.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Ouça o aviso de Jeová',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Samuel',
    joiasEspirituaisIrmao: 'Danilo C.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Airton',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-4-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Maria José', ajudante: 'Silvani' },
      { id: 'pm-4-2', numero: 2, titulo: 'Cultivando o interesse', tempoMin: 4, designado: 'Tereza', ajudante: 'Ruth' },
    ],
    canticoMeio: 95,
    partesVidaCrista: [
      { id: 'pvc-4-1', titulo: 'O valor da oração perseverante', tempoMin: 15, designado: 'Hermes B.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Marcelo F.',
    estudoBiblicoLeitor: 'Vitor Fraga',
    comentariosFinaisMin: 3,
    canticoFinal: 120,
    oracaoFinal: 'Geovane',
  },
  {
    id: 'sem-2026-10-12',
    periodo: '12-18 DE OUTUBRO',
    leituraBiblica: 'JEREMIAS 44-46',
    ehVisita: false,
    dataReferencia: '2026-10-12',
    presidente: 'Vilson M.',
    canticoInicial: 8,
    oracaoInicial: 'Vilson M.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Não confie em coisas passageiras',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Geovane',
    joiasEspirituaisIrmao: 'Marcelo F.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Samuel',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-5-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Ruth Mendes', ajudante: 'Cleonice' },
      { id: 'pm-5-2', numero: 2, titulo: 'Explicando suas crenças', tempoMin: 5, designado: 'Hugo C.', ajudante: 'Danilo C.' },
    ],
    canticoMeio: 70,
    partesVidaCrista: [
      { id: 'pvc-5-1', titulo: 'Como perseverar sob pressão', tempoMin: 15, designado: 'Kleber S.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Danilo C.',
    estudoBiblicoLeitor: 'Wilmar M.',
    comentariosFinaisMin: 3,
    canticoFinal: 130,
    oracaoFinal: 'Hugo C.',
  },
  {
    id: 'sem-2026-10-19',
    periodo: '19-25 DE OUTUBRO',
    leituraBiblica: 'JEREMIAS 47-48',
    ehVisita: false,
    dataReferencia: '2026-10-19',
    presidente: 'Marcelo F.',
    canticoInicial: 15,
    oracaoInicial: 'Marcelo F.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Jeová cumpre todas as suas promessas',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Hermes B.',
    joiasEspirituaisIrmao: 'Hugo C.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Vitor Fraga',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-6-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Maria Silva', ajudante: 'Tereza' },
      { id: 'pm-6-2', numero: 2, titulo: 'Fazendo discípulos', tempoMin: 5, designado: 'Vitor Fraga', ajudante: 'Pedro M.' },
    ],
    canticoMeio: 88,
    partesVidaCrista: [
      { id: 'pvc-6-1', titulo: 'Necessidades locais', tempoMin: 15, designado: 'Marcelo F.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Samuel',
    estudoBiblicoLeitor: 'Hugo C.',
    comentariosFinaisMin: 3,
    canticoFinal: 105,
    oracaoFinal: 'Vilson M.',
  },
  {
    id: 'sem-2026-10-26',
    periodo: '26 DE OUTUBRO A 1 DE NOVEMBRO',
    leituraBiblica: 'JEREMIAS 49-50',
    ehVisita: false,
    dataReferencia: '2026-10-26',
    presidente: 'Kleber S.',
    canticoInicial: 33,
    oracaoInicial: 'Kleber S.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'A justiça de Jeová prevalecerá',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Danilo C.',
    joiasEspirituaisIrmao: 'Vilson M.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Pedro Mendes',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-7-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Lourdes', ajudante: 'Aparecida' },
      { id: 'pm-7-2', numero: 2, titulo: 'Cultivando o interesse', tempoMin: 4, designado: 'Eliane', ajudante: 'Elizete' },
    ],
    canticoMeio: 62,
    partesVidaCrista: [
      { id: 'pvc-7-1', titulo: 'Trabalhe com alegria para Jeová', tempoMin: 15, designado: 'Danilo C.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Geovane',
    estudoBiblicoLeitor: 'Airton',
    comentariosFinaisMin: 3,
    canticoFinal: 140,
    oracaoFinal: 'Hermes B.',
  },
  {
    id: 'sem-2026-11-02',
    periodo: '2-8 DE NOVEMBRO',
    leituraBiblica: 'JEREMIAS 51-52',
    ehVisita: false,
    dataReferencia: '2026-11-02',
    presidente: 'Hugo C.',
    canticoInicial: 54,
    oracaoInicial: 'Hugo C.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Babilônia cairá e nunca mais se levantará',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Marcelo F.',
    joiasEspirituaisIrmao: 'Geovane',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Dhiego',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      { id: 'pm-8-1', numero: 1, titulo: 'Iniciando conversas', tempoMin: 3, designado: 'Silvani', ajudante: 'Maria José' },
      { id: 'pm-8-2', numero: 2, titulo: 'Fazendo discípulos', tempoMin: 5, designado: 'Airton', ajudante: 'Valdemir' },
    ],
    canticoMeio: 91,
    partesVidaCrista: [
      { id: 'pvc-8-1', titulo: 'O amor de Jeová nunca falha', tempoMin: 15, designado: 'Vilson M.' },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Kleber S.',
    estudoBiblicoLeitor: 'Vitor Fraga',
    comentariosFinaisMin: 3,
    canticoFinal: 148,
    oracaoFinal: 'Danilo C.',
  },
];

export function parseSemanaDateLimits(semana: S140TSemana): { inicio: Date; reuniao: Date; fim: Date } | null {
  if (semana.dataReferencia && /^\d{4}-\d{2}-\d{2}$/.test(semana.dataReferencia)) {
    const [y, m, d] = semana.dataReferencia.split('-').map(Number);
    const inicio = new Date(y, m - 1, d, 0, 0, 0, 0);
    const reuniao = new Date(y, m - 1, d + 3, 23, 59, 59, 999);
    const fim = new Date(y, m - 1, d + 6, 23, 59, 59, 999);
    return { inicio, reuniao, fim };
  }
  const parsed = parseItemDate(semana.dataReuniao || '') || parseItemDate(semana.periodo || '');
  if (parsed) {
    const monday = getMondayOfWeek(parsed);
    const sunday = getSundayOfWeek(monday);
    const reuniao = new Date(parsed);
    reuniao.setHours(23, 59, 59, 999);
    return { inicio: monday, reuniao, fim: sunday };
  }
  return null;
}

export function ordenarSemanasCronologicamente(lista: S140TSemana[]): S140TSemana[] {
  return [...lista].sort((a, b) => {
    const limA = parseSemanaDateLimits(a);
    const limB = parseSemanaDateLimits(b);
    if (limA && limB) {
      return limA.inicio.getTime() - limB.inicio.getTime();
    }
    if (limA) return -1;
    if (limB) return 1;
    return (a.dataReferencia || a.id).localeCompare(b.dataReferencia || b.id);
  });
}

export function identificarSemanaMaisProxima(lista: S140TSemana[], dataBase: Date = new Date()): S140TSemana | null {
  if (!lista || lista.length === 0) return null;
  const ordenadas = ordenarSemanasCronologicamente(lista);
  const hoje = new Date(dataBase);

  for (const sem of ordenadas) {
    const lim = parseSemanaDateLimits(sem);
    if (lim && lim.reuniao.getTime() >= hoje.getTime()) {
      return sem;
    }
  }
  for (const sem of ordenadas) {
    const lim = parseSemanaDateLimits(sem);
    if (lim && lim.fim.getTime() >= hoje.getTime()) {
      return sem;
    }
  }
  return ordenadas[ordenadas.length - 1];
}

export function getStoredS140TSemanas(): S140TSemana[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_S140T);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(S140T_DADOS_PADRAO));
      return ordenarSemanasCronologicamente(S140T_DADOS_PADRAO);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return ordenarSemanasCronologicamente(parsed);
    }
    return ordenarSemanasCronologicamente(S140T_DADOS_PADRAO);
  } catch {
    return ordenarSemanasCronologicamente(S140T_DADOS_PADRAO);
  }
}

export async function saveS140TSemana(semana: S140TSemana): Promise<{ success: boolean; data?: S140TSemana[]; error?: string }> {
  try {
    const current = getStoredS140TSemanas();
    const idx = current.findIndex((s) => s.id === semana.id);
    let updated: S140TSemana[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = semana;
    } else {
      updated = [semana, ...current];
    }
    updated = ordenarSemanasCronologicamente(updated);
    localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('s140t-firebase-updated', { detail: updated }));
    firebaseSync.saveS140TSemana(semana).catch(() => {});
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteS140TSemana(id: string): Promise<{ success: boolean; data?: S140TSemana[]; error?: string }> {
  try {
    const current = getStoredS140TSemanas();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('s140t-firebase-updated', { detail: updated }));
    firebaseSync.deleteS140TSemana(id).catch(() => {});
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function verificarDesignacaoIrmao(
  nomeProcurado: string | null | undefined,
  nomeCampo: string | null | undefined
): boolean {
  if (!nomeProcurado || !nomeCampo) return false;
  const proc = nomeProcurado.trim().toLowerCase();
  const campo = nomeCampo.trim().toLowerCase();
  if (proc === campo) return true;
  if (campo.includes('/')) {
    const partes = campo.split('/').map((p) => p.trim());
    return partes.some((p) => p === proc || proc.includes(p) || p.includes(proc));
  }
  return campo.includes(proc) || proc.includes(campo);
}

export async function saveBulkS140TSemanas(
  newWeeks: S140TSemana[],
  mode: 'append' | 'replace_month' | 'replace_all' = 'append',
  targetMonthKeys?: string[]
): Promise<{ success: boolean; data?: S140TSemana[]; error?: string; count?: number }> {
  try {
    const current = getStoredS140TSemanas();
    let updated: S140TSemana[];
    if (mode === 'replace_all') {
      updated = [...newWeeks];
    } else {
      const map = new Map<string, S140TSemana>();
      current.forEach((w) => map.set(w.dataReferencia || w.id, w));
      newWeeks.forEach((w) => map.set(w.dataReferencia || w.id, w));
      updated = Array.from(map.values());
    }
    updated = ordenarSemanasCronologicamente(updated);
    localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('s140t-firebase-updated', { detail: updated }));
    firebaseSync.saveAllS140T(updated).catch(() => {});
    return { success: true, data: updated, count: newWeeks.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar programações em lote.' };
  }
}
