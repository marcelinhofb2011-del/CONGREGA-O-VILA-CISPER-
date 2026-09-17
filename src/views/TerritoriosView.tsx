import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import {
  Territorio,
  SolicitacaoTerritorio,
  TransferenciaTerritorio,
  HistoricoTerritorio,
  getStoredTerritorios,
  getStoredSolicitacoes,
  getStoredTransferencias,
  getStoredHistorico,
  verifyAdminPassword,
  isAdminAuthenticated,
  setAdminAuthenticated,
  updateAdminPassword,
} from '../data/territoriosStorage';
import { PublicadorTerritoriosView } from '../components/territorios/PublicadorTerritoriosView';
import { AdminTerritoriosView } from '../components/territorios/AdminTerritoriosView';

export const TerritoriosView: React.FC = () => {
  // Autenticação administrativa (Área do Responsável)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Estados dos dados compartilhados
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoTerritorio[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaTerritorio[]>([]);
  const [historico, setHistorico] = useState<HistoricoTerritorio[]>([]);

  // Notificação temporária
  const [notification, setNotification] = useState<string>('');

  // Modal para alteração de senha administrativa
  const [showTrocarSenhaModal, setShowTrocarSenhaModal] = useState<boolean>(false);
  const [senhaAtualInput, setSenhaAtualInput] = useState<string>('');
  const [novaSenhaInput, setNovaSenhaInput] = useState<string>('');
  const [trocaSenhaError, setTrocaSenhaError] = useState<string>('');

  // Carregar dados
  const recarregarDados = () => {
    setTerritorios(getStoredTerritorios());
    setSolicitacoes(getStoredSolicitacoes());
    setTransferencias(getStoredTransferencias());
    setHistorico(getStoredHistorico());
  };

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated());
    recarregarDados();

    const handleFirebaseUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Territorio[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setTerritorios(customEvent.detail);
      }
    };

    window.addEventListener('territorios-firebase-updated', handleFirebaseUpdate);
    return () => {
      window.removeEventListener('territorios-firebase-updated', handleFirebaseUpdate);
    };
  }, []);

  // Limpar notificação
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(''), 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Handlers de autenticação
  const handleOpenAuthModal = () => {
    setPasswordInput('');
    setAuthError('');
    setShowPasswordModal(true);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setAuthError('');
      setNotification('Área do Responsável autenticada com sucesso.');
    } else {
      setAuthError('Senha incorreta. Verifique com os irmãos responsáveis.');
    }
  };

  const handleAdminLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setNotification('Área do Responsável encerrada.');
  };

  const handleSalvarNovaSenha = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateAdminPassword(senhaAtualInput, novaSenhaInput);
    if (res.success) {
      setShowTrocarSenhaModal(false);
      setSenhaAtualInput('');
      setNovaSenhaInput('');
      setTrocaSenhaError('');
      setNotification('Senha alterada com sucesso!');
    } else {
      setTrocaSenhaError(res.error || 'Erro ao alterar a senha.');
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* CABEÇALHO DO MÓDULO TERRITÓRIOS */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                TERRITÓRIOS
              </h2>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                  <Lock className="h-3 w-3" />
                  Área do Responsável
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {isAdmin
                ? 'Painel do Responsável: Solicitações, Transferências, Cadastro de Territórios e Histórico.'
                : 'Solicite um território para realizar o trabalho de pregação.'}
            </p>
          </div>

          {/* Botão de autenticação / encerramento */}
          <div>
            {!isAdmin ? (
              <button
                id="btn-acesso-responsavel"
                type="button"
                onClick={handleOpenAuthModal}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                Acesso do Responsável
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTrocarSenhaModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                  Alterar Senha
                </button>
                <button
                  id="btn-sair-responsavel"
                  type="button"
                  onClick={handleAdminLogout}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Sair do Acesso Restrito
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notificação temporária */}
      {notification && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800/80 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 dark:text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RENDERIZAÇÃO: PÚBLICO (PUBLICADOR) OU RESPONSÁVEL (ADMIN) */}
      {/* ------------------------------------------------------------- */}
      {!isAdmin ? (
        <PublicadorTerritoriosView
          territorios={territorios}
          solicitacoes={solicitacoes}
          transferencias={transferencias}
          onDataChange={recarregarDados}
          onNotification={(msg) => setNotification(msg)}
        />
      ) : (
        <AdminTerritoriosView
          territorios={territorios}
          solicitacoes={solicitacoes}
          transferencias={transferencias}
          historico={historico}
          onDataChange={recarregarDados}
          onNotification={(msg) => setNotification(msg)}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE AUTENTICAÇÃO DO RESPONSÁVEL */}
      {/* ------------------------------------------------------------- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Acesso do Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                  setAuthError('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="input-senha-responsavel"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  SENHA DE ACESSO
                </label>
                <div className="relative mt-1">
                  <input
                    id="input-senha-responsavel"
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha"
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{authError}</p>
                )}
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Senha inicial de fábrica: <code>cisper2026</code> (pode ser alterada a qualquer momento após o acesso).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setAuthError('');
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirmar-login-responsavel"
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Acessar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE ALTERAÇÃO DE SENHA */}
      {/* ------------------------------------------------------------- */}
      {showTrocarSenhaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Alterar Senha do Responsável
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTrocarSenhaModal(false);
                  setSenhaAtualInput('');
                  setNovaSenhaInput('');
                  setTrocaSenhaError('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaSenha} className="mt-4 space-y-3.5">
              <div>
                <label
                  htmlFor="input-senha-atual"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  SENHA ATUAL
                </label>
                <input
                  id="input-senha-atual"
                  type="password"
                  required
                  value={senhaAtualInput}
                  onChange={(e) => setSenhaAtualInput(e.target.value)}
                  placeholder="Senha atual"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="input-nova-senha"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  NOVA SENHA (MÍNIMO 4 CARACTERES)
                </label>
                <input
                  id="input-nova-senha"
                  type="password"
                  required
                  value={novaSenhaInput}
                  onChange={(e) => setNovaSenhaInput(e.target.value)}
                  placeholder="Nova senha"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {trocaSenhaError && (
                <p className="text-xs text-red-600 dark:text-red-400">{trocaSenhaError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTrocarSenhaModal(false);
                    setSenhaAtualInput('');
                    setNovaSenhaInput('');
                    setTrocaSenhaError('');
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
