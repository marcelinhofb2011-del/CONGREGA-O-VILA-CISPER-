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

const MESES_MAP: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  'março': 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

export function parseMesAno(mesStr?: string): { month: number; year: number } {
  const currentYear = new Date().getFullYear();
  if (!mesStr) return { month: 0, year: currentYear };

  const clean = mesStr.toLowerCase();
  let month = 0;
  for (const [key, val] of Object.entries(MESES_MAP)) {
    if (clean.includes(key)) {
      month = val;
      break;
    }
  }

  const yearMatch = mesStr.match(/\d{4}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : currentYear;

  return { month, year };
}

// Analisa strings de datas como "Domingo 04/01", "20/09", "15/20" e retorna Date com hora 23:59:59
export function parseItemDate(diaOrDataStr: string, mesStr?: string): Date | null {
  if (!diaOrDataStr) return null;
  const currentYear = new Date().getFullYear();

  // Caso 1: Formato com barra contendo dia e mês (ex: "Domingo 20/09" ou "20/09/2026")
  const ddmmyyyyMatch = diaOrDataStr.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    let year = ddmmyyyyMatch[3] ? parseInt(ddmmyyyyMatch[3], 10) : undefined;
    if (!year && mesStr) {
      const ym = mesStr.match(/\d{4}/);
      if (ym) year = parseInt(ym[0], 10);
    }
    return new Date(year || currentYear, month, day, 23, 59, 59);
  }

  // Caso 2: Contém apenas dias numéricos (ex: "15/20" ou "4" em escalas de limpeza)
  const nums = diaOrDataStr.match(/\d+/g);
  if (nums && nums.length > 0 && mesStr) {
    // Pega o último dia do período para saber até quando a atividade é válida
    const day = parseInt(nums[nums.length - 1], 10);
    const { month, year } = parseMesAno(mesStr);
    return new Date(year, month, day, 23, 59, 59);
  }

  return null;
}
