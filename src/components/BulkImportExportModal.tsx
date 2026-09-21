import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Info,
  ArrowRight,
  Check,
  RefreshCw,
  CalendarCheck,
  CheckCheck,
} from 'lucide-react';
import {
  parseDelimitedText,
  readSpreadsheetFile,
  normalizarMesChave,
  detectarMes,
  extrairInfoData,
  ehDiaSemana,
  LISTA_MESES_PADRAO,
} from '../utils/csvSpreadsheetUtils';
import { EscalaDesignacaoItem, saveBulkEscalaDesignacoes } from '../data/designacoesStorage';
import { CampoFimDeSemanaItem, saveBulkCampoFds } from '../data/campoStorage';
import { DiscursoBiblicoItem, saveBulkDiscursosBiblicos } from '../data/discursoStorage';
import { LimpezaEscalaItem, saveBulkLimpezaEscala } from '../data/limpezaStorage';

export type ModuloEscala = 'designacoes' | 'campo' | 'discurso' | 'limpeza';

interface BulkImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  modulo: ModuloEscala;
  tituloModulo: string;
  dadosAtuais: any[];
  isAdmin: boolean;
  onImportadoComSucesso: (qtd: number, modo: string) => void;
}

export const BulkImportExportModal: React.FC<BulkImportExportModalProps> = ({
  isOpen,
  onClose,
  modulo,
  tituloModulo,
  isAdmin,
  onImportadoComSucesso,
}) => {
  const [activeTab, setActiveTab] = useState<'arquivo' | 'colar'>('arquivo');
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace_month' | 'replace_all'>('append');
  const [targetMonth, setTargetMonth] = useState<string>('Janeiro 2026');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isReadingFile, setIsReadingFile] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leitura direta de planilha selecionada pelo Responsável
  const handleFileSelected = async (file: File) => {
    if (!file) return;
    setIsReadingFile(true);
    setSelectedFileName(file.name);
    setFeedback(null);

    try {
      const rows = await readSpreadsheetFile(file);
      if (!rows || rows.length === 0) {
        setFeedback({
          tipo: 'aviso',
          msg: `O arquivo "${file.name}" parece estar vazio ou não pôde ser lido. Verifique o formato.`,
        });
        setIsReadingFile(false);
        return;
      }

      // Converte matriz lida em texto delimitado para alimentar o analisador de dados
      const text = rows.map((r) => r.join('\t')).join('\n');
      setPastedText(text);

      setFeedback({
        tipo: 'sucesso',
        msg: `Planilha "${file.name}" lida com sucesso! ${rows.length} linha(s) detectadas. Você pode selecionar quais meses quer carregar abaixo e confirmar.`,
      });
    } catch (err: any) {
      setFeedback({
        tipo: 'erro',
        msg: `Erro ao ler a planilha: ${err.message || 'Formato não reconhecido'}.`,
      });
    } finally {
      setIsReadingFile(false);
    }
  };

  // Parser de todos os dados brutos da planilha com detecção inteligente de mês
  const parsedRaw = useMemo(() => {
    if (!pastedText.trim()) {
      return { rows: [], allItems: [], availableMonths: [] };
    }

    const rawMatrix = parseDelimitedText(pastedText);
    if (rawMatrix.length === 0) {
      return { rows: [], allItems: [], availableMonths: [] };
    }

    let currentContextMonth = targetMonth;
    const allItems: Array<{
      raw: string[];
      item: any;
      isValid: boolean;
      warnings: string[];
    }> = [];

    for (let idx = 0; idx < rawMatrix.length; idx++) {
      const cells = rawMatrix[idx];
      const filledCells = cells.filter((c) => c && c.trim().length > 0);

      // Linha vazia
      if (filledCells.length === 0) continue;

      // Pular primeira linha se o usuário marcou cabeçalho
      if (idx === 0 && hasHeaderRow) continue;

      // Detectar se a linha é um cabeçalho de colunas (ex: Dia, Indicador, Microfone, etc.)
      const linhaTexto = filledCells.join(' ').toLowerCase();
      const ehCabecalhoColunas =
        (cells.some((c) => c.toLowerCase().includes('indicador')) &&
          cells.some((c) => c.toLowerCase().includes('microfone') || c.toLowerCase().includes('áudio') || c.toLowerCase().includes('som') || c.toLowerCase().includes('leitor'))) ||
        (cells.some((c) => c.toLowerCase().includes('dirigente')) &&
          cells.some((c) => c.toLowerCase().includes('campo') || c.toLowerCase().includes('saída') || c.toLowerCase().includes('dia'))) ||
        (cells.some((c) => c.toLowerCase().includes('tema')) &&
          cells.some((c) => c.toLowerCase().includes('orador') || c.toLowerCase().includes('presidente'))) ||
        (cells.some((c) => c.toLowerCase().includes('grupo')) &&
          cells.some((c) => c.toLowerCase().includes('limpeza') || c.toLowerCase().includes('respons')));

      if (ehCabecalhoColunas) {
        continue;
      }

      // Título da Congregação / Banner (ex: "Congregação Vila Cisper", "Escala de Indicadores 2026")
      if (
        filledCells.length <= 3 &&
        (linhaTexto.includes('congrega') ||
          linhaTexto.includes('vila cisper') ||
          linhaTexto.includes('quadro de an') ||
          linhaTexto.includes('escala 202')) &&
        !extrairInfoData(filledCells[0]) &&
        !ehDiaSemana(filledCells[0])
      ) {
        continue;
      }

      // Linha isolada que indica mudança de Mês (ex: ["Fevereiro 2026"] ou ["MARÇO"] ou ["Abril"])
      if (filledCells.length <= 2) {
        const possivelMes = detectarMes(filledCells.join(' '), '');
        if (possivelMes && !extrairInfoData(filledCells[0]) && !ehDiaSemana(filledCells[0])) {
          currentContextMonth = possivelMes;
          continue; // Não gera registro de reunião para a linha de título de mês
        }
      }

      let itemObj: any = {};
      let isValid = false;
      let warnings: string[] = [];

      if (modulo === 'designacoes') {
        let mes = currentContextMonth;
        let dia = '';
        let indicador = '';
        let microfone = '';
        let leitor = '';
        let audio = '';
        let video = '';
        let presidencia = '';
        let observacao = '';

        // Padrão 1: Col 0 é Dia da semana ("Quarta-Feira", "Domingo") e Col 1 é Data ("07/01", "04/01/2026")
        if (ehDiaSemana(cells[0]) && (extrairInfoData(cells[1]) || /^\d{1,2}[\/-]\d{1,2}/.test(cells[1].trim()))) {
          dia = `${cells[0].trim()} ${cells[1].trim()}`;
          const mesDetectado = detectarMes(cells[1], currentContextMonth);
          if (mesDetectado) {
            mes = mesDetectado;
            currentContextMonth = mesDetectado;
          }
          indicador = cells[2] || '';
          microfone = cells[3] || '';
          leitor = cells[4] || '';
          audio = cells[5] || '';
          video = cells[6] || '';
          presidencia = cells[7] || '';
          observacao = cells[8] || '';
        }
        // Padrão 2: Col 0 é Data ("07/01") e Col 1 é Dia da semana ("Quarta-Feira")
        else if (extrairInfoData(cells[0]) && ehDiaSemana(cells[1])) {
          dia = `${cells[1].trim()} ${cells[0].trim()}`;
          const mesDetectado = detectarMes(cells[0], currentContextMonth);
          if (mesDetectado) {
            mes = mesDetectado;
            currentContextMonth = mesDetectado;
          }
          indicador = cells[2] || '';
          microfone = cells[3] || '';
          leitor = cells[4] || '';
          audio = cells[5] || '';
          video = cells[6] || '';
          presidencia = cells[7] || '';
          observacao = cells[8] || '';
        }
        // Padrão 3: Col 0 é Mês explícito (ex: "Janeiro 2026") e Col 1 é Dia ("Domingo 04/01")
        else if (
          detectarMes(cells[0], '') !== '' &&
          !ehDiaSemana(cells[0]) &&
          !extrairInfoData(cells[0]) &&
          cells.length >= 7
        ) {
          const mesDetectado = detectarMes(cells[0], currentContextMonth);
          mes = mesDetectado;
          currentContextMonth = mesDetectado;
          dia = cells[1] || '';
          indicador = cells[2] || '';
          microfone = cells[3] || '';
          leitor = cells[4] || '';
          audio = cells[5] || '';
          video = cells[6] || '';
          presidencia = cells[7] || '';
          observacao = cells[8] || '';
        }
        // Padrão 4: Formato canônico direto (Col 0 = Dia/Data, Col 1 = Indicador, etc.)
        else {
          dia = cells[0] || '';
          const mesDetectado = detectarMes(dia, currentContextMonth);
          if (extrairInfoData(dia)) {
            mes = mesDetectado;
            currentContextMonth = mesDetectado;
          } else {
            mes = currentContextMonth;
          }
          indicador = cells[1] || '';
          microfone = cells[2] || '';
          leitor = cells[3] || '';
          audio = cells[4] || '';
          video = cells[5] || '';
          presidencia = cells[6] || '';
          observacao = cells[7] || '';
        }

        const ehEspecial =
          indicador.toLowerCase().includes('assembleia') ||
          indicador.toLowerCase().includes('assembléia') ||
          indicador.toLowerCase().includes('congresso') ||
          dia.toLowerCase().includes('assembleia') ||
          dia.toLowerCase().includes('assembléia') ||
          observacao.toLowerCase().includes('assembleia') ||
          observacao.toLowerCase().includes('assembléia') ||
          observacao.toLowerCase().includes('congresso');

        isValid =
          dia.trim().length > 0 &&
          (indicador.trim().length > 0 ||
            microfone.trim().length > 0 ||
            audio.trim().length > 0 ||
            video.trim().length > 0 ||
            leitor.trim().length > 0 ||
            presidencia.trim().length > 0 ||
            observacao.trim().length > 0 ||
            ehEspecial);

        if (!dia.trim()) warnings.push('Dia/Data não informada');

        itemObj = {
          id: `imp-desig-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mes || targetMonth,
          mesChave: normalizarMesChave(mes || targetMonth),
          dia: dia.trim(),
          indicador: indicador.trim(),
          microfone: microfone.trim(),
          leitor: leitor.trim(),
          audio: audio.trim(),
          video: video.trim(),
          presidencia: presidencia.trim(),
          observacao: observacao.trim(),
          ehEspecial,
        } as EscalaDesignacaoItem;
      } else if (modulo === 'campo') {
        let mes = currentContextMonth;
        let data = '';
        let diaSemana: 'Sábado' | 'Domingo' = 'Sábado';
        let dirigente = '';
        let observacao = '';

        if (
          detectarMes(cells[0], '') !== '' &&
          !extrairInfoData(cells[0]) &&
          !ehDiaSemana(cells[0]) &&
          cells.length >= 4
        ) {
          mes = detectarMes(cells[0], currentContextMonth);
          currentContextMonth = mes;
          data = cells[1] || '';
          const ds = (cells[2] || '').toLowerCase();
          diaSemana = ds.includes('dom') ? 'Domingo' : 'Sábado';
          dirigente = cells[3] || '';
          observacao = cells[4] || '';
        } else {
          data = cells[0] || '';
          const mesDetectado = detectarMes(data, currentContextMonth);
          if (extrairInfoData(data)) {
            mes = mesDetectado;
            currentContextMonth = mesDetectado;
          }
          const ds = (cells[1] || '').toLowerCase();
          diaSemana = ds.includes('dom') ? 'Domingo' : 'Sábado';
          dirigente = cells[2] || '';
          observacao = cells[3] || '';
        }

        const ehEspecial =
          dirigente.toLowerCase().includes('assembléia') ||
          dirigente.toLowerCase().includes('assembleia') ||
          dirigente.toLowerCase().includes('congresso') ||
          observacao.toLowerCase().includes('assembleia') ||
          observacao.toLowerCase().includes('congresso');

        isValid = data.trim().length > 0 && (dirigente.trim().length > 0 || ehEspecial);
        if (!data.trim()) warnings.push('Data ausente');
        if (!dirigente.trim() && !ehEspecial) warnings.push('Dirigente ausente');

        itemObj = {
          id: `imp-c-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mes || targetMonth,
          mesChave: normalizarMesChave(mes || targetMonth),
          data: data.trim(),
          diaSemana,
          dirigente: dirigente.trim(),
          observacao: observacao.trim(),
          ehEspecial,
        } as CampoFimDeSemanaItem;
      } else if (modulo === 'discurso') {
        let mes = currentContextMonth;
        let data = '';
        let tema = '';
        let orador = '';
        let presidente = '';
        let leitor = '';
        let observacao = '';

        if (
          detectarMes(cells[0], '') !== '' &&
          !extrairInfoData(cells[0]) &&
          cells.length >= 4
        ) {
          mes = detectarMes(cells[0], currentContextMonth);
          currentContextMonth = mes;
          data = cells[1] || '';
          tema = cells[2] || '';
          orador = cells[3] || '';
          presidente = cells[4] || '';
          leitor = cells[5] || '';
          observacao = cells[6] || '';
        } else {
          data = cells[0] || '';
          const mesDetectado = detectarMes(data, currentContextMonth);
          if (extrairInfoData(data)) {
            mes = mesDetectado;
            currentContextMonth = mesDetectado;
          }
          tema = cells[1] || '';
          orador = cells[2] || '';
          presidente = cells[3] || '';
          leitor = cells[4] || '';
          observacao = cells[5] || '';
        }

        isValid = data.trim().length > 0 && (tema.trim().length > 0 || orador.trim().length > 0);
        if (!data.trim()) warnings.push('Data ausente');
        if (!tema.trim()) warnings.push('Tema ausente');

        itemObj = {
          id: `imp-disc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mes || targetMonth,
          data: data.trim(),
          tema: tema.trim(),
          orador: orador.trim() || 'Orador Local / Visitante',
          presidente: presidente.trim(),
          leitor: leitor.trim(),
          observacao: observacao.trim(),
        } as DiscursoBiblicoItem;
      } else if (modulo === 'limpeza') {
        let mes = currentContextMonth;
        let dias = '';
        let diasSemana = 'Quarta Feira e Domingo';
        let grupo = '';
        let responsaveis = '';
        let observacao = '';

        if (
          detectarMes(cells[0], '') !== '' &&
          !extrairInfoData(cells[0]) &&
          cells.length >= 5
        ) {
          mes = detectarMes(cells[0], currentContextMonth);
          currentContextMonth = mes;
          dias = cells[1] || '';
          diasSemana = cells[2] || 'Quarta Feira e Domingo';
          grupo = cells[3] || '';
          responsaveis = cells[4] || '';
          observacao = cells[5] || '';
        } else {
          dias = cells[0] || '';
          diasSemana = cells[1] || 'Quarta Feira e Domingo';
          grupo = cells[2] || '';
          responsaveis = cells[3] || '';
          observacao = cells[4] || '';
        }

        isValid = dias.trim().length > 0 && grupo.trim().length > 0;
        if (!dias.trim()) warnings.push('Dias não informados');
        if (!grupo.trim()) warnings.push('Grupo não informado');

        itemObj = {
          id: `imp-limp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mes || targetMonth,
          mesChave: normalizarMesChave(mes || targetMonth),
          dias: dias.trim(),
          diasSemana: diasSemana.trim(),
          grupo: grupo.trim(),
          responsaveis: responsaveis.trim(),
          observacao: observacao.trim(),
        } as LimpezaEscalaItem;
      }

      allItems.push({
        raw: cells,
        item: itemObj,
        isValid,
        warnings,
      });
    }

    // Detectar meses distintos encontrados na planilha
    const setMeses = new Set<string>();
    allItems.forEach((it) => {
      if (it.item?.mes) setMeses.add(it.item.mes);
    });

    const availableMonths = Array.from(setMeses);
    availableMonths.sort((a, b) => {
      const idxA = LISTA_MESES_PADRAO.findIndex((m) =>
        a.toLowerCase().includes(m.split(' ')[0].toLowerCase())
      );
      const idxB = LISTA_MESES_PADRAO.findIndex((m) =>
        b.toLowerCase().includes(m.split(' ')[0].toLowerCase())
      );
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });

    return {
      rows: rawMatrix,
      allItems,
      availableMonths,
    };
  }, [pastedText, hasHeaderRow, modulo, targetMonth]);

  // Sincroniza os meses selecionados sempre que novos meses forem identificados na planilha
  const availableMonthsKey = parsedRaw.availableMonths.join('|');
  useEffect(() => {
    if (parsedRaw.availableMonths.length > 0) {
      setSelectedMonths(parsedRaw.availableMonths);
    } else {
      setSelectedMonths([]);
    }
  }, [availableMonthsKey]);

  // Contagem de programações por mês detectado
  const countPerMonth = useMemo(() => {
    const map: Record<string, number> = {};
    parsedRaw.allItems.forEach((it) => {
      const m = it.item?.mes || targetMonth;
      map[m] = (map[m] || 0) + 1;
    });
    return map;
  }, [parsedRaw.allItems, targetMonth]);

  // Filtra itens com base nos meses marcados pelo usuário
  const parsedData = useMemo(() => {
    if (parsedRaw.allItems.length === 0) {
      return { previewItems: [], validCount: 0, invalidCount: 0 };
    }

    const selectedSet = new Set(selectedMonths);
    const previewItems = parsedRaw.allItems.filter((it) => selectedSet.has(it.item?.mes));

    let validCount = 0;
    let invalidCount = 0;
    previewItems.forEach((it) => {
      if (it.isValid) validCount++;
      else invalidCount++;
    });

    return {
      previewItems,
      validCount,
      invalidCount,
    };
  }, [parsedRaw.allItems, selectedMonths]);

  // Alternar seleção de um mês
  const handleToggleMonth = (m: string) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  // Efetivar Importação no aplicativo
  const handleConfirmarImportacao = () => {
    if (!isAdmin) {
      setFeedback({
        tipo: 'erro',
        msg: 'Acesso restrito: apenas o irmão responsável autenticado pode carregar alterações nas programações.',
      });
      return;
    }

    if (selectedMonths.length === 0) {
      setFeedback({
        tipo: 'aviso',
        msg: 'Por favor, selecione ao menos um mês nos botões de filtro para importar.',
      });
      return;
    }

    const itensValidos = parsedData.previewItems.filter((i) => i.isValid).map((i) => i.item);

    if (itensValidos.length === 0) {
      setFeedback({
        tipo: 'erro',
        msg: 'Nenhuma programação válida identificada para os meses selecionados.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const selectedMonthKeys = selectedMonths.map(normalizarMesChave);
      let res: any = { success: false };

      if (modulo === 'designacoes') {
        res = saveBulkEscalaDesignacoes(itensValidos, importMode, selectedMonthKeys);
      } else if (modulo === 'campo') {
        res = saveBulkCampoFds(itensValidos, importMode, selectedMonthKeys);
      } else if (modulo === 'discurso') {
        res = saveBulkDiscursosBiblicos(itensValidos, importMode, selectedMonths);
      } else if (modulo === 'limpeza') {
        res = saveBulkLimpezaEscala(itensValidos, importMode, selectedMonthKeys);
      }

      if (res.success) {
        onImportadoComSucesso(itensValidos.length, importMode);
        onClose();
      } else {
        setFeedback({ tipo: 'erro', msg: res.error || 'Erro ao gravar dados importados no banco de dados.' });
      }
    } catch (err: any) {
      setFeedback({ tipo: 'erro', msg: err.message || 'Erro inesperado durante importação.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                Importar Planilha de Programação
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Módulo: <strong className="text-slate-700 dark:text-slate-300">{tituloModulo}</strong> • Congregação Vila Cisper
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback / Mensagens de Status */}
        {feedback && (
          <div
            className={`mx-5 mt-3 flex items-center justify-between rounded-lg p-3 text-xs ${
              feedback.tipo === 'sucesso'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : feedback.tipo === 'aviso'
                ? 'border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Abas Exclusivas de Importação */}
        <div className="flex border-b border-slate-200 px-5 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('arquivo')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'arquivo'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            <span>1. Selecionar Planilha (Excel / CSV)</span>
          </button>
          <button
            onClick={() => setActiveTab('colar')}
            className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'colar'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Copy className="h-4 w-4" />
            <span>2. Ou Colar Células Copiadas</span>
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-slate-800 dark:text-slate-200">
          {activeTab === 'arquivo' && (
            <div className="space-y-4">
              {/* Dropzone Principal de Seleção de Planilha */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/20'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls,.csv,.tsv,.txt"
                  className="hidden"
                />

                {isReadingFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-10 w-10 animate-spin text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Lendo e analisando a planilha...
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 mb-2">
                      <FileSpreadsheet className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedFileName ? `Arquivo: ${selectedFileName}` : 'Selecionar a Planilha'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                      Clique para escolher a planilha do seu computador/celular ou arraste o arquivo aqui.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="rounded bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800">.XLSX</span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800">.XLS</span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800">.CSV</span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 font-medium dark:bg-slate-800">Excel / Google Sheets</span>
                    </div>
                    <button
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700"
                    >
                      <UploadCloud className="h-4 w-4" />
                      <span>{selectedFileName ? 'Escolher Outra Planilha' : 'Selecionar Planilha'}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <p>
                    <strong>Fluxo do Responsável:</strong> Escolha o arquivo da planilha. O sistema lê as colunas e as linhas automaticamente, identificando as datas e designações para exibi-las no aplicativo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'colar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Cole as linhas copiadas da planilha
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione as células no Excel ou Google Sheets (Ctrl+C) e cole aqui (Ctrl+V):
                  </p>
                </div>
                {pastedText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText('');
                      setSelectedFileName('');
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Cole aqui as linhas da planilha copiadas do Excel ou Sheets..."
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          )}

          {/* Seleção de Meses para Importação (quando detectados na planilha) */}
          {parsedRaw.availableMonths.length > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Selecione os meses que deseja importar ({selectedMonths.length} de {parsedRaw.availableMonths.length} selecionados):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonths(parsedRaw.availableMonths)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Marcar Todos</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMonths([])}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                  >
                    <X className="h-3 w-3" />
                    <span>Desmarcar Todos</span>
                  </button>
                </div>
              </div>

              {/* Badges clicáveis para cada mês */}
              <div className="flex flex-wrap gap-2">
                {parsedRaw.availableMonths.map((m) => {
                  const isChecked = selectedMonths.includes(m);
                  const count = countPerMonth[m] || 0;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => handleToggleMonth(m)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs dark:border-emerald-500 dark:bg-emerald-600'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked
                            ? 'border-white bg-white text-emerald-700'
                            : 'border-slate-400 bg-slate-50 dark:border-slate-600 dark:bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <span>{m}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isChecked
                            ? 'bg-emerald-700/90 text-emerald-100'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {count} prog.
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedMonths.length === 0 && (
                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Nenhum mês selecionado. Marque ao menos um mês para visualizar e importar as programações.</span>
                </p>
              )}
            </div>
          )}

          {/* Configurações de Aplicação das Programações */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                A primeira linha é o cabeçalho?
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={hasHeaderRow}
                  onChange={(e) => setHasHeaderRow(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Sim (ignorar linha de títulos)</span>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mês padrão (se não houver na coluna):
              </label>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {[
                  'Janeiro 2026',
                  'Fevereiro 2026',
                  'Março 2026',
                  'Abril 2026',
                  'Maio 2026',
                  'Junho 2026',
                  'Julho 2026',
                  'Agosto 2026',
                  'Setembro 2026',
                  'Outubro 2026',
                  'Novembro 2026',
                  'Dezembro 2026',
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Como aplicar no aplicativo:
              </label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="append">➕ Adicionar às existentes (Mesclar)</option>
                <option value="replace_month">
                  {selectedMonths.length > 1
                    ? `🔄 Substituir apenas os ${selectedMonths.length} meses selecionados`
                    : selectedMonths.length === 1
                    ? `🔄 Substituir apenas ${selectedMonths[0]}`
                    : '🔄 Substituir apenas os meses selecionados'}
                </option>
                <option value="replace_all">⚠️ Substituir todas as escalas deste módulo</option>
              </select>
            </div>
          </div>

          {/* Pré-visualização Automática das Programações Lidas */}
          {parsedData.previewItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Programações lidas da planilha:</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {parsedData.validCount} identificadas
                  </span>
                  {parsedData.invalidCount > 0 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {parsedData.invalidCount} com avisos
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Mostrando primeiras {Math.min(parsedData.previewItems.length, 12)} linhas
                </span>
              </div>

              <div className="max-h-60 overflow-x-auto overflow-y-auto rounded-xl border border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-950">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 border-b border-slate-200 bg-slate-100 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                      <th className="p-2">Status</th>
                      {modulo === 'designacoes' && (
                        <>
                          <th className="p-2">Mês</th>
                          <th className="p-2">Dia</th>
                          <th className="p-2">Indicador</th>
                          <th className="p-2">Microfone</th>
                          <th className="p-2">Leitor</th>
                          <th className="p-2">Áudio</th>
                          <th className="p-2">Vídeo</th>
                          <th className="p-2">Presidência</th>
                        </>
                      )}
                      {modulo === 'campo' && (
                        <>
                          <th className="p-2">Mês</th>
                          <th className="p-2">Data</th>
                          <th className="p-2">Dia Semana</th>
                          <th className="p-2">Dirigente</th>
                          <th className="p-2">Observação</th>
                        </>
                      )}
                      {modulo === 'discurso' && (
                        <>
                          <th className="p-2">Mês</th>
                          <th className="p-2">Data</th>
                          <th className="p-2">Tema</th>
                          <th className="p-2">Orador</th>
                          <th className="p-2">Presidente</th>
                        </>
                      )}
                      {modulo === 'limpeza' && (
                        <>
                          <th className="p-2">Mês</th>
                          <th className="p-2">Dias</th>
                          <th className="p-2">Grupo</th>
                          <th className="p-2">Responsáveis</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedData.previewItems.slice(0, 12).map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                          !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="p-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>OK</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium"
                              title={row.warnings.join(', ')}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Aviso</span>
                            </span>
                          )}
                        </td>
                        {modulo === 'designacoes' && (
                          <>
                            <td className="p-2 text-slate-600 dark:text-slate-400">{row.item.mes}</td>
                            <td className="p-2 font-medium">{row.item.dia}</td>
                            <td className="p-2">{row.item.indicador}</td>
                            <td className="p-2">{row.item.microfone}</td>
                            <td className="p-2">{row.item.leitor || '-'}</td>
                            <td className="p-2">{row.item.audio}</td>
                            <td className="p-2">{row.item.video}</td>
                            <td className="p-2">{row.item.presidencia || '-'}</td>
                          </>
                        )}
                        {modulo === 'campo' && (
                          <>
                            <td className="p-2 text-slate-600 dark:text-slate-400">{row.item.mes}</td>
                            <td className="p-2 font-medium">{row.item.data}</td>
                            <td className="p-2">{row.item.diaSemana}</td>
                            <td className="p-2 font-medium text-sky-700 dark:text-sky-300">
                              {row.item.dirigente}
                            </td>
                            <td className="p-2 text-slate-500">{row.item.observacao || '-'}</td>
                          </>
                        )}
                        {modulo === 'discurso' && (
                          <>
                            <td className="p-2 text-slate-600 dark:text-slate-400">{row.item.mes}</td>
                            <td className="p-2 font-medium">{row.item.data}</td>
                            <td className="p-2 font-medium text-purple-700 dark:text-purple-300">
                              {row.item.tema}
                            </td>
                            <td className="p-2">{row.item.orador}</td>
                            <td className="p-2">{row.item.presidente || '-'}</td>
                          </>
                        )}
                        {modulo === 'limpeza' && (
                          <>
                            <td className="p-2 text-slate-600 dark:text-slate-400">{row.item.mes}</td>
                            <td className="p-2 font-medium">{row.item.dias}</td>
                            <td className="p-2 font-medium text-emerald-700 dark:text-emerald-300">
                              {row.item.grupo}
                            </td>
                            <td className="p-2">{row.item.responsaveis}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações - 1 Clique para aplicar as programações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            {parsedData.validCount > 0 ? (
              <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                <Check className="h-4 w-4" />
                <span>
                  Pronto para aplicar <strong>{parsedData.validCount}</strong> programações ({selectedMonths.length} {selectedMonths.length === 1 ? 'mês' : 'meses'})
                </span>
              </span>
            ) : selectedMonths.length === 0 && parsedRaw.availableMonths.length > 0 ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Selecione ao menos um mês nos botões acima para carregar as programações.
              </span>
            ) : (
              <span>Selecione a planilha para ler e carregar as programações automaticamente.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>

            {parsedData.validCount > 0 && (
              <button
                type="button"
                disabled={isProcessing || selectedMonths.length === 0}
                onClick={handleConfirmarImportacao}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                <span>
                  {isProcessing
                    ? 'Carregando programações...'
                    : `Confirmar e Carregar ${parsedData.validCount} Programações (${selectedMonths.length} ${selectedMonths.length === 1 ? 'mês' : 'meses'})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
