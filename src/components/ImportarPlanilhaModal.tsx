import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  ChevronRight,
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
  // Passos do Fluxo de Importação: 1 = Arquivo, 2 = Meses, 3 = Conferência / Resumo
  const [passo, setPasso] = useState<1 | 2 | 3>(1);

  // Arquivo e Dados Brutos
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [linhasBrutas, setLinhasBrutas] = useState<string[][]>([]);
  const [erroArquivo, setErroArquivo] = useState<string>('');
  const [isProcessandoArquivo, setIsProcessandoArquivo] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seleção dos Meses
  const [mesesDetectados, setMesesDetectados] = useState<string[]>([]);
  const [mesesSelecionados, setMesesSelecionados] = useState<string[]>([]);

  // Opção para registros existentes (Evitar duplicação)
  const [modoSubstituicao, setModoSubstituicao] = useState<'substituir' | 'apenas_novos'>('substituir');

  // Estado de gravação
  const [isGravando, setIsGravando] = useState<boolean>(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

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
      setPasso(2); // Avança para seleção dos meses
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
        saveBulkEscalaDesignacoes(
          itensFinais as EscalaDesignacaoItem[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      } else if (modulo === 'discursos') {
        saveBulkDiscursosBiblicos(
          itensFinais as DiscursoBiblicoItem[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          mesesSelecionados
        );
      } else if (modulo === 'campo') {
        saveBulkCampoProgramacao(
          itensFinais as CampoProgramacao[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      } else if (modulo === 'limpeza') {
        saveBulkLimpezaEscala(
          itensFinais as LimpezaEscalaItem[],
          modoSubstituicao === 'substituir' ? 'replace_month' : 'append',
          chavesMeses
        );
      } else if (modulo === 'vida-ministerio') {
        saveBulkS140TSemanas(
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

  if (!isOpen) return null;

  const IconeDept = metaDepartamento.icone;

  return (
    <div
      id="modal-importar-planilha-departamento"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Modo Responsável
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Importação Dedicada
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white">
                Importar Planilha — {metaDepartamento.titulo}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Indicador de Passos */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-2.5 text-xs font-bold text-slate-500 dark:border-slate-800/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                passo === 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              1
            </span>
            <span className={passo === 1 ? 'font-extrabold text-blue-700 dark:text-blue-300' : ''}>
              Carregar Arquivo
            </span>
          </div>

          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                passo === 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              2
            </span>
            <span className={passo === 2 ? 'font-extrabold text-blue-700 dark:text-blue-300' : ''}>
              Seleção dos Meses
            </span>
          </div>

          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                passo === 3
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              3
            </span>
            <span className={passo === 3 ? 'font-extrabold text-blue-700 dark:text-blue-300' : ''}>
              Conferência & Confirmação
            </span>
          </div>
        </div>

        {/* Mensagem de Sucesso Flutuante */}
        {sucessoMsg && (
          <div className="p-4 bg-emerald-500 text-white text-center font-bold text-sm flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* =============================================================== */}
          {/* PASSO 1: CARREGAR ARQUIVO                                        */}
          {/* =============================================================== */}
          {passo === 1 && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                <p className="font-bold">
                  Importação exclusiva para o departamento de {metaDepartamento.titulo}.
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Carregue a planilha trimestral preparada no Excel (.xlsx, .xls) ou em formato (.csv). O sistema irá
                  identificar automaticamente os meses presentes e estruturar as programações.
                </p>
              </div>

              {/* Área de Drag & Drop */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer transition dark:border-slate-700 dark:bg-slate-800/40"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => e.target.files && handleCarregarArquivo(e.target.files[0])}
                  className="hidden"
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700 mb-3">
                  <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Clique para selecionar a planilha ou arraste o arquivo aqui
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou Texto delimitado (.csv)
                </p>
                {isProcessandoArquivo && (
                  <p className="mt-3 text-xs font-bold text-blue-600 animate-pulse">
                    Lendo arquivo e identificando os meses...
                  </p>
                )}
              </div>

              {erroArquivo && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{erroArquivo}</span>
                </div>
              )}

              {/* Estrutura esperada de colunas */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <h5 className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-2">
                  Colunas identificadas para {metaDepartamento.titulo}:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {metaDepartamento.camposEsperados.map((campo) => (
                    <span
                      key={campo}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                    >
                      {campo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PASSO 2: SELEÇÃO DOS MESES                                       */}
          {/* =============================================================== */}
          {passo === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    2. Seleção dos Meses para Importação
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Arquivo carregado: <span className="font-semibold text-slate-800 dark:text-slate-200">{nomeArquivo}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasso(1)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 dark:text-slate-400"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Trocar arquivo
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Trimestre / Meses Encontrados na Planilha
                  </span>

                  <label className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mesesSelecionados.length === mesesDetectados.length && mesesDetectados.length > 0}
                      onChange={handleToggleTodosMeses}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Selecionar todos</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mesesDetectados.map((mes) => {
                    const isChecked = mesesSelecionados.includes(mes);
                    return (
                      <label
                        key={mes}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-bold'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMes(mes)}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span className="text-sm font-extrabold">{mes}</span>
                        </div>

                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {isChecked ? 'Incluído' : 'Ignorado'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {mesesSelecionados.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Selecione pelo menos um mês para prosseguir para a conferência.</span>
                </div>
              ) : (
                <div className="rounded-xl bg-blue-50/60 p-3 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <span className="font-bold">Meses selecionados para importação:</span>{' '}
                  {mesesSelecionados.join(', ')}. Os meses não marcados serão completamente ignorados.
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* PASSO 3: RESUMO ANTES DA IMPORTAÇÃO & VALIDAÇÃO AUTOMÁTICA        */}
          {/* =============================================================== */}
          {passo === 3 && (
            <div className="space-y-6">
              {/* Card de Resumo Canônico solicitado na especificação */}
              <div className="rounded-2xl border-2 border-blue-600 bg-blue-50/40 p-5 dark:border-blue-500 dark:bg-blue-950/30">
                <div className="flex items-center justify-between border-b border-blue-200/80 pb-3 dark:border-blue-900/60">
                  <h3 className="text-sm sm:text-base font-black uppercase text-blue-950 dark:text-blue-100">
                    IMPORTAÇÃO — {metaDepartamento.titulo.toUpperCase()}
                  </h3>
                  <span className="text-xs font-extrabold bg-blue-600 text-white px-2.5 py-1 rounded-full">
                    Total: {registrosProcessados.length} registros
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs sm:text-sm">
                  <div>
                    <h5 className="font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      Meses selecionados:
                    </h5>
                    <ul className="space-y-1 font-semibold text-slate-900 dark:text-white">
                      {mesesSelecionados.map((m) => (
                        <li key={m} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      Registros encontrados:
                    </h5>
                    <ul className="space-y-1 font-semibold text-slate-900 dark:text-white">
                      {mesesSelecionados.map((m) => (
                        <li key={m} className="flex items-center justify-between">
                          <span>{m}:</span>
                          <span className="font-extrabold text-blue-700 dark:text-blue-300">
                            {contagemPorMes[m] || 0} registros
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Bloco de Inconsistências / Alertas da Validação Automática */}
              {inconsistencias.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-500 bg-amber-50/80 p-5 dark:border-amber-600 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <span>ATENÇÃO — EXISTEM REGISTROS QUE PRECISAM SER CONFERIDOS</span>
                  </div>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                    O sistema realizou a validação de datas, calendário e cadastro de irmãos. Revise os pontos abaixo
                    antes de confirmar:
                  </p>

                  <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pr-1">
                    {inconsistencias.map((inc, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-white/90 p-2.5 text-xs border border-amber-200 text-slate-800 dark:bg-slate-900 dark:border-amber-800/80 dark:text-slate-200"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-amber-800 dark:text-amber-400">
                            {inc.mes} &bull; Data {inc.data} ({inc.campo})
                          </span>
                          <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {inc.gravidade}
                          </span>
                        </div>
                        <p className="mt-0.5 text-slate-600 dark:text-slate-400">{inc.motivo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tratamento de Registros Existentes (Evitar Duplicação) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200">
                  Prevenção de Duplicação e Registros Existentes
                </h4>
                {conflitosExistentes > 0 ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    Existem {conflitosExistentes} registros já cadastrados no aplicativo para os meses selecionados.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Nenhum conflito direto detectado com os meses selecionados.
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="modoSubstituicao"
                      value="substituir"
                      checked={modoSubstituicao === 'substituir'}
                      onChange={() => setModoSubstituicao('substituir')}
                      className="text-blue-600"
                    />
                    <span>Atualizar / substituir programações dos meses selecionados (Recomendado)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="modoSubstituicao"
                      value="apenas_novos"
                      checked={modoSubstituicao === 'apenas_novos'}
                      onChange={() => setModoSubstituicao('apenas_novos')}
                      className="text-blue-600"
                    />
                    <span>Adicionar apenas novas datas sem alterar os registros existentes</span>
                  </label>
                </div>
              </div>

              {/* Lista Organizada dos Dados para Prévia / Conferência */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Prévia dos Registros Identificados ({registrosProcessados.length})
                  </h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Confira os dados antes de gravar no aplicativo
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                  {registrosProcessados.map((reg, idx) => (
                    <div
                      key={reg.idTemp}
                      className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white border-b border-slate-200/60 pb-1.5 mb-2 dark:border-slate-700">
                        <span className="text-blue-700 dark:text-blue-300 font-black">
                          {reg.dadosFormatados['Reunião'] || reg.dadosFormatados['Data'] || reg.data}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {reg.mes}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                        {Object.entries(reg.dadosFormatados)
                          .filter(([chave]) => chave !== 'Reunião' && chave !== 'Data')
                          .map(([chave, val]) => (
                            <div key={chave} className="flex items-baseline gap-1.5">
                              <span className="font-extrabold text-slate-500 dark:text-slate-400">
                                {chave}:
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">{val}</span>
                            </div>
                          ))}
                      </div>

                      {reg.avisos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {reg.avisos.map((aviso, aIdx) => (
                            <span
                              key={aIdx}
                              className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            >
                              {aviso}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900 shrink-0">
          <div>
            {passo > 1 && (
              <button
                type="button"
                onClick={() => setPasso((prev) => (prev === 3 ? 2 : 1))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="btn-cancelar-importacao-planilha"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
            >
              CANCELAR
            </button>

            {passo === 2 && (
              <button
                type="button"
                id="btn-avancar-conferencia-planilha"
                onClick={() => setPasso(3)}
                disabled={mesesSelecionados.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50 transition"
              >
                <span>Avançar para Conferência</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {passo === 3 && (
              <button
                type="button"
                id="btn-confirmar-importacao-planilha"
                onClick={handleConfirmarImportacao}
                disabled={isGravando || registrosProcessados.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-black uppercase text-white shadow-md hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isGravando ? 'Gravando...' : 'CONFIRMAR IMPORTAÇÃO'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
