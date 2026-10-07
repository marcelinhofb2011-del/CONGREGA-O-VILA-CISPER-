import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Map, Search, Shield, CheckCircle, Clock, Lock, UserCheck, LayoutGrid, ArrowLeft } from 'lucide-react';
import {
  Territorio,
  SolicitacaoTerritorio,
  TransferenciaTerritorio,
  HistoricoTerritorio,
  getStoredTerritorios,
  getStoredSolicitacoes,
  getStoredTransferencias,
  getStoredHistorico,
  saveTerritorio,
  isAdminAuthenticated,
  verifyAdminPassword,
  setAdminAuthenticated,
} from '../data/territoriosStorage';
import { AdminTerritoriosView } from '../components/territorios/AdminTerritoriosView';
import { PublicadorTerritoriosView } from '../components/territorios/PublicadorTerritoriosView';

interface TerritoriosViewProps {
  isAdmin: boolean;
  onAdminLoginSuccess?: () => void;
}

export const TerritoriosView: React.FC<TerritoriosViewProps> = ({
  isAdmin,
  onAdminLoginSuccess,
}) => {
  const [territorios, setTerritorios] = useState<Territorio[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoTerritorio[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaTerritorio[]>([]);
  const [historico, setHistorico] = useState<HistoricoTerritorio[]>([]);
  const [viewMode, setViewMode] = useState<'publicador' | 'todos' | 'admin'>(
    isAdmin ? 'admin' : 'publicador'
  );

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const carregarDados = useCallback(() => {
    setTerritorios(getStoredTerritorios());
    setSolicitacoes(getStoredSolicitacoes());
    setTransferencias(getStoredTransferencias());
    setHistorico(getStoredHistorico());
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (isAdmin) {
      setViewMode('admin');
    }
  }, [isAdmin]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setAuthError(false);
      setViewMode('admin');
      showNotification('Modo Responsável ativado com sucesso!');
      if (onAdminLoginSuccess) onAdminLoginSuccess();
    } else {
      setAuthError(true);
    }
  };

  const territoriosFiltrados = useMemo(() => {
    return territorios.filter((t) => {
      const st = (t.status || '').toLowerCase();
      if (filtroStatus !== 'todos' && !st.includes(filtroStatus.toLowerCase())) return false;
      if (filtroTexto.trim()) {
        const termo = filtroTexto.toLowerCase();
        const texto = `${t.numero} ${t.localidade || t.nome || ''} ${t.bairro || ''} ${t.designado_para || t.designadoPara || ''}`.toLowerCase();
        return texto.includes(termo);
      }
      return true;
    });
  }, [territorios, filtroStatus, filtroTexto]);

  const getStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('dispon')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle className="h-3 w-3" />
          Disponível
        </span>
      );
    }
    if (s.includes('conclu')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
          <CheckCircle className="h-3 w-3" />
          Concluído
        </span>
      );
    }
    if (s.includes('trabalho') || s.includes('desig')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <Clock className="h-3 w-3" />
          Designado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        <Clock className="h-3 w-3" />
        {status || 'Pendente'}
      </span>
    );
  };

  return (
    <div className="w-full space-y-6 pb-16 pt-1">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl dark:bg-white dark:text-slate-900 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Map className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Territórios da Congregação
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Cartões de território, cobertura de quadras e solicitações
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Modo de Exibição */}
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('publicador')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                viewMode === 'publicador'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Publicador
            </button>
            <button
              type="button"
              onClick={() => setViewMode('todos')}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                viewMode === 'todos'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Lista de Quadras
            </button>
            {(isAdmin || isAdminAuthenticated()) && (
              <button
                type="button"
                onClick={() => setViewMode('admin')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  viewMode === 'admin'
                    ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Painel Responsável
              </button>
            )}
          </div>

          {!isAdmin && !isAdminAuthenticated() && (
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-xs"
            >
              <Lock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Acesso Responsável</span>
            </button>
          )}
        </div>
      </div>

      {/* VISÃO 1: PAINEL DO RESPONSÁVEL (ADMIN) */}
      {viewMode === 'admin' && (
        <AdminTerritoriosView
          territorios={territorios}
          solicitacoes={solicitacoes}
          transferencias={transferencias}
          historico={historico}
          onDataChange={carregarDados}
          onNotification={showNotification}
        />
      )}

      {/* VISÃO 2: ÁREA DO PUBLICADOR */}
      {viewMode === 'publicador' && (
        <PublicadorTerritoriosView
          territorios={territorios}
          solicitacoes={solicitacoes}
          transferencias={transferencias}
          onDataChange={carregarDados}
          onNotification={showNotification}
        />
      )}

      {/* VISÃO 3: GRADE DE TODOS OS TERRITÓRIOS */}
      {viewMode === 'todos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar por número, bairro ou irmão designado..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="todos">Todos os Status</option>
              <option value="disponivel">Disponíveis</option>
              <option value="designado">Designados</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {territoriosFiltrados.map((ter) => (
              <div
                key={ter.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <span className="text-base font-black text-indigo-700 dark:text-indigo-400">
                    Território {ter.numero}
                  </span>
                  {getStatusBadge(ter.status)}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {ter.localidade || ter.nome}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ter.descricao || `${ter.bairro || 'Vila Cisper'} • ${ter.totalQuadras || 6} quadras`}
                  </p>
                </div>

                {(ter.designado_para || ter.designadoPara) && (
                  <div className="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Designado Para
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {ter.designado_para || ter.designadoPara} ({ter.data_ultima_designacao || ter.dataDesignacao || 'Em andamento'})
                    </span>
                  </div>
                )}

                {ter.mapa_url && (
                  <div className="pt-1">
                    <a
                      href={ter.mapa_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                      <Map className="h-3.5 w-3.5" />
                      Visualizar Mapa
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Senha de Acesso Responsável */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Modo Responsável por Territórios
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Digite a senha de responsável da Congregação Vila Cisper:
            </p>
            <form onSubmit={handleAdminAuthSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Senha de acesso (67744)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {authError && (
                <p className="text-xs text-red-500 font-semibold">Senha incorreta. Tente novamente.</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
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
