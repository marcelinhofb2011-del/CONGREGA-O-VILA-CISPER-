import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type DiaSemanaReuniao =
  | 'Domingo'
  | 'Segunda-feira'
  | 'Terça-feira'
  | 'Quarta-feira'
  | 'Quinta-feira'
  | 'Sexta-feira'
  | 'Sábado';

export interface HorariosReunioesConfig {
  meioDeSemana: {
    dia: DiaSemanaReuniao;
    horario: string; // Ex: '20:00'
  };
  fimDeSemana: {
    dia: DiaSemanaReuniao;
    horario: string; // Ex: '18:00'
  };
  saidaDeCampo: {
    horario: string; // Ex: '08:00'
  };
}

export const STORAGE_KEY_HORARIOS_REUNIOES = 'vila_cisper_horarios_reunioes_config_v1';
export const FIRESTORE_HORARIOS_COLLECTION = 'configuracoes_gerais';
export const FIRESTORE_HORARIOS_DOC_ID = 'horarios_reunioes';

export const HORARIOS_REUNIOES_PADRAO: HorariosReunioesConfig = {
  meioDeSemana: {
    dia: 'Quinta-feira',
    horario: '20:00',
  },
  fimDeSemana: {
    dia: 'Domingo',
    horario: '18:00',
  },
  saidaDeCampo: {
    horario: '08:00',
  },
};

/**
 * Mapeia o nome do dia para o índice do JavaScript Date (0 = Domingo, ..., 6 = Sábado)
 */
export const DIAS_SEMANA_MAPA_INDICE: Record<DiaSemanaReuniao, number> = {
  'Domingo': 0,
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
  'Sábado': 6,
};

export const LISTA_DIAS_SEMANA: DiaSemanaReuniao[] = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/**
 * Valida o formato do objeto HorariosReunioesConfig
 */
function isValidConfig(parsed: any): parsed is HorariosReunioesConfig {
  return (
    parsed &&
    parsed.meioDeSemana &&
    parsed.meioDeSemana.dia &&
    parsed.meioDeSemana.horario &&
    parsed.fimDeSemana &&
    parsed.fimDeSemana.dia &&
    parsed.fimDeSemana.horario
  );
}

/**
 * Obtém as configurações atuais dos horários das reuniões e saídas de campo
 */
export function getHorariosReunioes(): HorariosReunioesConfig {
  if (typeof window === 'undefined') return HORARIOS_REUNIOES_PADRAO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HORARIOS_REUNIOES);
    if (!raw) return HORARIOS_REUNIOES_PADRAO;
    const parsed = JSON.parse(raw);
    if (isValidConfig(parsed)) {
      return {
        meioDeSemana: parsed.meioDeSemana,
        fimDeSemana: parsed.fimDeSemana,
        saidaDeCampo: {
          horario: parsed.saidaDeCampo?.horario || HORARIOS_REUNIOES_PADRAO.saidaDeCampo.horario,
        },
      };
    }
  } catch (e) {
    console.warn('Erro ao ler horários das reuniões:', e);
  }
  return HORARIOS_REUNIOES_PADRAO;
}

/**
 * Obtém diretamente o horário atualmente configurado para as Saídas de Campo
 */
export function getHorarioSaidaDeCampo(): string {
  return getHorariosReunioes().saidaDeCampo.horario;
}

/**
 * Salva as configurações de horários das reuniões e despacha evento para sincronização no app
 */
export function saveHorariosReunioes(config: HorariosReunioesConfig): void {
  try {
    const configCompleta: HorariosReunioesConfig = {
      meioDeSemana: config.meioDeSemana,
      fimDeSemana: config.fimDeSemana,
      saidaDeCampo: {
        horario: config.saidaDeCampo?.horario?.trim() || HORARIOS_REUNIOES_PADRAO.saidaDeCampo.horario,
      },
    };

    localStorage.setItem(STORAGE_KEY_HORARIOS_REUNIOES, JSON.stringify(configCompleta));
    window.dispatchEvent(
      new CustomEvent('horarios-reunioes-updated', { detail: configCompleta })
    );

    // Sincroniza de forma assíncrona com o Firestore
    const docRef = doc(db, FIRESTORE_HORARIOS_COLLECTION, FIRESTORE_HORARIOS_DOC_ID);
    setDoc(docRef, { ...configCompleta, atualizadoEm: new Date().toISOString() }).catch((err) => {
      console.warn('Erro ao sincronizar horários com Firestore:', err);
    });
  } catch (e) {
    console.warn('Erro ao salvar horários das reuniões:', e);
  }
}

// Inicia listener em tempo real no Firestore para atualizar outros dispositivos
if (typeof window !== 'undefined') {
  try {
    const docRef = doc(db, FIRESTORE_HORARIOS_COLLECTION, FIRESTORE_HORARIOS_DOC_ID);
    onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (isValidConfig(data)) {
          const configCompleta: HorariosReunioesConfig = {
            meioDeSemana: data.meioDeSemana,
            fimDeSemana: data.fimDeSemana,
            saidaDeCampo: {
              horario: data.saidaDeCampo?.horario || HORARIOS_REUNIOES_PADRAO.saidaDeCampo.horario,
            },
          };
          localStorage.setItem(
            STORAGE_KEY_HORARIOS_REUNIOES,
            JSON.stringify(configCompleta)
          );
          window.dispatchEvent(
            new CustomEvent('horarios-reunioes-updated', { detail: configCompleta })
          );
        }
      }
    }, (error) => {
      console.warn('Listener Firestore horários reuniões:', error);
    });
  } catch (e) {
    console.warn('Falha ao inicializar listener de horários:', e);
  }
}
