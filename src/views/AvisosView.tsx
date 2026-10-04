import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { AvisoItem, getStoredAvisos, saveAvisoItem, deleteAvisoItem } from '../data/avisosStorage';

interface AvisosViewProps {
  isAdmin?: boolean;
}

export const AvisosView: React.FC<AvisosViewProps> = ({ isAdmin = false }) => {
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AvisoItem | null>(null);

  const carregarDados = () => {
    setAvisos(getStoredAvisos());
  };

  useEffect(() => {
    carregarDados();
    window.addEventListener('avisos-updated', carregarDados);
    return () => window.removeEventListener('avisos-updated', carregarDados);
  }, []);

  const handleOpenAdd = () => {
    setEditingItem({
      id: `aviso-${Date.now()}`,
      titulo: '',
      conteudo: '',
      data: new Date().toLocaleDateString('pt-BR'),
      importante: false,
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.titulo) return;
    saveAvisoItem(editingItem);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente remover este aviso?')) {
      deleteAvisoItem(id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Avisos da Congregação
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Comunicados oficiais aos publicadores, pioneiros e congregação
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Aviso</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={`rounded-2xl border p-5 shadow-xs transition-all ${
              aviso.importante
                ? 'border-amber-400 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                {aviso.importante && <AlertCircle className="h-4 w-4 text-amber-600" />}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {aviso.titulo}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {aviso.data}
                </span>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(aviso.id)}
                    className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {aviso.conteudo}
            </p>
          </div>
        ))}
      </div>

      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Novo Aviso</h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editingItem.titulo}
                  onChange={(e) => setEditingItem({ ...editingItem, titulo: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Conteúdo</label>
                <textarea
                  rows={4}
                  required
                  value={editingItem.conteudo}
                  onChange={(e) => setEditingItem({ ...editingItem, conteudo: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-importante"
                  checked={editingItem.importante}
                  onChange={(e) => setEditingItem({ ...editingItem, importante: e.target.checked })}
                />
                <label htmlFor="chk-importante" className="font-semibold cursor-pointer">
                  Marcar como aviso importante / destaque
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700"
                >
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
