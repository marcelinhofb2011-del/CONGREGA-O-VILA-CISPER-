export interface EscalaDesignacaoItem {
  id: string;
  mes: string; // Ex: 'Janeiro 2026', 'Fevereiro 2026', etc.
  mesChave: string; // 'janeiro', 'fevereiro', etc.
  dia: string; // Ex: 'Domingo 04/01', 'Quarta-Feira 07/01'
  dataIso?: string; // Para ordenação se aplicável
  indicador: string; // Ex: 'Danilo Cardoso / Hugo' ou 'Pedro / Danilo C.'
  microfone: string; // Ex: 'Danilo Maia / Leandro'
  leitor?: string; // Ex: 'Vilson', 'Samuel'
  audio: string; // Ex: 'Gustavo'
  video: string; // Ex: 'Dhiego'
  presidencia?: string; // Ex: 'Dhiego', 'Marcelo'
  observacao?: string; // Ex: 'Assembleia', 'Congresso'
  ehEspecial?: boolean; // Para pintar de vermelho ou azul
}

export interface VoluntarioTotais {
  nome: string;
  indicador: number;
  volante: number;
  audio: number;
  video: number;
  total: number;
}

const STORAGE_KEY_DESIGNACOES = 'vila_cisper_designacoes_reunioes_2026';

export const ESCALA_DESIGNACOES_CANONICA: EscalaDesignacaoItem[] = [
  // JANEIRO 2026
  { id: 'jan-1', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Domingo 04/01', indicador: 'Danilo Cardoso / Hugo', microfone: 'Danilo Maia / Leandro', leitor: 'Vilson', audio: 'Gustavo', video: 'Dhiego' },
  { id: 'jan-2', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Quarta-Feira 07/01', indicador: 'Samuel / Hermes', microfone: 'Silvani / Pedro', leitor: '', audio: 'Valdemir', video: 'Marcelo' },
  { id: 'jan-3', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Domingo 11/01', indicador: 'Vilson / Pedro', microfone: 'George / Danilo Maia', leitor: 'Samuel', audio: 'Hermes', video: 'Gustavo' },
  { id: 'jan-4', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Quarta-Feira 14/01', indicador: 'Danilo Maia / Leandro', microfone: 'Fernando / Marcelo', leitor: '', audio: 'Gustavo', video: 'Silvani' },
  { id: 'jan-5', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Domingo 18/01', indicador: 'Wilmar / Silvani', microfone: 'Hermes / Matheus', leitor: 'Hugo', audio: 'Dhiego', video: 'Leandro' },
  { id: 'jan-6', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Quarta-Feira 21/01', indicador: 'Assembleia', microfone: 'Assembleia', leitor: 'Assembleia', audio: 'Assembleia', video: 'Assembleia', observacao: 'Assembleia', ehEspecial: true },
  { id: 'jan-7', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Sábado 24/01', indicador: 'Assembleia', microfone: 'Assembleia', leitor: 'Assembleia', audio: 'Assembleia', video: 'Assembleia', observacao: 'Assembleia', ehEspecial: true },
  { id: 'jan-8', mes: 'Janeiro 2026', mesChave: 'janeiro', dia: 'Quarta-Feira 28/01', indicador: 'George / Danilo', microfone: 'Valdemir / Hugo', leitor: '', audio: 'Kleber', video: 'Hermes' },

  // FEVEREIRO 2026
  { id: 'fev-1', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Domingo 01/02', indicador: 'Danilo Cardoso / Hugo', microfone: 'Danilo Maia / Leandro', leitor: 'Silvani', audio: 'Gustavo', video: 'Dhiego' },
  { id: 'fev-2', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Quarta-Feira 04/02', indicador: 'Samuel / Hermes', microfone: 'Silvani / Pedro', leitor: '', audio: 'Valdemir', video: 'Marcelo' },
  { id: 'fev-3', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Domingo 08/02', indicador: 'Vilson / Pedro', microfone: 'George / Danilo Maia', leitor: 'Dhiego', audio: 'Hermes', video: 'Gustavo' },
  { id: 'fev-4', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Quarta-Feira 11/02', indicador: 'Danilo Maia / Leandro', microfone: 'Fernando / Marcelo', leitor: '', audio: 'Gustavo', video: 'Silvani' },
  { id: 'fev-5', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Domingo 15/02', indicador: 'Wilmar / Silvani', microfone: 'Hermes / Matheus', leitor: 'Geovane', audio: 'Dhiego', video: 'Leandro' },
  { id: 'fev-6', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Quarta-Feira 18/02', indicador: 'Dhiego / Fernando', microfone: 'Vilson / Gustavo', leitor: '', audio: 'Kleber', video: 'Hermes' },
  { id: 'fev-7', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Domingo 22/02', indicador: 'Matheus / Valdemir', microfone: 'Wilmar / George', leitor: 'Hermes', audio: 'Marcelo', video: 'Dhiego' },
  { id: 'fev-8', mes: 'Fevereiro 2026', mesChave: 'fevereiro', dia: 'Quarta-Feira 25/02', indicador: 'George / Danilo', microfone: 'Valdemir / Hugo', leitor: '', audio: 'Valdemir', video: 'Hermes' },

  // MARÇO 2026
  { id: 'mar-1', mes: 'Março 2026', mesChave: 'marco', dia: 'Domingo 01/03', indicador: 'Danilo Cardoso / Hugo', microfone: 'Danilo Maia / Leandro', leitor: 'Vilson', audio: 'Gustavo', video: 'Dhiego' },
  { id: 'mar-2', mes: 'Março 2026', mesChave: 'marco', dia: 'Quarta-Feira 04/03', indicador: 'Samuel / Hermes', microfone: 'Silvani / Pedro', leitor: '', audio: 'Valdemir', video: 'Marcelo' },
  { id: 'mar-3', mes: 'Março 2026', mesChave: 'marco', dia: 'Domingo 08/03', indicador: 'Vilson / Pedro', microfone: 'Hugo / Valdemir', leitor: 'Danilo', audio: 'Hermes', video: 'Gustavo' },
  { id: 'mar-4', mes: 'Março 2026', mesChave: 'marco', dia: 'Quarta-Feira 12/03', indicador: 'Hugo / Leandro', microfone: 'Fernando / Marcelo', leitor: '', audio: 'Gustavo', video: 'Silvani' },
  { id: 'mar-5', mes: 'Março 2026', mesChave: 'marco', dia: 'Domingo 15/03', indicador: 'Wilmar / Silvani', microfone: 'Hermes / Matheus', leitor: 'Fernando', audio: 'Dhiego', video: 'Leandro' },
  { id: 'mar-6', mes: 'Março 2026', mesChave: 'marco', dia: 'Quarta-Feira 19/03', indicador: 'Dhiego / Fernando', microfone: 'Vilson / Gustavo', leitor: '', audio: 'Kleber', video: 'Hermes' },
  { id: 'mar-7', mes: 'Março 2026', mesChave: 'marco', dia: 'Domingo 22/03', indicador: 'Matheus / Valdemir', microfone: 'Wilmar / Fernando', leitor: 'Hugo', audio: 'Marcelo', video: 'Dhiego' },
  { id: 'mar-8', mes: 'Março 2026', mesChave: 'marco', dia: 'Quarta-Feira 26/03', indicador: 'Pedro / Vilson', microfone: 'Valdemir / Hugo', leitor: '', audio: 'Valdemir', video: 'Hermes' },
  { id: 'mar-9', mes: 'Março 2026', mesChave: 'marco', dia: 'Domingo 29/03', indicador: 'Hugo / Danilo Cardoso', microfone: 'Gustavo / Dhiego', leitor: 'Samuel', audio: 'Silvani', video: 'Leandro' },

  // ABRIL 2026
  { id: 'abr-1', mes: 'Abril 2026', mesChave: 'abril', dia: 'Quinta-Feira 02/04', indicador: 'Pedro / Fernando', microfone: 'Vanderlei / Vilson', leitor: '', audio: 'Marcelo', video: 'Hermes' },
  { id: 'abr-2', mes: 'Abril 2026', mesChave: 'abril', dia: 'Domingo 05/04', indicador: 'Hugo / Vilmar', microfone: 'Valdemir / Danilo C.', leitor: 'Dhiego', audio: 'Leandro', video: 'Gustavo' },
  { id: 'abr-3', mes: 'Abril 2026', mesChave: 'abril', dia: 'Quinta-Feira 09/04', indicador: 'Samuel / Fernando', microfone: 'Gustavo / Hermes', leitor: '', audio: 'Kleber', video: 'Silvani' },
  { id: 'abr-4', mes: 'Abril 2026', mesChave: 'abril', dia: 'Domingo 12/04', indicador: 'Dhiego / Hugo', microfone: 'Vilmar / Silvani', leitor: 'Geovane', audio: 'Hermes', video: 'Leandro' },
  { id: 'abr-5', mes: 'Abril 2026', mesChave: 'abril', dia: 'Quinta-Feira 16/04', indicador: 'Fernando / Vanderlei', microfone: 'Marcelo / Leandro', leitor: '', audio: 'Gustavo', video: 'Hermes' },
  { id: 'abr-6', mes: 'Abril 2026', mesChave: 'abril', dia: 'Domingo 19/04', indicador: 'Hermes / Matheus', microfone: 'Hugo / Pedro', leitor: 'Vilson', audio: 'Dhiego', video: 'Silvani' },
  { id: 'abr-7', mes: 'Abril 2026', mesChave: 'abril', dia: 'Quinta-Feira 23/04', indicador: 'Danilo C. / Vilson', microfone: 'Samuel / Fernando', leitor: '', audio: 'Leandro', video: 'Marcelo' },
  { id: 'abr-8', mes: 'Abril 2026', mesChave: 'abril', dia: 'Domingo 26/04', indicador: 'Marcelo / George', microfone: 'Gustavo / Valdemir', leitor: 'Hermes', audio: 'Silvani', video: 'Dhiego' },
  { id: 'abr-9', mes: 'Abril 2026', mesChave: 'abril', dia: 'Quinta-Feira 30/04', indicador: 'Silvani / Valdemir', microfone: 'Vanderlei / Leandro', leitor: '', audio: 'Kleber', video: 'Hermes' },

  // MAIO 2026
  { id: 'mai-1', mes: 'Maio 2026', mesChave: 'maio', dia: 'Domingo 03/05', indicador: 'Silvani / Valdemir', microfone: 'George / Pedro', leitor: 'Danilo', audio: 'Leandro', video: 'Gustavo' },
  { id: 'mai-2', mes: 'Maio 2026', mesChave: 'maio', dia: 'Quinta-Feira 07/05', indicador: 'Pedro / Danilo Cardoso', microfone: 'Vanderlei / Vilson', leitor: '', audio: 'Marcelo', video: 'Silvani' },
  { id: 'mai-3', mes: 'Maio 2026', mesChave: 'maio', dia: 'Domingo 10/05', indicador: 'Hugo / Vilmar', microfone: 'Valdemir / Danilo C.', leitor: 'Fernando', audio: 'Hermes', video: 'Leandro' },
  { id: 'mai-4', mes: 'Maio 2026', mesChave: 'maio', dia: 'Quinta-Feira 14/05', indicador: 'Samuel / Fernando', microfone: 'Gustavo / Vanderlei', leitor: '', audio: 'Kleber', video: 'Marcelo' },
  { id: 'mai-5', mes: 'Maio 2026', mesChave: 'maio', dia: 'Domingo 17/05', indicador: 'Dhiego / George', microfone: 'Vilmar / Silvani', leitor: 'Hugo', audio: 'Hermes', video: 'Leandro' },
  { id: 'mai-6', mes: 'Maio 2026', mesChave: 'maio', dia: 'Quinta-Feira 21/05', indicador: 'Fernando / Vanderlei', microfone: 'Gustavo / Leandro', leitor: '', audio: 'Dhiego', video: 'Marcelo' },
  { id: 'mai-7', mes: 'Maio 2026', mesChave: 'maio', dia: 'Domingo 24/05', indicador: 'Hermes / Matheus', microfone: 'Hugo / Pedro', leitor: 'Samuel', audio: 'Silvani', video: 'Dhiego' },
  { id: 'mai-8', mes: 'Maio 2026', mesChave: 'maio', dia: 'Quinta-Feira 28/05', indicador: 'Danilo C. / Vilson', microfone: 'Samuel / Fernando', leitor: '', audio: 'Kleber', video: 'Hermes' },
  { id: 'mai-9', mes: 'Maio 2026', mesChave: 'maio', dia: 'Domingo 31/05', indicador: 'Marcelo / George', microfone: 'Gustavo / Matheus', leitor: 'Geovane', audio: 'Dhiego', video: 'Leandro' },

  // JUNHO 2026
  { id: 'jun-1', mes: 'Junho 2026', mesChave: 'junho', dia: 'Quinta-Feira 04/06', indicador: 'Pedro / Danilo Cardoso', microfone: 'Vanderlei / Vilson', leitor: '', audio: 'Marcelo', video: 'Silvani' },
  { id: 'jun-2', mes: 'Junho 2026', mesChave: 'junho', dia: 'Domingo 07/06', indicador: 'Hugo / Vilmar', microfone: 'Valdemir / Danilo C.', leitor: 'Dhiego', audio: 'Hermes', video: 'Leandro' },
  { id: 'jun-3', mes: 'Junho 2026', mesChave: 'junho', dia: 'Quinta-Feira 11/06', indicador: 'Samuel / Fernando', microfone: 'Gustavo / Vanderlei', leitor: '', audio: 'Kleber', video: 'Marcelo' },
  { id: 'jun-4', mes: 'Junho 2026', mesChave: 'junho', dia: 'Domingo 14/06', indicador: 'Valdemir / George', microfone: 'Vilmar / Pedro', leitor: 'Silvani', audio: 'Dhiego', video: 'Hermes' },
  { id: 'jun-5', mes: 'Junho 2026', mesChave: 'junho', dia: 'Quinta-Feira 18/06', indicador: 'Congresso', microfone: 'Congresso', leitor: 'Congresso', audio: 'Congresso', video: 'Congresso', observacao: 'Congresso', ehEspecial: true },
  { id: 'jun-6', mes: 'Junho 2026', mesChave: 'junho', dia: 'Domingo 21/06', indicador: 'Congresso', microfone: 'Congresso', leitor: 'Congresso', audio: 'Congresso', video: 'Congresso', observacao: 'Congresso', ehEspecial: true },
  { id: 'jun-7', mes: 'Junho 2026', mesChave: 'junho', dia: 'Quinta-Feira 25/06', indicador: 'Danilo C. / Vilson', microfone: 'Samuel / Fernando', leitor: '', audio: 'Kleber', video: 'Hermes' },
  { id: 'jun-8', mes: 'Junho 2026', mesChave: 'junho', dia: 'Domingo 28/06', indicador: 'Marcelo / George', microfone: 'Gustavo / Matheus', leitor: 'Vilson', audio: 'Dhiego', video: 'Leandro' },

  // SETEMBRO 2026
  { id: 'set-1', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Quinta-Feira 03/09', indicador: 'Samuel / Hermes', microfone: 'Gustavo / Edivaldo', leitor: '', audio: 'Guilherme', video: 'Marcelo' },
  { id: 'set-2', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Domingo 06/09', indicador: 'Dhiego / Matheus', microfone: 'Rafael / Silvani', leitor: 'Danilo C.', audio: 'Valdemir', video: 'Leandro', presidencia: 'Marcelo' },
  { id: 'set-3', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Quinta-Feira 10/09', indicador: 'Vanderlei / Kleber', microfone: 'Edivaldo / Leandro', leitor: '', audio: 'Gustavo', video: 'Silvani' },
  { id: 'set-4', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Domingo 13/09', indicador: 'Danilo C. / Leandro', microfone: 'Guilherme / Rafael', leitor: 'Hermes', audio: 'Valdemir', video: 'Dhiego', presidencia: 'Vilson' },
  { id: 'set-5', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Terça-Feira 15/09', indicador: 'Vanderlei / Vilson', microfone: 'Vilmar / Gustavo', leitor: '', audio: 'Kleber', video: 'Hermes' },
  { id: 'set-6', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Domingo 20/09', indicador: 'Pedro / George', microfone: 'Rafael / Valdemir', leitor: '', audio: 'Leandro', video: 'Gustavo' },
  { id: 'set-7', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Quinta-Feira 24/09', indicador: 'Silvani / Valdemir', microfone: 'Guilherme / Rafael', leitor: '', audio: 'Kleber', video: 'Leandro' },
  { id: 'set-8', mes: 'Setembro 2026', mesChave: 'setembro', dia: 'Domingo 27/09', indicador: 'Hermes / Vilmar', microfone: 'Gustavo / Edivaldo', leitor: 'Hugo', audio: 'Guilherme', video: 'Dhiego', presidencia: 'Geovane' },

  // OUTUBRO 2026
  { id: 'out-1', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Quinta-Feira 01/10', indicador: 'Pedro / Danilo C.', microfone: 'Wilmar / Rafael', leitor: '', audio: 'Guilherme', video: 'Dhiego' },
  { id: 'out-2', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Domingo 04/10', indicador: 'Vanderlei / Hermes', microfone: 'Mateus / Guilherme', leitor: 'Airton', audio: 'Silvani', video: 'Leandro', presidencia: 'Dhiego' },
  { id: 'out-3', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Quinta-Feira 08/10', indicador: 'Samuel / Vilson', microfone: 'Edivaldo / George', leitor: '', audio: 'Valdemir', video: 'Hermes' },
  { id: 'out-4', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Domingo 11/10', indicador: 'Pedro / Hugo', microfone: 'Rafael / Gustavo', leitor: 'Silvani', audio: 'Marcelo', video: 'Leandro', presidencia: 'Hermes' },
  { id: 'out-5', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Quinta-Feira 15/10', indicador: 'Kleber / Danilo M.', microfone: 'Guilherme / Wilmar', leitor: '', audio: 'Gustavo', video: 'Marcelo' },
  { id: 'out-6', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Domingo 18/10', indicador: 'Vanderlei / Silvani', microfone: 'Danilo M. / Rafael', leitor: 'Marcelo', audio: 'Hermes', video: 'Gustavo', presidencia: 'Samuel' },
  { id: 'out-7', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Quinta-Feira 22/10', indicador: 'Marcelo / Leandro', microfone: 'Valdemir / Edivaldo', leitor: '', audio: 'Guilherme', video: 'Dhiego' },
  { id: 'out-8', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Domingo 25/10', indicador: 'Valdemir / Danilo M.', microfone: 'Gustavo / Guilherme', leitor: 'Geovane', audio: 'Hermes', video: 'Leandro', presidencia: 'Hugo' },
  { id: 'out-9', mes: 'Outubro 2026', mesChave: 'outubro', dia: 'Quinta-Feira 29/10', indicador: 'Vanderlei / Dhiego', microfone: 'Silvani / Rafael', leitor: '', audio: 'Kleber', video: 'Marcelo' },

  // NOVEMBRO 2026
  { id: 'nov-1', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Domingo 01/11', indicador: 'Vanderlei / Hermes', microfone: 'Mateus / Guilherme', leitor: 'Vilson', audio: 'Silvani', video: 'Leandro', presidencia: 'Marcelo' },
  { id: 'nov-2', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Quinta-Feira 05/11', indicador: 'Samuel / Vilson', microfone: 'Edivaldo / George', leitor: '', audio: 'Valdemir', video: 'Hermes' },
  { id: 'nov-3', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Domingo 08/11', indicador: 'Pedro / Hugo', microfone: 'Rafael / Gustavo', leitor: 'Samuel', audio: 'Marcelo', video: 'Leandro', presidencia: 'Airton' },
  { id: 'nov-4', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Quinta-Feira 12/11', indicador: 'Kleber / Danilo M.', microfone: 'Guilherme / Wilmar', leitor: '', audio: 'Gustavo', video: 'Marcelo' },
  { id: 'nov-5', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Domingo 15/11', indicador: 'Vanderlei / Silvani', microfone: 'Danilo M. / Rafael', leitor: 'Valdemir', audio: 'Hermes', video: 'Gustavo', presidencia: 'Vilson' },
  { id: 'nov-6', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Quinta-Feira 19/11', indicador: 'Marcelo / Leandro', microfone: 'Valdemir / Edivaldo', leitor: '', audio: 'Guilherme', video: 'Dhiego' },
  { id: 'nov-7', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Domingo 22/11', indicador: 'Valdemir / Danilo M.', microfone: 'Gustavo / Guilherme', leitor: 'Danilo', audio: 'Hermes', video: 'Leandro', presidencia: 'Geovane' },
  { id: 'nov-8', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Quinta-Feira 26/11', indicador: 'Vanderlei / Dhiego', microfone: 'Silvani / Rafael', leitor: '', audio: 'Kleber', video: 'Marcelo' },
  { id: 'nov-9', mes: 'Novembro 2026', mesChave: 'novembro', dia: 'Domingo 29/11', indicador: 'Vilson / Samuel', microfone: 'Gustavo / Guilherme', leitor: 'Hermes', audio: 'Valdemir', video: 'Leandro', presidencia: 'Danilo' },

  // DEZEMBRO 2026
  { id: 'dez-1', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Quinta-Feira 03/12', indicador: 'Pedro / Danilo C.', microfone: 'Wilmar / Rafael', leitor: '', audio: 'Guilherme', video: 'Dhiego' },
  { id: 'dez-2', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Domingo 06/12', indicador: 'Vanderlei / Danilo M.', microfone: 'Mateus / Guilherme', leitor: 'Hugo', audio: 'Silvani', video: 'Leandro', presidencia: 'Hermes' },
  { id: 'dez-3', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Quinta-Feira 10/12', indicador: 'Samuel / Dhiego', microfone: 'Edivaldo / George', leitor: '', audio: 'Valdemir', video: 'Hermes' },
  { id: 'dez-4', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Domingo 13/12', indicador: 'Pedro / Hugo', microfone: 'Rafael / Gustavo', leitor: 'Dhiego', audio: 'Marcelo', video: 'Leandro', presidencia: 'Airton' },
  { id: 'dez-5', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Quinta-Feira 15/12', indicador: 'Kleber / Danilo M.', microfone: 'Guilherme / Wilmar', leitor: '', audio: 'Gustavo', video: 'Marcelo' },
  { id: 'dez-6', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Domingo 20/12', indicador: 'Vanderlei / Silvani', microfone: 'Danilo M. / Rafael', leitor: 'Airton', audio: 'Hermes', video: 'Gustavo', presidencia: 'Samuel' },
  { id: 'dez-7', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Quinta-Feira 24/12', indicador: 'Marcelo / Vilson', microfone: 'Valdemir / Edivaldo', leitor: '', audio: 'Guilherme', video: 'Dhiego' },
  { id: 'dez-8', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Domingo 27/12', indicador: 'Valdemir / Hermes', microfone: 'Gustavo / Guilherme', leitor: 'Silvani', audio: 'Hermes', video: 'Leandro', presidencia: 'Dhiego' },
  { id: 'dez-9', mes: 'Dezembro 2026', mesChave: 'dezembro', dia: 'Quinta-Feira 31/12', indicador: 'Vanderlei / Leandro', microfone: 'Silvani / Rafael', leitor: '', audio: 'Kleber', video: 'Marcelo' },
];

export function getStoredEscalaDesignacoes(): EscalaDesignacaoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DESIGNACOES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(ESCALA_DESIGNACOES_CANONICA));
      return ESCALA_DESIGNACOES_CANONICA;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ESCALA_DESIGNACOES_CANONICA;
  } catch {
    return ESCALA_DESIGNACOES_CANONICA;
  }
}

export function saveStoredEscalaItem(item: EscalaDesignacaoItem): { success: boolean; data?: EscalaDesignacaoItem[]; error?: string } {
  try {
    const current = getStoredEscalaDesignacoes();
    const idx = current.findIndex((i) => i.id === item.id);
    let updated: EscalaDesignacaoItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = item;
    } else {
      updated = [item, ...current];
    }
    localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(updated));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function deleteStoredEscalaItem(id: string): { success: boolean; data?: EscalaDesignacaoItem[]; error?: string } {
  try {
    const current = getStoredEscalaDesignacoes();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(updated));
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function saveBulkEscalaDesignacoes(
  newItems: EscalaDesignacaoItem[],
  mode: 'append' | 'replace_month' | 'replace_all',
  targetMonthKey?: string
): { success: boolean; data?: EscalaDesignacaoItem[]; error?: string; count?: number } {
  try {
    const current = getStoredEscalaDesignacoes();
    let updated: EscalaDesignacaoItem[];

    if (mode === 'replace_all') {
      updated = [...newItems];
    } else if (mode === 'replace_month' && targetMonthKey) {
      const filtered = current.filter((item) => item.mesChave !== targetMonthKey);
      updated = [...filtered, ...newItems];
    } else {
      // Append / Mesclar: evitar duplicados pelo ID se já existirem
      const existingIds = new Set(current.map((i) => i.id));
      const filteredNew = newItems.map((item) => {
        if (existingIds.has(item.id)) {
          return { ...item, id: `desig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
        }
        return item;
      });
      updated = [...current, ...filteredNew];
    }

    localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(updated));
    return { success: true, data: updated, count: newItems.length };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function resetEscalaDesignacoesToSample(): EscalaDesignacaoItem[] {
  localStorage.setItem(STORAGE_KEY_DESIGNACOES, JSON.stringify(ESCALA_DESIGNACOES_CANONICA));
  return ESCALA_DESIGNACOES_CANONICA;
}

export function verificarDesignacaoNome(nomeBuscado: string, campoTexto?: string): boolean {
  if (!nomeBuscado || !campoTexto) return false;
  const n = nomeBuscado.trim().toLowerCase();
  const c = campoTexto.trim().toLowerCase();
  if (c === n) return true;
  const partes = n.split(' ');
  const primeiro = partes[0];
  if (c.includes(n)) return true;
  if (partes.length > 1 && c.includes(primeiro) && c.includes(partes[1].charAt(0).toLowerCase())) {
    return true;
  }
  return false;
}
