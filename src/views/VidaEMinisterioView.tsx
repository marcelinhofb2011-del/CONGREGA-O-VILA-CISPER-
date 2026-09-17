import React, { useState, useEffect, useMemo } from 'react';
import {
  S140TSemana,
  getStoredS140TSemanas,
  saveS140TSemana,
  deleteS140TSemana,
  resetS140TToSample,
  extrairTodosNomesDesignados,
  verificarDesignacaoIrmao,
} from '../data/s140tStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import { S140TDocumentSheet } from '../components/S140TDocumentSheet';
import { S140TEditorModal } from '../components/S140TEditorModal';
import {
  Lock,
  Unlock,
  Plus,
  Printer,
  Search,
  CheckCircle2,
  Calendar,
  RotateCcw,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  User,
  BookOpen,
} from 'lucide-react';

export const VidaEMinisterioView: React.FC = () => {
  // Estado das semanas da programação
  const [semanas, setSemanas] = useState<S140TSemana[]>([]);

  // Autenticação do Irmão Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Filtro / Realce por Irmão ("Minhas Designações")
  const [irmaoSelecionado, setIrmaoSelecionado] = useState<string>('');

  // Filtro por Semana ou "Todas as Semanas"
  const [semanaFiltroId, setSemanaFiltroId] = useState<string>('todas');

  // Estado do Modal de Edição/Criação
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [semanaParaEditar, setSemanaParaEditar] = useState<S140TSemana | null>(null);

  // Mensagem de feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Carregar dados no mount e ouvir atualizações do Firebase em tempo real
  useEffect(() => {
    setSemanas(getStoredS140TSemanas());
    setIsAdmin(isAdminAuthenticated());

    const handleFirebaseUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<S140TSemana[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setSemanas(customEvent.detail);
      }
    };

    window.addEventListener('s140t-firebase-updated', handleFirebaseUpdate);
    return () => {
      window.removeEventListener('s140t-firebase-updated', handleFirebaseUpdate);
    };
  }, []);

  // Lista de todos os irmãos com designação para o dropdown de consulta
  const nomesComDesignacao = useMemo(() => {
    return extrairTodosNomesDesignados(semanas);
  }, [semanas]);

  // Contagem de designações do irmão consultado
  const resumoDesignacoesIrmao = useMemo(() => {
    if (!irmaoSelecionado) return null;
    let count = 0;
    const detalhes: string[] = [];

    semanas.forEach((sem) => {
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.presidente)) {
        count++;
        detalhes.push(`Presidente (${sem.periodo})`);
      }
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.oracaoInicial)) {
        count++;
        detalhes.push(`Oração Inicial (${sem.periodo})`);
      }
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.discursoTesourosIrmao)) {
        count++;
        detalhes.push(`Discurso Tesouros (${sem.periodo})`);
      }
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.joiasEspirituaisIrmao)) {
        count++;
        detalhes.push(`Joias Espirituais (${sem.periodo})`);
      }
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.leituraBibliaIrmao)) {
        count++;
        detalhes.push(`Leitura da Bíblia (${sem.periodo})`);
      }
      sem.partesMinisterio?.forEach((pm) => {
        if (verificarDesignacaoIrmao(irmaoSelecionado, pm.designado)) {
          count++;
          detalhes.push(`${pm.titulo} - Titular (${sem.periodo})`);
        }
        if (verificarDesignacaoIrmao(irmaoSelecionado, pm.ajudante)) {
          count++;
          detalhes.push(`${pm.titulo} - Ajudante (${sem.periodo})`);
        }
      });
      sem.partesVidaCrista?.forEach((pvc) => {
        if (verificarDesignacaoIrmao(irmaoSelecionado, pvc.designado)) {
          count++;
          detalhes.push(`${pvc.titulo} (${sem.periodo})`);
        }
      });
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.estudoBiblicoDirigente)) {
        count++;
        detalhes.push(`Dirigente do Estudo Bíblico (${sem.periodo})`);
      }
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.estudoBiblicoLeitor)) {
        count++;
        detalhes.push(`Leitor do Estudo Bíblico (${sem.periodo})`);
      }
      if (verificarDesignacaoIrmao(irmaoSelecionado, sem.oracaoFinal)) {
        count++;
        detalhes.push(`Oração Final (${sem.periodo})`);
      }
    });

    return { count, detalhes };
  }, [irmaoSelecionado, semanas]);

  // Semanas exibidas após filtro
  const semanasExibidas = useMemo(() => {
    if (semanaFiltroId === 'todas') return semanas;
    return semanas.filter((s) => s.id === semanaFiltroId);
  }, [semanas, semanaFiltroId]);

  // -------------------------------------------------------------------
  // Ações de Autenticação do Responsável
  // -------------------------------------------------------------------
  const handleOpenAuth = () => {
    setPasswordInput('');
    setAuthError('');
    setShowPasswordText(false);
    setShowAuthModal(true);
  };

  const handleVerifyAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setPasswordInput('');
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: 'Acesso do responsável autenticado com sucesso.',
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setAuthError('Senha incorreta. Tente novamente.');
    }
  };

  const handleLogoutAdmin = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: 'Sessão do responsável encerrada. Modo de consulta ativo.',
    });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // -------------------------------------------------------------------
  // Ações do Responsável (Criação, Edição, Exclusão)
  // -------------------------------------------------------------------
  const handleOpenCreate = () => {
    setSemanaParaEditar(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (semana: S140TSemana) => {
    setSemanaParaEditar(semana);
    setIsEditorOpen(true);
  };

  const handleSaveSemana = (semana: S140TSemana) => {
    const res = saveS140TSemana(semana);
    if (res.success && res.data) {
      setSemanas(res.data);
      setIsEditorOpen(false);
      setSemanaParaEditar(null);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Programação da semana "${semana.periodo}" salva com sucesso.`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.error || 'Não foi possível salvar a programação.',
      });
    }
  };

  const handleDeleteSemana = (id: string) => {
    const alvo = semanas.find((s) => s.id === id);
    const confirmou = window.confirm(
      `Deseja realmente remover a semana "${alvo?.periodo || 'selecionada'}" da programação?`
    );
    if (!confirmou) return;

    const res = deleteS140TSemana(id);
    if (res.success && res.data) {
      setSemanas(res.data);
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: 'Semana removida da programação.',
      });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: res.error || 'Erro ao remover semana.',
      });
    }
  };

  const handleResetPadrao = () => {
    const confirmou = window.confirm(
      'Deseja restaurar as semanas canônicas originais do documento oficial S-140-T?'
    );
    if (!confirmou) return;
    const padrao = resetS140TToSample();
    setSemanas(padrao);
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: 'Dados restaurados para a programação oficial do documento.',
    });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* 1. TOPO: BARRA SUPERIOR & CONTROLES DO USUÁRIO                   */}
      {/* ================================================================= */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800 no-print">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Vida e Ministério
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Programação da reunião do meio de semana &bull; Formulário oficial S-140-T
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Botão de Impressão Oficial */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              title="Imprimir formato A4 da folha oficial"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            {/* Alternar Acesso Responsável */}
            {!isAdmin ? (
              <button
                type="button"
                onClick={handleOpenAuth}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>Acesso do Responsável</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Responsável Ativo
                </span>
                <button
                  type="button"
                  onClick={handleLogoutAdmin}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback visual temporário */}
        {feedbackMsg && (
          <div
            className={`mt-3 flex items-center justify-between rounded-lg p-3 text-xs font-medium ${
              feedbackMsg.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedbackMsg.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 2. BARRA DE FERRAMENTAS DO RESPONSÁVEL (QUANDO AUTENTICADO)       */}
      {/* ================================================================= */}
      {isAdmin && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 no-print">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold">
                R
              </span>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Painel de Criação e Edição do Responsável
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Crie novas semanas, ajuste designações ou redefina os dados do formulário S-140-T.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetPadrao}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                title="Restaura os dados originais do documento S-140-T de Setembro"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restaurar Modelo Oficial</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <Plus className="h-4 w-4" />
                <span>+ Nova Semana</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. MELHORIA ELEGANTE PARA OS IRMÃOS: CONSULTA & DESTAQUE PESSOAL  */}
      {/* ================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 no-print space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Consulta rápida de designações por irmão/irmã */}
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Consultar / Destacar Minhas Designações
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={irmaoSelecionado}
                onChange={(e) => setIrmaoSelecionado(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-8 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Selecione o seu nome para destacar suas partes...</option>
                {nomesComDesignacao.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
              {irmaoSelecionado && (
                <button
                  type="button"
                  onClick={() => setIrmaoSelecionado('')}
                  title="Limpar destaque"
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Seletor de Semanas para navegação rápida */}
          <div className="shrink-0">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Exibição das Semanas
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSemanaFiltroId('todas')}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  semanaFiltroId === 'todas'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Todas ({semanas.length})
              </button>
              {semanas.map((sem) => (
                <button
                  key={sem.id}
                  type="button"
                  onClick={() => setSemanaFiltroId(sem.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    semanaFiltroId === sem.id
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  title={sem.periodo}
                >
                  {sem.periodo.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo do Irmão Selecionado */}
        {irmaoSelecionado && resumoDesignacoesIrmao && (
          <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 dark:bg-amber-950/40 dark:border-amber-900/60">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[11px] font-bold shrink-0 mt-0.5">
                {resumoDesignacoesIrmao.count}
              </span>
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {irmaoSelecionado} possui {resumoDesignacoesIrmao.count}{' '}
                  {resumoDesignacoesIrmao.count === 1 ? 'designação' : 'designações'} no período da programação:
                </span>
                <div className="flex flex-wrap gap-1.5 text-[11px] text-amber-800 dark:text-amber-300">
                  {resumoDesignacoesIrmao.detalhes.map((det, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded bg-amber-100/90 px-2 py-0.5 font-medium dark:bg-amber-900/60 text-amber-900 dark:text-amber-200"
                    >
                      &bull; {det}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 4. VISUALIZAÇÃO FIEL AO DOCUMENTO OFICIAL S-140-T                */}
      {/* ================================================================= */}
      <S140TDocumentSheet
        semanas={semanasExibidas}
        destacarIrmao={irmaoSelecionado}
        isAdmin={isAdmin}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteSemana}
      />

      {/* ================================================================= */}
      {/* 5. MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL                          */}
      {/* ================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs no-print">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Acesso do Irmão Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Digite a senha administrativa da congregação para criar, editar ou excluir designações da reunião de meio de semana.
            </p>

            <form onSubmit={handleVerifyAuth} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Senha do Responsável
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Digite a senha..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-800 dark:bg-red-950/60 dark:text-red-300">
                  {authError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. MODAL DE EDIÇÃO / CRIAÇÃO DE SEMANAS (S-140-T)                */}
      {/* ================================================================= */}
      <S140TEditorModal
        isOpen={isEditorOpen}
        semana={semanaParaEditar}
        onClose={() => {
          setIsEditorOpen(false);
          setSemanaParaEditar(null);
        }}
        onSave={handleSaveSemana}
      />
    </div>
  );
};
