export type ScreenId =
  | 'inicio'
  | 'programacao'
  | 'designacoes'
  | 'servico-de-campo'
  | 'limpeza'
  | 'territorios'
  | 'avisos'
  | 'administracao'
  | 'vida-e-ministerio'
  | 'discurso-publico'
  | 'secretario'
  | 'relatorios'
  | 'assistencia'
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
