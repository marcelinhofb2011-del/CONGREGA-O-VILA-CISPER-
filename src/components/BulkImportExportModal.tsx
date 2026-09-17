import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Info,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  parseDelimitedText,
  generateCsv,
  downloadBrowserFile,
  normalizarMesChave,
  MODELOS_PLANILHA,
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
  dadosAtuais,
  isAdmin,
  onImportadoComSucesso,
}) => {
  const [activeTab, setActiveTab] = useState<'colar' | 'arquivo' | 'modelos'>('colar');
  const [pastedText, setPastedText] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace_month' | 'replace_all'>('append');
  const [targetMonth, setTargetMonth] = useState<string>('Janeiro');
  const [hasHeaderRow, setHasHeaderRow] = useState<boolean>(true);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; msg: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonBackupInputRef = useRef<HTMLInputElement>(null);

  // Carrega exemplo no campo de texto para teste rápido
  const carregarExemploNoTexto = () => {
    const modelo = MODELOS_PLANILHA[modulo];
    const headerLine = modelo.cabecalhos.join('\t');
    const rows = modelo.linhasExemplo.map((r) => r.join('\t')).join('\n');
    setPastedText(`${headerLine}\n${rows}`);
    setHasHeaderRow(true);
  };

  // Parser dos dados colados ou carregados
  const parsedData = useMemo(() => {
    if (!pastedText.trim()) {
      return { rows: [], previewItems: [], validCount: 0, invalidCount: 0 };
    }

    const rawMatrix = parseDelimitedText(pastedText);
    if (rawMatrix.length === 0) {
      return { rows: [], previewItems: [], validCount: 0, invalidCount: 0 };
    }

    const dataMatrix = hasHeaderRow && rawMatrix.length > 1 ? rawMatrix.slice(1) : rawMatrix;

    let validCount = 0;
    let invalidCount = 0;

    const previewItems = dataMatrix.map((cells, idx) => {
      let itemObj: any = {};
      let isValid = false;
      let warnings: string[] = [];

      if (modulo === 'designacoes') {
        // Formato esperado: Mês, Dia, Indicador, Microfone, Leitor, Audio, Video, Presidencia, Observacao
        // Se 8 colunas e primeira for Dia:
        let mes = '';
        let dia = '';
        let indicador = '';
        let microfone = '';
        let leitor = '';
        let audio = '';
        let video = '';
        let presidencia = '';
        let observacao = '';

        if (cells.length >= 8 && cells[0].toLowerCase().includes('202')) {
          // Começa com mês
          mes = cells[0] || targetMonth;
          dia = cells[1] || '';
          indicador = cells[2] || '';
          microfone = cells[3] || '';
          leitor = cells[4] || '';
          audio = cells[5] || '';
          video = cells[6] || '';
          presidencia = cells[7] || '';
          observacao = cells[8] || '';
        } else {
          // Começa direto com Dia
          dia = cells[0] || '';
          indicador = cells[1] || '';
          microfone = cells[2] || '';
          leitor = cells[3] || '';
          audio = cells[4] || '';
          video = cells[5] || '';
          presidencia = cells[6] || '';
          observacao = cells[7] || '';
          mes = targetMonth;
        }

        isValid = dia.trim().length > 0;
        if (!isValid) warnings.push('Dia/Data não informada');

        const ehEspecial =
          indicador.toLowerCase().includes('assembleia') ||
          indicador.toLowerCase().includes('congresso') ||
          observacao.toLowerCase().includes('assembleia') ||
          observacao.toLowerCase().includes('congresso');

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
        // Mês, Data, Dia da Semana, Dirigente, Observação
        let mes = '';
        let data = '';
        let diaSemana: 'Sábado' | 'Domingo' = 'Sábado';
        let dirigente = '';
        let observacao = '';

        if (cells.length >= 4 && (cells[0].toLowerCase().includes('janeiro') || cells[0].toLowerCase().includes('fevereiro') || cells[0].toLowerCase().includes('março') || cells[0].toLowerCase().includes('marco') || cells[0].toLowerCase().includes('abril') || cells[0].toLowerCase().includes('maio') || cells[0].toLowerCase().includes('junho') || cells[0].toLowerCase().includes('julho') || cells[0].toLowerCase().includes('agosto') || cells[0].toLowerCase().includes('setembro') || cells[0].toLowerCase().includes('outubro') || cells[0].toLowerCase().includes('novembro') || cells[0].toLowerCase().includes('dezembro'))) {
          mes = cells[0];
          data = cells[1];
          const ds = cells[2]?.toLowerCase();
          diaSemana = ds && ds.includes('dom') ? 'Domingo' : 'Sábado';
          dirigente = cells[3];
          observacao = cells[4] || '';
        } else {
          data = cells[0] || '';
          const ds = cells[1]?.toLowerCase();
          diaSemana = ds && ds.includes('dom') ? 'Domingo' : 'Sábado';
          dirigente = cells[2] || '';
          observacao = cells[3] || '';
          mes = targetMonth;
        }

        isValid = data.trim().length > 0 && dirigente.trim().length > 0;
        if (!data.trim()) warnings.push('Data ausente');
        if (!dirigente.trim()) warnings.push('Dirigente ausente');

        const ehEspecial =
          dirigente.toLowerCase().includes('assembléia') ||
          dirigente.toLowerCase().includes('assembleia') ||
          dirigente.toLowerCase().includes('congresso');

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
        // Mês, Data, Tema, Orador, Presidente, Leitor, Observação
        let mes = '';
        let data = '';
        let tema = '';
        let orador = '';
        let presidente = '';
        let leitor = '';
        let observacao = '';

        if (cells.length >= 4 && (cells[0].toLowerCase().includes('setembro') || cells[0].toLowerCase().includes('outubro') || cells[0].toLowerCase().includes('novembro') || cells[0].toLowerCase().includes('dezembro') || cells[0].toLowerCase().includes('janeiro'))) {
          mes = cells[0];
          data = cells[1];
          tema = cells[2];
          orador = cells[3];
          presidente = cells[4] || '';
          leitor = cells[5] || '';
          observacao = cells[6] || '';
        } else {
          data = cells[0] || '';
          tema = cells[1] || '';
          orador = cells[2] || '';
          presidente = cells[3] || '';
          leitor = cells[4] || '';
          observacao = cells[5] || '';
          mes = targetMonth;
        }

        isValid = data.trim().length > 0 && tema.trim().length > 0;
        if (!data.trim()) warnings.push('Data ausente');
        if (!tema.trim()) warnings.push('Tema ausente');

        itemObj = {
          id: `imp-disc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mes || targetMonth,
          data: data.trim(),
          tema: tema.trim(),
          orador: orador.trim() || 'Orador Local',
          presidente: presidente.trim(),
          leitor: leitor.trim(),
          observacao: observacao.trim(),
        } as DiscursoBiblicoItem;
      } else if (modulo === 'limpeza') {
        // Mês, Dias, Dias da Semana, Grupo, Responsáveis, Observação
        let mes = '';
        let dias = '';
        let diasSemana = 'Quarta Feira e Domingo';
        let grupo = '';
        let responsaveis = '';
        let observacao = '';

        if (cells.length >= 5) {
          mes = cells[0];
          dias = cells[1];
          diasSemana = cells[2] || 'Quarta Feira e Domingo';
          grupo = cells[3];
          responsaveis = cells[4];
          observacao = cells[5] || '';
        } else {
          dias = cells[0] || '';
          grupo = cells[1] || '';
          responsaveis = cells[2] || '';
          observacao = cells[3] || '';
          mes = targetMonth;
        }

        isValid = dias.trim().length > 0 && grupo.trim().length > 0;
        if (!dias.trim()) warnings.push('Dias ausentes');
        if (!grupo.trim()) warnings.push('Grupo ausente');

        const ehEspecial =
          observacao.toLowerCase().includes('assembléia') ||
          observacao.toLowerCase().includes('assembleia') ||
          observacao.toLowerCase().includes('congresso');

        itemObj = {
          id: `imp-limp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          mes: mes || targetMonth,
          mesChave: normalizarMesChave(mes || targetMonth),
          dias: dias.trim(),
          diasSemana: diasSemana.trim(),
          grupo: grupo.trim(),
          responsaveis: responsaveis.trim(),
          observacao: observacao.trim(),
          ehEspecial,
        } as LimpezaEscalaItem;
      }

      if (isValid) validCount++;
      else invalidCount++;

      return {
        item: itemObj,
        raw: cells,
        isValid,
        warnings,
      };
    });

    return {
      rows: dataMatrix,
      previewItems,
      validCount,
      invalidCount,
    };
  }, [pastedText, hasHeaderRow, modulo, targetMonth]);

  // Arquivo CSV drag & drop / input
  const handleFileSelected = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setPastedText(content);
        setActiveTab('colar');
        setFeedback({
          tipo: 'sucesso',
          msg: `Arquivo "${file.name}" carregado. Revise os dados abaixo antes de importar.`,
        });
      }
    };
    reader.onerror = () => {
      setFeedback({ tipo: 'erro', msg: 'Erro ao ler arquivo CSV.' });
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Download do modelo CSV oficial
  const handleDownloadModelo = () => {
    const modelo = MODELOS_PLANILHA[modulo];
    const csvContent = generateCsv(modelo.cabecalhos, modelo.linhasExemplo);
    downloadBrowserFile(csvContent, modelo.nome);
    setFeedback({
      tipo: 'sucesso',
      msg: `Modelo "${modelo.nome}" baixado com sucesso! Abra no Excel ou Google Sheets para preencher.`,
    });
  };

  // Exportar dados atuais em CSV para abrir no Excel
  const handleExportarCsvAtual = () => {
    if (!dadosAtuais || dadosAtuais.length === 0) {
      setFeedback({ tipo: 'aviso', msg: 'Nenhum dado atual para exportar neste módulo.' });
      return;
    }

    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (modulo === 'designacoes') {
      headers = ['Mês', 'Dia/Data', 'Indicador', 'Microfone Volante', 'Leitor', 'Áudio', 'Vídeo', 'Presidência', 'Observação'];
      rows = dadosAtuais.map((item: EscalaDesignacaoItem) => [
        item.mes,
        item.dia,
        item.indicador,
        item.microfone,
        item.leitor || '',
        item.audio,
        item.video,
        item.presidencia || '',
        item.observacao || '',
      ]);
      filename = 'Escala_Designacoes_Vila_Cisper_2026.csv';
    } else if (modulo === 'campo') {
      headers = ['Mês', 'Data', 'Dia da Semana', 'Dirigente', 'Observação'];
      rows = dadosAtuais.map((item: CampoFimDeSemanaItem) => [
        item.mes,
        item.data,
        item.diaSemana,
        item.dirigente,
        item.observacao || '',
      ]);
      filename = 'Escala_Servico_Campo_Vila_Cisper_2026.csv';
    } else if (modulo === 'discurso') {
      headers = ['Mês', 'Data', 'Tema do Discurso', 'Orador', 'Presidente', 'Leitor', 'Observação'];
      rows = dadosAtuais.map((item: DiscursoBiblicoItem) => [
        item.mes,
        item.data,
        item.tema,
        item.orador || '',
        item.presidente || '',
        item.leitor || '',
        item.observacao || '',
      ]);
      filename = 'Escala_Discursos_Biblicos_Vila_Cisper_2026.csv';
    } else if (modulo === 'limpeza') {
      headers = ['Mês', 'Dias', 'Dias da Semana', 'Grupo', 'Responsáveis', 'Observação'];
      rows = dadosAtuais.map((item: LimpezaEscalaItem) => [
        item.mes,
        item.dias,
        item.diasSemana,
        item.grupo,
        item.responsaveis,
        item.observacao || '',
      ]);
      filename = 'Escala_Limpeza_Salao_Vila_Cisper_2026.csv';
    }

    const csvContent = generateCsv(headers, rows);
    downloadBrowserFile(csvContent, filename);
    setFeedback({
      tipo: 'sucesso',
      msg: `Planilha exportada com sucesso: ${filename} (Total: ${rows.length} registros).`,
    });
  };

  // Exportar Backup JSON
  const handleExportarJsonBackup = () => {
    const jsonStr = JSON.stringify(dadosAtuais, null, 2);
    downloadBrowserFile(
      jsonStr,
      `backup_${modulo}_vila_cisper_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
    setFeedback({ tipo: 'sucesso', msg: 'Backup JSON baixado com sucesso!' });
  };

  // Restaurar Backup JSON
  const handleRestaurarJsonBackup = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          setFeedback({ tipo: 'erro', msg: 'O arquivo JSON deve conter uma lista de itens.' });
          return;
        }

        let res: any = { success: false };
        if (modulo === 'designacoes') {
          res = saveBulkEscalaDesignacoes(parsed, 'replace_all');
        } else if (modulo === 'campo') {
          res = saveBulkCampoFds(parsed, 'replace_all');
        } else if (modulo === 'discurso') {
          res = saveBulkDiscursosBiblicos(parsed, 'replace_all');
        } else if (modulo === 'limpeza') {
          res = saveBulkLimpezaEscala(parsed, 'replace_all');
        }

        if (res.success) {
          onImportadoComSucesso(parsed.length, 'backup_restaurado');
          onClose();
        } else {
          setFeedback({ tipo: 'erro', msg: res.error || 'Falha ao restaurar backup.' });
        }
      } catch (err: any) {
        setFeedback({ tipo: 'erro', msg: `Erro ao processar JSON: ${err.message}` });
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Efetivar Importação
  const handleConfirmarImportacao = () => {
    if (!isAdmin) {
      setFeedback({
        tipo: 'erro',
        msg: 'Apenas o irmão responsável autenticado pode salvar alterações nas escalas.',
      });
      return;
    }

    const itensValidos = parsedData.previewItems.filter((i) => i.isValid).map((i) => i.item);

    if (itensValidos.length === 0) {
      setFeedback({ tipo: 'erro', msg: 'Nenhum item válido identificado para importação.' });
      return;
    }

    setIsProcessing(true);

    try {
      const targetMonthKey = normalizarMesChave(targetMonth);
      let res: any = { success: false };

      if (modulo === 'designacoes') {
        res = saveBulkEscalaDesignacoes(itensValidos, importMode, targetMonthKey);
      } else if (modulo === 'campo') {
        res = saveBulkCampoFds(itensValidos, importMode, targetMonthKey);
      } else if (modulo === 'discurso') {
        res = saveBulkDiscursosBiblicos(itensValidos, importMode, targetMonth);
      } else if (modulo === 'limpeza') {
        res = saveBulkLimpezaEscala(itensValidos, importMode, targetMonthKey);
      }

      if (res.success) {
        onImportadoComSucesso(itensValidos.length, importMode);
        onClose();
      } else {
        setFeedback({ tipo: 'erro', msg: res.error || 'Erro ao gravar dados importados.' });
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
                Importar e Exportar Planilhas em Lote
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

        {/* Feedback Mensagem se houver */}
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

        {/* Navegação entre Abas */}
        <div className="flex border-b border-slate-200 px-5 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('colar')}
            className={`flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'colar'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Copy className="h-4 w-4" />
            <span>1. Copiar & Colar do Excel / Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab('arquivo')}
            className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'arquivo'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            <span>2. Enviar Arquivo CSV</span>
          </button>
          <button
            onClick={() => setActiveTab('modelos')}
            className={`ml-6 flex items-center gap-2 border-b-2 py-3 text-xs font-semibold transition ${
              activeTab === 'modelos'
                ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>3. Baixar Modelos & Exportações</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-slate-800 dark:text-slate-200">
          {activeTab === 'colar' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Cole as linhas da sua planilha (Excel, LibreOffice ou Google Sheets)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Selecione as células na sua planilha, tecle <strong>Ctrl+C</strong> e depois{' '}
                    <strong>Ctrl+V</strong> na caixa abaixo:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={carregarExemploNoTexto}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Carregar Linhas de Exemplo</span>
                  </button>
                  {pastedText && (
                    <button
                      type="button"
                      onClick={() => setPastedText('')}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* Área de Texto para Colar */}
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Cole aqui as linhas copiadas da planilha...\nExemplo:\nJaneiro 2026\tDomingo 04/01\tDanilo Cardoso / Hugo\tDanilo Maia / Leandro\tVilson\tGustavo\tDhiego`}
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />

              {/* Controles de Configuração de Importação */}
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
                    Mês padrão (se não houver coluna de mês):
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
                    Como aplicar as novas escalas:
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="append">➕ Adicionar às existentes (Mesclar)</option>
                    <option value="replace_month">🔄 Substituir apenas o mês selecionado</option>
                    <option value="replace_all">⚠️ Substituir todas as escalas deste módulo</option>
                  </select>
                </div>
              </div>

              {/* Pré-visualização ao vivo */}
              {parsedData.previewItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Pré-visualização dos dados detectados:</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {parsedData.validCount} válidas
                      </span>
                      {parsedData.invalidCount > 0 && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          {parsedData.invalidCount} com avisos
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Mostrando primeiras 10 linhas
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
                        {parsedData.previewItems.slice(0, 10).map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                              !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="p-2">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>OK</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"
                                  title={row.warnings.join(', ')}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>Erro</span>
                                </span>
                              )}
                            </td>
                            {modulo === 'designacoes' && (
                              <>
                                <td className="p-2">{row.item.mes}</td>
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
                                <td className="p-2">{row.item.mes}</td>
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
                                <td className="p-2">{row.item.mes}</td>
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
                                <td className="p-2">{row.item.mes}</td>
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
          )}

          {activeTab === 'arquivo' && (
            <div className="space-y-4">
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
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900'
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
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                />
                <UploadCloud className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Arraste e solte seu arquivo CSV ou clique para escolher
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Suporta arquivos .csv exportados do Excel, Google Sheets ou LibreOffice
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700">
                  Selecionar Arquivo do Computador/Celular
                </span>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Dica para salvar o arquivo no Excel:</p>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                      No Microsoft Excel, ao salvar a planilha, escolha o formato{' '}
                      <strong>"CSV (delimitado por vírgulas) (*.csv)"</strong> ou{' '}
                      <strong>"CSV UTF-8"</strong>. O sistema reconhece automaticamente acentos e
                      delimitadores em português.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modelos' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Baixar Modelo Oficial de Planilha */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Baixar Modelo de Planilha
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Baixe um arquivo CSV com as colunas certas e linhas de exemplo pré-formatadas para preencher no Excel ou Google Sheets.
                </p>
                <button
                  type="button"
                  onClick={handleDownloadModelo}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar Modelo CSV ({tituloModulo})</span>
                </button>
              </div>

              {/* Exportar Escala Atual */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Exportar Escala Atual (CSV)
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Exporta todos os registros atualmente cadastrados neste módulo para abrir e editar diretamente no Excel.
                </p>
                <button
                  type="button"
                  onClick={handleExportarCsvAtual}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4 text-blue-600" />
                  <span>Exportar Dados em Planilha ({dadosAtuais.length} itens)</span>
                </button>
              </div>

              {/* Backup Completo JSON */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Backup Completo (JSON)
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Gera um arquivo de segurança com a estrutura exata do banco de dados deste módulo.
                </p>
                <button
                  type="button"
                  onClick={handleExportarJsonBackup}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4 text-indigo-600" />
                  <span>Baixar Arquivo de Backup</span>
                </button>
              </div>

              {/* Restaurar Backup JSON */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Restaurar Backup (JSON)
                  </h4>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Recupere as escalas a partir de um arquivo de backup previamente gerado.
                </p>
                <input
                  type="file"
                  ref={jsonBackupInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleRestaurarJsonBackup(e.target.files[0]);
                    }
                  }}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => jsonBackupInputRef.current?.click()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-xs transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Carregar Backup JSON</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {parsedData.validCount > 0 && (
              <span>
                Pronto para importar: <strong>{parsedData.validCount}</strong> itens
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Fechar
            </button>

            {parsedData.validCount > 0 && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmarImportacao}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                <span>
                  {isProcessing
                    ? 'Importando...'
                    : `Confirmar e Importar ${parsedData.validCount} Itens`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
