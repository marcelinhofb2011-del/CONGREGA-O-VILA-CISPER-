// Utilitários de data para o padrão brasileiro DD/MM/AAAA e semanas da congregação

export function formatDateBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function parseDateBR(str: string): Date | null {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day, 12, 0, 0);
}

// Retorna a segunda-feira da semana de uma data de referência
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Retorna o domingo da semana de uma data de referência
export function getSundayOfWeek(monday: Date): Date {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

// Retorna texto do período da semana: ex: "09/03/2026 a 15/03/2026"
export function formatWeekRange(monday: Date): string {
  const sunday = getSundayOfWeek(monday);
  return `${formatDateBR(monday)} a ${formatDateBR(sunday)}`;
}

export function isDateInWeek(dateStr: string, monday: Date): boolean {
  const d = parseDateBR(dateStr);
  if (!d) return false;
  const start = new Date(monday);
  start.setHours(0, 0, 0, 0);
  const end = getSundayOfWeek(monday);
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

export function getDiaSemanaExtenso(dateStr: string): string {
  const d = parseDateBR(dateStr);
  if (!d) return '';
  const dias = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  return dias[d.getDay()] || '';
}

// Converte YYYY-MM-DD (de input type="date") para DD/MM/AAAA
export function inputDateToBR(inputVal: string): string {
  if (!inputVal) return '';
  const [year, month, day] = inputVal.split('-');
  return `${day}/${month}/${year}`;
}

// Converte DD/MM/AAAA para YYYY-MM-DD (para input type="date")
export function brToInputDate(brVal: string): string {
  if (!brVal) return '';
  const [day, month, year] = brVal.split('/');
  return `${year}-${month}-${day}`;
}
