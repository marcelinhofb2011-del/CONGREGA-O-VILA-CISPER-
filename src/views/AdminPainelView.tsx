import React, { useState, useEffect } from 'react';
import {
  Shield,
  Settings,
  Users,
  Compass,
  BookOpen,
  Speech,
  Sparkles,
  Map,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
} from 'lucide-react';
import {
  HorariosReunioesConfig,
  getHorariosReunioes,
  saveHorariosReunioes,
  LISTA_DIAS_SEMANA,
  DiaSemanaReuniao,
} from '../data/horariosReunioesStorage';
import { ScreenId } from '../types';

interface AdminPainelViewProps {
  onNavigate: (screen: ScreenId) => void;
  onLogout: () => void;
}

type AdminTab =
  | 'horarios'
  | 'designacoes'
  | 's140t'
  | 'campo'
  | 'limpeza'
  | 'discursos'
  | 'territorios'
  | 'avisos';

export const AdminPainelView: React.FC<AdminPainelViewProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab | null>('horarios');
  const [horariosConfig, setHorariosConfig] = useState<HorariosReunioesConfig>(getHorariosReunioes());
  const [horariosFeedback, setHorariosFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);

  useEffect(() => {
    setHorariosConfig(getHorariosReunioes());
  }, []);

  const handleSalvarHorarios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !horariosConfig.meioDeSemana.horario.trim() ||
      !horariosConfig.fimDeSemana.horario.trim() ||
      !horariosConfig.saidaDeCampo?.horario?.trim()
    ) {
      setHorariosFeedback({
        tipo: 'erro',
        msg: 'Preencha todos os horários (Meio de Semana, Fim de Semana e Saída de Campo).',
      });
      return;
    }

    setSalvandoHorarios(true);
    setHorariosFeedback(null);

    const res = await saveHorariosReunioes(horariosConfig);
    setSalvandoHorarios(false);

    if (res.success) {
      setHorariosFeedback({
        tipo: 'sucesso',
        msg: 'Horários atualizados com sucesso! A alteração já reflete em todo o aplicativo.',
      });
      setTimeout(() => setHorariosFeedback(null), 4000);
    } else {
      setHorariosFeedback({
        tipo: 'erro',
        msg: res.error || 'Erro ao salvar os novos horários.',
      });
    }
  };

  const tabsConfig = [
    { id: 'horarios', label: 'Horários & Reuniões', icon: Settings, desc: 'Configuração geral de horários e saída de campo' },
    { id: 'designacoes', label: 'Designações', icon: Users, desc: 'Áudio, vídeo, indicadores e microfones', screen: 'designacoes' as ScreenId },
    { id: 's140t', label: 'Vida e Ministério', icon: BookOpen, desc: 'Reunião de Meio de Semana S-140-T', screen: 'vida-e-ministerio' as ScreenId },
    { id: 'campo', label: 'Serviço de Campo', icon: Compass, desc: 'Escala de saídas e pontos de encontro', screen: 'servico-de-campo' as ScreenId },
    { id: 'limpeza', label: 'Escala de Limpeza', icon: Sparkles, desc: 'Grupos e semanas de higienização', screen: 'limpeza' as ScreenId },
    { id: 'discursos', label: 'Discurso Público', icon: Speech, desc: 'Oradores visitantes e temas', screen: 'discurso-publico' as ScreenId },
    { id: 'territorios', label: 'Territórios', icon: Map, desc: 'Cartões e mapa das quadras', screen: 'territorios' as ScreenId },
    { id: 'avisos', label: 'Avisos da Congregação', icon: Bell, desc: 'Publicar e remover comunicados', screen: 'avisos' as ScreenId },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Painel do Responsável
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Gerencie as programações, escalas e configurações da Congregação Vila Cisper (67744)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('inicio')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Quadro</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
          >
            Sair do Modo Responsável
          </button>
        </div>
      </div>

      {/* Menu de Abas da Administração */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {tabsConfig.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.screen) {
                  onNavigate(t.screen);
                } else {
                  setActiveTab(t.id as AdminTab);
                }
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo da Aba: Horários & Reuniões (CONFIGURAÇÃO) */}
      {activeTab === 'horarios' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Configuração dos Horários da Congregação
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Altere os horários oficiais das reuniões e saídas de campo. Os novos horários refletirão automaticamente em todo o quadro e para todos os publicadores.
            </p>
          </div>

          {horariosFeedback && (
            <div
              className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                horariosFeedback.tipo === 'sucesso'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {horariosFeedback.tipo === 'sucesso' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{horariosFeedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleSalvarHorarios} className="space-y-6">
            {/* Seção 1: Meio de Semana */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                Reunião de Meio de Semana
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dia da Semana
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
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {LISTA_DIAS_SEMANA.map((dia) => (
                      <option key={dia} value={dia}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="20:00"
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
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Fim de Semana */}
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                Reunião de Fim de Semana
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dia da Semana
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
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {LISTA_DIAS_SEMANA.map((dia) => (
                      <option key={dia} value={dia}>
                        {dia}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="18:00"
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
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: SAÍDA DE CAMPO (Requisito Explícito do Usuário) */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 block">
                  SAÍDA DE CAMPO
                </span>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                  Sábados e Domingos
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Horário Oficial:
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="text"
                    id="input-horario-saida-campo"
                    required
                    placeholder="08:00"
                    value={horariosConfig.saidaDeCampo?.horario || '08:00'}
                    onChange={(e) =>
                      setHorariosConfig({
                        ...horariosConfig,
                        saidaDeCampo: {
                          horario: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-teal-300 bg-white p-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:outline-none dark:border-teal-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="text-[11px] text-teal-700/80 dark:text-teal-400/80 mt-1">
                  Ex: [08:00]. Salva no banco de dados e atualiza todas as telas do aplicativo.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                id="btn-salvar-horarios"
                disabled={salvandoHorarios}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{salvandoHorarios ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
