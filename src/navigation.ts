import {
  Home,
  CalendarCheck,
  BookOpen,
  Speech,
  Sparkles,
  Users,
  Map,
  Compass,
  Lock,
} from 'lucide-react';
import { ScreenId } from './types';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: typeof Home;
  description?: string;
}

/**
 * Abas de Acesso Principais da Congregação Vila Cisper:
 * 1. Designação
 * 2. Vida e ministério
 * 3. Discurso público
 * 4. Grupo de Limpeza
 * 5. Assistência
 * 6. Território
 */
export const ABAS_PRINCIPAIS: NavItem[] = [
  {
    id: 'designacoes',
    label: 'Designação',
    icon: CalendarCheck,
  },
  {
    id: 'vida-e-ministerio',
    label: 'Vida e ministério',
    icon: BookOpen,
  },
  {
    id: 'discurso-publico',
    label: 'Discurso público',
    icon: Speech,
  },
  {
    id: 'limpeza',
    label: 'Grupo de Limpeza',
    icon: Sparkles,
  },
  {
    id: 'assistencia',
    label: 'Assistência',
    icon: Users,
  },
  {
    id: 'territorios',
    label: 'Território',
    icon: Map,
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
  },
  ...ABAS_PRINCIPAIS,
  {
    id: 'servico-de-campo',
    label: 'Serviço de Campo',
    icon: Compass,
  },
];

export const MENU_PRINCIPAL = NAV_ITEMS;

// Acesso restrito aos irmãos responsáveis
export const ADMIN_NAV_ITEM = {
  id: 'administracao' as ScreenId,
  label: 'Área dos Responsáveis',
  icon: Lock,
};
