export interface VidaEMinisterioParte {
  id: string;
  data: string; // Formato brasileiro DD/MM/AAAA
  parte: string; // Nome da parte
  designado: string; // Nome do irmão designado
  observacoes?: string; // Observações se necessário
  horario?: string; // Horário se necessário
  criadoEm?: string; // Histórico
  atualizadoEm?: string; // Histórico
}

const STORAGE_KEY = 'vila_cisper_vida_e_ministerio';

export function getStoredPartes(): VidaEMinisterioParte[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredParte(item: VidaEMinisterioParte): VidaEMinisterioParte[] {
  const current = getStoredPartes();
  const existingIndex = current.findIndex((p) => p.id === item.id);
  const now = new Date().toISOString();

  let updated: VidaEMinisterioParte[];
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = {
      ...item,
      atualizadoEm: now,
    };
  } else {
    updated = [
      ...current,
      {
        ...item,
        criadoEm: now,
        atualizadoEm: now,
      },
    ];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteStoredParte(id: string): VidaEMinisterioParte[] {
  const current = getStoredPartes();
  const updated = current.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
