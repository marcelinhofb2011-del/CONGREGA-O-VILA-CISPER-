import {
  Home,
  CalendarCheck,
  BookOpen,
  Speech,
  Compass,
  Users,
  Sparkles,
  Map,
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
 * Menu Principal da Congregação Vila Cisper
 * Acessos organizados de forma simples, direta e sem abreviações:
 * 1. Início
 * 2. Designações
 * 3. Vida e Ministério
 * 4. Discurso Público
 * 5. Serviço de Campo
 * 6. Assistência
 * 7. Grupo de Limpeza
 * 8. Território
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
  },
  {
    id: 'designacoes',
    label: 'Designações',
    icon: CalendarCheck,
  },
  {
    id: 'vida-e-ministerio',
    label: 'Vida e Ministério',
    icon: BookOpen,
  },
  {
    id: 'discurso-publico',
    label: 'Discurso Público',
    icon: Speech,
  },
  {
    id: 'servico-de-campo',
    label: 'Serviço de Campo',
    icon: Compass,
  },
  {
    id: 'assistencia',
    label: 'Assistência',
    icon: Users,
  },
  {
    id: 'limpeza',
    label: 'Grupo de Limpeza',
    icon: Sparkles,
  },
  {
    id: 'territorios',
    label: 'Território',
    icon: Map,
  },
];

export const MENU_PRINCIPAL = NAV_ITEMS;

// Acesso restrito aos irmãos responsáveis
export const ADMIN_NAV_ITEM = {
  id: 'administracao' as ScreenId,
  label: 'Área dos Responsáveis',
  icon: Lock,
};
