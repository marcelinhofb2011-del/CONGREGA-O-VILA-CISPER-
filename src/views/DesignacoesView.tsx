import React, { useState, useEffect, useMemo } from 'react';
import {
  EscalaDesignacaoItem,
  getStoredEscalaDesignacoes,
  saveStoredEscalaItem,
  deleteStoredEscalaItem,
  resetEscalaDesignacoesToSample,
  verificarDesignacaoNome,
} from '../data/designacoesStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  Lock,
  Unlock,
  Plus,
  Calendar,
  RotateCcw,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  User,
  Mic,
  Volume2,
  Tv,
  CheckCircle2,
  Edit2,
  Trash2,
  Users,
  FileSpreadsheet,
} from 'lucide-react';
import { BulkImportExportModal } from '../components/BulkImportExportModal';
import { ImportarPlanilhaModal } from '../components/ImportarPlanilhaModal';

export const DesignacoesView: React.FC = () => {
  const [escalas, setEscalas] = useState<EscalaDesignacaoItem[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [isImportPlanilhaOpen, setIsImportPlanilhaOpen] = useState<boolean>(false);
  const [modoVisualizacao, setModoVisualizacao] = useState<'cartoes' | 'tabela'>('cartoes');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Filtro / Realce por Irmão ("Minhas Designações")
  const [irmaoSelecionado, setIrmaoSelecionado] = useState<string>('');
  // Filtro por Mês
  const [mesFiltro, setMesFiltro] = useState<string>('todos');

  // Estado do Modal de Edição/Criação
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [itemParaEditar, setItemParaEditar] = useState<EscalaDesignacaoItem | null>(null);

  // Campos do formulário
  const [formMes, setFormMes] = useState<string>('Janeiro 2026');
  const [formDia, setFormDia] = useState<string>('');
  const [formIndicador, setFormIndicador] = useState<string>('');
  const [formMicrofone, setFormMicrofone] = useState<string>('');
  const [formLeitor, setFormLeitor] = useState<string>('');
  const [formAudio, setFormAudio] = useState<string>('');
  const [formVideo, setFormVideo] = useState<string>('');
  const [formPresidencia, setFormPresidencia] = useState<string>('');
  const [formEspecial, setFormEspecial] = useState<boolean>(false);
  const [formObservacao, setFormObservacao] = useState<string>('');

  // Mensagem de feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setEscalas(getStoredEscalaDesignacoes());
    setIsAdmin(isAdminAuthenticated());

    const handleFirebaseUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setEscalas(e.detail);
      }
    };
    window.addEventListener('designacoes-firebase-updated', handleFirebaseUpdate);
    return () => {
      window.removeEventListener('designacoes-firebase-updated', handleFirebaseUpdate);
    };
  }, []);

  // Lista única de meses disponíveis
  const mesesDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    escalas.forEach((item) => {
      if (!map.has(item.mesChave)) {
        map.set(item.mesChave, item.mes);
      }
    });
    return Array.from(map.entries()).map(([chave, rotulo]) => ({ chave, rotulo }));
  }, [escalas]);

  // Lista de todos os nomes únicos citados na escala
  const todosIrmaosNaEscala = useMemo(() => {
    const nomes = new Set<string>();
    const extrair = (str?: string) => {
      if (!str) return;
      if (str.toLowerCase().includes('assembleia') || str.toLowerCase().includes('congresso')) return;
      str.split(/[/,eE+&]/).forEach((part) => {
        const limpo = part.trim();
        if (limpo.length > 2) nomes.add(limpo);
      });
    };

    escalas.forEach((e) => {
      extrair(e.indicador);
      extrair(e.microfone);
      extrair(e.leitor);
      extrair(e.audio);
      extrair(e.video);
      extrair(e.presidencia);
    });

    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [escalas]);

  // Resumo de designações do irmão selecionado
  const resumoIrmao = useMemo(() => {
    if (!irmaoSelecionado) return null;
    let indicadorCount = 0;
    let volanteCount = 0;
    let leitorCount = 0;
    let audioCount = 0;
    let videoCount = 0;
    let presidenciaCount = 0;
    const listaDetalhes: { dia: string; mes: string; funcao: string }[] = [];

    escalas.forEach((e) => {
      if (verificarDesignacaoNome(irmaoSelecionado, e.indicador)) {
        indicadorCount++;
        listaDetalhes.push({ dia: e.dia, mes: e.mes, funcao: 'Indicador' });
      }
      if (verificarDesignacaoNome(irmaoSelecionado, e.microfone)) {
        volanteCount++;
        listaDetalhes.push({ dia: e.dia, mes: e.mes, funcao: 'Microfone Volante' });
      }
      if (verificarDesignacaoNome(irmaoSelecionado, e.leitor)) {
        leitorCount++;
        listaDetalhes.push({ dia: e.dia, mes: e.mes, funcao: 'Leitor' });
      }
      if (verificarDesignacaoNome(irmaoSelecionado, e.audio)) {
        audioCount++;
        listaDetalhes.push({ dia: e.dia, mes: e.mes, funcao: 'Áudio' });
      }
      if (verificarDesignacaoNome(irmaoSelecionado, e.video)) {
        videoCount++;
        listaDetalhes.push({ dia: e.dia, mes: e.mes, funcao: 'Vídeo' });
      }
      if (verificarDesignacaoNome(irmaoSelecionado, e.presidencia)) {
        presidenciaCount++;
        listaDetalhes.push({ dia: e.dia, mes: e.mes, funcao: 'Presidência' });
      }
    });

    const total = indicadorCount + volanteCount + leitorCount + audioCount + videoCount + presidenciaCount;
    return {
      total,
      indicadorCount,
      volanteCount,
      leitorCount,
      audioCount,
      videoCount,
      presidenciaCount,
      listaDetalhes,
    };
  }, [irmaoSelecionado, escalas]);

  // Estatísticas de voluntários oficiais
  const estatisticasVoluntarios = useMemo(() => {
    const mapa = new Map<string, { indicador: number; volante: number; audio: number; video: number; total: number }>();

    todosIrmaosNaEscala.forEach((nome) => {
      mapa.set(nome, { indicador: 0, volante: 0, audio: 0, video: 0, total: 0 });
    });

    escalas.forEach((e) => {
      todosIrmaosNaEscala.forEach((nome) => {
        const st = mapa.get(nome)!;
        let somou = false;
        if (verificarDesignacaoNome(nome, e.indicador)) {
          st.indicador++;
          st.total++;
          somou = true;
        }
        if (verificarDesignacaoNome(nome, e.microfone)) {
          st.volante++;
          st.total++;
          somou = true;
        }
        if (verificarDesignacaoNome(nome, e.audio)) {
          st.audio++;
          st.total++;
          somou = true;
        }
        if (verificarDesignacaoNome(nome, e.video)) {
          st.video++;
          st.total++;
          somou = true;
        }
      });
    });

    return Array.from(mapa.entries())
      .map(([nome, dados]) => ({ nome, ...dados }))
      .filter((v) => v.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [todosIrmaosNaEscala, escalas]);

  // Escalas agrupadas por mês exibido
  const escalasAgrupadas = useMemo(() => {
    const grupos: { [mes: string]: EscalaDesignacaoItem[] } = {};
    escalas.forEach((item) => {
      if (mesFiltro !== 'todos' && item.mesChave !== mesFiltro) return;
      if (!grupos[item.mes]) grupos[item.mes] = [];
      grupos[item.mes].push(item);
    });
    return grupos;
  }, [escalas, mesFiltro]);

  // Autenticação
  const handleOpenAuth = () => {
    setPasswordInput('');
    setAuthError('');
    setShowAuthModal(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Acesso do responsável concedido.' });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setFeedbackMsg({ tipo: 'sucesso', texto: 'Modo de gestão finalizado.' });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Abrir Modal de Criação / Edição
  const handleOpenCreate = () => {
    setItemParaEditar(null);
    setFormMes(mesFiltro !== 'todos' ? (mesesDisponiveis.find((m) => m.chave === mesFiltro)?.rotulo || 'Janeiro 2026') : 'Janeiro 2026');
    setFormDia('');
    setFormIndicador('');
    setFormMicrofone('');
    setFormLeitor('');
    setFormAudio('');
    setFormVideo('');
    setFormPresidencia('');
    setFormEspecial(false);
    setFormObservacao('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: EscalaDesignacaoItem) => {
    setItemParaEditar(item);
    setFormMes(item.mes);
    setFormDia(item.dia);
    setFormIndicador(item.indicador);
    setFormMicrofone(item.microfone);
    setFormLeitor(item.leitor || '');
    setFormAudio(item.audio);
    setFormVideo(item.video);
    setFormPresidencia(item.presidencia || '');
    setFormEspecial(!!item.ehEspecial);
    setFormObservacao(item.observacao || '');
    setIsEditorOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDia.trim() || !formIndicador.trim()) {
      alert('Preencha ao menos o Dia e os Indicadores.');
      return;
    }

    const mesChave = formMes.toLowerCase().split(' ')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const item: EscalaDesignacaoItem = {
      id: itemParaEditar ? itemParaEditar.id : `esc-${Date.now()}`,
      mes: formMes,
      mesChave,
      dia: formDia.trim(),
      indicador: formIndicador.trim(),
      microfone: formMicrofone.trim(),
      leitor: formLeitor.trim(),
      audio: formAudio.trim(),
      video: formVideo.trim(),
      presidencia: formPresidencia.trim(),
      ehEspecial: formEspecial,
      observacao: formObservacao.trim(),
    };

    const res = saveStoredEscalaItem(item);
    if (res.success && res.data) {
      setEscalas(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala salva com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleDeleteItem = (id: string, dia: string) => {
    if (window.confirm(`Deseja realmente remover a escala do dia "${dia}"?`)) {
      const res = deleteStoredEscalaItem(id);
      if (res.success && res.data) {
        setEscalas(res.data);
        setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala removida.' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    }
  };

  const handleResetToOfficial = () => {
    if (window.confirm('Deseja restaurar a escala oficial completa de Indicadores, Microfone, Áudio e Vídeo de 2026?')) {
      const canonico = resetEscalaDesignacoesToSample();
      setEscalas(canonico);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala oficial de 2026 restaurada com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleBulkSuccess = (qtd: number, modo: string) => {
    setEscalas(getStoredEscalaDesignacoes());
    const modoTexto =
      modo === 'append'
        ? 'adicionadas às existentes'
        : modo === 'replace_month'
        ? 'substituindo o mês selecionado'
        : 'substituição completa de escalas';
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Importação em lote concluída com sucesso! ${qtd} escalas processadas (${modoTexto}).`,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Superior de Identificação e Modos */}
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Congregação Vila Cisper (67744)
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escala Oficial 2026
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Indicadores, Microfonistas, Áudio e Vídeo
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Quadro operacional das reuniões congregacionais (Meio de Semana e Fim de Semana).
          </p>
        </div>

        {/* Controles de Acesso */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              title="Selecionar planilha (Excel / CSV) para importar programações"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Importar Planilha</span>
            </button>
          )}

          {isAdmin ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Unlock className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">Modo Gestão:</span> Responsável Ativo
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Sair do modo de gestão"
              >
                Sair
              </button>
            </div>
          ) : (
            <button
              onClick={handleOpenAuth}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Acesso do Responsável</span>
            </button>
          )}
        </div>
      </header>

      {/* Feedback Mensagem */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-sm print:hidden ${
            feedbackMsg.tipo === 'sucesso'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
              : 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackMsg.texto}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Barra de Ações Administrativas (Exclusiva do Responsável) */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 p-3.5 dark:border-blue-800 dark:bg-blue-950/20 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Painel do Responsável pelas Designações de Som, Vídeo e Indicadores
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-importar-planilha-designacoes"
              onClick={() => setIsImportPlanilhaOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3.5 py-1.5 text-xs font-black uppercase text-white shadow-xs hover:bg-emerald-700 transition"
              title="Importar planilha trimestral de Designações"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>IMPORTAR PLANILHA</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Nova Data/Escala</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca "Minhas Designações" */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        {/* Seletor "Consultar Minhas Designações" */}
        <div className="md:col-span-6 lg:col-span-7">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Consultar / Destacar Minhas Designações:</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={irmaoSelecionado}
              onChange={(e) => setIrmaoSelecionado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">-- Selecione seu nome para realçar suas datas --</option>
              {todosIrmaosNaEscala.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
            {irmaoSelecionado && (
              <button
                onClick={() => setIrmaoSelecionado('')}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                title="Limpar seleção"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Seletor de Mês */}
        <div className="md:col-span-6 lg:col-span-5">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Visualizar Mês:</span>
          </label>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="todos">Todos os Meses (Quadro Completo)</option>
            {mesesDisponiveis.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card de Resumo do Irmão Selecionado */}
      {resumoIrmao && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/40 p-4 shadow-sm dark:border-blue-900/60 dark:from-blue-950/30 dark:to-indigo-950/20 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-blue-950 dark:text-blue-200">
                  {irmaoSelecionado}
                </h2>
                <p className="text-xs text-blue-800/80 dark:text-blue-300/80">
                  Total de <span className="font-bold text-blue-700 dark:text-blue-300">{resumoIrmao.total} designações</span> identificadas na escala oficial.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {resumoIrmao.indicadorCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                  Indicador: {resumoIrmao.indicadorCount}
                </span>
              )}
              {resumoIrmao.volanteCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                  Volante: {resumoIrmao.volanteCount}
                </span>
              )}
              {resumoIrmao.audioCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                  Áudio: {resumoIrmao.audioCount}
                </span>
              )}
              {resumoIrmao.videoCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                  Vídeo: {resumoIrmao.videoCount}
                </span>
              )}
              {resumoIrmao.leitorCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                  Leitor: {resumoIrmao.leitorCount}
                </span>
              )}
              {resumoIrmao.presidenciaCount > 0 && (
                <span className="rounded-md border border-blue-200 bg-white px-2 py-1 font-semibold text-blue-800 shadow-sm dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300">
                  Presidência: {resumoIrmao.presidenciaCount}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENTO OFICIAL: QUADRO AZUL (IDÊNTICO AO MODELO OFICIAL DA CONGREGAÇÃO) */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-xl border-2 border-blue-600 bg-white shadow-md dark:border-blue-700 dark:bg-slate-900 print:border-none print:shadow-none">
        {/* Banner do Cabeçalho Oficial */}
        <div className="relative border-b-2 border-blue-700 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 p-4 text-white sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white shadow-inner">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                  Congregação Vila Cisper • 2026
                </span>
                <h2 className="text-xl font-black tracking-wide uppercase sm:text-2xl">
                  Indicadores • Microfonista • Áudio e Vídeo • Leitores
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md border border-white/20 bg-blue-900/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-100">
                Escala Congregacional
              </span>
            </div>
          </div>
        </div>

        {/* Tabelas por Mês */}
        <div className="divide-y divide-blue-200 dark:divide-slate-800">
          {Object.keys(escalasAgrupadas).length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-semibold">Nenhuma programação cadastrada no momento.</p>
            </div>
          ) : (
            (Object.entries(escalasAgrupadas) as [string, EscalaDesignacaoItem[]][]).map(([mesTitulo, itensDoMes]) => (
            <div key={mesTitulo} className="p-4 sm:p-5">
              {/* Barra do Mês com Alternância de Visualização */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-100/80 px-4 py-2.5 dark:bg-blue-950/40">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                    {mesTitulo}
                  </h3>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    ({itensDoMes.length} reuniões)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('cartoes')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      modoVisualizacao === 'cartoes'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white/80 text-blue-900 hover:bg-white dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Por Reunião (Fácil Leitura)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVisualizacao('tabela')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      modoVisualizacao === 'tabela'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white/80 text-blue-900 hover:bg-white dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    Tabela
                  </button>
                </div>
              </div>

              {modoVisualizacao === 'cartoes' ? (
                /* APRESENTAÇÃO SIMPLES E FÁCIL: CADA REUNIÃO SEPARADA */
                <div className="space-y-4">
                  {itensDoMes.map((item) => {
                    const hasIrmao =
                      irmaoSelecionado &&
                      (verificarDesignacaoNome(irmaoSelecionado, item.indicador) ||
                        verificarDesignacaoNome(irmaoSelecionado, item.microfone) ||
                        verificarDesignacaoNome(irmaoSelecionado, item.leitor) ||
                        verificarDesignacaoNome(irmaoSelecionado, item.audio) ||
                        verificarDesignacaoNome(irmaoSelecionado, item.video) ||
                        verificarDesignacaoNome(irmaoSelecionado, item.presidencia));

                    const tituloReuniao = item.dia
                      .toUpperCase()
                      .replace(/\s+(\d{1,2}\/\d{1,2})/, ' — $1');
                    const audioVideoTexto =
                      item.audio && item.video
                        ? `${item.audio} / ${item.video}`
                        : item.audio || item.video || '—';

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 sm:p-5 transition shadow-xs ${
                          hasIrmao
                            ? 'border-amber-400 bg-amber-50/70 dark:border-amber-500 dark:bg-amber-950/40 ring-2 ring-amber-400/40'
                            : item.ehEspecial
                            ? 'border-rose-300 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/30'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                        }`}
                      >
                        {/* Cabeçalho da Data: Ex. QUINTA-FEIRA — 24/09 */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                            <h4 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 dark:text-white">
                              {tituloReuniao}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasIrmao && (
                              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                                Sua Designação
                              </span>
                            )}
                            {item.ehEspecial && (
                              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                                Evento Especial
                              </span>
                            )}
                            {isAdmin && (
                              <div className="flex items-center gap-1 print:hidden">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                  title="Editar reunião"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id, item.dia)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                  title="Remover reunião"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Blocos de Designação Simples e Diretos */}
                        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
                          {/* Indicador */}
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Indicador
                            </span>
                            <span
                              className={`mt-0.5 block font-bold ${
                                verificarDesignacaoNome(irmaoSelecionado, item.indicador)
                                  ? 'text-amber-900 dark:text-amber-300 font-extrabold'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.indicador || '—'}
                            </span>
                          </div>

                          {/* Microfone */}
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Microfone
                            </span>
                            <span
                              className={`mt-0.5 block font-bold ${
                                verificarDesignacaoNome(irmaoSelecionado, item.microfone)
                                  ? 'text-amber-900 dark:text-amber-300 font-extrabold'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.microfone || '—'}
                            </span>
                          </div>

                          {/* Áudio e vídeo */}
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Áudio e vídeo
                            </span>
                            <span
                              className={`mt-0.5 block font-bold ${
                                verificarDesignacaoNome(irmaoSelecionado, item.audio) ||
                                verificarDesignacaoNome(irmaoSelecionado, item.video)
                                  ? 'text-amber-900 dark:text-amber-300 font-extrabold'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {audioVideoTexto}
                            </span>
                          </div>

                          {/* Leitor */}
                          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
                            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Leitor
                            </span>
                            <span
                              className={`mt-0.5 block font-bold ${
                                verificarDesignacaoNome(irmaoSelecionado, item.leitor)
                                  ? 'text-amber-900 dark:text-amber-300 font-extrabold'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {item.leitor || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Presidência ou Observação */}
                        {(item.presidencia || item.observacao) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                            {item.presidencia && (
                              <div>
                                <span className="font-bold text-slate-500 dark:text-slate-400">
                                  Presidência:{' '}
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {item.presidencia}
                                </span>
                              </div>
                            )}
                            {item.observacao && (
                              <div>
                                <span className="font-bold text-slate-500 dark:text-slate-400">Obs: </span>
                                <span>{item.observacao}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Tabela de Designações */
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b-2 border-blue-600 bg-blue-600 text-white">
                        <th className="p-2.5 font-bold uppercase tracking-wider sm:w-44">DIAS</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider">INDICADOR</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider">MICROFONE</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider sm:w-28">LEITOR</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider sm:w-28">ÁUDIO</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider sm:w-28">VÍDEO</th>
                        <th className="p-2.5 font-bold uppercase tracking-wider sm:w-28">Presidência</th>
                        {isAdmin && <th className="p-2.5 text-center font-bold uppercase tracking-wider sm:w-20 print:hidden">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {itensDoMes.map((item, idx) => {
                        const ehEspecial = item.ehEspecial;
                        const hasIrmao = irmaoSelecionado && (
                          verificarDesignacaoNome(irmaoSelecionado, item.indicador) ||
                          verificarDesignacaoNome(irmaoSelecionado, item.microfone) ||
                          verificarDesignacaoNome(irmaoSelecionado, item.leitor) ||
                          verificarDesignacaoNome(irmaoSelecionado, item.audio) ||
                          verificarDesignacaoNome(irmaoSelecionado, item.video) ||
                          verificarDesignacaoNome(irmaoSelecionado, item.presidencia)
                        );

                        return (
                          <tr
                            key={item.id}
                            className={`transition ${
                              hasIrmao
                                ? 'bg-amber-100/90 font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
                                : ehEspecial
                                ? 'bg-rose-50 font-semibold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                                : idx % 2 === 0
                                ? 'bg-white dark:bg-slate-900'
                                : 'bg-slate-50/70 dark:bg-slate-900/60'
                            } hover:bg-blue-50/50 dark:hover:bg-blue-950/20`}
                          >
                            {/* Dia */}
                            <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">
                              <span className={item.dia.toLowerCase().includes('domingo') ? 'text-rose-600 dark:text-rose-400' : ''}>
                                {item.dia}
                              </span>
                            </td>

                            {/* Indicador */}
                            <td className="p-2.5">
                              <span className={verificarDesignacaoNome(irmaoSelecionado, item.indicador) ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                                {item.indicador}
                              </span>
                            </td>

                            {/* Microfone */}
                            <td className="p-2.5">
                              <span className={verificarDesignacaoNome(irmaoSelecionado, item.microfone) ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                                {item.microfone}
                              </span>
                            </td>

                            {/* Leitor */}
                            <td className="p-2.5">
                              <span className={verificarDesignacaoNome(irmaoSelecionado, item.leitor) ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                                {item.leitor || '—'}
                              </span>
                            </td>

                            {/* Áudio */}
                            <td className="p-2.5">
                              <span className={verificarDesignacaoNome(irmaoSelecionado, item.audio) ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                                {item.audio}
                              </span>
                            </td>

                            {/* Vídeo */}
                            <td className="p-2.5">
                              <span className={verificarDesignacaoNome(irmaoSelecionado, item.video) ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                                {item.video}
                              </span>
                            </td>

                            {/* Presidência */}
                            <td className="p-2.5">
                              <span className={verificarDesignacaoNome(irmaoSelecionado, item.presidencia) ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                                {item.presidencia || '—'}
                              </span>
                            </td>

                            {/* Ações do Responsável */}
                            {isAdmin && (
                              <td className="p-2.5 text-center print:hidden">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEdit(item)}
                                    className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                                    title="Editar escala"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.dia)}
                                    className="rounded p-1 text-slate-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                    title="Remover escala"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Observação Oficial do Formulário */}
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                <span className="font-bold">Observação Oficial:</span> Os indicadores deverão cuidar do lado interno e externo do Salão do Reino, ventilação, reposição do material nos banheiros e copos de água.
              </div>
            </div>
          )))}
        </div>

        {/* ========================================================================= */}
        {/* QUADRO DE RESUMO DE VOLUNTÁRIOS (ROSTER COM TOTAL DE CADA IRMÃO)           */}
        {/* ========================================================================= */}
        {estatisticasVoluntarios.length > 0 && (
          <div className="border-t-2 border-blue-300 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Resumo de Voluntários e Designações Atribuídas
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Total de voluntários ativos: {estatisticasVoluntarios.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                    <th className="p-2">VOLUNTÁRIOS</th>
                    <th className="p-2 text-center">INDICADOR</th>
                    <th className="p-2 text-center">VOLANTE</th>
                    <th className="p-2 text-center">ÁUDIO</th>
                    <th className="p-2 text-center">VÍDEO</th>
                    <th className="p-2 text-center font-black text-blue-700 dark:text-blue-400">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {estatisticasVoluntarios.map((vol) => (
                    <tr key={vol.nome} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50">
                      <td className="p-2 font-medium text-slate-900 dark:text-white">{vol.nome}</td>
                      <td className="p-2 text-center text-slate-600 dark:text-slate-400">{vol.indicador}</td>
                      <td className="p-2 text-center text-slate-600 dark:text-slate-400">{vol.volante}</td>
                      <td className="p-2 text-center text-slate-600 dark:text-slate-400">{vol.audio}</td>
                      <td className="p-2 text-center text-slate-600 dark:text-slate-400">{vol.video}</td>
                      <td className="p-2 text-center font-bold text-blue-700 dark:text-blue-400">{vol.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL                                      */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Acesso do Responsável</h3>
                  <p className="text-xs text-slate-500">Designações de Som, Vídeo e Indicadores</p>
                </div>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Senha Administrativa da Congregação
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && <p className="mt-1 text-xs font-medium text-rose-600">{authError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE ESCALA                                        */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {itemParaEditar ? 'Editar Escala' : 'Nova Escala de Reunião'}
              </h3>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Mês</label>
                  <input
                    type="text"
                    value={formMes}
                    onChange={(e) => setFormMes(e.target.value)}
                    placeholder="Ex: Janeiro 2026"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Dia e Data</label>
                  <input
                    type="text"
                    value={formDia}
                    onChange={(e) => setFormDia(e.target.value)}
                    placeholder="Ex: Domingo 04/01"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Indicadores (Interno / Externo)</label>
                <input
                  type="text"
                  value={formIndicador}
                  onChange={(e) => setFormIndicador(e.target.value)}
                  placeholder="Ex: Danilo Cardoso / Hugo"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Microfone Volantes (1º e 2º)</label>
                <input
                  type="text"
                  value={formMicrofone}
                  onChange={(e) => setFormMicrofone(e.target.value)}
                  placeholder="Ex: Danilo Maia / Leandro"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Leitor</label>
                  <input
                    type="text"
                    value={formLeitor}
                    onChange={(e) => setFormLeitor(e.target.value)}
                    placeholder="Ex: Vilson"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Áudio</label>
                  <input
                    type="text"
                    value={formAudio}
                    onChange={(e) => setFormAudio(e.target.value)}
                    placeholder="Ex: Gustavo"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Vídeo</label>
                  <input
                    type="text"
                    value={formVideo}
                    onChange={(e) => setFormVideo(e.target.value)}
                    placeholder="Ex: Dhiego"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Presidência (se houver)</label>
                <input
                  type="text"
                  value={formPresidencia}
                  onChange={(e) => setFormPresidencia(e.target.value)}
                  placeholder="Ex: Dhiego, Marcelo"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkEspecial"
                  checked={formEspecial}
                  onChange={(e) => setFormEspecial(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="chkEspecial" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Evento especial (Assembleia / Congresso / Sem reunião)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação e Exportação de Planilhas em Lote */}
      <BulkImportExportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        modulo="designacoes"
        tituloModulo="Indicadores, Microfones, Áudio e Vídeo"
        dadosAtuais={escalas}
        isAdmin={isAdmin}
        onImportadoComSucesso={handleBulkSuccess}
      />

      {/* Modal Especializado de Importação de Planilha Trimestral */}
      <ImportarPlanilhaModal
        isOpen={isImportPlanilhaOpen}
        onClose={() => setIsImportPlanilhaOpen(false)}
        modulo="designacoes"
        onImportadoComSucesso={() => {
          setEscalas(getStoredEscalaDesignacoes());
        }}
      />
    </div>
  );
};
