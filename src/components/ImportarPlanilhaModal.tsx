import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Users,
  Info,
  Clock,
  MapPin,
  Speech,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { readSpreadsheetFile, parseDelimitedText } from '../utils/csvSpreadsheetUtils';
import { IRMAOS_CONGREGACAO } from '../data/irmaos';
import {
  EscalaDesignacaoItem,
  getStoredEscalaDesignacoes,
  saveBulkEscalaDesignacoes,
} from '../data/designacoesStorage';
import {
  S140TSemana,
  getStoredS140TSemanas,
  saveBulkS140TSemanas,
} from '../data/s140tStorage';
import {
  DiscursoBiblicoItem,
  getStoredDiscursosBiblicos,
  saveBulkDiscursosBiblicos,
} from '../data/discursoStorage';
import {
  CampoProgramacao,
  getStoredCampoProgramacao,
  saveBulkCampoProgramacao,
} from '../data/campoStorage';
import {
  LimpezaEscalaItem,
  getStoredLimpezaEscalas,
  saveBulkLimpezaEscala,
} from '../data/limpezaStorage';

export type ModuloImportacao =
  | 'designacoes'
  | 'vida-ministerio'
  | 'discursos'
  | 'campo'
  | 'limpeza';

interface ImportarPlanilhaModalProps {
  isOpen: boolean;
  onClose: () => void;
  modulo: ModuloImportacao;
  onImportadoComSucesso?: (count: number) => void;
}

const MESES_NOMES = [
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

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

interface ValidacaoItem {
  mes: string;
  data: string;
  campo: string;
  motivo: string;
  gravidade: 'alerta' | 'erro';
}

interface RegistroProcessado {
  idTemp: string;
  mes: string;
  data: string;
  diaSemanaCalculado?: string;
  dadosFormatados: Record<string, string>;
  itemFinal: any;
  avisos: string[];
}

export const ImportarPlanilhaModal: React.FC<ImportarPlanilhaModalProps> = ({
  isOpen,
  onClose,
  modulo,
  onImportadoComSucesso,
}) => {
  // Passos do Fluxo de Importação: 1 = Escolher Arquivo, 2 = Escolher Meses, 3 = Conferir, 4 = Confirmar
  const [passo, setPasso] = useState<1 | 2 | 3 | 4>(1);

  // Arquivo e Dados Brutos
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [linhasBrutas, setLinhasBrutas] = useState<string[][]>([]);
  const [erroArquivo, setErroArquivo] = useState<string>('');
  const [isProcessandoArquivo, setIsProcessandoArquivo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seleção dos Meses
  const [mesesDetectados, setMesesDetectados] = useState<string[]>([]);
  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>([]);

  // Modais de apoio
  const [showProblemasModal, setShowProblemasModal] = useState<boolean>(false);
  const [showOpcoesAvancadas, setShowOpcoesAvancadas] = useState<boolean>(false);

  // Opção para registros existentes (Evitar duplicação - dentro de Opções avançadas)
  const [modoSubstituicao, setModoSubstituicao] = useState<'substituir' | 'apenas_novos'>('substituir');

  // Estado de gravação
  const [isGravando, setIsGravando] = useState<boolean>(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Helper para formatar lista de meses em linguagem natural (Ex: "Outubro e Novembro")
  const formatarMesesTexto = (meses: string[]): string => {
    if (meses.length === 0) return 'Nenhum mês';
    if (meses.length === 1) return meses[0];
    if (meses.length === 2) return `${meses[0]} e ${meses[1]}`;
    return `${meses.slice(0, -1).join(', ')} e ${meses[meses.length - 1]}`;
  };

  // Títulos e metadados por departamento
  const metaDepartamento = useMemo(() => {
    switch (modulo) {
      case 'designacoes':
        return {
          titulo: 'Designações',
          subtitulo: 'Indicadores, Microfones, Áudio e Vídeo, Leitor',
          cor: 'blue',
          icone: Users,
          camposEsperados: ['Data', 'Indicador', 'Microfone', 'Áudio e vídeo', 'Leitor'],
        };
      case 'vida-ministerio':
        return {
          titulo: 'Vida e Ministério',
          subtitulo: 'Programação semanal, Tesouros, Ministério e Vida Cristã',
          cor: 'purple',
          icone: BookOpen,
          camposEsperados: ['Data', 'Presidente', 'Tesouros', 'Ministério', 'Vida Cristã'],
        };
      case 'discursos':
        return {
          titulo: 'Discurso Público',
          subtitulo: 'Discursos bíblicos, oradores e temas',
          cor: 'amber',
          icone: Speech,
          camposEsperados: ['Data', 'Tema', 'Orador'],
        };
      case 'campo':
        return {
          titulo: 'Serviço de Campo',
          subtitulo: 'Saídas de campo, horários, locais e dirigentes',
          cor: 'sky',
          icone: Clock,
          camposEsperados: ['Data', 'Horário', 'Ponto de encontro', 'Responsável'],
        };
      case 'limpeza':
        return {
          titulo: 'Grupo de Limpeza',
          subtitulo: 'Escala de manutenção e grupos responsáveis',
          cor: 'emerald',
          icone: Sparkles,
          camposEsperados: ['Data', 'Grupo responsável'],
        };
    }
  }, [modulo]);

  // Função auxiliar para normalizar string
  const normalizar = (s: string): string => {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Helper para identificar se um nome está no cadastro da congregação
  const verificarNomeIrmao = (nome: string): boolean => {
    if (!nome || !nome.trim()) return true;
    const limpo = normalizar(nome);
    // Ignora termos comuns como visitante, livre, folga, assembleia, etc.
    if (
      limpo.includes('visitante') ||
      limpo.includes('livre') ||
      limpo.includes('assembleia') ||
      limpo.includes('congresso') ||
      limpo === '-' ||
      limpo === '—'
    ) {
      return true;
    }

    // Nomes podem conter barras: "Fulano / Ciclano"
    const partes = nome.split(/[\/,+e&]/).map((p) => normalizar(p.trim())).filter(Boolean);
    return partes.every((p) => {
      if (p.length < 3) return true;
      return IRMAOS_CONGREGACAO.some((cad) => {
        const cadNorm = normalizar(cad);
        return cadNorm.includes(p) || p.includes(cadNorm) || cadNorm.startsWith(p.substring(0, 4));
      });
    });
  };

  // Helper para detectar mês em uma string ou data
  const detectarMesTexto = (texto: string): string | null => {
    if (!texto) return null;
    const t = normalizar(texto);

    for (let i = 0; i < MESES_NOMES.length; i++) {
      const nomeMesNorm = normalizar(MESES_NOMES[i]);
      if (t.includes(nomeMesNorm)) {
        return MESES_NOMES[i];
      }
    }

    // Tenta formato DD/MM/YYYY ou DD/MM
    const matchData = texto.match(/(\d{1,2})[\/\-\.](\d{1,2})([\/\-\.](\d{2,4}))?/);
    if (matchData) {
      const mesNum = parseInt(matchData[2], 10);
      if (mesNum >= 1 && mesNum <= 12) {
        return MESES_NOMES[mesNum - 1];
      }
    }

    return null;
  };

  // Processa arquivo selecionado
  const handleCarregarArquivo = async (file: File) => {
    try {
      setIsProcessandoArquivo(true);
      setErroArquivo('');
      setNomeArquivo(file.name);

      const matrix = await readSpreadsheetFile(file);
      if (!matrix || matrix.length === 0) {
        setErroArquivo('A planilha está vazia ou não pôde ser lida.');
        setIsProcessandoArquivo(false);
        return;
      }

      setLinhasBrutas(matrix);

      // Detecta os meses presentes na planilha
      const mesesEncontrados = new Set<string>();
      let mesAtualContexto: string | null = null;

      for (const row of matrix) {
        const linhaCompleta = row.join(' ');
        const mesDetectado = detectarMesTexto(linhaCompleta);
        if (mesDetectado) {
          mesAtualContexto = mesDetectado;
          mesesEncontrados.add(mesDetectado);
        }
      }

      // Se nenhum mês foi detectado pelo texto, tenta o mês corrente e seguintes
      if (mesesEncontrados.size === 0) {
        const mesAtualIdx = new Date().getMonth();
        mesesEncontrados.add(MESES_NOMES[mesAtualIdx]);
      }

      const listaMeses = Array.from(mesesEncontrados).sort((a, b) => {
        return MESES_NOMES.indexOf(a) - MESES_NOMES.indexOf(b);
      });

      setMesesDetectados(listaMeses);
      setMesesSelecionados(listaMeses); // Por padrão, seleciona todos os encontrados
      setPasso(1); // Permanece no passo 1 mostrando "Planilha carregada" e o botão "CONTINUAR"
    } catch (err: any) {
      setErroArquivo(err.message || 'Erro ao carregar o arquivo da planilha.');
    } finally {
      setIsProcessandoArquivo(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCarregarArquivo(e.dataTransfer.files[0]);
    }
  };

  // Alternar seleção de um mês
  const handleToggleMes = (mes: string) => {
    setMesesSelecionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes]
    );
  };

  // Alternar "Selecionar todos"
  const handleToggleTodosMeses = () => {
    if (mesesSelecionados.length === mesesDetectados.length) {
      setMesesSelecionados([]);
    } else {
      setMesesSelecionados([...mesesDetectados]);
    }
  };

  // =========================================================================
  // PARSER E VALIDAÇÃO DOS DADOS DE ACORDO COM O DEPARTAMENTO E MESES
  // =========================================================================
  const { registrosProcessados, inconsistencias, contagemPorMes, conflitosExistentes } = useMemo(() => {
    if (linhasBrutas.length === 0 || mesesSelecionados.length === 0) {
      return {
        registrosProcessados: [],
        inconsistencias: [],
        contagemPorMes: {},
        conflitosExistentes: 0,
      };
    }

    const mesesAlvoNorm = new Set(mesesSelecionados.map(normalizar));
    const registros: RegistroProcessado[] = [];
    const validacoes: ValidacaoItem[] = [];
    const contagem: Record<string, number> = {};
    mesesSelecionados.forEach((m) => (contagem[m] = 0));

    let mesContextoAtual = mesesSelecionados[0] || 'Janeiro';
    const anoAtual = new Date().getFullYear();

    // Map de cabeçalhos de coluna se houver
    let mapaColunas: Record<string, number> = {};
    let cabecalhoDetectado = false;

    for (let idx = 0; idx < linhasBrutas.length; idx++) {
      const cells = linhasBrutas[idx].map((c) => (c ? c.trim() : ''));
      const linhaTexto = cells.join(' ').trim();
      if (!linhaTexto) continue;

      // Detecta se a linha é um título de Mês isolado
      const mesLinha = detectarMesTexto(linhaTexto);
      const celulasComTexto = cells.filter(Boolean);
      if (mesLinha && celulasComTexto.length <= 2 && !linhaTexto.includes('/')) {
        mesContextoAtual = mesLinha;
        continue;
      }

      // Detecção de linha de cabeçalho de colunas
      const normLinha = normalizar(linhaTexto);
      if (
        (normLinha.includes('indicador') && normLinha.includes('microfone')) ||
        (normLinha.includes('orador') && normLinha.includes('tema')) ||
        (normLinha.includes('ponto') && normLinha.includes('responsavel')) ||
        (normLinha.includes('grupo') && normLinha.includes('limpeza')) ||
        (normLinha.includes('tesouros') && normLinha.includes('presidente'))
      ) {
        cabecalhoDetectado = true;
        mapaColunas = {};
        cells.forEach((c, i) => {
          const colNorm = normalizar(c);
          if (colNorm.includes('data') || colNorm.includes('dia')) mapaColunas['data'] = i;
          if (colNorm.includes('indicador')) mapaColunas['indicador'] = i;
          if (colNorm.includes('microfone') || colNorm.includes('volante')) mapaColunas['microfone'] = i;
          if (colNorm.includes('leitor')) mapaColunas['leitor'] = i;
          if (colNorm.includes('audio e video') || colNorm.includes('som e video') || colNorm.includes('audio'))
            mapaColunas['audio'] = i;
          if (colNorm.includes('video')) mapaColunas['video'] = i;
          if (colNorm.includes('tema')) mapaColunas['tema'] = i;
          if (colNorm.includes('orador')) mapaColunas['orador'] = i;
          if (colNorm.includes('horario') || colNorm.includes('hora')) mapaColunas['horario'] = i;
          if (colNorm.includes('ponto') || colNorm.includes('local')) mapaColunas['pontoEncontro'] = i;
          if (colNorm.includes('responsavel') || colNorm.includes('dirigente')) mapaColunas['responsavel'] = i;
          if (colNorm.includes('grupo')) mapaColunas['grupo'] = i;
          if (colNorm.includes('presidente')) mapaColunas['presidente'] = i;
          if (colNorm.includes('parte')) mapaColunas['partes'] = i;
        });
        continue;
      }

      // Extrai data da linha
      const matchData = linhaTexto.match(/(\d{1,2})[\/\-\.](\d{1,2})([\/\-\.](\d{2,4}))?/);
      let dataFormatada = '';
      let diaNum = 0;
      let mesNum = 0;
      let anoNum = anoAtual;

      if (matchData) {
        diaNum = parseInt(matchData[1], 10);
        mesNum = parseInt(matchData[2], 10);
        if (matchData[4]) {
          anoNum = parseInt(matchData[4], 10);
          if (anoNum < 100) anoNum += 2000;
        }
        dataFormatada = `${String(diaNum).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}/${anoNum}`;
        if (mesNum >= 1 && mesNum <= 12) {
          mesContextoAtual = MESES_NOMES[mesNum - 1];
        }
      } else {
        // Se a primeira coluna tem apenas o dia número (ex: "04", "07")
        const possivelDia = parseInt(cells[0], 10);
        if (!isNaN(possivelDia) && possivelDia >= 1 && possivelDia <= 31) {
          diaNum = possivelDia;
          mesNum = MESES_NOMES.indexOf(mesContextoAtual) + 1;
          dataFormatada = `${String(diaNum).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}/${anoNum}`;
        }
      }

      // Verifica se o registro pertence a um dos meses selecionados
      const mesNorm = normalizar(mesContextoAtual);
      if (!mesesAlvoNorm.has(mesNorm)) {
        continue; // Ignora registros de meses não selecionados
      }

      const avisosLinha: string[] = [];

      // 1. Validação de Data
      let diaSemanaCalculado = '';
      if (!dataFormatada || diaNum < 1 || diaNum > 31 || mesNum < 1 || mesNum > 12) {
        validacoes.push({
          mes: mesContextoAtual,
          data: dataFormatada || cells[0] || 'Desconhecida',
          campo: 'Data',
          motivo: 'Data não informada ou em formato não reconhecido.',
          gravidade: 'erro',
        });
        avisosLinha.push('Data inválida');
      } else {
        // Calcula dia da semana real no calendário
        const dataObj = new Date(anoNum, mesNum - 1, diaNum);
        if (!isNaN(dataObj.getTime())) {
          diaSemanaCalculado = DIAS_SEMANA[dataObj.getDay()];
          // Confere se bate com o dia mencionado na planilha
          for (const diaNome of DIAS_SEMANA) {
            if (normLinha.includes(normalizar(diaNome)) && normalizar(diaNome) !== normalizar(diaSemanaCalculado)) {
              validacoes.push({
                mes: mesContextoAtual,
                data: dataFormatada,
                campo: 'Dia da Semana',
                motivo: `Planilha cita "${diaNome}", mas o calendário indica que ${dataFormatada} é ${diaSemanaCalculado}.`,
                gravidade: 'alerta',
              });
              avisosLinha.push(`Aviso: Calendário indica ${diaSemanaCalculado}`);
              break;
            }
          }
        }
      }

      // =====================================================================
      // EXTRAÇÃO ESPECÍFICA POR DEPARTAMENTO
      // =====================================================================
      if (modulo === 'designacoes') {
        const indicador = mapaColunas['indicador'] !== undefined ? cells[mapaColunas['indicador']] : cells[1] || '';
        const microfone = mapaColunas['microfone'] !== undefined ? cells[mapaColunas['microfone']] : cells[2] || '';
        const leitor = mapaColunas['leitor'] !== undefined ? cells[mapaColunas['leitor']] : cells[3] || '';
        const audio = mapaColunas['audio'] !== undefined ? cells[mapaColunas['audio']] : cells[4] || '';
        const video = mapaColunas['video'] !== undefined ? cells[mapaColunas['video']] : cells[5] || '';

        // Formatação do Dia (Ex: QUINTA-FEIRA — 24/09)
        const diaSemanaTexto = diaSemanaCalculado || (normLinha.includes('domingo') ? 'Domingo' : 'Quarta-Feira');
        const diaFormatadoExibicao = `${diaSemanaTexto.toUpperCase()} — ${String(diaNum).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}`;

        // Validação de nomes cadastrados
        [
          { campo: 'Indicador', valor: indicador },
          { campo: 'Microfone', valor: microfone },
          { campo: 'Leitor', valor: leitor },
          { campo: 'Áudio', valor: audio },
          { campo: 'Vídeo', valor: video },
        ].forEach(({ campo, valor }) => {
          if (valor && !verificarNomeIrmao(valor)) {
            validacoes.push({
              mes: mesContextoAtual,
              data: dataFormatada,
              campo,
              motivo: `Nome "${valor}" não localizado com precisão no cadastro de irmãos da congregação.`,
              gravidade: 'alerta',
            });
            avisosLinha.push(`Conferir nome: ${valor}`);
          }
        });

        // Validação de campos obrigatórios
        if (!indicador && !microfone && !audio && !video) {
          validacoes.push({
            mes: mesContextoAtual,
            data: dataFormatada,
            campo: 'Designações',
            motivo: 'Nenhum irmão designado (indicador, microfone ou áudio/vídeo).',
            gravidade: 'alerta',
          });
        }

        const itemFinal: EscalaDesignacaoItem = {
          id: `desig-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mesContextoAtual,
          mesChave: normalizar(mesContextoAtual),
          dia: `${diaSemanaTexto} ${String(diaNum).padStart(2, '0')}/${String(mesNum).padStart(2, '0')}`,
          indicador: indicador.trim(),
          microfone: microfone.trim(),
          leitor: leitor.trim(),
          audio: audio.trim(),
          video: video.trim(),
          presidencia: mapaColunas['presidente'] !== undefined ? cells[mapaColunas['presidente']] : '',
          observacao: '',
          ehEspecial: normLinha.includes('assembleia') || normLinha.includes('congresso'),
        };

        registros.push({
          idTemp: itemFinal.id,
          mes: mesContextoAtual,
          data: dataFormatada,
          diaSemanaCalculado,
          dadosFormatados: {
            Reunião: diaFormatadoExibicao,
            Indicador: indicador || '—',
            Microfone: microfone || '—',
            'Áudio e vídeo': audio && video ? `${audio} / ${video}` : audio || video || '—',
            Leitor: leitor || '—',
          },
          itemFinal,
          avisos: avisosLinha,
        });
      } else if (modulo === 'discursos') {
        const tema = mapaColunas['tema'] !== undefined ? cells[mapaColunas['tema']] : cells[1] || '';
        const orador = mapaColunas['orador'] !== undefined ? cells[mapaColunas['orador']] : cells[2] || '';

        if (!tema) {
          validacoes.push({
            mes: mesContextoAtual,
            data: dataFormatada,
            campo: 'Tema',
            motivo: 'Tema do discurso bíblico não informado.',
            gravidade: 'erro',
          });
          avisosLinha.push('Tema em branco');
        }
        if (!orador) {
          validacoes.push({
            mes: mesContextoAtual,
            data: dataFormatada,
            campo: 'Orador',
            motivo: 'Nome do orador não informado.',
            gravidade: 'erro',
          });
          avisosLinha.push('Orador em branco');
        }

        const itemFinal: DiscursoBiblicoItem = {
          id: `disc-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          data: dataFormatada,
          tema: tema.trim(),
          orador: orador.trim(),
          mes: mesContextoAtual,
        };

        registros.push({
          idTemp: itemFinal.id,
          mes: mesContextoAtual,
          data: dataFormatada,
          diaSemanaCalculado,
          dadosFormatados: {
            Data: dataFormatada,
            Tema: tema || '—',
            Orador: orador || '—',
          },
          itemFinal,
          avisos: avisosLinha,
        });
      } else if (modulo === 'campo') {
        const horario = mapaColunas['horario'] !== undefined ? cells[mapaColunas['horario']] : cells[1] || '09:00';
        const pontoEncontro =
          mapaColunas['pontoEncontro'] !== undefined ? cells[mapaColunas['pontoEncontro']] : cells[2] || 'Salão do Reino';
        const responsavel =
          mapaColunas['responsavel'] !== undefined ? cells[mapaColunas['responsavel']] : cells[3] || '';

        if (!responsavel) {
          validacoes.push({
            mes: mesContextoAtual,
            data: dataFormatada,
            campo: 'Responsável',
            motivo: 'Responsável/Dirigente da saída de campo não informado.',
            gravidade: 'alerta',
          });
          avisosLinha.push('Responsável não informado');
        } else if (!verificarNomeIrmao(responsavel)) {
          validacoes.push({
            mes: mesContextoAtual,
            data: dataFormatada,
            campo: 'Responsável',
            motivo: `Irmão "${responsavel}" não localizado no cadastro de publicadores.`,
            gravidade: 'alerta',
          });
          avisosLinha.push(`Conferir: ${responsavel}`);
        }

        const itemFinal: CampoProgramacao = {
          id: `campo-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          data: dataFormatada,
          horario: horario.trim(),
          pontoEncontro: pontoEncontro.trim(),
          responsavel: responsavel.trim(),
        };

        registros.push({
          idTemp: itemFinal.id,
          mes: mesContextoAtual,
          data: dataFormatada,
          diaSemanaCalculado,
          dadosFormatados: {
            Data: dataFormatada,
            Horário: horario,
            'Ponto de encontro': pontoEncontro,
            Responsável: responsavel || '—',
          },
          itemFinal,
          avisos: avisosLinha,
        });
      } else if (modulo === 'limpeza') {
        const grupo = mapaColunas['grupo'] !== undefined ? cells[mapaColunas['grupo']] : cells[1] || cells[2] || 'GRUPO 1';
        const responsaveis = cells[3] || '';

        if (!grupo) {
          validacoes.push({
            mes: mesContextoAtual,
            data: dataFormatada,
            campo: 'Grupo Responsável',
            motivo: 'Grupo responsável pela limpeza não identificado.',
            gravidade: 'erro',
          });
          avisosLinha.push('Grupo não informado');
        }

        const itemFinal: LimpezaEscalaItem = {
          id: `limp-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mesContextoAtual,
          mesChave: normalizar(mesContextoAtual),
          dias: String(diaNum).padStart(2, '0'),
          diasSemana: diaSemanaCalculado || 'Quarta Feira e Domingo',
          grupo: grupo.toUpperCase(),
          responsaveis: responsaveis.trim(),
          observacao: '',
          ehEspecial: false,
        };

        registros.push({
          idTemp: itemFinal.id,
          mes: mesContextoAtual,
          data: dataFormatada,
          diaSemanaCalculado,
          dadosFormatados: {
            Data: dataFormatada,
            'Grupo responsável': grupo.toUpperCase(),
          },
          itemFinal,
          avisos: avisosLinha,
        });
      } else if (modulo === 'vida-ministerio') {
        const presidente = mapaColunas['presidente'] !== undefined ? cells[mapaColunas['presidente']] : cells[1] || '';
        const discursoTesourosTitulo = cells[2] || 'Discurso de Tesouros da Palavra';
        const discursoTesourosIrmao = cells[3] || '';

        const itemFinal: S140TSemana = {
          id: `s140t-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          periodo: `${String(diaNum).padStart(2, '0')} de ${mesContextoAtual}`,
          dataReferencia: `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`,
          dataReuniao: dataFormatada,
          leituraBiblica: cells[2] || 'Leitura Semanal',
          presidente: presidente.trim(),
          canticoInicial: '1',
          oracaoInicial: presidente.trim(),
          discursoTesourosTitulo,
          discursoTesourosIrmao: discursoTesourosIrmao.trim(),
          discursoTesourosTempoMin: 10,
          joiasEspirituaisIrmao: cells[4] || '',
          leituraBibliaIrmao: cells[5] || '',
          partesMinisterio: [],
          canticoMeio: '2',
          partesVidaCrista: [],
          estudoBiblicoDirigente: cells[6] || '',
          estudoBiblicoLeitor: cells[7] || '',
          canticoFinal: '3',
          oracaoFinal: cells[8] || presidente.trim(),
        };

        registros.push({
          idTemp: itemFinal.id,
          mes: mesContextoAtual,
          data: dataFormatada,
          diaSemanaCalculado,
          dadosFormatados: {
            Data: dataFormatada,
            Presidente: presidente || '—',
            'Discurso de Tesouros': discursoTesourosIrmao ? `${discursoTesourosTitulo} (${discursoTesourosIrmao})` : '—',
          },
          itemFinal,
          avisos: avisosLinha,
        });
      }

      contagem[mesContextoAtual] = (contagem[mesContextoAtual] || 0) + 1;
    }

    // Identifica se há registros duplicados na própria planilha
    const datasVistas = new Set<string>();
    registros.forEach((r) => {
      if (datasVistas.has(r.data)) {
        validacoes.push({
          mes: r.mes,
          data: r.data,
          campo: 'Duplicidade',
          motivo: `A data ${r.data} aparece repetida mais de uma vez na planilha.`,
          gravidade: 'alerta',
        });
      }
      datasVistas.add(r.data);
    });

    // Verifica conflitos com dados já existentes no aplicativo
    let totalConflitos = 0;
    if (modulo === 'designacoes') {
      const atuais = getStoredEscalaDesignacoes();
      const chavesMeses = new Set(mesesSelecionados.map(normalizar));
      totalConflitos = atuais.filter((a) => chavesMeses.has(a.mesChave)).length;
    } else if (modulo === 'discursos') {
      const atuais = getStoredDiscursosBiblicos();
      const mesesSel = new Set(mesesSelecionados.map((m) => m.toLowerCase()));
      totalConflitos = atuais.filter((d) => mesesSel.has(d.mes.toLowerCase())).length;
    } else if (modulo === 'campo') {
      const atuais = getStoredCampoProgramacao();
      const datasPlanilha = new Set(registros.map((r) => r.data));
      totalConflitos = atuais.filter((c) => datasPlanilha.has(c.data)).length;
    } else if (modulo === 'limpeza') {
      const atuais = getStoredLimpezaEscalas();
      const chavesMeses = new Set(mesesSelecionados.map(normalizar));
      totalConflitos = atuais.filter((l) => chavesMeses.has(l.mesChave)).length;
    } else if (modulo === 'vida-ministerio') {
      const atuais = getStoredS140TSemanas();
      totalConflitos = atuais.filter((s) =>
        mesesSelecionados.some((m) =>
          (s.periodo || '').toLowerCase().includes(m.toLowerCase())
        )
      ).length;
    }

    return {
      registrosProcessados: registros,
      inconsistencias: validacoes,
      contagemPorMes: contagem,
      conflitosExistentes: totalConflitos,
    };
  }, [linhasBrutas, mesesSelecionados, modulo]);

  // Executa a confirmação e salvamento definitivo dos dados
  const handleConfirmarImportacao = async () => {
    try {
      setIsGravando(true);
      const itensFinais = registrosProcessados.map((r) => r.itemFinal);
      const chavesMeses = mesesSelecionados.map(normalizar);

      if (modulo === 'designacoes') {
        await saveBulkEscalaDesignacoes(
          itensFinais as EscalaDesignacaoItem[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      } else if (modulo === 'discursos') {
        await saveBulkDiscursosBiblicos(
          itensFinais as DiscursoBiblicoItem[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          mesesSelecionados
        );
      } else if (modulo === 'campo') {
        await saveBulkCampoProgramacao(
          itensFinais as CampoProgramacao[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      } else if (modulo === 'limpeza') {
        await saveBulkLimpezaEscala(
          itensFinais as LimpezaEscalaItem[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      } else if (modulo === 'vida-ministerio') {
        await saveBulkS140TSemanas(
          itensFinais as S140TSemana[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      }

      setSucessoMsg(`Importação de ${itensFinais.length} registros realizada com sucesso!`);
      if (onImportadoComSucesso) {
        onImportadoComSucesso(itensFinais.length);
      }

      setTimeout(() => {
        setIsGravando(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setIsGravando(false);
      alert(`Erro ao salvar importação: ${err.message || 'Falha no banco de dados'}`);
    }
  };

  const handleFecharModal = () => {
    setPasso(1);
    setNomeArquivo('');
    setLinhasBrutas([]);
    setErroArquivo('');
    setMesesDetectados([]);
    setMesesSelecionados([]);
    setShowProblemasModal(false);
    setShowOpcoesAvancadas(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-importar-planilha-departamento"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Modo Responsável
              </span>
              <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 dark:text-white">
                IMPORTAR PROGRAMAÇÃO — {metaDepartamento.titulo.toUpperCase()}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFecharModal}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de 4 Etapas */}
        <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-center text-[11px] font-bold text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/60 shrink-0">
          <div className={`py-1 ${passo === 1 ? 'text-blue-700 dark:text-blue-400 font-extrabold border-b-2 border-blue-600' : ''}`}>
            1. Arquivo
          </div>
          <div className={`py-1 ${passo === 2 ? 'text-blue-700 dark:text-blue-400 font-extrabold border-b-2 border-blue-600' : ''}`}>
            2. Meses
          </div>
          <div className={`py-1 ${passo === 3 ? 'text-blue-700 dark:text-blue-400 font-extrabold border-b-2 border-blue-600' : ''}`}>
            3. Conferir
          </div>
          <div className={`py-1 ${passo === 4 ? 'text-blue-700 dark:text-blue-400 font-extrabold border-b-2 border-blue-600' : ''}`}>
            4. Confirmar
          </div>
        </div>

        {/* Mensagem de Sucesso Flutuante */}
        {sucessoMsg && (
          <div className="p-4 bg-emerald-600 text-white text-center font-bold text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* =============================================================== */}
          {/* ETAPA 1: ESCOLHER ARQUIVO                                        */}
          {/* =============================================================== */}
          {passo === 1 && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={(e) => e.target.files && handleCarregarArquivo(e.target.files[0])}
                className="hidden"
              />

              {linhasBrutas.length > 0 && nomeArquivo ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 mb-3">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <p className="text-base font-extrabold text-emerald-800 dark:text-emerald-300">
                      ✓ Planilha carregada
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium truncate max-w-xs mx-auto">
                      {nomeArquivo}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLinhasBrutas([]);
                        setNomeArquivo('');
                        setMesesDetectados([]);
                        setMesesSelecionados([]);
                        fileInputRef.current?.click();
                      }}
                      className="mt-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                    >
                      Trocar planilha
                    </button>
                  </div>

                  <button
                    type="button"
                    id="btn-continuar-etapa-meses"
                    onClick={() => setPasso(2)}
                    className="w-full rounded-2xl bg-blue-700 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-blue-800 active:scale-[0.99] transition"
                  >
                    CONTINUAR
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-8 text-center hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200 dark:bg-slate-800 dark:border-slate-700 mb-3">
                      <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Selecionar planilha
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Arquivos Excel (.xlsx, .xls) ou .csv
                    </p>
                    {isProcessandoArquivo && (
                      <p className="mt-3 text-xs font-bold text-blue-600 animate-pulse">
                        Carregando planilha...
                      </p>
                    )}
                  </div>

                  {erroArquivo && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{erroArquivo}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* ETAPA 2: ESCOLHER MESES                                          */}
          {/* =============================================================== */}
          {passo === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Meses encontrados
                </span>
                <button
                  type="button"
                  onClick={handleToggleTodosMeses}
                  className="text-xs font-bold text-blue-700 hover:underline dark:text-blue-400"
                >
                  {mesesSelecionados.length === mesesDetectados.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>

              <div className="space-y-2">
                {mesesDetectados.map((mes) => {
                  const isChecked = mesesSelecionados.includes(mes);
                  return (
                    <label
                      key={mes}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 text-blue-950 dark:text-blue-100 font-bold'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleMes(mes)}
                        className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-sm">{mes}</span>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                {mesesSelecionados.length} {mesesSelecionados.length === 1 ? 'mês selecionado' : 'meses selecionados'}
              </p>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasso(1)}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  VOLTAR
                </button>
                <button
                  type="button"
                  id="btn-continuar-etapa-conferir"
                  onClick={() => setPasso(3)}
                  disabled={mesesSelecionados.length === 0}
                  className="flex-1 rounded-xl bg-blue-700 py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition"
                >
                  CONTINUAR
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ETAPA 3: CONFERIR                                                */}
          {/* =============================================================== */}
          {passo === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  RESUMO DA IMPORTAÇÃO
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Departamento:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {metaDepartamento.titulo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Meses selecionados:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatarMesesTexto(mesesSelecionados)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Registros encontrados:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {registrosProcessados.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status da Validação */}
              {inconsistencias.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>✓ Dados prontos para importar</span>
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-center dark:border-amber-900/60 dark:bg-amber-950/30 space-y-2">
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>⚠ {inconsistencias.length} {inconsistencias.length === 1 ? 'item precisa' : 'itens precisam'} de atenção</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowProblemasModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-900 dark:text-amber-200 underline hover:opacity-80"
                  >
                    VER PROBLEMAS
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasso(2)}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  VOLTAR
                </button>
                <button
                  type="button"
                  id="btn-continuar-etapa-confirmar"
                  onClick={() => setPasso(4)}
                  disabled={registrosProcessados.length === 0}
                  className="flex-1 rounded-xl bg-blue-700 py-3 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition"
                >
                  CONTINUAR
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* ETAPA 4: CONFIRMAR                                               */}
          {/* =============================================================== */}
          {passo === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  PRONTO PARA IMPORTAR
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Departamento:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {metaDepartamento.titulo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Período:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatarMesesTexto(mesesSelecionados)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Total:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {registrosProcessados.length} registros
                    </span>
                  </div>
                </div>
              </div>

              {/* Opções avançadas (Duplicações / Substituição) */}
              <div className="border border-slate-200 rounded-xl dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowOpcoesAvancadas((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span>Opções avançadas</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showOpcoesAvancadas ? 'rotate-180' : ''}`} />
                </button>
                {showOpcoesAvancadas && (
                  <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 space-y-2 text-xs">
                    <p className="font-bold text-slate-700 dark:text-slate-300">
                      Tratamento de dados existentes:
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                      <input
                        type="radio"
                        name="substituicao"
                        value="substituir"
                        checked={modoSubstituicao === 'substituir'}
                        onChange={() => setModoSubstituicao('substituir')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Substituir programações dos meses selecionados (Recomendado)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                      <input
                        type="radio"
                        name="substituicao"
                        value="apenas_novos"
                        checked={modoSubstituicao === 'apenas_novos'}
                        onChange={() => setModoSubstituicao('apenas_novos')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Adicionar mantendo as existentes (apenas novos registros)</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  id="btn-cancelar-importacao-planilha"
                  onClick={handleFecharModal}
                  disabled={isGravando}
                  className="flex-1 rounded-xl border border-slate-300 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  id="btn-confirmar-importar-agora"
                  onClick={handleConfirmarImportacao}
                  disabled={isGravando || registrosProcessados.length === 0}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-xs sm:text-sm font-black uppercase text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 transition"
                >
                  {isGravando ? 'IMPORTANDO...' : 'IMPORTAR AGORA'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Diálogo para "VER PROBLEMAS" */}
      {showProblemasModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                  Itens que precisam de atenção ({inconsistencias.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowProblemasModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {inconsistencias.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 space-y-1"
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{item.data || item.mes}</span>
                    <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60">
                      {item.campo}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{item.motivo}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowProblemasModal(false)}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
