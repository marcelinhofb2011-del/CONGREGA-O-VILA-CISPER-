import React, { useState, useEffect, useMemo } from 'react';
import {
  CampoDiaSemanaItem,
  CampoFimDeSemanaItem,
  DIAS_SEMANA_CAMPO_CANONICO,
  getStoredCampoFds,
  saveStoredCampoFdsItem,
  deleteStoredCampoFdsItem,
  resetCampoToSample,
} from '../data/campoStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  Compass,
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
  Clock,
  MapPin,
  CheckCircle2,
  Edit2,
  Trash2,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { BulkImportExportModal } from '../components/BulkImportExportModal';

export const ServicoDeCampoView: React.FC = () => {
  const [campoFds, setCampoFds] = useState<CampoFimDeSemanaItem[]>([]);
  const [diasSemana] = useState<CampoDiaSemanaItem[]>(DIAS_SEMANA_CAMPO_CANONICO);

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
  const [itemParaEditar, setItemParaEditar] = useState<CampoFimDeSemanaItem | null>(null);

  // Formulário
  const [formData, setFormData] = useState<{
    mes: string;
    data: string;
    diaSemana: 'Sábado' | 'Domingo';
    dirigente: string;
    observacao: string;
    ehEspecial: boolean;
  }>({
    mes: 'Janeiro',
    data: '',
    diaSemana: 'Sábado',
    dirigente: '',
    observacao: '',
    ehEspecial: false,
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setCampoFds(getStoredCampoFds());
    setIsAdmin(isAdminAuthenticated());
  }, []);

  // Meses únicos
  const mesesDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    campoFds.forEach((item) => {
      if (!map.has(item.mesChave)) {
        map.set(item.mesChave, item.mes);
      }
    });
    return Array.from(map.entries()).map(([chave, rotulo]) => ({ chave, rotulo }));
  }, [campoFds]);

  // Lista de todos os irmãos dirigentes
  const todosDirigentes = useMemo(() => {
    const nomes = new Set<string>();
    const extrair = (str?: string) => {
      if (!str) return;
      if (
        str.toLowerCase().includes('assembléia') ||
        str.toLowerCase().includes('congresso') ||
        str.toLowerCase().includes('superintendente do grupo') ||
        str.toLowerCase().includes('viajante')
      ) {
        return;
      }
      // Pega o nome principal (antes do parênteses)
      const nomeBase = str.split('(')[0].trim();
      nomeBase.split(/[/,eE+&]/).forEach((part) => {
        const limpo = part.trim();
        if (limpo.length > 2) nomes.add(limpo);
      });
    };

    campoFds.forEach((c) => extrair(c.dirigente));
    diasSemana.forEach((d) => extrair(d.dirigente));

    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [campoFds, diasSemana]);

  // Helper de checagem de nome
  const verificarIrmao = (nomeBuscado: string, texto?: string): boolean => {
    if (!nomeBuscado || !texto) return false;
    const n = nomeBuscado.trim().toLowerCase();
    const t = texto.trim().toLowerCase();
    return t.includes(n);
  };

  // Resumo do irmão selecionado
  const resumoIrmao = useMemo(() => {
    if (!irmaoSelecionado) return null;
    let countFds = 0;
    let countSemana = 0;
    const datas: string[] = [];

    campoFds.forEach((c) => {
      if (verificarIrmao(irmaoSelecionado, c.dirigente)) {
        countFds++;
        datas.push(`${c.data} (${c.diaSemana} - ${c.mes})`);
      }
    });

    diasSemana.forEach((d) => {
      if (verificarIrmao(irmaoSelecionado, d.dirigente)) {
        countSemana++;
      }
    });

    return {
      total: countFds + countSemana,
      countFds,
      countSemana,
      datas,
    };
  }, [irmaoSelecionado, campoFds, diasSemana]);

  // Agrupamento por mês
  const campoAgrupadoPorMes = useMemo(() => {
    const grupos: { [mes: string]: CampoFimDeSemanaItem[] } = {};
    campoFds.forEach((item) => {
      if (mesFiltro !== 'todos' && item.mesChave !== mesFiltro) return;
      if (!grupos[item.mes]) grupos[item.mes] = [];
      grupos[item.mes].push(item);
    });
    return grupos;
  }, [campoFds, mesFiltro]);

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
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Acesso do responsável pelo serviço de campo concedido.' });
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

  // Ações de edição
  const handleOpenCreate = () => {
    setItemParaEditar(null);
    setFormData({
      mes: mesFiltro !== 'todos' ? (mesesDisponiveis.find((m) => m.chave === mesFiltro)?.rotulo || 'Janeiro') : 'Janeiro',
      data: '',
      diaSemana: 'Sábado',
      dirigente: '',
      observacao: '',
      ehEspecial: false,
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: CampoFimDeSemanaItem) => {
    setItemParaEditar(item);
    setFormData({
      mes: item.mes,
      data: item.data,
      diaSemana: item.diaSemana,
      dirigente: item.dirigente,
      observacao: item.observacao || '',
      ehEspecial: !!item.ehEspecial,
    });
    setIsEditorOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data.trim() || !formData.dirigente.trim()) {
      alert('Informe a Data e o Dirigente.');
      return;
    }

    const mesChave = formData.mes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const item: CampoFimDeSemanaItem = {
      id: itemParaEditar ? itemParaEditar.id : `c-${Date.now()}`,
      mes: formData.mes,
      mesChave,
      data: formData.data.trim(),
      diaSemana: formData.diaSemana,
      dirigente: formData.dirigente.trim(),
      observacao: formData.observacao.trim(),
      ehEspecial: formData.ehEspecial,
    };

    const res = saveStoredCampoFdsItem(item);
    if (res.success && res.data) {
      setCampoFds(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala de campo salva com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleDeleteItem = (id: string, data: string) => {
    if (window.confirm(`Deseja realmente remover a escala de campo da data "${data}"?`)) {
      const res = deleteStoredCampoFdsItem(id);
      if (res.success && res.data) {
        setCampoFds(res.data);
        setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala removida.' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    }
  };

  const handleResetToOfficial = () => {
    if (window.confirm('Deseja restaurar a escala oficial completa de Dirigentes de Campo 2026?')) {
      const canonico = resetCampoToSample();
      setCampoFds(canonico);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala oficial de Dirigentes de Campo restaurada!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBulkSuccess = (qtd: number, modo: string) => {
    setCampoFds(getStoredCampoFds());
    const modoTexto =
      modo === 'append'
        ? 'adicionados às existentes'
        : modo === 'replace_month'
        ? 'substituindo o mês selecionado'
        : 'substituição completa da escala';
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Importação em lote de campo concluída com sucesso! ${qtd} datas processadas (${modoTexto}).`,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Superior de Identificação e Modos */}
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Congregação Vila Cisper (67744)
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escala Oficial 2026
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Serviço de Campo • Dirigentes 2026
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Programação oficial de saídas para o ministério de campo durante a semana, sábados e domingos.
          </p>
        </div>

        {/* Controles de Acesso e Impressão */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 shadow-sm transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50"
              title="Importar ou exportar planilha em lote (Excel / CSV)"
            >
              <FileSpreadsheet className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Planilhas / Lote</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Imprimir escala ou gerar PDF"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:bg-sky-600 dark:hover:bg-sky-700"
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/60 p-3.5 dark:border-sky-800 dark:bg-sky-950/20 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-semibold text-sky-900 dark:text-sky-200">
              Painel do Responsável pelo Serviço de Campo
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-xs hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-800 dark:text-sky-300"
              title="Importar planilhas em lote do Excel ou Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-sky-600" />
              <span>Importar / Exportar Planilha</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-sky-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Novo Dirigente / Data</span>
            </button>
            <button
              onClick={handleResetToOfficial}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Restaurar escala oficial de 2026"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>Restaurar Modelo Oficial</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Consulta de Irmão */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        {/* Seletor "Consultar Minhas Designações" */}
        <div className="md:col-span-6 lg:col-span-7">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <User className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Consultar / Destacar Minhas Datas:</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={irmaoSelecionado}
              onChange={(e) => setIrmaoSelecionado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">-- Selecione seu nome para realçar suas datas --</option>
              {todosDirigentes.map((nome) => (
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
            <Calendar className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Visualizar Mês:</span>
          </label>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="todos">Todos os Meses (Ano Completo 2026)</option>
            {mesesDisponiveis.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card de Resumo do Irmão */}
      {resumoIrmao && (
        <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50/40 p-4 shadow-sm dark:border-sky-900/60 dark:from-sky-950/30 dark:to-blue-950/20 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-sky-950 dark:text-sky-200">
                  {irmaoSelecionado}
                </h2>
                <p className="text-xs text-sky-800/80 dark:text-sky-300/80">
                  Você está escalado em <span className="font-bold text-sky-700 dark:text-sky-300">{resumoIrmao.total} ocasiões</span> como dirigente de campo em 2026.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-sky-200 bg-white px-2.5 py-1 font-semibold text-sky-800 shadow-sm dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300">
                Finais de Semana: {resumoIrmao.countFds}
              </span>
              {resumoIrmao.countSemana > 0 && (
                <span className="rounded-md border border-sky-200 bg-white px-2.5 py-1 font-semibold text-sky-800 shadow-sm dark:border-sky-800 dark:bg-slate-900 dark:text-sky-300">
                  Dias de Semana: Fixo
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENTO OFICIAL: QUADRO DIRIGENTES CAMPO 2026 (IDÊNTICO AO MODELO PDF)  */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-xl border-2 border-sky-600 bg-white shadow-md dark:border-sky-700 dark:bg-slate-900 print:border-none print:shadow-none">
        {/* Banner do Cabeçalho Oficial */}
        <div className="border-b-2 border-sky-700 bg-gradient-to-r from-sky-700 via-sky-600 to-sky-800 p-4 text-white sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white shadow-inner">
                <Compass className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-200">
                  Congregação Vila Cisper • Ano 2026
                </span>
                <h2 className="text-xl font-black tracking-wide uppercase sm:text-2xl">
                  DIRIGENTES CAMPO
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md border border-white/20 bg-sky-900/50 px-3 py-1 text-sm font-bold uppercase tracking-widest text-sky-100">
                2026
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 1: DIAS DA SEMANA (TABELA OFICIAL DO PDF)                           */}
        {/* ========================================================================= */}
        <div className="border-b border-sky-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              DIAS DA SEMANA
            </h3>
            <span className="text-[11px] text-slate-500">Horários e Arranjos Fixos</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                  <th className="p-2.5 text-rose-600 dark:text-rose-400 sm:w-36">DIAS DA SEMANA</th>
                  <th className="p-2.5 text-rose-600 dark:text-rose-400">DIRIGENTE</th>
                  <th className="p-2.5 text-rose-600 dark:text-rose-400 sm:w-36">Horários</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {diasSemana.map((d) => {
                  const ehDestacado = irmaoSelecionado && verificarIrmao(irmaoSelecionado, d.dirigente);
                  return (
                    <tr
                      key={d.diaSemana}
                      className={ehDestacado ? 'bg-amber-100 font-bold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                    >
                      <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">{d.diaSemana}</td>
                      <td className="p-2.5">
                        <span className={ehDestacado ? 'rounded bg-amber-200 px-1 py-0.5 font-bold text-amber-900 dark:bg-amber-800 dark:text-amber-100' : ''}>
                          {d.dirigente}
                        </span>
                        {d.localOuNota && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                            ({d.localOuNota})
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{d.horario}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: SÁBADOS E DOMINGOS (ORGANIZADO POR MESES COM CABEÇALHO AZUL)     */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5">
          <div className="mb-4 rounded-lg bg-sky-200/80 px-4 py-2 font-bold uppercase tracking-wider text-sky-950 dark:bg-sky-950/60 dark:text-sky-200">
            SÁBADOS E DOMINGOS
          </div>

          <div className="space-y-6">
            {(Object.entries(campoAgrupadoPorMes) as [string, CampoFimDeSemanaItem[]][]).map(([mesTitulo, itens]) => (
              <div key={mesTitulo} className="overflow-hidden rounded-lg border border-sky-300 dark:border-slate-800">
                {/* Cabeçalho do Mês estilo PDF */}
                <div className="bg-sky-100 px-4 py-2 text-center font-black uppercase tracking-widest text-sky-900 dark:bg-sky-900/60 dark:text-sky-100">
                  {mesTitulo}
                </div>

                <table className="w-full text-left text-xs sm:text-sm">
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {itens.map((item, idx) => {
                      const ehDomingo = item.diaSemana === 'Domingo';
                      const ehEspecial = item.ehEspecial;
                      const hasIrmao = irmaoSelecionado && verificarIrmao(irmaoSelecionado, item.dirigente);

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${
                            hasIrmao
                              ? 'bg-amber-100/90 font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
                              : ehEspecial
                              ? 'bg-rose-50 font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                              : idx % 2 === 0
                              ? 'bg-white dark:bg-slate-900'
                              : 'bg-slate-50/70 dark:bg-slate-900/60'
                          } hover:bg-sky-50/60 dark:hover:bg-sky-950/20`}
                        >
                          {/* Data */}
                          <td className="w-20 p-2.5 font-bold text-slate-900 dark:text-slate-100">
                            {item.data}
                          </td>

                          {/* Dia da Semana */}
                          <td className="w-28 p-2.5 font-bold">
                            <span className={ehDomingo ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                              {item.diaSemana}
                            </span>
                          </td>

                          {/* Dirigente */}
                          <td className="p-2.5">
                            <span
                              className={`inline-block ${
                                hasIrmao
                                  ? 'rounded bg-amber-200 px-1 py-0.5 font-black text-amber-950 dark:bg-amber-800 dark:text-amber-100'
                                  : ehEspecial
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : item.dirigente.includes('Todos os grupos no salão')
                                  ? 'text-rose-700 dark:text-rose-400 font-semibold'
                                  : 'text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              {item.dirigente}
                            </span>
                          </td>

                          {/* Ações do Responsável */}
                          {isAdmin && (
                            <td className="w-20 p-2.5 text-center print:hidden">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                                  title="Editar data"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.data)}
                                  className="rounded p-1 text-slate-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                  title="Remover data"
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
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: NOTAS OFICIAIS DO RODAPÉ (COMO NO FORMULÁRIO DO PDF)             */}
        {/* ========================================================================= */}
        <div className="border-t-2 border-sky-300 bg-sky-50/70 p-4 text-xs font-semibold text-sky-950 dark:border-slate-800 dark:bg-slate-900/90 dark:text-sky-200 sm:p-5">
          <div className="mb-2 flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
            <Info className="h-4 w-4" />
            <span className="font-bold uppercase tracking-wider">Instruções e Locais de Encontro Oficiais:</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <p>*SÁBADO NO SALÃO DO REINO ÀS 9:15 HORAS</p>
            <p>*DOMINGO ÀS 9:15 NOS GRUPOS</p>
            <p>*Terça-Feira Zoom às 19:30</p>
            <p>*Quarta-Feira às 9:15 na casa da Maria José Silva</p>
            <p>*Quinta-feira às 15:30 na casa da Tereza Aparecido</p>
            <p>*Sexta-Feira às 9:15 na casa da Tereza Aparecido</p>
          </div>
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
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Acesso do Responsável</h3>
                  <p className="text-xs text-slate-500">Serviço de Campo</p>
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  className="rounded-lg bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE ESCALA DE CAMPO                              */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {itemParaEditar ? 'Editar Dirigente de Campo' : 'Novo Dirigente de Campo'}
              </h3>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Mês</label>
                <select
                  value={formData.mes}
                  onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Data (DD/MM)</label>
                  <input
                    type="text"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    placeholder="Ex: 03/01"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Dia da Semana</label>
                  <select
                    value={formData.diaSemana}
                    onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value as 'Sábado' | 'Domingo' })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Dirigente / Designação</label>
                <input
                  type="text"
                  value={formData.dirigente}
                  onChange={(e) => setFormData({ ...formData, dirigente: e.target.value })}
                  placeholder="Ex: Marcelo, Samuel (Todos os grupos no salão)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkEspecialCampo"
                  checked={formData.ehEspecial}
                  onChange={(e) => setFormData({ ...formData, ehEspecial: e.target.checked })}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="chkEspecialCampo" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Destaque especial (Assembléia / Congresso / Visita do Viajante)
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
                  className="rounded-lg bg-sky-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
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
        modulo="campo"
        tituloModulo="Serviço de Campo e Dirigentes"
        dadosAtuais={campoFds}
        isAdmin={isAdmin}
        onImportadoComSucesso={handleBulkSuccess}
      />
    </div>
  );
};
