import {
  Home,
  Calendar,
  Users,
  BookOpen,
  Speech,
  Compass,
  Sparkles,
  Map,
  Bell,
  Settings,
  Shield,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
} from 'lucide-react';
import { ScreenId } from './types';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: any;
  departamento?: string;
  badge?: number;
  description?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'programacao', label: 'Programação', icon: Calendar },
  { id: 'designacoes', label: 'Designações', icon: Users },
  { id: 'vida-e-ministerio', label: 'Vida e Ministério', icon: BookOpen },
  { id: 'discurso-publico', label: 'Discurso Público', icon: Speech },
  { id: 'servico-de-campo', label: 'Serviço de Campo', icon: Compass },
  { id: 'limpeza', label: 'Limpeza', icon: Sparkles },
  { id: 'territorios', label: 'Territórios', icon: Map },
  { id: 'avisos', label: 'Avisos', icon: Bell },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { id: 'administracao', label: 'Painel Admin', icon: Shield },
  { id: 'secretario', label: 'Secretário', icon: FileSpreadsheet },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { id: 'assistencia', label: 'Assistência', icon: UserCheck },
];
