import {
  Home,
  Mic,
  BookOpen,
  Sparkles,
  Compass,
  Speech,
  FileSpreadsheet,
  BarChart3,
  Users2,
  Map,
  Settings,
} from 'lucide-react';
import { NavItem, ScreenId } from './types';

export const NAV_ITEMS: {
  id: ScreenId;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Home;
  category: 'principal' | 'reunioes' | 'atividades' | 'administracao';
}[] = [
  {
    id: 'inicio',
    label: 'Início',
    shortLabel: 'Início',
    description: 'Painel principal da congregação',
    icon: Home,
    category: 'principal',
  },
  {
    id: 'designacoes',
    label: 'Designações',
    shortLabel: 'Designações',
    description: 'Microfone, Indicador, Áudio e Vídeo',
    icon: Mic,
    category: 'reunioes',
  },
  {
    id: 'vida-e-ministerio',
    label: 'Vida e Ministério',
    shortLabel: 'Vida e Min.',
    description: 'Programação da reunião de meio de semana',
    icon: BookOpen,
    category: 'reunioes',
  },
  {
    id: 'discurso-publico',
    label: 'Discurso Público',
    shortLabel: 'Discurso',
    description: 'Programação de oradores e temas',
    icon: Speech,
    category: 'reunioes',
  },
  {
    id: 'assistencia',
    label: 'Assistência',
    shortLabel: 'Assistência',
    description: 'Registros de assistência presencial e vídeo',
    icon: Users2,
    category: 'reunioes',
  },
  {
    id: 'limpeza',
    label: 'Limpeza',
    shortLabel: 'Limpeza',
    description: 'Designações e rodízio de grupos',
    icon: Sparkles,
    category: 'atividades',
  },
  {
    id: 'servico-de-campo',
    label: 'Serviço de Campo',
    shortLabel: 'Campo',
    description: 'Arranjos de pregação e modalidades',
    icon: Compass,
    category: 'atividades',
  },
  {
    id: 'territorios',
    label: 'Territórios',
    shortLabel: 'Territórios',
    description: 'Solicitação e gerenciamento de territórios',
    icon: Map,
    category: 'atividades',
  },
  {
    id: 'secretario',
    label: 'Secretário',
    shortLabel: 'Secretário',
    description: 'Funções administrativas do secretário',
    icon: FileSpreadsheet,
    category: 'administracao',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    shortLabel: 'Relatórios',
    description: 'Visualização dos relatórios da congregação',
    icon: BarChart3,
    category: 'administracao',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    shortLabel: 'Config.',
    description: 'Aparência, tamanho de texto e sistema',
    icon: Settings,
    category: 'administracao',
  },
];
