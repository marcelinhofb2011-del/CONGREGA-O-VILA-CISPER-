import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  FileSpreadsheet,
  Calendar,
  Speech,
  Compass,
  Sparkles,
  Map,
  Bell,
  BarChart3,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Pin,
  Tag,
  Edit2,
  Power,
  PowerOff,
  Clock,
  BookOpen,
  Settings,
  Users,
  ChevronRight,
} from 'lucide-react';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
  updateAdminPassword,
} from '../data/territoriosStorage';
import { firebaseSync } from '../data/firebaseSyncService';
import { DesignacoesView } from './DesignacoesView';
import { VidaEMinisterioView } from './VidaEMinisterioView';
import { DiscursoPublicoView } from './DiscursoPublicoView';
import { ServicoDeCampoView } from './ServicoDeCampoView';
import { LimpezaView } from './LimpezaView';
import { TerritoriosView } from './TerritoriosView';
import { SecretarioView } from './SecretarioView';
import { RelatoriosView } from './RelatoriosView';
import { AssistenciaView } from './AssistenciaView';
import {
  AvisoItem,
  getStoredAvisos,
  addAviso,
  deleteAviso,
  updateAviso,
  toggleAtivoAviso,
} from '../data/avisosStorage';
import {
  HorariosReunioesConfig,
  getHorariosReunioes,
  saveHorariosReunioes,
  LISTA_DIAS_SEMANA,
  DiaSemanaReuniao,
} from '../data/horariosReunioesStorage';
import { ScreenId } from '../types';

interface AdminPainelViewProps {
  onBackToPublic: () => void;
}

type AdminTabId =
  | 'designacoes'
  | 'vida-ministerio'
  | 'discursos'
  | 'campo'
  | 'limpeza'
  | 'territorios'
  | 'avisos'
  | 'horarios'
  | 'secretario'
  | 'relatorios'
  | 'assistencia'
  | 'seguranca';

interface ItemRecurso {
  id: AdminTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SecaoRecurso {
  titulo: string;
  itens: ItemRecurso[];
}

export const AdminPainelView: React.FC<AdminPainelViewProps> = ({ onBackToPublic }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AdminTabId | null>(null);

  // Organização dos recursos por departamento
  const SECOES: SecaoRecurso[] = [
    {
      titulo: 'REUNIÕES E DESIGNAÇÕES',
      itens: [
        { id: 'designacoes', label: 'Designações', icon: Calendar },
        { id: 'vida-ministerio', label: 'Vida e Ministério', icon: BookOpen },
        { id: 'discursos', label: 'Discurso Público', icon: Speech },
      ],
    },
    {
      titulo: 'MINISTÉRIO',
      itens: [
        { id: 'campo', label: 'Serviço de Campo', icon: Compass },
        { id: 'territorios', label: 'Territórios', icon: Map },
      ],
    },
    {
      titulo: 'CONGREGAÇÃO',
      itens: [
        { id: 'limpeza', label: 'Grupo de Limpeza', icon: Sparkles },
        { id: 'assistencia', label: 'Assistência', icon: Users },
        { id: 'avisos', label: 'Avisos', icon: Bell },
      ],
    },
    {
      titulo: 'ADMINISTRAÇÃO',
      itens: [
        { id: 'secretario', label: 'Secretaria', icon: FileSpreadsheet },
        { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
        { id: 'horarios', label: 'Configurações', icon: Settings },
        { id: 'seguranca', label: 'Senha do Painel', icon: KeyRound },
      ],
    },
  ];

  // Avisos state for admin management
  const [avisosList, setAvisosList] = useState<AvisoItem[]>([]);
  const [isNovoAvisoOpen, setIsNovoAvisoOpen] = useState<boolean>(false);
  const [avisoEmEdicao, setAvisoEmEdicao] = useState<AvisoItem | null>(null);
  const [novoAviso, setNovoAviso] = useState<{
    titulo: string;
    conteudo: string;
    categoria: AvisoItem['categoria'];
    fixado: boolean;
    autor: string;
  }>({
    titulo: '',
    conteudo: '',
    categoria: 'Geral',
    fixado: false,
    autor: 'Corpo de Anciãos',
  });

  // Alteração de senha
  const [senhaAtual, setSenhaAtual] = useState<string>('');
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmaNovaSenha, setConfirmaNovaSenha] = useState<string>('');
  const [senhaFeedback, setSenhaFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  // Configuração dos Horários das Reuniões
  const [horariosConfig, setHorariosConfig] = useState<HorariosReunioesConfig>(() =>
    getHorariosReunioes()
  );
  const [horariosFeedback, setHorariosFeedback] = useState<{
    tipo: 'sucesso' | 'erro';
    msg: string;
  } | null>(null);

  useEffect(() => {
    const isAuth = isAdminAuthenticated();
    setIsAuthenticated(isAuth);
    if (isAuth) {
      setAvisosList(getStoredAvisos());
      setHorariosConfig(getHorariosReunioes());
    }

    const handleAvisosUpdate = () => {
      setAvisosList(getStoredAvisos());
    };
    window.addEventListener('avisos-firebase-updated', handleAvisosUpdate);
    return () => {
      window.removeEventListener('avisos-firebase-updated', handleAvisosUpdate);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'avisos') {
      setAvisosList(getStoredAvisos());
    }
  }, [activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAuthenticated(true);
      setActiveTab(null);
      setLoginError('');
      setPasswordInput('');
      setAvisosList(getStoredAvisos());
      setHorariosConfig(getHorariosReunioes());
    } else {
      setLoginError('Senha incorreta. Verifique e tente novamente.');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAuthenticated(false);
    setActiveTab(null);
  };

  const handleSalvarNovoAviso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAviso.titulo.trim() || !novoAviso.conteudo.trim()) {
      alert('Por favor preencha o título e o conteúdo do aviso.');
      return;
    }

    addAviso({
      titulo: novoAviso.titulo.trim(),
      conteudo: novoAviso.conteudo.trim(),
      categoria: novoAviso.categoria,
      fixado: novoAviso.fixado,
      autor: novoAviso.autor.trim() || 'Corpo de Anciãos',
    });

    setAvisosList(getStoredAvisos());
    setNovoAviso({
      titulo: '',
      conteudo: '',
      categoria: 'Geral',
      fixado: false,
      autor: 'Corpo de Anciãos',
    });
    setIsNovoAvisoOpen(false);
  };

  const handleSalvarEdicaoAviso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!avisoEmEdicao) return;
    if (!avisoEmEdicao.titulo.trim() || !avisoEmEdicao.conteudo.trim()) {
      alert('Por favor preencha o título e o conteúdo do aviso.');
      return;
    }

    updateAviso({
      ...avisoEmEdicao,
      titulo: avisoEmEdicao.titulo.trim(),
      conteudo: avisoEmEdicao.conteudo.trim(),
      autor: avisoEmEdicao.autor?.trim() || 'Corpo de Anciãos',
    });

    setAvisosList(getStoredAvisos());
    setAvisoEmEdicao(null);
  };

  const handleToggleAtivo = (id: string) => {
    toggleAtivoAviso(id);
    setAvisosList(getStoredAvisos());
  };

  const handleExcluirAviso = (id: string) => {
    if (confirm('Deseja realmente excluir este aviso do quadro?')) {
      deleteAviso(id);
      setAvisosList(getStoredAvisos());
    }
  };

  const handleSalvarHorarios = (e: React.FormEvent) => {
    e.preventDefault();
    if (!horariosConfig.meioDeSemana.horario.trim() || !horariosConfig.fimDeSemana.horario.trim()) {
      setHorariosFeedback({
        tipo: 'erro',
        msg: 'Preencha os horários das duas reuniões.',
      });
      return;
    }

    saveHorariosReunioes(horariosConfig);
    setHorariosFeedback({
      tipo: 'sucesso',
      msg: 'Horários das reuniões salvos e sincronizados com sucesso!',
    });

    setTimeout(() => {
      setHorariosFeedback(null);
    }, 4000);
  };

  const handleAlterarSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmaNovaSenha) {
      setSenhaFeedback({ tipo: 'erro', msg: 'A nova senha e a confirmação não conferem.' });
      return;
    }
    if (novaSenha.length < 4) {
      setSenhaFeedback({ tipo: 'erro', msg: 'A nova senha deve conter pelo menos 4 caracteres.' });
      return;
    }
    const sucesso = updateAdminPassword(senhaAtual, novaSenha);
    if (sucesso) {
      setSenhaFeedback({ tipo: 'sucesso', msg: 'Senha alterada com sucesso!' });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmaNovaSenha('');
    } else {
      setSenhaFeedback({ tipo: 'erro', msg: 'Senha atual incorreta.' });
    }
  };

  // -------------------------------------------------------------
  // TELA DE LOGIN PROTEGIDA PARA RESPONSÁVEIS
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md py-12 px-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Lock className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              ÁREA DOS RESPONSÁVEIS
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Acesso exclusivo para os irmãos designados para gerenciar as atividades da congregação.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1"
              >
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite a senha"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              id="btn-login-admin"
              type="submit"
              className="w-full rounded-xl bg-blue-700 py-3 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              Acessar Painel dos Responsáveis
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToPublic}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Quadro Digital Público</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PAINEL ADMINISTRATIVO AUTENTICADO
  // -------------------------------------------------------------
  // 1. MENU PRINCIPAL DE ACESSO (QUANDO NENHUM DEPARTAMENTO ESTÁ SELECIONADO)
  if (activeTab === null) {
    return (
      <div className="space-y-6 sm:space-y-7">
        {/* Topo: Cabeçalho Limpo e Moderno */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                  PAINEL DO RESPONSÁVEL
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Modo Responsável Ativo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Congregação Vila Cisper &bull; Gestão e organização de congregação
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-voltar-ao-quadro"
                type="button"
                onClick={onBackToPublic}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao Quadro</span>
              </button>

              <button
                id="btn-admin-logout"
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-[0.99] dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950"
                title="Encerrar sessão"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recursos Organizados por Departamento */}
        <div className="space-y-6 sm:space-y-7">
          {SECOES.map((secao) => (
            <div key={secao.titulo} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {secao.titulo}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {secao.itens.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`admin-btn-${item.id}`}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 sm:py-3.5 text-left transition-all border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-950 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-850 active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-blue-500 dark:group-hover:text-white">
                          <Icon className="h-4 w-4 shrink-0" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-950 dark:text-slate-200 dark:group-hover:text-white truncate">
                          {item.label}
                        </span>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. TELA DEDICADA DO DEPARTAMENTO SELECIONADO
  const itemAtual = SECOES.flatMap((s) => s.itens).find((i) => i.id === activeTab);
  const secaoAtual = SECOES.find((s) => s.itens.some((i) => i.id === activeTab));

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Topo da Tela Dedicada com Botão Voltar ao Painel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <button
              id="btn-voltar-ao-painel"
              type="button"
              onClick={() => setActiveTab(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-blue-700 hover:bg-blue-100 hover:text-blue-900 transition active:scale-[0.99] dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Painel</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div>
              <h1 className="text-base sm:text-xl font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
                {itemAtual?.label}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Painel do Responsável &bull; {secaoAtual?.titulo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="btn-voltar-quadro-dept"
              type="button"
              onClick={onBackToPublic}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <span>Voltar ao Quadro</span>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Modo Responsável Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo Exclusivo do Departamento Selecionado */}
      <div>
        {activeTab === 'designacoes' && <DesignacoesView />}
        {activeTab === 'vida-ministerio' && <VidaEMinisterioView />}
        {activeTab === 'discursos' && <DiscursoPublicoView />}
        {activeTab === 'campo' && <ServicoDeCampoView />}
        {activeTab === 'limpeza' && <LimpezaView />}
        {activeTab === 'territorios' && <TerritoriosView />}
        {activeTab === 'secretario' && <SecretarioView />}
        {activeTab === 'relatorios' && <RelatoriosView />}
        {activeTab === 'assistencia' && <AssistenciaView />}

        {/* Gerenciamento de Avisos do Quadro */}
        {activeTab === 'avisos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Gerenciador de Avisos do Quadro
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Os avisos adicionados aqui aparecem instantaneamente para todos os irmãos na tela de Avisos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNovoAvisoOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Aviso</span>
              </button>
            </div>

            {/* Modal Novo Aviso */}
            {isNovoAvisoOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Adicionar Novo Aviso ao Quadro
                  </h3>

                  <form onSubmit={handleSalvarNovoAviso} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Título do Aviso
                      </label>
                      <input
                        type="text"
                        value={novoAviso.titulo}
                        onChange={(e) => setNovoAviso({ ...novoAviso, titulo: e.target.value })}
                        placeholder="Ex: Horário da Reunião Especial"
                        required
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Categoria
                      </label>
                      <select
                        value={novoAviso.categoria}
                        onChange={(e) =>
                          setNovoAviso({ ...novoAviso, categoria: e.target.value as any })
                        }
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                      >
                        <option value="Geral">Geral</option>
                        <option value="Reunião">Reunião</option>
                        <option value="Campo">Serviço de Campo</option>
                        <option value="Limpeza">Limpeza</option>
                        <option value="Assembleia">Assembleia / Congresso</option>
                        <option value="Importante">Importante</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Conteúdo do Comunicado
                      </label>
                      <textarea
                        value={novoAviso.conteudo}
                        onChange={(e) => setNovoAviso({ ...novoAviso, conteudo: e.target.value })}
                        rows={4}
                        placeholder="Digite o texto detalhado do aviso..."
                        required
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Fonte / Autor
                      </label>
                      <input
                        type="text"
                        value={novoAviso.autor}
                        onChange={(e) => setNovoAviso({ ...novoAviso, autor: e.target.value })}
                        placeholder="Ex: Corpo de Anciãos / Comissão de Serviço"
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="aviso-fixado"
                        checked={novoAviso.fixado}
                        onChange={(e) => setNovoAviso({ ...novoAviso, fixado: e.target.checked })}
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      <label htmlFor="aviso-fixado" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Fixar no topo do quadro de avisos
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsNovoAvisoOpen(false)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        Publicar Aviso
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal de Edição de Aviso */}
            {avisoEmEdicao && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      Editar Aviso
                    </h4>
                    <button
                      type="button"
                      onClick={() => setAvisoEmEdicao(null)}
                      className="text-sm font-bold text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSalvarEdicaoAviso} className="mt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Título do Aviso
                      </label>
                      <input
                        type="text"
                        value={avisoEmEdicao.titulo}
                        onChange={(e) =>
                          setAvisoEmEdicao({ ...avisoEmEdicao, titulo: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                          Categoria
                        </label>
                        <select
                          value={avisoEmEdicao.categoria}
                          onChange={(e) =>
                            setAvisoEmEdicao({
                              ...avisoEmEdicao,
                              categoria: e.target.value as AvisoItem['categoria'],
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="Geral">Geral</option>
                          <option value="Reunião">Reunião</option>
                          <option value="Campo">Campo</option>
                          <option value="Limpeza">Limpeza</option>
                          <option value="Assembleia">Assembleia</option>
                          <option value="Importante">Importante</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                          Autor / Comissão
                        </label>
                        <input
                          type="text"
                          value={avisoEmEdicao.autor || ''}
                          onChange={(e) =>
                            setAvisoEmEdicao({ ...avisoEmEdicao, autor: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                        Conteúdo do Aviso
                      </label>
                      <textarea
                        rows={4}
                        value={avisoEmEdicao.conteudo}
                        onChange={(e) =>
                          setAvisoEmEdicao({ ...avisoEmEdicao, conteudo: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="check-fixado-edicao"
                        checked={avisoEmEdicao.fixado || false}
                        onChange={(e) =>
                          setAvisoEmEdicao({ ...avisoEmEdicao, fixado: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="check-fixado-edicao" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Destacar como prioritário (topo da fila de pop-ups)
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setAvisoEmEdicao(null)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        Salvar Alterações
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Lista dos Avisos Atuais */}
            {avisosList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <Bell className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                  Nenhum Pop-up ou aviso cadastrado
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  A lista está vazia. Toque em "+ Novo Aviso" no canto superior para criar uma nova mensagem quando desejar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {avisosList.map((aviso) => {
                  const isAtivo = aviso.ativo !== false;
                  return (
                    <div
                      key={aviso.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-5 transition-all ${
                        isAtivo
                          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                          : 'border-slate-200 bg-slate-50/70 opacity-60 dark:border-slate-800 dark:bg-slate-900/50'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {aviso.fixado && (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                              Prioritário
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {aviso.categoria}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                            isAtivo
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {isAtivo ? 'Pop-up Ativo' : 'Pausado'}
                          </span>
                          <span className="text-xs text-slate-400">&bull; {aviso.dataPublicacao}</span>
                          {aviso.autor && (
                            <span className="text-xs text-slate-400">&bull; {aviso.autor}</span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {aviso.titulo}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                          {aviso.conteudo}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAtivo(aviso.id)}
                          title={isAtivo ? 'Pausar pop-up deste aviso' : 'Ativar pop-up deste aviso'}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                            isAtivo
                              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {isAtivo ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          <span>{isAtivo ? 'Pausar' : 'Ativar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAvisoEmEdicao(aviso)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExcluirAviso(aviso.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* HORÁRIOS DAS REUNIÕES                                         */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'horarios' && (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                    HORÁRIOS DAS REUNIÕES
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure os dias e horários oficiais das reuniões de meio de semana e de fim de semana.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSalvarHorarios} className="mt-8 space-y-6">
                {/* 1. Reunião do meio de semana */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-850/50 space-y-4">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      1
                    </span>
                    <h4 className="text-base font-extrabold">
                      Reunião do meio de semana
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Dia
                      </label>
                      <select
                        value={horariosConfig.meioDeSemana.dia}
                        onChange={(e) =>
                          setHorariosConfig({
                            ...horariosConfig,
                            meioDeSemana: {
                              ...horariosConfig.meioDeSemana,
                              dia: e.target.value as DiaSemanaReuniao,
                            },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {LISTA_DIAS_SEMANA.map((dia) => (
                          <option key={dia} value={dia}>
                            {dia}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Horário
                      </label>
                      <input
                        type="time"
                        value={horariosConfig.meioDeSemana.horario}
                        onChange={(e) =>
                          setHorariosConfig({
                            ...horariosConfig,
                            meioDeSemana: {
                              ...horariosConfig.meioDeSemana,
                              horario: e.target.value,
                            },
                          })
                        }
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Reunião de fim de semana */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-850/50 space-y-4">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                      2
                    </span>
                    <h4 className="text-base font-extrabold">
                      Reunião de fim de semana
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Dia
                      </label>
                      <select
                        value={horariosConfig.fimDeSemana.dia}
                        onChange={(e) =>
                          setHorariosConfig({
                            ...horariosConfig,
                            fimDeSemana: {
                              ...horariosConfig.fimDeSemana,
                              dia: e.target.value as DiaSemanaReuniao,
                            },
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {LISTA_DIAS_SEMANA.map((dia) => (
                          <option key={dia} value={dia}>
                            {dia}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                        Horário
                      </label>
                      <input
                        type="time"
                        value={horariosConfig.fimDeSemana.horario}
                        onChange={(e) =>
                          setHorariosConfig({
                            ...horariosConfig,
                            fimDeSemana: {
                              ...horariosConfig.fimDeSemana,
                              horario: e.target.value,
                            },
                          })
                        }
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {horariosFeedback && (
                  <div
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                      horariosFeedback.tipo === 'sucesso'
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {horariosFeedback.tipo === 'sucesso' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{horariosFeedback.msg}</span>
                  </div>
                )}

                <button
                  id="btn-salvar-horarios-reunioes"
                  type="submit"
                  className="w-full rounded-xl bg-blue-700 py-3.5 text-base font-extrabold text-white shadow-sm hover:bg-blue-800 transition active:scale-[0.99]"
                >
                  Salvar Horários das Reuniões
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Alteração da Senha de Acesso */}
        {activeTab === 'seguranca' && (
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Alterar Senha dos Responsáveis
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta senha protege as funções administrativas e planilhas.
                </p>
              </div>
            </div>

            <form onSubmit={handleAlterarSenha} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Senha atual (ex: cisper2026)"
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha"
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Confirme a Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmaNovaSenha}
                  onChange={(e) => setConfirmaNovaSenha(e.target.value)}
                  placeholder="Digite a nova senha novamente"
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                />
              </div>

              {senhaFeedback && (
                <div
                  className={`flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                    senhaFeedback.tipo === 'sucesso'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {senhaFeedback.tipo === 'sucesso' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{senhaFeedback.msg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-800 transition"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
