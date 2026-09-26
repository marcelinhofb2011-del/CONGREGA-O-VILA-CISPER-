import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  BookOpen,
  Users,
  Sparkles,
  ArrowRight,
  Loader2,
  FileCheck,
  Info,
} from 'lucide-react';
import { S140TSemana, saveBulkS140TSemanas } from '../data/s140tStorage';

interface ImportarVidaMinisterioPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSucesso: (count: number) => void;
}

export const ImportarVidaMinisterioPdfModal: React.FC<ImportarVidaMinisterioPdfModalProps> = ({
  isOpen,
  onClose,
  onSucesso,
}) => {
  const [etapa, setEtapa] = useState<'selecionar' | 'processando' | 'revisao' | 'sucesso'>('selecionar');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState<string>('');
  const [tamanhoFormatado, setTamanhoFormatado] = useState<string>('');
  const [semanasExtraidas, setSemanasExtraidas] = useState<S140TSemana[]>([]);
  const [erro, setErro] = useState<string>('');
  const [modoContinuacao, setModoContinuacao] = useState<'append' | 'replace_month' | 'replace_all'>('append');
  const [isGravando, setIsGravando] = useState<boolean>(false);
  const [textoManual, setTextoManual] = useState<string>('');
  const [usarTextoManual, setUsarTextoManual] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetar = () => {
    setEtapa('selecionar');
    setArquivo(null);
    setNomeArquivo('');
    setTamanhoFormatado('');
    setSemanasExtraidas([]);
    setErro('');
    setModoContinuacao('append');
    setIsGravando(false);
    setTextoManual('');
    setUsarTextoManual(false);
  };

  const handleFechar = () => {
    resetar();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErro('Por favor, selecione um arquivo no formato PDF (.pdf).');
      return;
    }

    setArquivo(file);
    setNomeArquivo(file.name);
    setTamanhoFormatado((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    setErro('');
  };

  const handleProcessarPdf = async () => {
    if (!arquivo && (!usarTextoManual || !textoManual.trim())) {
      setErro('Selecione um arquivo PDF ou cole o texto da programação.');
      return;
    }

    try {
      setEtapa('processando');
      setErro('');

      let pdfBase64 = '';
      if (arquivo) {
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(arquivo);
        });
      }

      const response = await fetch('/api/parse-s140t-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: pdfBase64 || undefined,
          textContent: usarTextoManual ? textoManual.trim() : undefined,
          filename: nomeArquivo || 'programacao.pdf',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível extrair a programação do PDF.');
      }

      if (!data.semanas || !Array.isArray(data.semanas) || data.semanas.length === 0) {
        throw new Error('Nenhuma semana de programação foi identificada no arquivo.');
      }

      setSemanasExtraidas(data.semanas);
      setEtapa('revisao');
    } catch (err: any) {
      console.error('Erro ao interpretar PDF:', err);
      setErro(err?.message || 'Falha ao processar o arquivo PDF. Tente novamente.');
      setEtapa('selecionar');
    }
  };

  const handleConfirmarGravacao = async () => {
    if (semanasExtraidas.length === 0) return;

    try {
      setIsGravando(true);
      const res = await saveBulkS140TSemanas(semanasExtraidas, modoContinuacao);

      if (!res.success) {
        throw new Error(res.error || 'Erro ao gravar as semanas no banco de dados.');
      }

      setEtapa('sucesso');
      setTimeout(() => {
        onSucesso(semanasExtraidas.length);
        handleFechar();
      }, 1600);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      setErro(err?.message || 'Falha ao salvar as novas designações.');
      setIsGravando(false);
    }
  };

  return (
    <div
      id="modal-importar-pdf-vida-ministerio"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Modo Responsável &bull; S-140-T
              </span>
              <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white">
                IMPORTAR PROGRAMAÇÃO EM PDF
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFechar}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {erro && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs sm:text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1 font-semibold">{erro}</div>
            </div>
          )}

          {/* ETAPA 1: Selecionar Arquivo */}
          {etapa === 'selecionar' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/30 text-xs sm:text-sm text-blue-900 dark:text-blue-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>Importação direta do documento oficial S-140-T</span>
                </div>
                <p className="text-xs text-blue-800/90 dark:text-blue-300 leading-relaxed">
                  Você pode importar a programação oficial mensal ou trimestral diretamente em PDF.
                  O sistema reconhece automaticamente os períodos, semanas, tesouros, partes do ministério, ajudantes, vida cristã e o estudo bíblico com dirigente e leitor.
                </p>
              </div>

              {!usarTextoManual ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40 group"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100/70 text-red-600 group-hover:scale-105 transition-transform dark:bg-red-950/60 dark:text-red-400 mb-3">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {arquivo ? arquivo.name : 'Clique para selecionar o PDF da programação'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {arquivo
                        ? `Tamanho: ${tamanhoFormatado}`
                        : 'Formatos aceitos: Documento PDF oficial (.pdf)'}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setUsarTextoManual(true)}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-semibold"
                    >
                      Prefere colar o texto do documento?
                    </button>
                    {arquivo && (
                      <button
                        type="button"
                        onClick={() => {
                          setArquivo(null);
                          setNomeArquivo('');
                        }}
                        className="text-red-600 hover:underline font-semibold"
                      >
                        Trocar arquivo
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cole aqui o texto copiado do documento da programação:
                    </label>
                    <button
                      type="button"
                      onClick={() => setUsarTextoManual(false)}
                      className="text-xs text-blue-600 hover:underline font-bold"
                    >
                      Voltar para envio de arquivo PDF
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={textoManual}
                    onChange={(e) => setTextoManual(e.target.value)}
                    placeholder="Ex: 5-11 DE OUTUBRO | JEREMIAS 40-42... Presidente: Marcelo F..."
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:border-red-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Botão de envio para análise */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!arquivo && (!usarTextoManual || !textoManual.trim())}
                  onClick={handleProcessarPdf}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black uppercase text-white shadow-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.99]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>ANALISAR DOCUMENTO PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: Processamento / Leitura inteligente */}
          {etapa === 'processando' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-red-600 mx-auto" />
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Lendo e interpretando o arquivo PDF...
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  A inteligência congregacional está extraindo as semanas, leituras bíblicas, presidentes, partes do ministério com ajudantes e orações.
                </p>
              </div>
            </div>
          )}

          {/* ETAPA 3: Revisão e Opção de Continuação */}
          {etapa === 'revisao' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-emerald-600" />
                    <span>{semanasExtraidas.length} semanas identificadas no PDF</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Confira abaixo o resumo antes de gravar no sistema.
                  </p>
                </div>
              </div>

              {/* Lista compacta de semanas extraídas */}
              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                {semanasExtraidas.map((sem, idx) => (
                  <div
                    key={sem.id || idx}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span className="text-amber-700 dark:text-amber-400 uppercase">
                        {sem.periodo || `Semana ${idx + 1}`}
                      </span>
                      <span className="text-slate-500 font-semibold">{sem.leituraBiblica}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">Presidente:</span>{' '}
                        {sem.presidente || 'A definir'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">Discurso:</span>{' '}
                        {sem.discursoTesourosIrmao || 'A definir'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">Estudo Bíblico:</span>{' '}
                        {sem.estudoBiblicoDirigente ? `${sem.estudoBiblicoDirigente} / ${sem.estudoBiblicoLeitor || ''}` : 'A definir'}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-200">Partes do Ministério:</span>{' '}
                        {sem.partesMinisterio?.length || 0} designações
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* OPÇÃO CRÍTICA DE CONTINUAÇÃO (SOLICITADA PELO USUÁRIO) */}
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 dark:border-emerald-800/80 dark:bg-emerald-950/30 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-black text-xs uppercase tracking-wide">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>Como deseja aplicar estas designações?</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modoContinuacao"
                      value="append"
                      checked={modoContinuacao === 'append'}
                      onChange={() => setModoContinuacao('append')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">
                        Continuar programação (Recomendado)
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        Permanece com todos os meses atuais já cadastrados no sistema (ex: Setembro) e apenas acrescenta as novas semanas dos próximos meses.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="modoContinuacao"
                      value="replace_month"
                      checked={modoContinuacao === 'replace_month'}
                      onChange={() => setModoContinuacao('replace_month')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 dark:text-white">
                        Atualizar apenas as semanas correspondentes deste PDF
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        Substitui semanas com as mesmas datas e mantém os outros meses intocados.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEtapa('selecionar')}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Voltar / Escolher Outro
                </button>
                <button
                  type="button"
                  disabled={isGravando}
                  onClick={handleConfirmarGravacao}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs sm:text-sm font-black uppercase text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {isGravando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Gravando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>GRAVAR PROGRAMAÇÃO DO PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 4: Sucesso */}
          {etapa === 'sucesso' && (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Programação Gravada com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                As novas designações foram salvas e sincronizadas, mantendo os meses anteriores em perfeita continuidade.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
