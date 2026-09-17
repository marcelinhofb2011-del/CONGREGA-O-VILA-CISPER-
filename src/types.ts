export type ScreenId =
  | 'inicio'
  | 'designacoes'
  | 'vida-e-ministerio'
  | 'limpeza'
  | 'servico-de-campo'
  | 'discurso-publico'
  | 'secretario'
  | 'relatorios'
  | 'assistencia'
  | 'territorios'
  | 'configuracoes';

export type TextSize = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark';

export interface NavItem {
  id: ScreenId;
  label: string;
  shortLabel?: string;
  iconName: string;
  category: 'principal' | 'reunioes' | 'atividades' | 'administracao';
}
