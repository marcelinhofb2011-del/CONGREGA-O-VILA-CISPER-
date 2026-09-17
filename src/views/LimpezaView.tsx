import React, { useState, useEffect, useMemo } from 'react';
import {
  LimpezaEscalaItem,
  GrupoLimpezaMembros,
  getStoredLimpezaEscalas,
  getStoredGruposMembros,
  saveStoredLimpezaEscala,
  deleteStoredLimpezaEscala,
  resetLimpezaToSample,
} from '../data/limpezaStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  Sparkles,
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
  Users,
  CheckCircle2,
  Edit2,
  Trash2,
  Clock,
  MapPin,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { BulkImportExportModal } from '../components/BulkImportExportModal';

export const LimpezaView: React.FC = () => {
  const [escalas, setEscalas] = useState<LimpezaEscalaItem[]>([]);
  const [grupos] = useState<GrupoLimpezaMembros[]>(getStoredGruposMembros());

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Filtros
  const [irmaoSelecionado, setIrmaoSelecionado] = useState<string>('');
  const [mesFiltro, setMesFiltro] = useState<string>('todos');
  const [abaAtiva, setAbaAtiva] = useState<'escala' | 'grupos'>('escala');

  // Modal de edição / criação
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [itemParaEditar, setItemParaEditar] = useState<LimpezaEscalaItem | null>(null);

  // Formulário
  const [formData, setFormData] = useState<{
    mes: string;
    dias: string;
    diasSemana: string;
    grupo: string;
    responsaveis: string;
    observacao: string;
    ehEspecial: boolean;
  }>({
    mes: 'Janeiro',
    dias: '',
    diasSemana: 'Quarta Feira e Domingo',
    grupo: 'GRUPO 1',
    responsaveis: '',
    observacao: '',
    ehEspecial: false,
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    setEscalas(getStoredLimpezaEscalas());
    setIsAdmin(isAdminAuthenticated());
  }, []);

  // Meses únicos
  const mesesDisponiveis = useMemo(() => {
    const map = new Map<string, string>();
    escalas.forEach((item) => {
      if (!map.has(item.mesChave)) {
        map.set(item.mesChave, item.mes);
      }
    });
    return Array.from(map.entries()).map(([chave, rotulo]) => ({ chave, rotulo }));
  }, [escalas]);

  // Lista de todos os publicadores da congregação (dos 3 grupos)
  const todosPublicadores = useMemo(() => {
    const nomes = new Set<string>();
    grupos.forEach((g) => {
      g.membros.forEach((m) => nomes.add(m.trim()));
      // Adiciona também os nomes dos dirigentes se houver
      g.superintendentes.split(/[/,eE]/).forEach((p) => {
        const limpo = p.trim();
        if (limpo.length > 2) nomes.add(limpo);
      });
    });
    return Array.from(nomes).sort((a, b) => a.localeCompare(b));
  }, [grupos]);

  // Identificar o grupo do irmão selecionado
  const grupoDoIrmao = useMemo(() => {
    if (!irmaoSelecionado) return null;
    const n = irmaoSelecionado.trim().toLowerCase();
    for (const g of grupos) {
      const achou = g.membros.some((m) => m.toLowerCase().includes(n) || n.includes(m.toLowerCase()));
      if (achou || g.superintendentes.toLowerCase().includes(n)) {
        return g;
      }
    }
    return null;
  }, [irmaoSelecionado, grupos]);

  // Resumo de datas em que o grupo do irmão limpa
  const resumoIrmao = useMemo(() => {
    if (!irmaoSelecionado || !grupoDoIrmao) return null;
    const grupoKey = `GRUPO ${grupoDoIrmao.numero}`.toLowerCase();
    const datasGrupo: string[] = [];

    escalas.forEach((e) => {
      if (e.grupo.toLowerCase().includes(grupoKey)) {
        datasGrupo.push(`${e.dias} de ${e.mes} (${e.diasSemana})`);
      }
    });

    return {
      grupoNome: grupoDoIrmao.nomeGrupo,
      superintendentes: grupoDoIrmao.superintendentes,
      totalLimpezas: datasGrupo.length,
      datasGrupo,
    };
  }, [irmaoSelecionado, grupoDoIrmao, escalas]);

  // Escalas agrupadas por mês
  const escalasAgrupadas = useMemo(() => {
    const mapa: { [mes: string]: LimpezaEscalaItem[] } = {};
    escalas.forEach((item) => {
      if (mesFiltro !== 'todos' && item.mesChave !== mesFiltro) return;
      if (!mapa[item.mes]) mapa[item.mes] = [];
      mapa[item.mes].push(item);
    });
    return mapa;
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
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Acesso do responsável pela limpeza concedido.' });
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
      mes: mesFiltro !== 'todos' ? (mesesDisponiveis.find((m) => m.chave === mesFiltro)?.rotulo || 'Janeiro') : 'Janeiro',
      dias: '',
      diasSemana: 'Quarta Feira e Domingo',
      grupo: 'GRUPO 1',
      responsaveis: 'SAMUEL E GEOVANE',
      observacao: '',
      ehEspecial: false,
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (item: LimpezaEscalaItem) => {
    setItemParaEditar(item);
    setFormData({
      mes: item.mes,
      dias: item.dias,
      diasSemana: item.diasSemana,
      grupo: item.grupo,
      responsaveis: item.responsaveis,
      observacao: item.observacao || '',
      ehEspecial: !!item.ehEspecial,
    });
    setIsEditorOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dias.trim() || !formData.grupo.trim()) {
      alert('Informe os Dias e o Grupo.');
      return;
    }

    const mesChave = formData.mes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const item: LimpezaEscalaItem = {
      id: itemParaEditar ? itemParaEditar.id : `limp-${Date.now()}`,
      mes: formData.mes.trim(),
      mesChave,
      dias: formData.dias.trim(),
      diasSemana: formData.diasSemana.trim(),
      grupo: formData.grupo.trim(),
      responsaveis: formData.responsaveis.trim(),
      observacao: formData.observacao.trim(),
      ehEspecial: formData.ehEspecial,
    };

    const res = saveStoredLimpezaEscala(item);
    if (res.success && res.data) {
      setEscalas(res.data);
      setIsEditorOpen(false);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala de limpeza salva com sucesso!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handleDeleteItem = (id: string, dias: string, mes: string) => {
    if (window.confirm(`Deseja remover a escala de ${mes} (${dias})?`)) {
      const res = deleteStoredLimpezaEscala(id);
      if (res.success && res.data) {
        setEscalas(res.data);
        setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala removida.' });
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    }
  };

  const handleResetToOfficial = () => {
    if (window.confirm('Deseja restaurar a escala e composição oficial de limpeza de 2026?')) {
      const canonico = resetLimpezaToSample();
      setEscalas(canonico);
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Escala oficial de limpeza restaurada!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBulkSuccess = (qtd: number, modo: string) => {
    setEscalas(getStoredLimpezaEscalas());
    const modoTexto =
      modo === 'append'
        ? 'adicionadas às existentes'
        : modo === 'replace_month'
        ? 'substituindo o mês selecionado'
        : 'substituição completa de escalas';
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Importação em lote de limpeza concluída com sucesso! ${qtd} escalas processadas (${modoTexto}).`,
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra Superior de Identificação e Modos */}
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Congregação Vila Cisper (67744)
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Programa de Limpeza 2026
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Limpeza do Salão do Reino
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            Escala semanal após as reuniões, limpeza semanal geral e limpeza trimestral dos grupos.
          </p>
        </div>

        {/* Controles de Acesso e Impressão */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              title="Importar ou exportar planilha em lote (Excel / CSV)"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Planilhas / Lote</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Imprimir quadro ou exportar em PDF"
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-700"
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/20 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              Painel do Responsável pela Limpeza e Manutenção do Salão
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-300"
              title="Importar planilhas em lote do Excel ou Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Importar / Exportar Planilha</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Nova Escala de Limpeza</span>
            </button>
            <button
              onClick={handleResetToOfficial}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Restaurar a escala oficial completa de limpeza de 2026"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>Restaurar Modelo Oficial</span>
            </button>
          </div>
        </div>
      )}

      {/* Navegação entre Visualização de Escalas vs. Composição dos Grupos */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 print:hidden">
        <button
          onClick={() => setAbaAtiva('escala')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            abaAtiva === 'escala'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Escalas de Limpeza Mensal</span>
        </button>
        <button
          onClick={() => setAbaAtiva('grupos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            abaAtiva === 'grupos'
              ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Composição dos Grupos (Membros)</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca "Consultar Meu Grupo / Designação" */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:grid-cols-12 dark:border-slate-800 dark:bg-slate-900 print:hidden">
        <div className="md:col-span-6 lg:col-span-7">
          <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Consultar Meu Grupo e Minhas Limpezas:</span>
          </label>
          <div className="flex items-center gap-2">
            <select
              value={irmaoSelecionado}
              onChange={(e) => setIrmaoSelecionado(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">-- Selecione seu nome para localizar seu grupo e datas --</option>
              {todosPublicadores.map((nome) => (
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

        {abaAtiva === 'escala' && (
          <div className="md:col-span-6 lg:col-span-5">
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Visualizar Mês:</span>
            </label>
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="todos">Todos os Meses</option>
              {mesesDisponiveis.map((m) => (
                <option key={m.chave} value={m.chave}>
                  {m.rotulo}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Card de Resumo do Irmão */}
      {resumoIrmao && (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/40 p-4 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-teal-950/20 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                  {irmaoSelecionado} • {resumoIrmao.grupoNome}
                </h2>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  Superintendentes do Grupo: <span className="font-semibold">{resumoIrmao.superintendentes}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
                Seu grupo está escalado em {resumoIrmao.totalLimpezas} períodos de 2026
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: ESCALA DE LIMPEZA MENSAL (IDÊNTICA AO PDF VERDE DA CONGREGAÇÃO)    */}
      {/* ========================================================================= */}
      {abaAtiva === 'escala' && (
        <div className="overflow-hidden rounded-xl border-2 border-emerald-600 bg-white shadow-md dark:border-emerald-700 dark:bg-slate-900 print:border-none print:shadow-none">
          {/* Banner do Cabeçalho Oficial */}
          <div className="border-b-2 border-emerald-700 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-800 p-4 text-white sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white shadow-inner">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
                    Congregação Vila Cisper (67744) • Ano 2026
                  </span>
                  <h2 className="text-xl font-black tracking-wide uppercase sm:text-2xl">
                    LIMPEZA SALÃO DO REINO
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block rounded-md border border-white/20 bg-emerald-900/50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-100">
                  Quadro de Limpeza
                </span>
              </div>
            </div>
          </div>

          {/* Tabelas por Mês */}
          <div className="divide-y divide-emerald-200 dark:divide-slate-800">
            {(Object.entries(escalasAgrupadas) as [string, LimpezaEscalaItem[]][]).map(([mesTitulo, itensDoMes]) => (
              <div key={mesTitulo} className="p-4 sm:p-5">
                {/* Barra do Mês estilo PDF */}
                <div className="mb-3 rounded-lg bg-emerald-600 px-4 py-2 text-center font-black uppercase tracking-widest text-white shadow-sm">
                  {mesTitulo}
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        <th className="w-24 p-2.5 font-bold uppercase">DIAS</th>
                        <th className="p-2.5 font-bold uppercase">DIAS DA SEMANA</th>
                        <th className="w-36 p-2.5 font-bold uppercase">GRUPO</th>
                        <th className="p-2.5 font-bold uppercase">RESPONSÁVEIS</th>
                        {isAdmin && <th className="w-20 p-2.5 text-center font-bold uppercase print:hidden">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {itensDoMes.map((item, idx) => {
                        const ehGrupoDoIrmao = grupoDoIrmao && item.grupo.toLowerCase().includes(`grupo ${grupoDoIrmao.numero}`.toLowerCase());
                        const ehEspecial = item.ehEspecial;

                        return (
                          <tr
                            key={item.id}
                            className={`transition ${
                              ehGrupoDoIrmao
                                ? 'bg-amber-100/90 font-bold text-amber-950 dark:bg-amber-950/40 dark:text-amber-100'
                                : ehEspecial
                                ? 'bg-rose-50 font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'
                                : idx % 2 === 0
                                ? 'bg-white dark:bg-slate-900'
                                : 'bg-slate-50/70 dark:bg-slate-900/60'
                            } hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20`}
                          >
                            <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                              {item.dias}
                            </td>
                            <td className="p-2.5">
                              {item.diasSemana}
                            </td>
                            <td className="p-2.5 font-bold">
                              <span
                                className={`rounded px-2 py-0.5 ${
                                  ehGrupoDoIrmao
                                    ? 'bg-amber-300 text-amber-950 dark:bg-amber-800 dark:text-amber-100'
                                    : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                                }`}
                              >
                                {item.grupo}
                              </span>
                            </td>
                            <td className="p-2.5 font-semibold">
                              {item.responsaveis}
                            </td>
                            {isAdmin && (
                              <td className="p-2.5 text-center print:hidden">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEdit(item)}
                                    className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-emerald-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                                    title="Editar escala"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id, item.dias, item.mes)}
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
              </div>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* PROGRAMA DE LIMPEZA DO SALÃO DO REINO (SEMANAL E TRIMESTRAL)              */}
          {/* ========================================================================= */}
          <div className="border-t-2 border-emerald-300 bg-emerald-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/90 sm:p-5">
            <div className="mb-3 rounded-lg bg-emerald-700 px-4 py-1.5 text-center font-bold uppercase tracking-wider text-white">
              PROGRAMA DE LIMPEZA DO SALÃO DO REINO 2026
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              {/* Limpeza Semanal */}
              <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  LIMPEZA SEMANAL GERAL (TODOS OS GRUPOS):
                </span>
                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  <strong>JANEIRO • ABRIL • JULHO • OUTUBRO:</strong> CISPER — TODOS OS GRUPOS SÁBADO APÓS O CAMPO
                </p>
              </div>

              {/* Limpeza Trimestral */}
              <div className="rounded-lg border border-emerald-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  LIMPEZA TRIMESTRAL GERAL:
                </span>
                <p className="mt-1 text-slate-700 dark:text-slate-300">
                  <strong>JANEIRO E ABRIL:</strong> CISPER — TODOS OS GRUPOS • SÁBADO ÀS 08:00 HORAS
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: COMPOSIÇÃO DOS GRUPOS (TODOS OS PUBLICADORES CADASTRADOS NO PDF)   */}
      {/* ========================================================================= */}
      {abaAtiva === 'grupos' && (
        <div className="space-y-6">
          {grupos.map((grp) => {
            const ehMeuGrupo = grupoDoIrmao && grupoDoIrmao.id === grp.id;
            return (
              <div
                key={grp.id}
                className={`overflow-hidden rounded-xl border-2 ${
                  ehMeuGrupo
                    ? 'border-emerald-600 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                } shadow-sm`}
              >
                {/* Header do Grupo */}
                <div className="flex flex-col border-b border-slate-200 bg-emerald-700 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wide">
                      {grp.nomeGrupo}
                    </h3>
                    <p className="text-xs text-emerald-100">
                      Dirigentes: <span className="font-semibold">{grp.superintendentes}</span>
                    </p>
                  </div>
                  <span className="mt-1 rounded-md bg-emerald-900/60 px-2.5 py-1 text-xs font-bold sm:mt-0">
                    {grp.membros.length} Publicadores
                  </span>
                </div>

                {/* Lista de Membros */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2">
                    {grp.membros.map((membro) => {
                      const ehDestacado = irmaoSelecionado && membro.toLowerCase().includes(irmaoSelecionado.toLowerCase());
                      return (
                        <span
                          key={membro}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            ehDestacado
                              ? 'border-amber-500 bg-amber-200 font-bold text-amber-950 dark:bg-amber-800 dark:text-amber-100'
                              : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {membro}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL                                      */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Acesso do Responsável</h3>
                  <p className="text-xs text-slate-500">Limpeza do Salão do Reino</p>
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE ESCALA DE LIMPEZA                            */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {itemParaEditar ? 'Editar Escala de Limpeza' : 'Nova Escala de Limpeza'}
              </h3>
              <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Dias</label>
                  <input
                    type="text"
                    value={formData.dias}
                    onChange={(e) => setFormData({ ...formData, dias: e.target.value })}
                    placeholder="Ex: 4 ou 7/11"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Dias da Semana</label>
                <input
                  type="text"
                  value={formData.diasSemana}
                  onChange={(e) => setFormData({ ...formData, diasSemana: e.target.value })}
                  placeholder="Ex: Quarta Feira e Domingo"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Grupo</label>
                  <select
                    value={formData.grupo}
                    onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="GRUPO 1">GRUPO 1</option>
                    <option value="GRUPO 2">GRUPO 2</option>
                    <option value="GRUPO 3">GRUPO 3</option>
                    <option value="Assembléia">Assembléia</option>
                    <option value="Congresso">Congresso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Responsáveis</label>
                  <input
                    type="text"
                    value={formData.responsaveis}
                    onChange={(e) => setFormData({ ...formData, responsaveis: e.target.value })}
                    placeholder="Ex: AIRTON E DHIEGO"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkEspecialLimpeza"
                  checked={formData.ehEspecial}
                  onChange={(e) => setFormData({ ...formData, ehEspecial: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chkEspecialLimpeza" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Evento especial (Assembléia / Congresso)
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
                  className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
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
        modulo="limpeza"
        tituloModulo="Limpeza do Salão do Reino"
        dadosAtuais={escalas}
        isAdmin={isAdmin}
        onImportadoComSucesso={handleBulkSuccess}
      />
    </div>
  );
};
