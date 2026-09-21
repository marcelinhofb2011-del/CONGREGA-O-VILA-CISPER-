import { firebaseSync } from './firebaseSyncService';

export interface LimpezaEscalaItem {
  id: string;
  mes: string; // Ex: 'Janeiro', 'Fevereiro', etc.
  mesChave: string; // 'janeiro', 'fevereiro', etc.
  dias: string; // Ex: '4', '7/11', '14/18'
  diasSemana: string; // Ex: 'Quarta Feira e Domingo'
  grupo: string; // Ex: 'GRUPO 2', 'GRUPO 1', 'GRUPO 3'
  responsaveis: string; // Ex: 'AIRTON E DHIEGO', 'SAMUEL E GEOVANE'
  observacao?: string; // Ex: 'Assembléia', 'Congresso'
  ehEspecial?: boolean;
}

export interface GrupoLimpezaMembros {
  id: string;
  numero: number;
  nomeGrupo: string; // Ex: 'GRUPO 1 / Salão do reino'
  superintendentes: string; // Ex: 'Samuel / Geovane / Hugo'
  membros: string[]; // Lista de nomes
}

export interface LimpezaDesignacao {
  id: string;
  dataPeriodo: string;
  area: string;
  responsavel: string;
  observacao?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export const STORAGE_KEY_LIMPEZA_ESCALAS = 'vila_cisper_limpeza_escalas_2026';
const STORAGE_KEY_GRUPOS_LIMPEZA = 'vila_cisper_limpeza_grupos_2026';

export const GRUPOS_LIMPEZA_CANONICOS: GrupoLimpezaMembros[] = [
  {
    id: 'grp-1',
    numero: 1,
    nomeGrupo: 'GRUPO 1 / Salão do reino',
    superintendentes: 'Samuel / Geovane / Hugo',
    membros: [
      'Samuel Aparecido',
      'Isabelly Machado',
      'Yasmin Machado',
      'Alessandra Machado',
      'Maria Alice Borges Santos',
      'Geovane Souza',
      'Carina Souza',
      'Hugo Borges',
      'Paula Borges',
      'Vanderlei Silvério',
      'Thainá Mendonça',
      'Bruno Mansini',
      'Hermes Bertucci',
      'Simone Bertucci',
      'Tereza Aparecido',
      'Mirna Silvério',
      'Alessandra Santana',
      'Nicoly Santana',
      'Lindival Gomes da Silva',
      'Luciana dos Anjos',
      'Leonice Batista',
      'Rose Mary Santana',
      'Mirian Santiago',
      'Miriele Santiago',
      'Silvanir Santos',
      'Tereza Zanão',
      'Raquel Uchoa',
      'Maria Lourdes Sobral',
      'Elizete Bonato',
      'Irene Zanini',
      'Inês Santos',
    ],
  },
  {
    id: 'grp-2',
    numero: 2,
    nomeGrupo: 'GRUPO 2 / Leitão',
    superintendentes: 'Airton / Kleber / Dhiego',
    membros: [
      'Airton Sales',
      'Cleide Lima',
      'Camila Lima',
      'Kleber Santos',
      'Adriana Santos',
      'Marcelo Ferreira',
      'Angela Albuquerque',
      'Fernando Mendes',
      'Karina Mendes',
      'Pedro Mendes',
      'Priscila Braga',
      'Josefa',
      'Elizete Oliveira',
      'Maria Brito',
      'Vanessa Ferreira',
      'Leandro Leitão',
      'Maria Leitão',
      'Emília Brito',
      'Maria Carrilho',
      'Michelle Carrilho',
      'Aparecida Tolloto',
      'George da Silva',
      'Ana Paula',
      'Fernanda Silva Pereira',
      'Lordes Laura Silva Pereira',
      'Maria Antonia Silva Pereira',
      'João Brito',
      'Matheus Brito',
      'Karoline Brito',
      'Wilmar Mendonça',
      'Francisca Mendonça',
      'Diego Oliveira Pires',
      'Gustavo Lins',
      'Guilherme Lins',
      'Dhiego Lins',
      'Nieda Lins',
      'Bernardo Lins',
      'Natalia dos Santos',
    ],
  },
  {
    id: 'grp-3',
    numero: 3,
    nomeGrupo: 'GRUPO 3 / Gedalva',
    superintendentes: 'Danilo / Vilson / Kleber',
    membros: [
      'Danilo Cardoso',
      'Juliana Cardoso',
      'Vilson Malta',
      'Leidiane Moraes Malta',
      'Antônio Jr',
      'Danilo Maia',
      'Sandra Maia',
      'Mariete Santos',
      'Neuza Chagas',
      'Paulo Spina',
      'Patrícia Spina',
      'Júlio Spina',
      'Fabiana Macedo',
      'Ana Carolina Spina',
      'Neuma Bernadine',
      'Gedalva Silva',
      'Valdemir Oliveira',
      'Luzienete Oliveira',
      'Laura Valeria Bertaco',
      'Maiara Braga',
      'Maria do Carmo Dantas',
      'Vera Lucia',
      'Kleber Santos',
      'Adriana Santos',
      'Matheus Brito',
      'João Pedro',
      'Karoline Brito',
    ],
  },
];

export const LIMPEZA_ESCALAS_CANONICAS: LimpezaEscalaItem[] = [
  // JANEIRO
  { id: 'limp-jan-1', mes: 'Janeiro', mesChave: 'janeiro', dias: '4', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E DHIEGO' },
  { id: 'limp-jan-2', mes: 'Janeiro', mesChave: 'janeiro', dias: '7/11', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-jan-3', mes: 'Janeiro', mesChave: 'janeiro', dias: '14/18', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-jan-4', mes: 'Janeiro', mesChave: 'janeiro', dias: '21/25', diasSemana: 'Assembléia', grupo: 'Assembléia', responsaveis: 'Assembléia', ehEspecial: true, observacao: 'Assembléia' },
  { id: 'limp-jan-5', mes: 'Janeiro', mesChave: 'janeiro', dias: '28', diasSemana: 'Quarta Feira', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },

  // FEVEREIRO
  { id: 'limp-fev-1', mes: 'Fevereiro', mesChave: 'fevereiro', dias: '1', diasSemana: 'Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-fev-2', mes: 'Fevereiro', mesChave: 'fevereiro', dias: '04/08', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-fev-3', mes: 'Fevereiro', mesChave: 'fevereiro', dias: '11/15', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-fev-4', mes: 'Fevereiro', mesChave: 'fevereiro', dias: '18/22', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-fev-5', mes: 'Fevereiro', mesChave: 'fevereiro', dias: '25', diasSemana: 'Quarta Feira', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },

  // MARÇO
  { id: 'limp-mar-1', mes: 'Março', mesChave: 'marco', dias: '1', diasSemana: 'Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-mar-2', mes: 'Março', mesChave: 'marco', dias: '04/08', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-mar-3', mes: 'Março', mesChave: 'marco', dias: '11/15', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-mar-4', mes: 'Março', mesChave: 'marco', dias: '18/22', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-mar-5', mes: 'Março', mesChave: 'marco', dias: '25/29', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },

  // ABRIL
  { id: 'limp-abr-1', mes: 'Abril', mesChave: 'abril', dias: '02/05', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-abr-2', mes: 'Abril', mesChave: 'abril', dias: '9/12', diasSemana: 'Quinta-Feira e Sábado', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-abr-3', mes: 'Abril', mesChave: 'abril', dias: '16/19', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-abr-4', mes: 'Abril', mesChave: 'abril', dias: '23/26', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-abr-5', mes: 'Abril', mesChave: 'abril', dias: '30', diasSemana: 'Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },

  // MAIO
  { id: 'limp-mai-1', mes: 'Maio', mesChave: 'maio', dias: '3', diasSemana: 'Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-mai-2', mes: 'Maio', mesChave: 'maio', dias: '07/10', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-mai-3', mes: 'Maio', mesChave: 'maio', dias: '14/17', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-mai-4', mes: 'Maio', mesChave: 'maio', dias: '21/24', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-mai-5', mes: 'Maio', mesChave: 'maio', dias: '28/31', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },

  // JUNHO
  { id: 'limp-jun-1', mes: 'Junho', mesChave: 'junho', dias: '04/07', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-jun-2', mes: 'Junho', mesChave: 'junho', dias: '11/14', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-jun-3', mes: 'Junho', mesChave: 'junho', dias: '18/21', diasSemana: 'CONGRESSO', grupo: 'CONGRESSO', responsaveis: 'CONGRESSO', ehEspecial: true, observacao: 'Congresso' },
  { id: 'limp-jun-4', mes: 'Junho', mesChave: 'junho', dias: '25/28', diasSemana: 'Quarta Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },

  // JULHO
  { id: 'limp-jul-1', mes: 'Julho', mesChave: 'julho', dias: '02/05', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-jul-2', mes: 'Julho', mesChave: 'julho', dias: '09/12', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-jul-3', mes: 'Julho', mesChave: 'julho', dias: '16/19', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-jul-4', mes: 'Julho', mesChave: 'julho', dias: '23/26', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-jul-5', mes: 'Julho', mesChave: 'julho', dias: '30', diasSemana: 'Quinta-Feira', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },

  // AGOSTO
  { id: 'limp-ago-1', mes: 'Agosto', mesChave: 'agosto', dias: '2', diasSemana: 'Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-ago-2', mes: 'Agosto', mesChave: 'agosto', dias: '06/09', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-ago-3', mes: 'Agosto', mesChave: 'agosto', dias: '13/16', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-ago-4', mes: 'Agosto', mesChave: 'agosto', dias: '20/23', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-ago-5', mes: 'Agosto', mesChave: 'agosto', dias: '27/30', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },

  // SETEMBRO
  { id: 'limp-set-1', mes: 'Setembro', mesChave: 'setembro', dias: '03/06', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },
  { id: 'limp-set-2', mes: 'Setembro', mesChave: 'setembro', dias: '10/13', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL E GEOVANE' },
  { id: 'limp-set-3', mes: 'Setembro', mesChave: 'setembro', dias: '15/20', diasSemana: 'Terça-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E KLEBER' },
  { id: 'limp-set-4', mes: 'Setembro', mesChave: 'setembro', dias: '24/27', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO E VILSON' },

  // OUTUBRO
  { id: 'limp-out-1', mes: 'Outubro', mesChave: 'outubro', dias: '01/04', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL / GEOVANE / HUGO' },
  { id: 'limp-out-2', mes: 'Outubro', mesChave: 'outubro', dias: '8/11', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E DHIEGO' },
  { id: 'limp-out-3', mes: 'Outubro', mesChave: 'outubro', dias: '15/18', diasSemana: 'Assembléia', grupo: 'Assembléia', responsaveis: 'Assembléia', ehEspecial: true, observacao: 'Assembléia' },
  { id: 'limp-out-4', mes: 'Outubro', mesChave: 'outubro', dias: '22/25', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO / VILSON / KLEBER' },
  { id: 'limp-out-5', mes: 'Outubro', mesChave: 'outubro', dias: '29', diasSemana: 'Quinta-Feira', grupo: 'GRUPO 1', responsaveis: 'SAMUEL / GEOVANE / HUGO' },

  // NOVEMBRO
  { id: 'limp-nov-1', mes: 'Novembro', mesChave: 'novembro', dias: '1', diasSemana: 'Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL / GEOVANE / HUGO' },
  { id: 'limp-nov-2', mes: 'Novembro', mesChave: 'novembro', dias: '05/08', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E DHIEGO' },
  { id: 'limp-nov-3', mes: 'Novembro', mesChave: 'novembro', dias: '12/15', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO / VILSON / KLEBER' },
  { id: 'limp-nov-4', mes: 'Novembro', mesChave: 'novembro', dias: '19/22', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL / GEOVANE / HUGO' },
  { id: 'limp-nov-5', mes: 'Novembro', mesChave: 'novembro', dias: '26/29', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E DHIEGO' },

  // DEZEMBRO
  { id: 'limp-dez-1', mes: 'Dezembro', mesChave: 'dezembro', dias: '03/06', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO / VILSON / KLEBER' },
  { id: 'limp-dez-2', mes: 'Dezembro', mesChave: 'dezembro', dias: '10/13', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL / GEOVANE / HUGO' },
  { id: 'limp-dez-3', mes: 'Dezembro', mesChave: 'dezembro', dias: '17/20', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 2', responsaveis: 'AIRTON E DHIEGO' },
  { id: 'limp-dez-4', mes: 'Dezembro', mesChave: 'dezembro', dias: '24/27', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 3', responsaveis: 'DANILO / VILSON / KLEBER' },
  { id: 'limp-dez-5', mes: 'Dezembro', mesChave: 'dezembro', dias: '31', diasSemana: 'Quinta-Feira e Domingo', grupo: 'GRUPO 1', responsaveis: 'SAMUEL / GEOVANE / HUGO' },
];

export function getStoredLimpezaEscalas(): LimpezaEscalaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIMPEZA_ESCALAS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(LIMPEZA_ESCALAS_CANONICAS));
      return LIMPEZA_ESCALAS_CANONICAS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : LIMPEZA_ESCALAS_CANONICAS;
  } catch {
    return LIMPEZA_ESCALAS_CANONICAS;
  }
}

export const getStoredLimpezaEscala = getStoredLimpezaEscalas;

export function saveStoredLimpezaEscala(item: LimpezaEscalaItem): { success: boolean; data?: LimpezaEscalaItem[]; error?: string } {
  try {
    const current = getStoredLimpezaEscalas();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: LimpezaEscalaItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(updated));
    firebaseSync.saveAllLimpeza(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteStoredLimpezaEscala(id: string): { success: boolean; data?: LimpezaEscalaItem[]; error?: string } {
  try {
    const current = getStoredLimpezaEscalas();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(updated));
    firebaseSync.saveAllLimpeza(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function saveBulkLimpezaEscala(
  newItems: LimpezaEscalaItem[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonthKey?: string | string[]
): { success: boolean; data?: LimpezaEscalaItem[]; error?: string; count?: number } {
  try {
    const current = getStoredLimpezaEscalas();
    let updated: LimpezaEscalaItem[];

    if (mode === 'replace_all') {
      updated = [...newItems];
    } else if (mode === 'replace_month' && targetMonthKey) {
      const keys = Array.isArray(targetMonthKey) ? new Set(targetMonthKey) : new Set([targetMonthKey]);
      const filtered = current.filter((item) => !keys.has(item.mesChave));
      updated = [...filtered, ...newItems];
    } else {
      const existingIds = new Set(current.map((i) => i.id));
      const filteredNew = newItems.map((item) => {
        if (existingIds.has(item.id)) {
          return { ...item, id: `limp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
        }
        return item;
      });
      updated = [...current, ...filteredNew];
    }

    localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(updated));
    firebaseSync.saveAllLimpeza(updated);
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function resetLimpezaToSample(): LimpezaEscalaItem[] {
  localStorage.setItem(STORAGE_KEY_LIMPEZA_ESCALAS, JSON.stringify(LIMPEZA_ESCALAS_CANONICAS));
  firebaseSync.saveAllLimpeza(LIMPEZA_ESCALAS_CANONICAS);
  return LIMPEZA_ESCALAS_CANONICAS;
}

export function getStoredGruposMembros(): GrupoLimpezaMembros[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GRUPOS_LIMPEZA);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_GRUPOS_LIMPEZA, JSON.stringify(GRUPOS_LIMPEZA_CANONICOS));
      return GRUPOS_LIMPEZA_CANONICOS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : GRUPOS_LIMPEZA_CANONICOS;
  } catch {
    return GRUPOS_LIMPEZA_CANONICOS;
  }
}

// Retrocompatibilidade
export function getStoredLimpeza(): LimpezaDesignacao[] {
  return [];
}
export function saveStoredLimpeza(l: LimpezaDesignacao): LimpezaDesignacao[] {
  return [];
}
export function deleteStoredLimpeza(id: string): LimpezaDesignacao[] {
  return [];
}
export function getStoredAreas(): string[] {
  return ['Salão Principal', 'Banheiros', 'Área Externa'];
}
export function addStoredArea(a: string): string[] {
  return ['Salão Principal', 'Banheiros', 'Área Externa'];
}
