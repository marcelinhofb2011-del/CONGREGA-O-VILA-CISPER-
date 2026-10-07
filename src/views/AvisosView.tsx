import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Pin,
  Calendar,
  Tag,
  Info,
  Lock,
  Unlock,
  Plus,
  Send,
  Trash2,
  Edit2,
  X,
  Eye,
  EyeOff,
  Megaphone,
  CheckCircle2,
} from 'lucide-react';
import {
  AvisoItem,
  getStoredAvisos,
  addAviso,
  updateAviso,
  deleteAviso,
} from '../data/avisosStorage';
import {
  isAdminAuthenticated,
  verifyAdminPassword,
  setAdminAuthenticated,
} from '../data/territoriosStorage';

export const AvisosView: React.FC = () => {
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');

  // Controle de Modo Responsável
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Campo simples para escrever o aviso e publicar (somente Responsável)
  const [isFormAvisoAberto, setIsFormAvisoAberto] = useState<boolean>(false);
  const [novoTitulo, setNovoTitulo] = useState<string>('');
  const [novoConteudo, setNovoConteudo] = useState<string>('');
  const [novaCategoria, setNovaCategoria] = useState<AvisoItem['categoria']>('Geral');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Edição de aviso (somente Responsável)
  const [avisoEmEdicao, setAvisoEmEdicao] = useState<AvisoItem | null>(null);

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated());
    setAvisos(getStoredAvisos());

    const handleAvisosUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AvisoItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setAvisos(customEvent.detail);
      } else {
        setAvisos(getStoredAvisos());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vila_cisper_admin_senha' || e.key === 'vila_cisper_admin_persisted') {
        setIsAdmin(isAdminAuthenticated());
      }
    };

    window.addEventListener('avisos-firebase-updated', handleAvisosUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('avisos-firebase-updated', handleAvisosUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Categorias únicas dos avisos
  const categorias = useMemo(() => {
    const set = new Set<string>();
    avisos.forEach((a) => set.add(a.categoria));
    return ['todos', ...Array.from(set)];
  }, [avisos]);

  // Lista filtrada
  const avisosFiltrados = useMemo(() => {
    return avisos.filter((a) => {
      if (filtroCategoria !== 'todos' && a.categoria !== filtroCategoria) {
        return false;
      }
      return true;
    });
  }, [avisos, filtroCategoria]);

  // Login como Responsável
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('Senha incorreta. Verifique e tente novamente.');
    }
  };

  // Logout do Responsável
  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
  };

  // Publicar aviso através do campo simples
  const handlePublicarAviso = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const conteudoLimpo = novoConteudo.trim();
    if (!conteudoLimpo) {
      setFeedback({ tipo: 'erro', texto: 'Por favor, escreva a mensagem do aviso antes de publicar.' });
      return;
    }

    const tituloFinal = novoTitulo.trim() || 'Aviso';

    addAviso({
      titulo: tituloFinal,
      conteudo: conteudoLimpo,
      categoria: novaCategoria,
      autor: 'Responsável',
    });

    setNovoTitulo('');
    setNovoConteudo('');
    setNovaCategoria('Geral');
    setIsFormAvisoAberto(false);
    setFeedback({
      tipo: 'sucesso',
      texto: 'Aviso publicado com sucesso! Ele aparecerá como pop-up ao abrir o aplicativo para os demais usuários.',
    });
    setAvisos(getStoredAvisos());

    setTimeout(() => {
      setFeedback(null);
    }, 6000);
  };

  // Salvar edição
  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !avisoEmEdicao) return;

    if (!avisoEmEdicao.conteudo.trim()) {
      alert('O conteúdo do aviso não pode ficar vazio.');
      return;
    }

    updateAviso({
      ...avisoEmEdicao,
      titulo: avisoEmEdicao.titulo.trim() || 'Aviso',
      conteudo: avisoEmEdicao.conteudo.trim(),
    });

    setAvisos(getStoredAvisos());
    setAvisoEmEdicao(null);
  };

  // Excluir aviso
  const handleExcluir = (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Deseja realmente excluir este aviso? Ele será removido definitivamente.')) {
      deleteAviso(id);
      setAvisos(getStoredAvisos());
    }
  };

  return (
    <div className="w-full space-y-6 pb-16 pt-1">
      {/* Cabeçalho do Quadro de Avisos */}
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-900 dark:text-white">
                AVISOS DA CONGREGAÇÃO
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Quadro de anúncios, lembretes e comunicados oficiais
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão + (Adicionar Novo Aviso) */}
            <button
              type="button"
              id="btn-adicionar-aviso-plus"
              onClick={() => {
                if (isAdmin) {
                  setIsFormAvisoAberto(!isFormAvisoAberto);
                } else {
                  setPasswordInput('');
                  setAuthError('');
                  setShowAuthModal(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 active:scale-[0.98] transition cursor-pointer"
              title="Adicionar Novo Aviso"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isFormAvisoAberto ? 'Fechar' : 'Novo Aviso'}</span>
            </button>

            {/* Botão de Modo Responsável */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Responsável
                </span>
                <button
                  type="button"
                  id="btn-sair-responsavel-avisos"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Sair do modo responsável"
                >
                  <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-login-responsavel-avisos"
                onClick={() => {
                  setPasswordInput('');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Responsável</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtro por Categoria */}
        {categorias.length > 2 && (
          <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="self-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Filtrar:
            </span>
            {categorias.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  filtroCategoria === cat
                    ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'todos' ? 'Todos os Avisos' : cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ------------------------------------------------------------- */}
      {/* CAMPO SIMPLES PARA O RESPONSÁVEL ESCREVER O AVISO E PUBLICAR  */}
      {/* (Aberto SOMENTE quando clicar no botão +)                     */}
      {/* ------------------------------------------------------------- */}
      {isAdmin && isFormAvisoAberto && (
        <div
          id="campo-simples-publicar-aviso"
          className="rounded-2xl border-2 border-blue-500/30 bg-blue-50/50 p-5 shadow-xs dark:border-blue-700/50 dark:bg-blue-950/20 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
              <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-extrabold tracking-tight sm:text-lg">
                Escrever e Publicar Novo Aviso
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsFormAvisoAberto(false)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Fechar formulário"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handlePublicarAviso} className="space-y-3">
            <div>
              <label htmlFor="input-titulo-aviso" className="sr-only">
                Título do aviso
              </label>
              <input
                id="input-titulo-aviso"
                type="text"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Título do comunicado (ex: Reunião Especial, Limpeza do Salão, etc.)"
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="textarea-conteudo-aviso" className="sr-only">
                Mensagem do aviso
              </label>
              <textarea
                id="textarea-conteudo-aviso"
                rows={3}
                value={novoConteudo}
                onChange={(e) => setNovoConteudo(e.target.value)}
                placeholder="Escreva a mensagem do aviso que aparecerá no pop-up..."
                required
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label htmlFor="select-categoria-aviso" className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Categoria:
                </label>
                <select
                  id="select-categoria-aviso"
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value as any)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="Geral">Geral</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Campo">Serviço de Campo</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Assembleia">Assembleia / Congresso</option>
                  <option value="Importante">Importante</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormAvisoAberto(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-publicar-aviso-simples"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 active:scale-[0.99] transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>Publicar Aviso</span>
                </button>
              </div>
            </div>
          </form>

          {feedback && (
            <div
              className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-bold ${
                feedback.tipo === 'sucesso'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedback.texto}</span>
            </div>
          )}
        </div>
      )}

      {/* Lista de Avisos */}
      {avisosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Bell className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-lg font-bold text-slate-800 dark:text-slate-200">
            Nenhum aviso no momento
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Não há anúncios registrados para esta categoria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {avisosFiltrados.map((aviso) => {
            const isImportante = aviso.categoria === 'Importante';
            return (
              <article
                key={aviso.id}
                id={`aviso-card-${aviso.id}`}
                className={`rounded-xl p-5 sm:p-6 transition-all ${
                  isImportante
                    ? 'bg-amber-50/70 border-l-4 border-l-amber-500 dark:bg-amber-950/30 dark:border-l-amber-400'
                    : 'bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    {aviso.fixado && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Pin className="h-3 w-3" />
                        Fixado
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Tag className="h-3 w-3 text-slate-400" />
                      {aviso.categoria}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{aviso.dataPublicacao}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {aviso.titulo}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {aviso.conteudo}
                  </p>
                </div>

                {aviso.autor && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs font-bold text-slate-500 dark:text-slate-400">
                    Fonte: {aviso.autor}
                  </div>
                )}

                {/* Ações restritas SOMENTE para o Responsável */}
                {isAdmin && (
                  <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      id={`btn-editar-aviso-${aviso.id}`}
                      onClick={() => setAvisoEmEdicao(aviso)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      id={`btn-excluir-aviso-${aviso.id}`}
                      onClick={() => handleExcluir(aviso.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE EDIÇÃO DE AVISO (SOMENTE RESPONSÁVEL)                 */}
      {/* ------------------------------------------------------------- */}
      {avisoEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Editar Aviso
              </h3>
              <button
                type="button"
                onClick={() => setAvisoEmEdicao(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="mt-4 space-y-4">
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
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

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
                  <option value="Campo">Serviço de Campo</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Assembleia">Assembleia / Congresso</option>
                  <option value="Importante">Importante</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Mensagem do Aviso
                </label>
                <textarea
                  rows={4}
                  value={avisoEmEdicao.conteudo}
                  onChange={(e) =>
                    setAvisoEmEdicao({ ...avisoEmEdicao, conteudo: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
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
                  className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE LOGIN DO RESPONSÁVEL                                  */}
      {/* ------------------------------------------------------------- */}
      {showAuthModal && (
        <div
          id="modal-login-responsavel-avisos"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Acesso do Responsável
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Avisos da Congregação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="input-senha-responsavel-avisos"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5"
                >
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    id="input-senha-responsavel-avisos"
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha..."
                    autoFocus
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-10 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                    {authError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirmar-senha-avisos"
                  className="rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
