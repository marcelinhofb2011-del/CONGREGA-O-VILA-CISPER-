import React, { useState, useEffect } from 'react';
import {
  Type,
  Sun,
  Moon,
  Download,
  Smartphone,
  Check,
  Laptop,
  FileSpreadsheet,
  Upload,
  Database,
  ArrowDownToLine,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { TextSize, ThemeMode } from '../types';
import { usePWA } from '../hooks/usePWA';
import { BulkImportExportModal } from '../components/BulkImportExportModal';
import { getStoredEscalaDesignacoes } from '../data/designacoesStorage';
import { getStoredCampoFds } from '../data/campoStorage';
import { getStoredDiscursosBiblicos } from '../data/discursoStorage';
import { getStoredLimpezaEscala } from '../data/limpezaStorage';
import {
  isAdminAuthenticated,
  setAdminAuthenticated,
  verifyAdminPassword,
} from '../data/territoriosStorage';
import {
  gerarModeloCsvExemplo,
  generateCsv,
  downloadBrowserFile,
} from '../utils/csvSpreadsheetUtils';

interface ConfiguracoesViewProps {
  textSize: TextSize;
  onChangeTextSize: (size: TextSize) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const ConfiguracoesView: React.FC<ConfiguracoesViewProps> = ({
  textSize,
  onChangeTextSize,
  theme,
  onToggleTheme,
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [modalAberto, setModalAberto] = useState<'designacoes' | 'campo' | 'discurso' | 'limpeza' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminAuthenticated());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated());
  }, []);

  const handleOpenAuth = () => {
    setPasswordInput('');
    setAuthError('');
    setShowPasswordText(false);
    setShowAuthModal(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPassword(passwordInput)) {
      setAdminAuthenticated(true);
      setIsAdmin(true);
      setShowAuthModal(false);
      setPasswordInput('');
      setFeedbackMsg('Acesso do responsável ativado. Central de planilhas liberada.');
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAdmin(false);
    setFeedbackMsg('Sessão do responsável encerrada. Modo de consulta ativo.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleDownloadFullBackupJson = () => {
    const backup = {
      versao: '2026.1',
      congregacao: 'Vila Cisper (67744)',
      data_exportacao: new Date().toISOString(),
      designacoes: getStoredEscalaDesignacoes(),
      campo: getStoredCampoFds(),
      discursos: getStoredDiscursosBiblicos(),
      limpeza: getStoredLimpezaEscala(),
    };
    downloadBrowserFile(
      JSON.stringify(backup, null, 2),
      `Backup_Geral_Vila_Cisper_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
    setFeedbackMsg('Backup geral completo (JSON) baixado com sucesso!');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleDownloadModeloCsv = (modulo: 'designacoes' | 'campo' | 'discurso' | 'limpeza') => {
    const csv = gerarModeloCsvExemplo(modulo);
    const nomes = {
      designacoes: 'Modelo_Planilha_Designacoes_Som_Video_Indicadores',
      campo: 'Modelo_Planilha_Servico_Campo',
      discurso: 'Modelo_Planilha_Discursos_Publicos',
      limpeza: 'Modelo_Planilha_Limpeza_Salao',
    };
    downloadBrowserFile(csv, `${nomes[modulo]}.csv`, 'text/csv;charset=utf-8;');
    setFeedbackMsg(`Modelo de planilha (${modulo}) baixado para Excel / Google Sheets!`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Configurações e Gestão de Planilhas
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Ajustes de interface, instalação do aplicativo e central de importação/exportação em lote.
        </p>
      </div>

      {feedbackMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Central de Importação / Exportação e Backup (Exclusivo para Responsável Autenticado) */}
      {isAdmin ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                    Central de Importação & Exportação em Lote (Excel / Sheets)
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 dark:bg-emerald-900/80 dark:text-emerald-200">
                    <Unlock className="h-3 w-3" />
                    Responsável Ativo
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Lance meses ou anos inteiros de uma só vez colando do Excel ou importando arquivos CSV.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleDownloadFullBackupJson}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-50 dark:border-emerald-700 dark:bg-slate-800 dark:text-emerald-300 sm:self-auto"
                title="Exportar todos os 4 módulos em um único arquivo de backup JSON"
              >
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                <span>Backup Geral (JSON)</span>
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Encerrar sessão do responsável"
              >
                Sair
              </button>
            </div>
          </div>

        {/* Grade dos 4 Módulos */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Designações */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400">
                1. Som, Vídeo & Indicadores
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Meio de semana e fim de semana.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalAberto('designacoes')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar / Gerenciar</span>
              </button>
              <button
                onClick={() => handleDownloadModeloCsv('designacoes')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ArrowDownToLine className="h-3 w-3" />
                <span>Baixar Modelo CSV</span>
              </button>
            </div>
          </div>

          {/* 2. Campo */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-xs font-bold text-sky-700 dark:text-sky-400">
                2. Serviço de Campo
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Dirigentes de sábado e domingo.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalAberto('campo')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar / Gerenciar</span>
              </button>
              <button
                onClick={() => handleDownloadModeloCsv('campo')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ArrowDownToLine className="h-3 w-3" />
                <span>Baixar Modelo CSV</span>
              </button>
            </div>
          </div>

          {/* 3. Discursos */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
                3. Discurso Bíblico
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Temas, oradores, presidentes e leitores.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalAberto('discurso')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar / Gerenciar</span>
              </button>
              <button
                onClick={() => handleDownloadModeloCsv('discurso')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ArrowDownToLine className="h-3 w-3" />
                <span>Baixar Modelo CSV</span>
              </button>
            </div>
          </div>

          {/* 4. Limpeza */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                4. Limpeza do Salão
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Grupos, datas e dirigentes semanais.
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalAberto('limpeza')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar / Gerenciar</span>
              </button>
              <button
                onClick={() => handleDownloadModeloCsv('limpeza')}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ArrowDownToLine className="h-3 w-3" />
                <span>Baixar Modelo CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Gestão e Backup de Planilhas em Lote
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesso restrito ao irmão responsável para importar escalas ou gerar backups da congregação.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAuth}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:self-auto"
          >
            <Lock className="h-3.5 w-3.5 text-slate-500" />
            <span>Acesso do Responsável</span>
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {/* Tamanho do Texto */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Tamanho do Texto
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste a escala tipográfica para melhor legibilidade no celular ou monitor.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                id="btn-font-sm"
                onClick={() => onChangeTextSize('sm')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  textSize === 'sm'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Pequeno
              </button>
              <button
                type="button"
                id="btn-font-md"
                onClick={() => onChangeTextSize('md')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  textSize === 'md'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Padrão
              </button>
              <button
                type="button"
                id="btn-font-lg"
                onClick={() => onChangeTextSize('lg')}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  textSize === 'lg'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Grande
              </button>
            </div>
          </div>
        </div>

        {/* Aparência (Claro / Escuro) */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-slate-400" />
                ) : (
                  <Sun className="h-4 w-4 text-slate-600" />
                )}
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Aparência Visual
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alternar entre tema claro e tema escuro de alto contraste.
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                id="btn-theme-light"
                onClick={() => theme === 'dark' && onToggleTheme()}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Claro
              </button>
              <button
                type="button"
                id="btn-theme-dark"
                onClick={() => theme === 'light' && onToggleTheme()}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-100 text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Escuro
              </button>
            </div>
          </div>
        </div>

        {/* Instalação PWA */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Aplicativo PWA (Instalação)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instale o aplicativo diretamente na tela inicial do celular ou tablet para acesso rápido offline.
              </p>
            </div>

            <div>
              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Instalado
                </span>
              ) : isInstallable ? (
                <button
                  type="button"
                  id="btn-install-pwa"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Download className="h-3.5 w-3.5" />
                  Instalar App
                </button>
              ) : isIOS ? (
                <button
                  type="button"
                  onClick={() => setShowIOSModal(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Instalar no iOS
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Laptop className="h-3.5 w-3.5" />
                  Pronto no Navegador
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="p-5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <div>Identificação: <strong>CONGREGAÇÃO VILA CISPER (67744)</strong></div>
          <div>Formato padrão de datas: <strong>DD/MM/AAAA</strong></div>
          <div>Interface: <strong>Português do Brasil (pt-BR)</strong></div>
          <div>Suporte a Planilhas: <strong>Microsoft Excel, Google Planilhas, LibreOffice Calc (.csv / .tsv)</strong></div>
        </div>
      </div>

      {/* Modal instrucional para iOS se aberto */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Como instalar no iPhone ou iPad
            </h4>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              1. Toque no botão <strong>Compartilhar</strong> no menu inferior do Safari.<br />
              2. Role a lista para baixo e selecione <strong>Adicionar à Tela de Início</strong>.<br />
              3. Toque em <strong>Adicionar</strong> no canto superior direito.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-md bg-slate-900 py-2 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modais de Importação / Exportação se abertos */}
      {modalAberto === 'designacoes' && (
        <BulkImportExportModal
          isOpen={true}
          onClose={() => setModalAberto(null)}
          modulo="designacoes"
          tituloModulo="Indicadores, Microfones, Áudio e Vídeo"
          dadosAtuais={getStoredEscalaDesignacoes()}
          isAdmin={isAdmin}
          onImportadoComSucesso={(qtd) => {
            setFeedbackMsg(`${qtd} escalas de Som/Vídeo/Indicadores importadas com sucesso!`);
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />
      )}

      {modalAberto === 'campo' && (
        <BulkImportExportModal
          isOpen={true}
          onClose={() => setModalAberto(null)}
          modulo="campo"
          tituloModulo="Serviço de Campo e Dirigentes"
          dadosAtuais={getStoredCampoFds()}
          isAdmin={isAdmin}
          onImportadoComSucesso={(qtd) => {
            setFeedbackMsg(`${qtd} datas de dirigentes de campo importadas com sucesso!`);
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />
      )}

      {modalAberto === 'discurso' && (
        <BulkImportExportModal
          isOpen={true}
          onClose={() => setModalAberto(null)}
          modulo="discurso"
          tituloModulo="Discurso Bíblico e Reunião Pública"
          dadosAtuais={getStoredDiscursosBiblicos()}
          isAdmin={isAdmin}
          onImportadoComSucesso={(qtd) => {
            setFeedbackMsg(`${qtd} discursos bíblicos importados com sucesso!`);
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />
      )}

      {modalAberto === 'limpeza' && (
        <BulkImportExportModal
          isOpen={true}
          onClose={() => setModalAberto(null)}
          modulo="limpeza"
          tituloModulo="Limpeza do Salão do Reino"
          dadosAtuais={getStoredLimpezaEscala()}
          isAdmin={isAdmin}
          onImportadoComSucesso={(qtd) => {
            setFeedbackMsg(`${qtd} escalas de limpeza importadas com sucesso!`);
            setTimeout(() => setFeedbackMsg(null), 4000);
          }}
        />
      )}

      {/* Modal de Senha do Responsável */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Acesso do Responsável
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  setPasswordInput('');
                  setAuthError('');
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLogin} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="input-senha-responsavel-config"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                >
                  Senha de Acesso
                </label>
                <div className="relative mt-1">
                  <input
                    id="input-senha-responsavel-config"
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha"
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                    {authError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setPasswordInput('');
                    setAuthError('');
                  }}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
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
