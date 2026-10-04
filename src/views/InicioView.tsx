import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  BookOpen,
  Speech,
  Compass,
  Sparkles,
  Map,
  Bell,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ScreenId } from '../types';
import { getStoredS140TSemanas, S140TSemana, identificarSemanaMaisProxima } from '../data/s140tStorage';
import { getStoredDesignacoes, DesignacaoItem } from '../data/designacoesStorage';
import { getHorariosReunioes, HorariosReunioesConfig } from '../data/horariosReunioesStorage';

const bannerImg = '/congregacao_banner.jpg';

interface InicioViewProps {
  onNavigate: (screen: ScreenId) => void;
  isAdmin: boolean;
  onNavigateToAdmin: () => void;
}

export const InicioView: React.FC<InicioViewProps> = ({ onNavigate }) => {
  const [horarios, setHorarios] = useState<HorariosReunioesConfig>(getHorariosReunioes());
  const [semanaMaisProxima, setSemanaMaisProxima] = useState<S140TSemana | null>(null);
  const [proximaDesignacao, setProximaDesignacao] = useState<{
    indicador: string;
    microfone: string;
    audioVideo: string;
    leitor: string;
  }>({
    indicador: 'Pedro / Danilo C.',
    microfone: 'Wilmar / Rafael',
    audioVideo: 'Guilherme / Dhiego',
    leitor: 'A definir',
  });

  const [dataAtualTexto, setDataAtualTexto] = useState<string>('Quinta-Feira, 1 De Outubro De 2026');
  const [reuniaoInfo, setReuniaoInfo] = useState<{
    tipo: string;
    dataTitulo: string;
    horario: string;
  }>({
    tipo: 'REUNIÃO DE MEIO DE SEMANA',
    dataTitulo: 'Quinta-feira, 1 de outubro',
    horario: '20:00',
  });

  useEffect(() => {
    // Atualiza horários configurados
    const config = getHorariosReunioes();
    setHorarios(config);

    // Formatação da data atual por extenso
    try {
      const hoje = new Date();
      const diasSemana = [
        'Domingo',
        'Segunda-Feira',
        'Terça-Feira',
        'Quarta-Feira',
        'Quinta-Feira',
        'Sexta-Feira',
        'Sábado',
      ];
      const meses = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
      ];
      const diaSem = diasSemana[hoje.getDay()];
      const diaNum = hoje.getDate();
      const mesNome = meses[hoje.getMonth()];
      const anoNum = hoje.getFullYear();
      setDataAtualTexto(`${diaSem}, ${diaNum} De ${mesNome} De ${anoNum}`);
    } catch {
      setDataAtualTexto('Quinta-Feira, 1 De Outubro De 2026');
    }

    // Carrega dados da Reunião Mais Próxima
    const semanas = getStoredS140TSemanas();
    const maisProxima = identificarSemanaMaisProxima(semanas);
    if (maisProxima) {
      setSemanaMaisProxima(maisProxima);
      const diaMeioSemana = config.meioDeSemana?.dia || 'Quinta-feira';
      const horaMeioSemana = config.meioDeSemana?.horario || '20:00';
      setReuniaoInfo({
        tipo: 'REUNIÃO DE MEIO DE SEMANA',
        dataTitulo: maisProxima.dataReuniao
          ? `${diaMeioSemana}, ${maisProxima.dataReuniao}`
          : `${diaMeioSemana} (${maisProxima.periodo})`,
        horario: horaMeioSemana,
      });
    }

    // Carrega Designações reais se houver
    const designacoes = getStoredDesignacoes();
    if (designacoes.length > 0) {
      const des = designacoes[0];
      const ind = [des.indicadorEntrada, des.indicadorAuditorio].filter(Boolean).join(' / ');
      const mic = [des.microfone1, des.microfone2].filter(Boolean).join(' / ');
      setProximaDesignacao({
        indicador: ind || 'Pedro / Danilo C.',
        microfone: mic || 'Wilmar / Rafael',
        audioVideo: des.audioVideo || 'Guilherme / Dhiego',
        leitor: des.leitorSentinela || 'A definir',
      });
    }
  }, []);

  const acessosPrincipais: { id: ScreenId; label: string; desc: string; icon: any; color: string }[] = [
    {
      id: 'programacao',
      label: 'Programação Geral',
      desc: 'Quadro completo e datas de reuniões',
      icon: Calendar,
      color: 'bg-blue-600',
    },
    {
      id: 'designacoes',
      label: 'Designações',
      desc: 'Indicadores, microfones, áudio e vídeo',
      icon: Users,
      color: 'bg-indigo-600',
    },
    {
      id: 'vida-e-ministerio',
      label: 'Vida e Ministério',
      desc: 'Apostila e programa semanal S-140-T',
      icon: BookOpen,
      color: 'bg-sky-600',
    },
    {
      id: 'servico-de-campo',
      label: 'Serviço de Campo',
      desc: `Saídas e grupos às ${horarios.saidaDeCampo?.horario || '08:00'}`,
      icon: Compass,
      color: 'bg-teal-600',
    },
    {
      id: 'discurso-publico',
      label: 'Discurso Público',
      desc: 'Temas bíblicos e oradores do fim de semana',
      icon: Speech,
      color: 'bg-amber-600',
    },
    {
      id: 'limpeza',
      label: 'Escala de Limpeza',
      desc: 'Grupos e manutenção do Salão do Reino',
      icon: Sparkles,
      color: 'bg-emerald-600',
    },
    {
      id: 'territorios',
      label: 'Territórios',
      desc: 'Cartões de quadras e solicitações de campo',
      icon: Map,
      color: 'bg-purple-600',
    },
    {
      id: 'avisos',
      label: 'Avisos da Congregação',
      desc: 'Comunicados oficiais e informativos',
      icon: Bell,
      color: 'bg-rose-600',
    },
  ];

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-6">
      {/* Título e Data da Congregação */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
          CONGREGAÇÃO: VILA CISPER
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 capitalize">
          {dataAtualTexto}
        </p>
      </div>

      {/* Banner Fotográfico */}
      <div className="overflow-hidden rounded-2xl shadow-xs border border-slate-200/60 dark:border-slate-800">
        <img
          src={bannerImg}
          alt="Congregação Vila Cisper"
          className="h-44 sm:h-52 w-full object-cover"
        />
      </div>

      {/* Seção: PRÓXIMA REUNIÃO */}
      <div className="space-y-2">
        <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-700 dark:text-slate-300 uppercase">
          PRÓXIMA REUNIÃO
        </h2>
        <div
          onClick={() => onNavigate('vida-e-ministerio')}
          className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            {reuniaoInfo.tipo}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {reuniaoInfo.dataTitulo}
          </h3>
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>{reuniaoInfo.horario}</span>
          </div>
        </div>
      </div>

      {/* Seção: PRÓXIMAS DESIGNAÇÕES */}
      <div className="space-y-2">
        <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-700 dark:text-slate-300 uppercase">
          PRÓXIMAS DESIGNAÇÕES
        </h2>
        <div
          onClick={() => onNavigate('designacoes')}
          className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div>
            <strong className="font-bold text-slate-900 dark:text-white">Indicador: </strong>
            <span>{proximaDesignacao.indicador}</span>
          </div>
          <div>
            <strong className="font-bold text-slate-900 dark:text-white">Microfone: </strong>
            <span>{proximaDesignacao.microfone}</span>
          </div>
          <div>
            <strong className="font-bold text-slate-900 dark:text-white">Áudio e vídeo: </strong>
            <span>{proximaDesignacao.audioVideo}</span>
          </div>
          <div>
            <strong className="font-bold text-slate-900 dark:text-white">Leitor: </strong>
            <span>{proximaDesignacao.leitor}</span>
          </div>
        </div>
      </div>

      {/* Seção: ACESSOS PRINCIPAIS */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-700 dark:text-slate-300 uppercase">
          ACESSOS PRINCIPAIS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {acessosPrincipais.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-3.5 text-left shadow-xs transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={`rounded-xl p-2.5 text-white ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {item.desc}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
