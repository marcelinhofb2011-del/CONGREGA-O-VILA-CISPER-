import React, { useState, useEffect, useMemo } from 'react';
import {
  DiscursoBiblicoItem,
  DISCURSOS_CANONICOS,
  IRMAOS_DISCURSO_ROSTER,
  getStoredDiscursosBiblicos,
  saveStoredDiscursoBiblico,
  deleteStoredDiscursoBiblico,
  resetDiscursosBiblicosToSample,
} from '../data/discursoStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  Speech,
  Lock,
  Unlock,
  Plus,
  Printer,
  Calendar,
  RotateCcw,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  User,
  CheckCircle2,
  Edit2,
  Trash2,
  Volume2,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { BulkImportExportModal } from '../components/BulkImportExportModal';

export const DiscursoPublicoView: React.FC = () => {
  const [discursos, setDiscursos] = useState<DiscursoBiblicoItem[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Filtros
  const [irmaoSelecionado, setIrmaoSelecionado] = useState<string>('');
  const [mesFiltro, setMesFiltro] = useState<string>('todos');

  // Modal de edição / criação
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [itemParaEditar, setItemParaEditar] = useState<DiscursoBiblicoItem | null>(null);

  // Formulário
  const [formData, setFormData] = useState<{
    mes: string;
    data: string;
    tema: string;
    presidente: string;
    leitor: string;
    orador: string;
    observacao: string;
  }>({
    mes: 'Setembro',
    data: '',
    tema: '',
    presidente: '',
    leitor: '',
    orador: '',
    observacao: '',
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setDiscursos(getStoredDiscursosBiblicos());
    setIsAdmin(isAdminAuthenticated());
  }, []);

  // Meses únicos disponíveis
  const mesesDisponiveis = useMemo(() => {
    const list: string[] = [];
    discursos.forEach((d) => {
      if (!list.includes(d.mes)) list.push(d.mes);
    });
    return list;
  }, [discursos]);

  // Lista de todos os irmãos participantes
  const todosIrmaos = useMemo(() => {
    const set = new Set<string>(IRMAOS_DISCURSO_ROSTER);
    discursos.forEach((d) => {
      if (d.presidente) set.add(d.presidente);
      if (d.leitor) set.add(d.leitor);
      if (d.orador && !d.orador.includes('Visitante') && !d.orador.includes('Circuito')) {
        set.add(d.orador);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [discursos]);

  const verificarIrmao = (nomeBuscado: string, texto?: string): boolean => {
    if (!nomeBuscado || !texto) return false;
    const n = nomeBuscado.trim().toLowerCase();
    const t = texto.trim().toLowerCase();
    return t.includes(n) || n.includes(t);
  };

  // Resumo do irmão selecionado
  const resumoIrmao = useMemo(() => {
    if (!irmaoSelecionado) return null;
    let countPresidente = 0;
    let countLeitor = 0;
    let countOrador = 0;
    const detalhes: string[] = [];

    discursos.forEach((d) => {
      if (verificarIrmao(irmaoSelecionado, d.presidente)) {
        countPresidente++;
        detalhes.push(`Presidente (${d.data} - ${d.mes})`);
      }
      if (verificarIrmao(irmaoSelecionado, d.leitor)) {
        countLeitor++;
        detalhes.push(`Leitor de A Sentinela (${d.data} - ${d.mes})`);
      }
      if (verificarIrmao(irmaoSelecionado, d.orador)) {
        countOrador++;
        detalhes.push(`Orador (${d.data} - ${d.mes})`);
      }
    });

    const total = countPresidente + countLeitor + countOrador;
    return {
      total,
      countPresidente,
      countLeitor,
      countOrador,
      detalhes,
    };
  }, [irmaoSelecionado, discursos]);

  // Discursos agrupados por mês
  const discursosAgrupados = useMemo(() => {
    const map: { [mes: string]: DiscursoBiblicoItem[] } = {};
    discursos.forEach((d) => {
      if (mesFiltro !== 'todos' && d.mes !== mesFiltro) return;
      if (!map[d.mes]) map[d.mes] = [];
      map[d.mes].push(d);
    });
    return map;
  }, [discursos, mesFiltro]);

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
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Acesso do responsável pelo discurso público concedido.' });
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

  // Edição
  const handleOpenCreate = () => {
    setItemParaEditar(null);
    setFormData({
      mes: mesFiltro !== 'todos' ? mesFiltro : 'Setembro',
      data: '',
      tema: '',
      presidente: '',
      leitor: '',
      orador: 'Orador Local / Visitante',
      observacao: '',
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: DiscursoBiblicoItem) => {
    setItemParaEditar(item);
    setFormData({
      mes: item.mes,
      data: item.data,
      tema: item.tema,
      presidente: item.presidente,
      leitor: item.leitor || '',
      orador: item.orador || '',
      observacao: item.observacao || '',
    });
    setIsEditorOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data.trim() || !formData.tema.trim()) {
      alert('Informe a Data e o Tema do Discurso.');
      return;
    }

    const item: DiscursoBiblicoItem = {
      id: itemParaEditar ? itemParaEditar.id : `disc-${Date.now()}`,
      mes: formData.mes.trim(),
      data: formData.data.trim(),
      tema: formData.tema.trim(),
      presidente: formData.presidente.trim(),
      leitor: formData.leitor.trim(),
      orador: formData.orador.trim(),
      observacao: formData.observacao.trim(),
    };

    const res = saveStoredDiscursoBiblico(item);
    if (res.success && res.data) {
      setDiscursos(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Discurso bíblico salvo com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleDeleteItem = (id: string, data: string) => {
    if (window.confirm(`Deseja remover o discurso do dia "${data}"?`)) {
      const res = deleteStoredDiscursoBiblico(id);
      if (res.success && res.data) {
        setDiscursos(res.data);
        setFeedbackMsg({ tipo: 'sucesso', texto: 'Discurso removido.' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    }
  };

  const handleResetToOfficial = () => {
    if (window.confirm('Deseja restaurar a programação oficial de Discursos Bíblicos?')) {
      const canonico = resetDiscursosBiblicosToSample();
      setDiscursos(canonico);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Programação de Discursos Bíblicos restaurada!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBulkSuccess = (qtd: number, modo: string) => {
    setDiscursos(getStoredDiscursosBiblicos());
    const modoTexto =
      modo === 'append'
        ? 'adicionados aos existentes'
        : modo === 'replace_month'
        ? 'substituindo o mês selecionado'
        : 'substituição completa de discursos';
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Importação em lote de discursos concluída com sucesso! ${qtd} discursos processados (${modoTexto}).`,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Superior de Identificação e Modos */}
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Congregação Vila Cisper (67744)
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Reunião de Fim de Semana
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Discurso Bíblico • Reunião Pública
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Programação de temas bíblicos, oradores, presidentes e leitores de A Sentinela.
          </p>
        </div>

        {/* Controles de Acesso e Impressão */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
              title="Importar ou exportar planilha em lote (Excel / CSV)"
            >
              <FileSpreadsheet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Planilhas / Lote</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Imprimir quadro ou gerar PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir / PDF</span>
          </button>

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
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-700"
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

      {/* Barra de Ações Administrativas (Responsável) */}
      {isAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-3.5 dark:border-amber-800 dark:bg-amber-950/20 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Painel do Coordenador de Discursos Públicos
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300"
              title="Importar planilhas em lote do Excel ou Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-amber-600" />
              <span>Importar / Exportar Planilha</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Novo Discurso Bíblico</span>
            </button>
            <button
              onClick={handleResetToOfficial}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Restaurar programação oficial de discursos"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>Restaurar Modelo Oficial</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca "Minhas Designações" */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="md:col-span-6 lg:col-span-7">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Consultar Minhas Participações (Presidente / Leitor):</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={irmaoSelecionado}
              onChange={(e) => setIrmaoSelecionado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">-- Selecione seu nome para realçar suas reuniões --</option>
              {todosIrmaos.map((nome) => (
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

        <div className="md:col-span-6 lg:col-span-5">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Visualizar Mês:</span>
          </label>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="todos">Todos os Meses</option>
            {mesesDisponiveis.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card de Resumo do Irmão */}
      {resumoIrmao && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/40 p-4 shadow-sm dark:border-amber-900/60 dark:from-amber-950/30 dark:to-orange-950/20 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow">
                <Speech className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-950 dark:text-amber-200">
                  {irmaoSelecionado}
                </h2>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Total de <span className="font-bold text-amber-700 dark:text-amber-300">{resumoIrmao.total} participações</span> na reunião de fim de semana.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {resumoIrmao.countPresidente > 0 && (
                <span className="rounded-md border border-amber-200 bg-white px-2.5 py-1 font-semibold text-amber-800 shadow-sm dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300">
                  Presidente: {resumoIrmao.countPresidente}
                </span>
              )}
              {resumoIrmao.countLeitor > 0 && (
                <span className="rounded-md border border-amber-200 bg-white px-2.5 py-1 font-semibold text-amber-800 shadow-sm dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300">
                  Leitor de A Sentinela: {resumoIrmao.countLeitor}
                </span>
              )}
              {resumoIrmao.countOrador > 0 && (
                <span className="rounded-md border border-amber-200 bg-white px-2.5 py-1 font-semibold text-amber-800 shadow-sm dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300">
                  Orador: {resumoIrmao.countOrador}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENTO OFICIAL: DISCURSO BÍBLICO (IDÊNTICO AO MODELO PDF DOURADO)       */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-xl border-2 border-amber-600 bg-white shadow-md dark:border-amber-700 dark:bg-slate-900 print:border-none print:shadow-none">
        {/* Banner do Cabeçalho Oficial Amarelo/Dourado */}
        <div className="border-b-2 border-amber-700 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 p-4 text-white sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white shadow-inner">
                <Speech className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-100">
                  Congregação Vila Cisper (67744)
                </span>
                <h2 className="text-xl font-black tracking-wide uppercase sm:text-2xl">
                  DISCURSO BÍBLICO
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md border border-white/20 bg-amber-800/50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-100">
                Fim de Semana
              </span>
            </div>
          </div>
        </div>

        {/* Tabelas por Mês */}
        <div className="divide-y divide-amber-200 dark:divide-slate-800">
          {(Object.entries(discursosAgrupados) as [string, DiscursoBiblicoItem[]][]).map(([mesTitulo, itensDoMes]) => (
            <div key={mesTitulo} className="p-4 sm:p-5">
              {/* Barra do Mês estilo PDF */}
              <div className="mb-4 rounded-lg bg-amber-400 px-4 py-2 text-center font-black uppercase tracking-wider text-amber-950 shadow-sm dark:bg-amber-600 dark:text-white">
                {mesTitulo}
              </div>

              <div className="space-y-4">
                {itensDoMes.map((item) => {
                  const ehPres = irmaoSelecionado && verificarIrmao(irmaoSelecionado, item.presidente);
                  const ehLeit = irmaoSelecionado && verificarIrmao(irmaoSelecionado, item.leitor);
                  const ehOrad = irmaoSelecionado && verificarIrmao(irmaoSelecionado, item.orador);
                  const temDestaque = ehPres || ehLeit || ehOrad;

                  return (
                    <div
                      key={item.id}
                      className={`overflow-hidden rounded-lg border ${
                        temDestaque
                          ? 'border-amber-500 bg-amber-50/90 dark:border-amber-600 dark:bg-amber-950/30'
                          : 'border-amber-300/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                      } shadow-xs transition hover:shadow-sm`}
                    >
                      {/* Faixa Amarela Superior com DIA e TEMA */}
                      <div className="flex flex-col border-b border-amber-300 bg-amber-300/80 px-3.5 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-900/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black uppercase tracking-wider text-amber-950 dark:text-amber-100">
                            DIA {item.data}
                          </span>
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            TEMA:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.tema}
                          </span>
                        </div>

                        {isAdmin && (
                          <div className="mt-1 flex items-center gap-1.5 self-end print:hidden sm:mt-0">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="rounded p-1 text-slate-600 hover:bg-amber-200 hover:text-amber-900 dark:text-slate-300 dark:hover:bg-amber-950"
                              title="Editar discurso"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.data)}
                              className="rounded p-1 text-slate-600 hover:bg-rose-200 hover:text-rose-800 dark:text-slate-300 dark:hover:bg-rose-950"
                              title="Remover discurso"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Linhas de Presidente e Leitor */}
                      <div className="divide-y divide-slate-100 text-xs sm:text-sm dark:divide-slate-800">
                        <div className="flex items-center px-4 py-2">
                          <span className="w-28 shrink-0 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            PRESIDENTE:
                          </span>
                          <span
                            className={`font-semibold ${
                              ehPres
                                ? 'rounded bg-amber-200 px-2 py-0.5 font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-100'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.presidente || '—'}
                          </span>
                        </div>

                        <div className="flex items-center px-4 py-2">
                          <span className="w-28 shrink-0 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            LEITOR:
                          </span>
                          <span
                            className={`font-semibold ${
                              ehLeit
                                ? 'rounded bg-amber-200 px-2 py-0.5 font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-100'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.leitor || '— (Sem leitor / Visita)'}
                          </span>
                        </div>

                        {item.orador && (
                          <div className="flex items-center px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="w-28 shrink-0 font-semibold uppercase">Orador:</span>
                            <span>{item.orador}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Roster de Irmãos do Rodapé Oficial */}
        <div className="border-t-2 border-amber-300 bg-amber-50/70 p-4 text-xs font-semibold text-amber-950 dark:border-slate-800 dark:bg-slate-900/90 dark:text-amber-200 sm:p-5">
          <span className="font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            Irmãos Qualificados no Roster Congregacional:
          </span>
          <p className="mt-1 tracking-wide text-slate-700 dark:text-slate-300">
            {IRMAOS_DISCURSO_ROSTER.join(' • ')}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL                                      */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Acesso do Responsável</h3>
                  <p className="text-xs text-slate-500">Discursos Públicos</p>
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE DISCURSO                                      */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {itemParaEditar ? 'Editar Discurso Bíblico' : 'Novo Discurso Bíblico'}
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
                    value={formData.mes}
                    onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                    placeholder="Ex: Setembro"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Data (DD/MM)</label>
                  <input
                    type="text"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    placeholder="Ex: 06/09"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Tema do Discurso</label>
                <input
                  type="text"
                  value={formData.tema}
                  onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                  placeholder="Ex: Mostre que você apoia o direito de Jeová governar"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Presidente</label>
                <input
                  type="text"
                  value={formData.presidente}
                  onChange={(e) => setFormData({ ...formData, presidente: e.target.value })}
                  placeholder="Ex: Marcelo Ferreira"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Leitor de A Sentinela</label>
                <input
                  type="text"
                  value={formData.leitor}
                  onChange={(e) => setFormData({ ...formData, leitor: e.target.value })}
                  placeholder="Ex: Danilo Cardoso"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Orador</label>
                <input
                  type="text"
                  value={formData.orador}
                  onChange={(e) => setFormData({ ...formData, orador: e.target.value })}
                  placeholder="Ex: Irmão Convidado ou Local"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
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
                  className="rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
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
        modulo="discurso"
        tituloModulo="Discurso Bíblico e Reunião Pública"
        dadosAtuais={discursos}
        isAdmin={isAdmin}
        onImportadoComSucesso={handleBulkSuccess}
      />
    </div>
  );
};
