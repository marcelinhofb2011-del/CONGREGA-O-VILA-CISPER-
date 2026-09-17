// Armazenamento e gerenciamento da Programação da Reunião do Meio de Semana (S-140-T)
// Congregação Vila Cisper - 67744

import { isAdminAuthenticated } from './territoriosStorage';
import { firebaseSync } from './firebaseSyncService';

export interface S140TMinisterioParte {
  id: string;
  numero: number;
  titulo: string; // Ex: "Iniciando conversas", "Cultivando o interesse", "Fazendo discípulos"
  tempoMin: number; // Ex: 2, 3, 4, 5, 6
  designado: string; // Titular
  ajudante?: string; // Ajudante (opcional)
  salao?: string; // "Salão principal"
}

export interface S140TVidaCristaParte {
  id: string;
  numero?: number;
  titulo: string; // Ex: "Use seu tempo da melhor forma...", "Realizações da organização"
  tempoMin?: number; // Ex: 15, 6, 9
  designado: string; // Ex: "Vilson M."
}

export interface S140TSemana {
  id: string;
  periodo: string; // Ex: "7-13 DE SETEMBRO"
  leituraBiblica: string; // Ex: "JEREMIAS 32-33"
  ehVisita?: boolean; // Se for semana de visita do superintendente
  dataReferencia: string; // YYYY-MM-DD para ordenação cronológica
  presidente: string; // Ex: "Marcelo F."

  // Introdução
  canticoInicial: number | string; // Ex: 1
  oracaoInicial: string; // Ex: "Marcelo F."
  comentariosIniciaisMin?: number; // Padrão: 1 min

  // Tesouros da Palavra de Deus (Cinza / Grafite)
  tesourosSalao?: string; // Padrão: "Salão principal"
  discursoTesourosTitulo: string; // Ex: "Meditar nas qualidades de Jeová fortalece a nossa fé"
  discursoTesourosTempoMin?: number; // Padrão: 10
  discursoTesourosIrmao: string; // Ex: "Danilo C."

  joiasEspirituaisIrmao: string; // Ex: "Hermes B."
  joiasEspirituaisTempoMin?: number; // Padrão: 10

  leituraBibliaIrmao: string; // Ex: "Vitor Fraga"
  leituraBibliaTempoMin?: number; // Padrão: 4

  // Faça Seu Melhor no Ministério (Mostarda / Ocre)
  ministerioSalao?: string; // Padrão: "Salão principal"
  partesMinisterio: S140TMinisterioParte[];

  // Nossa Vida Cristã (Bordô / Vinho)
  canticoMeio: number | string; // Ex: 128
  partesVidaCrista: S140TVidaCristaParte[];

  // Estudo bíblico de congregação
  estudoBiblicoTempoMin?: number; // Padrão: 30
  estudoBiblicoDirigente?: string; // Ex: "Geovane"
  estudoBiblicoLeitor?: string; // Ex: "Pedro M"

  comentariosFinaisMin?: number; // Padrão: 3
  canticoFinal: number | string; // Ex: 143
  oracaoFinal: string; // Ex: "Wilmar M."

  observacoesGerais?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export const STORAGE_KEY_S140T = 'vila_cisper_programacao_s140t';

// Dados canônicos fiéis extraídos diretamente do documento oficial fornecido pelo usuário (S-140-T Vila Cisper - 67744)
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
      {
        id: 'pm-1-1',
        numero: 4,
        titulo: 'Iniciando conversas',
        tempoMin: 3,
        designado: 'Eliane Chaves',
        ajudante: 'Elizete O.',
      },
      {
        id: 'pm-1-2',
        numero: 5,
        titulo: 'Iniciando conversas',
        tempoMin: 4,
        designado: 'Alessandra M',
        ajudante: 'Gedalva',
      },
      {
        id: 'pm-1-3',
        numero: 6,
        titulo: 'Cultivando o interesse',
        tempoMin: 5,
        designado: 'Cleide L.',
        ajudante: 'Maria Dantas',
      },
    ],
    canticoMeio: 128,
    partesVidaCrista: [
      {
        id: 'pvc-1-1',
        numero: 7,
        titulo: '“Use seu tempo da melhor forma durante a campanha”',
        tempoMin: 15,
        designado: 'Vilson M.',
      },
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
    leituraBiblica: 'JEREMIAS 34-35',
    ehVisita: true,
    dataReferencia: '2026-09-14',
    presidente: 'Ayrton S.',
    canticoInicial: 161,
    oracaoInicial: 'J. Brito',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Jeová recompensa quem sempre é obediente a ele',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Hermes B.',
    joiasEspirituaisIrmao: 'Vanderley S.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Rafael P.',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      {
        id: 'pm-2-1',
        numero: 4,
        titulo: 'Iniciando conversas',
        tempoMin: 2,
        designado: 'Julia B.',
        ajudante: 'Carina Alves',
      },
      {
        id: 'pm-2-2',
        numero: 5,
        titulo: 'Iniciando conversas',
        tempoMin: 2,
        designado: 'Fernanda',
        ajudante: 'Maria Ed.',
      },
      {
        id: 'pm-2-3',
        numero: 6,
        titulo: 'Cultivando o interesse',
        tempoMin: 3,
        designado: 'Guilherme',
        ajudante: 'Gustavo',
      },
      {
        id: 'pm-2-4',
        numero: 7,
        titulo: 'Fazendo discípulos',
        tempoMin: 4,
        designado: 'Ines L.',
        ajudante: 'Raquel U.',
      },
    ],
    canticoMeio: 121,
    partesVidaCrista: [
      {
        id: 'pvc-2-1',
        numero: 8,
        titulo: 'O autodomínio nos ajuda a obedecer',
        tempoMin: 6,
        designado: 'Marcelo F.',
      },
      {
        id: 'pvc-2-2',
        numero: 9,
        titulo: 'Realizações da organização',
        tempoMin: 9,
        designado: 'Samuel Ap.',
      },
      {
        id: 'pvc-2-3',
        numero: 8,
        titulo: '“Tenha a mais alta consideração por eles em amor”',
        tempoMin: 30,
        designado: 'Expedito Amancio',
      },
    ],
    comentariosFinaisMin: 3,
    canticoFinal: 28,
    oracaoFinal: 'Pedro Mendes',
  },
  {
    id: 'sem-2026-09-21',
    periodo: '21-27 DE SETEMBRO',
    leituraBiblica: 'JEREMIAS 36-37',
    ehVisita: false,
    dataReferencia: '2026-09-21',
    presidente: 'Hermes B.',
    canticoInicial: 74,
    oracaoInicial: 'Hermes B.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Jeová apoia aqueles que apoiam Seu reino',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Geovane A.',
    joiasEspirituaisIrmao: 'Ayrton S.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'Edvaldo Francisco',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      {
        id: 'pm-3-1',
        numero: 4,
        titulo: 'Iniciando conversas',
        tempoMin: 3,
        designado: 'Juliana C.',
        ajudante: 'Maria A.',
      },
      {
        id: 'pm-3-2',
        numero: 5,
        titulo: 'Cultivando o interesse',
        tempoMin: 4,
        designado: 'Leidiane',
        ajudante: 'Leticia',
      },
      {
        id: 'pm-3-3',
        numero: 6,
        titulo: 'O que você diria ?',
        tempoMin: 6,
        designado: 'Kleber P.',
      },
    ],
    canticoMeio: 142,
    partesVidaCrista: [
      {
        id: 'pvc-3-1',
        numero: 7,
        titulo: 'Continue neutro no seu coração',
        tempoMin: 15,
        designado: 'Kleber P.',
      },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Danilo C',
    estudoBiblicoLeitor: 'Gustavo L',
    comentariosFinaisMin: 3,
    canticoFinal: 134,
    oracaoFinal: 'Ayrton S.',
  },
  {
    id: 'sem-2026-09-28',
    periodo: '28 DE SETEMBRO-4 DE OUTUBRO',
    leituraBiblica: 'JEREMIAS 38-39',
    ehVisita: false,
    dataReferencia: '2026-09-28',
    presidente: 'Dhiego L.',
    canticoInicial: 102,
    oracaoInicial: 'Dhiego L.',
    comentariosIniciaisMin: 1,
    tesourosSalao: 'Salão principal',
    discursoTesourosTitulo: 'Continuem ajudando uns aos outros',
    discursoTesourosTempoMin: 10,
    discursoTesourosIrmao: 'Marcelo F.',
    joiasEspirituaisIrmao: 'Pedro M.',
    joiasEspirituaisTempoMin: 10,
    leituraBibliaIrmao: 'George S.',
    leituraBibliaTempoMin: 4,
    ministerioSalao: 'Salão principal',
    partesMinisterio: [
      {
        id: 'pm-4-1',
        numero: 4,
        titulo: 'Iniciando conversas',
        tempoMin: 3,
        designado: 'Adriana S.',
        ajudante: 'Maria Carrilho',
      },
      {
        id: 'pm-4-2',
        numero: 5,
        titulo: 'Cultivando o interesse',
        tempoMin: 4,
        designado: 'Maria Eduarda',
        ajudante: 'Michele C.',
      },
      {
        id: 'pm-4-3',
        numero: 6,
        titulo: 'O que você diria ?',
        tempoMin: 6,
        designado: 'Danilo Cardoso',
      },
    ],
    canticoMeio: 90,
    partesVidaCrista: [
      {
        id: 'pvc-4-1',
        numero: 7,
        titulo: '“Quem me tocou?’',
        tempoMin: 15,
        designado: 'Hermes B.',
      },
    ],
    estudoBiblicoTempoMin: 30,
    estudoBiblicoDirigente: 'Vilson M',
    estudoBiblicoLeitor: 'Valdemir',
    comentariosFinaisMin: 3,
    canticoFinal: 56,
    oracaoFinal: 'Marcelo F.',
  },
];

export function getStoredS140TSemanas(): S140TSemana[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_S140T);
    if (!raw) {
      // Primeira inicialização: salvar os dados oficiais do documento
      localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(S140T_DADOS_PADRAO));
      return S140T_DADOS_PADRAO;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(S140T_DADOS_PADRAO));
      return S140T_DADOS_PADRAO;
    }
    return parsed;
  } catch {
    return S140T_DADOS_PADRAO;
  }
}

export function saveS140TSemana(semana: S140TSemana): { success: boolean; error?: string; data?: S140TSemana[] } {
  if (!isAdminAuthenticated()) {
    return { success: false, error: 'Apenas o irmão responsável pode criar ou alterar designações.' };
  }

  try {
    const current = getStoredS140TSemanas();
    const existingIndex = current.findIndex((s) => s.id === semana.id);
    const now = new Date().toISOString();

    let updated: S140TSemana[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = {
        ...semana,
        atualizadoEm: now,
      };
    } else {
      updated = [
        ...current,
        {
          ...semana,
          criadoEm: now,
          atualizadoEm: now,
        },
      ];
    }

    // Ordenar cronologicamente por dataReferencia
    updated.sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia));

    localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(updated));
    // Sincronizar com a nuvem Firebase
    firebaseSync.saveS140TSemana(semana);
    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Erro ao salvar a programação no armazenamento local.' };
  }
}

export function deleteS140TSemana(id: string): { success: boolean; error?: string; data?: S140TSemana[] } {
  if (!isAdminAuthenticated()) {
    return { success: false, error: 'Apenas o irmão responsável pode excluir designações.' };
  }

  try {
    const current = getStoredS140TSemanas();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(updated));
    // Sincronizar exclusão com a nuvem Firebase
    firebaseSync.deleteS140TSemana(id);
    return { success: true, data: updated };
  } catch {
    return { success: false, error: 'Erro ao excluir a semana no armazenamento local.' };
  }
}

export function resetS140TToSample(): S140TSemana[] {
  if (!isAdminAuthenticated()) return getStoredS140TSemanas();
  localStorage.setItem(STORAGE_KEY_S140T, JSON.stringify(S140T_DADOS_PADRAO));
  firebaseSync.resetS140TToOfficial();
  return S140T_DADOS_PADRAO;
}

// Extrai todos os nomes únicos de publicadores/irmãos presentes nas designações
export function extrairTodosNomesDesignados(semanas: S140TSemana[]): string[] {
  const nomesSet = new Set<string>();

  semanas.forEach((sem) => {
    if (sem.presidente) nomesSet.add(sem.presidente.trim());
    if (sem.oracaoInicial) nomesSet.add(sem.oracaoInicial.trim());
    if (sem.discursoTesourosIrmao) nomesSet.add(sem.discursoTesourosIrmao.trim());
    if (sem.joiasEspirituaisIrmao) nomesSet.add(sem.joiasEspirituaisIrmao.trim());
    if (sem.leituraBibliaIrmao) nomesSet.add(sem.leituraBibliaIrmao.trim());

    sem.partesMinisterio?.forEach((pm) => {
      if (pm.designado) nomesSet.add(pm.designado.trim());
      if (pm.ajudante) nomesSet.add(pm.ajudante.trim());
    });

    sem.partesVidaCrista?.forEach((pvc) => {
      if (pvc.designado) nomesSet.add(pvc.designado.trim());
    });

    if (sem.estudoBiblicoDirigente) nomesSet.add(sem.estudoBiblicoDirigente.trim());
    if (sem.estudoBiblicoLeitor) nomesSet.add(sem.estudoBiblicoLeitor.trim());
    if (sem.oracaoFinal) nomesSet.add(sem.oracaoFinal.trim());
  });

  return Array.from(nomesSet).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

// Verifica se um irmão está designado em uma parte específica
export function verificarDesignacaoIrmao(
  nomeProcurado: string | null | undefined,
  nomeCampo: string | null | undefined
): boolean {
  if (!nomeProcurado || !nomeCampo) return false;
  const proc = nomeProcurado.trim().toLowerCase();
  const campo = nomeCampo.trim().toLowerCase();
  if (proc === campo) return true;
  // Casos compostos tipo "Eliane Chaves/Elizete O." ou "Danilo C/Gustavo L"
  if (campo.includes('/')) {
    const partes = campo.split('/').map((p) => p.trim());
    return partes.some((p) => p === proc || proc.includes(p) || p.includes(proc));
  }
  return campo.includes(proc) || proc.includes(campo);
}
