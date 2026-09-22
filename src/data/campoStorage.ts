export interface CampoDiaSemanaItem {
  diaSemana: string;
  dirigente: string;
  horario: string;
  localOuNota?: string;
}

import { firebaseSync } from './firebaseSyncService';

export interface CampoFimDeSemanaItem {
  id: string;
  mes: string; // Ex: 'Janeiro', 'Fevereiro'
  mesChave: string; // 'janeiro', 'fevereiro'
  data: string; // Ex: '03/01'
  diaSemana: 'Sábado' | 'Domingo';
  dirigente: string; // Ex: 'Dhiego', 'Samuel (Todos os grupos no salão)', 'Assembléia de Circuito'
  observacao?: string;
  ehEspecial?: boolean;
}

export interface CampoGrupo {
  id: string;
  nomeGrupo: string;
  diaData: string;
  horario: string;
  local: string;
  responsavel: string;
  observacao?: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export const STORAGE_KEY_CAMPO_FDS = 'vila_cisper_campo_fds_2026';
const STORAGE_KEY_CAMPO_SEMANA = 'vila_cisper_campo_semana_2026';

export const DIAS_SEMANA_CAMPO_CANONICO: CampoDiaSemanaItem[] = [
  { diaSemana: 'Segunda', dirigente: 'Carrinho', horario: '18:00', localOuNota: 'Ponto do Carrinho' },
  { diaSemana: 'Terça', dirigente: 'Zoom', horario: '19:30', localOuNota: 'Reunião via Zoom' },
  { diaSemana: 'Quarta', dirigente: 'Pedro Mendes / Silvani Siva / Airton Sales', horario: '09:15 / 15:30', localOuNota: 'Casa da Maria José Silva' },
  { diaSemana: 'Quinta', dirigente: 'Silvani / Valdemir / Pedro Mendes', horario: '15:30 / 09:15', localOuNota: 'Casa da Tereza Aparecido' },
  { diaSemana: 'Sexta', dirigente: 'Hermes Bertucci', horario: '09:15', localOuNota: 'Casa da Tereza Aparecido' },
];

export const CAMPO_FDS_CANONICO: CampoFimDeSemanaItem[] = [
  // JANEIRO
  { id: 'c-jan-1', mes: 'Janeiro', mesChave: 'janeiro', data: '03/01', diaSemana: 'Sábado', dirigente: 'Dhiego' },
  { id: 'c-jan-2', mes: 'Janeiro', mesChave: 'janeiro', data: '04/01', diaSemana: 'Domingo', dirigente: 'Samuel (Todos os grupos no salão)' },
  { id: 'c-jan-3', mes: 'Janeiro', mesChave: 'janeiro', data: '10/01', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-jan-4', mes: 'Janeiro', mesChave: 'janeiro', data: '11/01', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jan-5', mes: 'Janeiro', mesChave: 'janeiro', data: '17/01', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-jan-6', mes: 'Janeiro', mesChave: 'janeiro', data: '18/01', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jan-7', mes: 'Janeiro', mesChave: 'janeiro', data: '24/01', diaSemana: 'Sábado', dirigente: 'Assembléia de Circuito', ehEspecial: true },
  { id: 'c-jan-8', mes: 'Janeiro', mesChave: 'janeiro', data: '25/01', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jan-9', mes: 'Janeiro', mesChave: 'janeiro', data: '31/01', diaSemana: 'Sábado', dirigente: 'Fernando' },

  // FEVEREIRO
  { id: 'c-fev-1', mes: 'Fevereiro', mesChave: 'fevereiro', data: '01/02', diaSemana: 'Domingo', dirigente: 'Kleber (Todos os grupos no salão)' },
  { id: 'c-fev-2', mes: 'Fevereiro', mesChave: 'fevereiro', data: '07/02', diaSemana: 'Sábado', dirigente: 'Kleber' },
  { id: 'c-fev-3', mes: 'Fevereiro', mesChave: 'fevereiro', data: '08/02', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-fev-4', mes: 'Fevereiro', mesChave: 'fevereiro', data: '14/02', diaSemana: 'Sábado', dirigente: 'Geovane' },
  { id: 'c-fev-5', mes: 'Fevereiro', mesChave: 'fevereiro', data: '15/02', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-fev-6', mes: 'Fevereiro', mesChave: 'fevereiro', data: '21/02', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-fev-7', mes: 'Fevereiro', mesChave: 'fevereiro', data: '22/02', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-fev-8', mes: 'Fevereiro', mesChave: 'fevereiro', data: '28/02', diaSemana: 'Sábado', dirigente: 'Vilson' },

  // MARÇO
  { id: 'c-mar-1', mes: 'Março', mesChave: 'marco', data: '01/03', diaSemana: 'Domingo', dirigente: 'Danilo (Todos os grupos no salão)' },
  { id: 'c-mar-2', mes: 'Março', mesChave: 'marco', data: '07/03', diaSemana: 'Sábado', dirigente: 'Hugo' },
  { id: 'c-mar-3', mes: 'Março', mesChave: 'marco', data: '08/03', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-mar-4', mes: 'Março', mesChave: 'marco', data: '14/03', diaSemana: 'Sábado', dirigente: 'Danilo' },
  { id: 'c-mar-5', mes: 'Março', mesChave: 'marco', data: '15/03', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-mar-6', mes: 'Março', mesChave: 'marco', data: '21/03', diaSemana: 'Sábado', dirigente: 'Expedito viajante', ehEspecial: true },
  { id: 'c-mar-7', mes: 'Março', mesChave: 'marco', data: '22/03', diaSemana: 'Domingo', dirigente: 'Expedito viajante', ehEspecial: true },
  { id: 'c-mar-8', mes: 'Março', mesChave: 'marco', data: '28/03', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-mar-9', mes: 'Março', mesChave: 'marco', data: '29/03', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // ABRIL
  { id: 'c-abr-1', mes: 'Abril', mesChave: 'abril', data: '04/04', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-abr-2', mes: 'Abril', mesChave: 'abril', data: '05/04', diaSemana: 'Domingo', dirigente: 'Vilson (Todos os grupos no salão)' },
  { id: 'c-abr-3', mes: 'Abril', mesChave: 'abril', data: '11/04', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-abr-4', mes: 'Abril', mesChave: 'abril', data: '12/04', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-abr-5', mes: 'Abril', mesChave: 'abril', data: '18/04', diaSemana: 'Sábado', dirigente: 'Kleber' },
  { id: 'c-abr-6', mes: 'Abril', mesChave: 'abril', data: '19/04', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-abr-7', mes: 'Abril', mesChave: 'abril', data: '25/04', diaSemana: 'Sábado', dirigente: 'Geovane' },
  { id: 'c-abr-8', mes: 'Abril', mesChave: 'abril', data: '26/04', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // MAIO
  { id: 'c-mai-1', mes: 'Maio', mesChave: 'maio', data: '02/05', diaSemana: 'Sábado', dirigente: 'Vilson' },
  { id: 'c-mai-2', mes: 'Maio', mesChave: 'maio', data: '03/05', diaSemana: 'Domingo', dirigente: 'Geovane (Todos os grupos no salão)' },
  { id: 'c-mai-3', mes: 'Maio', mesChave: 'maio', data: '09/05', diaSemana: 'Sábado', dirigente: 'Hugo' },
  { id: 'c-mai-4', mes: 'Maio', mesChave: 'maio', data: '10/05', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-mai-5', mes: 'Maio', mesChave: 'maio', data: '16/05', diaSemana: 'Sábado', dirigente: 'Danilo' },
  { id: 'c-mai-6', mes: 'Maio', mesChave: 'maio', data: '17/05', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-mai-7', mes: 'Maio', mesChave: 'maio', data: '23/05', diaSemana: 'Sábado', dirigente: 'Samuel' },
  { id: 'c-mai-8', mes: 'Maio', mesChave: 'maio', data: '24/05', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-mai-9', mes: 'Maio', mesChave: 'maio', data: '30/05', diaSemana: 'Sábado', dirigente: 'Dhiego' },
  { id: 'c-mai-10', mes: 'Maio', mesChave: 'maio', data: '31/05', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // JUNHO
  { id: 'c-jun-1', mes: 'Junho', mesChave: 'junho', data: '06/06', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-jun-2', mes: 'Junho', mesChave: 'junho', data: '07/06', diaSemana: 'Domingo', dirigente: 'Hugo (Todos os grupos no salão)' },
  { id: 'c-jun-3', mes: 'Junho', mesChave: 'junho', data: '13/06', diaSemana: 'Sábado', dirigente: 'Kleber' },
  { id: 'c-jun-4', mes: 'Junho', mesChave: 'junho', data: '14/06', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jun-5', mes: 'Junho', mesChave: 'junho', data: '20/06', diaSemana: 'Sábado', dirigente: 'Congresso', ehEspecial: true },
  { id: 'c-jun-6', mes: 'Junho', mesChave: 'junho', data: '21/06', diaSemana: 'Domingo', dirigente: 'Congresso', ehEspecial: true },
  { id: 'c-jun-7', mes: 'Junho', mesChave: 'junho', data: '27/06', diaSemana: 'Sábado', dirigente: 'Geovane' },
  { id: 'c-jun-8', mes: 'Junho', mesChave: 'junho', data: '28/06', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // JULHO
  { id: 'c-jul-1', mes: 'Julho', mesChave: 'julho', data: '04/07', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-jul-2', mes: 'Julho', mesChave: 'julho', data: '05/07', diaSemana: 'Domingo', dirigente: 'Dhiego (Todos os grupos no salão)' },
  { id: 'c-jul-3', mes: 'Julho', mesChave: 'julho', data: '11/07', diaSemana: 'Sábado', dirigente: 'Vilson' },
  { id: 'c-jul-4', mes: 'Julho', mesChave: 'julho', data: '12/07', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jul-5', mes: 'Julho', mesChave: 'julho', data: '18/07', diaSemana: 'Sábado', dirigente: 'Hugo' },
  { id: 'c-jul-6', mes: 'Julho', mesChave: 'julho', data: '19/07', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-jul-7', mes: 'Julho', mesChave: 'julho', data: '25/07', diaSemana: 'Sábado', dirigente: 'Danilo' },
  { id: 'c-jul-8', mes: 'Julho', mesChave: 'julho', data: '26/07', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // AGOSTO
  { id: 'c-ago-1', mes: 'Agosto', mesChave: 'agosto', data: '01/08', diaSemana: 'Sábado', dirigente: 'Samuel' },
  { id: 'c-ago-2', mes: 'Agosto', mesChave: 'agosto', data: '02/08', diaSemana: 'Domingo', dirigente: 'Samuel (Todos os grupos no salão)' },
  { id: 'c-ago-3', mes: 'Agosto', mesChave: 'agosto', data: '08/08', diaSemana: 'Sábado', dirigente: 'Dhiego' },
  { id: 'c-ago-4', mes: 'Agosto', mesChave: 'agosto', data: '09/08', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-ago-5', mes: 'Agosto', mesChave: 'agosto', data: '15/08', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-ago-6', mes: 'Agosto', mesChave: 'agosto', data: '16/08', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-ago-7', mes: 'Agosto', mesChave: 'agosto', data: '22/08', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-ago-8', mes: 'Agosto', mesChave: 'agosto', data: '23/08', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-ago-9', mes: 'Agosto', mesChave: 'agosto', data: '29/08', diaSemana: 'Sábado', dirigente: 'Kleber' },
  { id: 'c-ago-10', mes: 'Agosto', mesChave: 'agosto', data: '30/08', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // SETEMBRO
  { id: 'c-set-1', mes: 'Setembro', mesChave: 'setembro', data: '05/09', diaSemana: 'Sábado', dirigente: 'Geovane' },
  { id: 'c-set-2', mes: 'Setembro', mesChave: 'setembro', data: '06/09', diaSemana: 'Domingo', dirigente: 'Kleber (Todos os grupos no salão)' },
  { id: 'c-set-3', mes: 'Setembro', mesChave: 'setembro', data: '12/09', diaSemana: 'Sábado', dirigente: 'Vilson' },
  { id: 'c-set-4', mes: 'Setembro', mesChave: 'setembro', data: '13/09', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-set-5', mes: 'Setembro', mesChave: 'setembro', data: '19/09', diaSemana: 'Sábado', dirigente: 'Viajante Expedito', ehEspecial: true },
  { id: 'c-set-6', mes: 'Setembro', mesChave: 'setembro', data: '20/09', diaSemana: 'Domingo', dirigente: 'Viajante Expedito', ehEspecial: true },
  { id: 'c-set-7', mes: 'Setembro', mesChave: 'setembro', data: '26/09', diaSemana: 'Sábado', dirigente: 'Danilo' },
  { id: 'c-set-8', mes: 'Setembro', mesChave: 'setembro', data: '27/09', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // OUTUBRO
  { id: 'c-out-1', mes: 'Outubro', mesChave: 'outubro', data: '03/10', diaSemana: 'Sábado', dirigente: 'Samuel' },
  { id: 'c-out-2', mes: 'Outubro', mesChave: 'outubro', data: '04/10', diaSemana: 'Domingo', dirigente: 'Danilo (Todos os grupos no salão)' },
  { id: 'c-out-3', mes: 'Outubro', mesChave: 'outubro', data: '10/10', diaSemana: 'Sábado', dirigente: 'Dhiego' },
  { id: 'c-out-4', mes: 'Outubro', mesChave: 'outubro', data: '11/10', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-out-5', mes: 'Outubro', mesChave: 'outubro', data: '17/10', diaSemana: 'Sábado', dirigente: 'Airton' },
  { id: 'c-out-6', mes: 'Outubro', mesChave: 'outubro', data: '18/10', diaSemana: 'Domingo', dirigente: 'Assembléia', ehEspecial: true },
  { id: 'c-out-7', mes: 'Outubro', mesChave: 'outubro', data: '24/10', diaSemana: 'Sábado', dirigente: 'Marcelo' },
  { id: 'c-out-8', mes: 'Outubro', mesChave: 'outubro', data: '25/10', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-out-9', mes: 'Outubro', mesChave: 'outubro', data: '31/10', diaSemana: 'Sábado', dirigente: 'Kleber' },

  // NOVEMBRO
  { id: 'c-nov-1', mes: 'Novembro', mesChave: 'novembro', data: '01/11', diaSemana: 'Domingo', dirigente: 'Vilson (Todos os grupos no salão)' },
  { id: 'c-nov-2', mes: 'Novembro', mesChave: 'novembro', data: '07/11', diaSemana: 'Sábado', dirigente: 'Geovane' },
  { id: 'c-nov-3', mes: 'Novembro', mesChave: 'novembro', data: '08/11', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-nov-4', mes: 'Novembro', mesChave: 'novembro', data: '14/11', diaSemana: 'Sábado', dirigente: 'Hermes' },
  { id: 'c-nov-5', mes: 'Novembro', mesChave: 'novembro', data: '15/11', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-nov-6', mes: 'Novembro', mesChave: 'novembro', data: '21/11', diaSemana: 'Sábado', dirigente: 'Vilson' },
  { id: 'c-nov-7', mes: 'Novembro', mesChave: 'novembro', data: '22/11', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-nov-8', mes: 'Novembro', mesChave: 'novembro', data: '28/11', diaSemana: 'Sábado', dirigente: 'Hugo' },
  { id: 'c-nov-9', mes: 'Novembro', mesChave: 'novembro', data: '29/11', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },

  // DEZEMBRO
  { id: 'c-dez-1', mes: 'Dezembro', mesChave: 'dezembro', data: '05/12', diaSemana: 'Sábado', dirigente: 'Danilo' },
  { id: 'c-dez-2', mes: 'Dezembro', mesChave: 'dezembro', data: '06/12', diaSemana: 'Domingo', dirigente: 'Geovane (Todos os grupos no salão)' },
  { id: 'c-dez-3', mes: 'Dezembro', mesChave: 'dezembro', data: '12/12', diaSemana: 'Sábado', dirigente: 'Samuel' },
  { id: 'c-dez-4', mes: 'Dezembro', mesChave: 'dezembro', data: '13/12', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-dez-5', mes: 'Dezembro', mesChave: 'dezembro', data: '19/12', diaSemana: 'Sábado', dirigente: 'Dhiego' },
  { id: 'c-dez-6', mes: 'Dezembro', mesChave: 'dezembro', data: '20/12', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
  { id: 'c-dez-7', mes: 'Dezembro', mesChave: 'dezembro', data: '26/12', diaSemana: 'Sábado', dirigente: 'Airton' },
  { id: 'c-dez-8', mes: 'Dezembro', mesChave: 'dezembro', data: '27/12', diaSemana: 'Domingo', dirigente: 'Superintendente do Grupo' },
];

export function getStoredCampoFds(): CampoFimDeSemanaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPO_FDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(CAMPO_FDS_CANONICO));
      return CAMPO_FDS_CANONICO;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CAMPO_FDS_CANONICO;
  } catch {
    return CAMPO_FDS_CANONICO;
  }
}

export function saveStoredCampoFdsItem(item: CampoFimDeSemanaItem): { success: boolean; data?: CampoFimDeSemanaItem[]; error?: string } {
  try {
    const current = getStoredCampoFds();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: CampoFimDeSemanaItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(updated));
    firebaseSync.saveAllCampo(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteStoredCampoFdsItem(id: string): { success: boolean; data?: CampoFimDeSemanaItem[]; error?: string } {
  try {
    const current = getStoredCampoFds();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(updated));
    firebaseSync.saveAllCampo(updated);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function saveBulkCampoFds(
  newItems: CampoFimDeSemanaItem[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonthKey?: string | string[]
): { success: boolean; data?: CampoFimDeSemanaItem[]; error?: string; count?: number } {
  try {
    const current = getStoredCampoFds();
    let updated: CampoFimDeSemanaItem[];

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
          return { ...item, id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
        }
        return item;
      });
      updated = [...current, ...filteredNew];
    }

    localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(updated));
    firebaseSync.saveAllCampo(updated);
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function resetCampoToSample(): CampoFimDeSemanaItem[] {
  localStorage.setItem(STORAGE_KEY_CAMPO_FDS, JSON.stringify(CAMPO_FDS_CANONICO));
  firebaseSync.saveAllCampo(CAMPO_FDS_CANONICO);
  return CAMPO_FDS_CANONICO;
}

// Retrocompatibilidade com funções antigas de grupos
export function getStoredGrupos(): CampoGrupo[] {
  return [];
}
export function saveStoredGrupo(g: CampoGrupo): CampoGrupo[] {
  return [];
}
export function deleteStoredGrupo(id: string): CampoGrupo[] {
  return [];
}

// =========================================================================
// MÓDULO SERVIÇO DE CAMPO (PROGRAMAÇÃO OFICIAL)
// Campos: Data, Horário, Ponto de encontro, Irmão responsável
// =========================================================================

export interface CampoProgramacao {
  id: string;
  data: string; // Ex: '26/09/2026' ou '26/09'
  horario: string; // Ex: '09:00' ou '09:15'
  pontoEncontro: string; // Ex: 'Salão do Reino'
  responsavel: string; // Ex: 'Dhiego'
}

export const STORAGE_KEY_CAMPO_PROGRAMACAO = 'vila_cisper_campo_programacao_2026';

export const CAMPO_PROGRAMACAO_INICIAL: CampoProgramacao[] = [
  {
    id: 'prog-campo-1',
    data: '26/09/2026',
    horario: '09:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Dhiego',
  },
  {
    id: 'prog-campo-2',
    data: '27/09/2026',
    horario: '09:15',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Marcelo',
  },
  {
    id: 'prog-campo-3',
    data: '03/10/2026',
    horario: '09:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Samuel',
  },
  {
    id: 'prog-campo-4',
    data: '04/10/2026',
    horario: '09:15',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Danilo',
  },
  {
    id: 'prog-campo-5',
    data: '10/10/2026',
    horario: '09:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Hermes',
  },
  {
    id: 'prog-campo-6',
    data: '11/10/2026',
    horario: '09:15',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Kleber',
  },
  {
    id: 'prog-campo-7',
    data: '17/10/2026',
    horario: '09:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Airton',
  },
  {
    id: 'prog-campo-8',
    data: '18/10/2026',
    horario: '09:15',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Vilson',
  },
  {
    id: 'prog-campo-9',
    data: '24/10/2026',
    horario: '09:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Marcelo',
  },
  {
    id: 'prog-campo-10',
    data: '25/10/2026',
    horario: '09:15',
    pontoEncontro: 'Ponto dos Grupos',
    responsavel: 'Geovane',
  },
  {
    id: 'prog-campo-11',
    data: '31/10/2026',
    horario: '09:00',
    pontoEncontro: 'Salão do Reino',
    responsavel: 'Kleber',
  },
];

export const CANONICAL_CAMPO_SAMPLE_IDS = new Set(
  CAMPO_PROGRAMACAO_INICIAL.map((i) => i.id)
);

export function getStoredCampoProgramacao(): CampoProgramacao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAMPO_PROGRAMACAO);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(CAMPO_PROGRAMACAO_INICIAL));
      return CAMPO_PROGRAMACAO_INICIAL;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const temRegistrosReais = parsed.some((i) => !CANONICAL_CAMPO_SAMPLE_IDS.has(i.id));
      if (temRegistrosReais) {
        const limpos = parsed.filter((i) => !CANONICAL_CAMPO_SAMPLE_IDS.has(i.id));
        if (limpos.length > 0) {
          return limpos;
        }
      }
      return parsed;
    }
    return CAMPO_PROGRAMACAO_INICIAL;
  } catch {
    return CAMPO_PROGRAMACAO_INICIAL;
  }
}

export async function saveStoredCampoProgramacao(item: CampoProgramacao): Promise<{
  success: boolean;
  data?: CampoProgramacao[];
  error?: string;
}> {
  try {
    const current = getStoredCampoProgramacao();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: CampoProgramacao[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('campo-programacao-firebase-updated', { detail: updated }));
    if ((firebaseSync as any).saveAllCampoProgramacao) {
      await (firebaseSync as any).saveAllCampoProgramacao(updated);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteStoredCampoProgramacao(id: string): Promise<{
  success: boolean;
  data?: CampoProgramacao[];
  error?: string;
}> {
  try {
    const current = getStoredCampoProgramacao();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('campo-programacao-firebase-updated', { detail: updated }));
    if ((firebaseSync as any).saveAllCampoProgramacao) {
      await (firebaseSync as any).saveAllCampoProgramacao(updated);
    }
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveBulkCampoProgramacao(
  newItems: CampoProgramacao[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonthKeys?: string[]
): Promise<{ success: boolean; data?: CampoProgramacao[]; error?: string; count?: number }> {
  try {
    const current = getStoredCampoProgramacao();
    // Descarta dados de exemplo antigos do template ao importar dados reais
    const cleanedCurrent = current.filter((item) => !CANONICAL_CAMPO_SAMPLE_IDS.has(item.id));
    let updated: CampoProgramacao[];

    if (mode === 'replace_all') {
      updated = [...newItems];
    } else if (mode === 'replace_month' && targetMonthKeys && targetMonthKeys.length > 0) {
      // Filtra itens cujo mês não esteja nos meses alvo
      const monthsSet = new Set(targetMonthKeys.map((k) => k.toLowerCase()));
      const filtered = cleanedCurrent.filter((item) => {
        // Formato da data: DD/MM/YYYY ou DD/MM
        const partes = item.data.split('/');
        if (partes.length >= 2) {
          const mesNum = parseInt(partes[1], 10);
          const nomes = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
          const nomeMes = nomes[mesNum - 1] || '';
          return !Array.from(monthsSet).some((m) => m.includes(nomeMes) || (item.mesChave && m.includes(item.mesChave.toLowerCase())));
        }
        return true;
      });
      updated = [...filtered, ...newItems];
    } else {
      // Append / Mesclar: evitar duplicar mesma data e horário
      const map = new Map<string, CampoProgramacao>();
      cleanedCurrent.forEach((it) => map.set(`${it.data}_${it.horario}`, it));
      newItems.forEach((it) => map.set(`${it.data}_${it.horario}`, it));
      updated = Array.from(map.values());
    }

    // Ordenar cronologicamente
    updated.sort((a, b) => {
      const pA = a.data.split('/');
      const pB = b.data.split('/');
      if (pA.length >= 3 && pB.length >= 3) {
        const dA = `${pA[2]}-${pA[1].padStart(2, '0')}-${pA[0].padStart(2, '0')}`;
        const dB = `${pB[2]}-${pB[1].padStart(2, '0')}-${pB[0].padStart(2, '0')}`;
        return dA.localeCompare(dB);
      }
      return a.data.localeCompare(b.data);
    });

    localStorage.setItem(STORAGE_KEY_CAMPO_PROGRAMACAO, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('campo-programacao-firebase-updated', { detail: updated }));
    if ((firebaseSync as any).saveAllCampoProgramacao) {
      await (firebaseSync as any).saveAllCampoProgramacao(updated);
    }
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar serviço de campo em lote.' };
  }
}

