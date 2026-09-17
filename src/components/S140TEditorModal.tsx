import React, { useState } from 'react';
import {
  S140TSemana,
  S140TMinisterioParte,
  S140TVidaCristaParte,
} from '../data/s140tStorage';
import { IRMAOS_CONGREGACAO } from '../data/irmaos';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

interface S140TEditorModalProps {
  semana: S140TSemana | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (semana: S140TSemana) => void;
}

export const S140TEditorModal: React.FC<S140TEditorModalProps> = ({
  semana,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'geral' | 'tesouros' | 'ministerio' | 'vida-crista'>('geral');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Form state
  const [periodo, setPeriodo] = useState(semana?.periodo || '');
  const [leituraBiblica, setLeituraBiblica] = useState(semana?.leituraBiblica || '');
  const [ehVisita, setEhVisita] = useState(Boolean(semana?.ehVisita));
  const [dataReferencia, setDataReferencia] = useState(semana?.dataReferencia || new Date().toISOString().slice(0, 10));
  const [presidente, setPresidente] = useState(semana?.presidente || '');

  // Introdução
  const [canticoInicial, setCanticoInicial] = useState<string | number>(semana?.canticoInicial || '');
  const [oracaoInicial, setOracaoInicial] = useState(semana?.oracaoInicial || '');
  const [comentariosIniciaisMin, setComentariosIniciaisMin] = useState<number>(semana?.comentariosIniciaisMin || 1);

  // Tesouros
  const [discursoTesourosTitulo, setDiscursoTesourosTitulo] = useState(semana?.discursoTesourosTitulo || '');
  const [discursoTesourosTempoMin, setDiscursoTesourosTempoMin] = useState<number>(semana?.discursoTesourosTempoMin || 10);
  const [discursoTesourosIrmao, setDiscursoTesourosIrmao] = useState(semana?.discursoTesourosIrmao || '');
  const [joiasEspirituaisIrmao, setJoiasEspirituaisIrmao] = useState(semana?.joiasEspirituaisIrmao || '');
  const [leituraBibliaIrmao, setLeituraBibliaIrmao] = useState(semana?.leituraBibliaIrmao || '');

  // Ministério
  const [partesMinisterio, setPartesMinisterio] = useState<S140TMinisterioParte[]>(
    semana?.partesMinisterio || [
      { id: '1', numero: 4, titulo: 'Iniciando conversas', tempoMin: 3, designado: '', ajudante: '' },
      { id: '2', numero: 5, titulo: 'Cultivando o interesse', tempoMin: 4, designado: '', ajudante: '' },
      { id: '3', numero: 6, titulo: 'Explicando suas crenças', tempoMin: 5, designado: '', ajudante: '' },
    ]
  );

  // Vida Cristã
  const [canticoMeio, setCanticoMeio] = useState<string | number>(semana?.canticoMeio || '');
  const [partesVidaCrista, setPartesVidaCrista] = useState<S140TVidaCristaParte[]>(
    semana?.partesVidaCrista || [
      { id: '1', numero: 7, titulo: 'Necessidades locais', tempoMin: 15, designado: '' },
    ]
  );
  const [estudoBiblicoDirigente, setEstudoBiblicoDirigente] = useState(semana?.estudoBiblicoDirigente || '');
  const [estudoBiblicoLeitor, setEstudoBiblicoLeitor] = useState(semana?.estudoBiblicoLeitor || '');
  const [canticoFinal, setCanticoFinal] = useState<string | number>(semana?.canticoFinal || '');
  const [oracaoFinal, setOracaoFinal] = useState(semana?.oracaoFinal || '');

  const handleAddMinisterioParte = () => {
    const nextNum = partesMinisterio.length > 0 ? (partesMinisterio[partesMinisterio.length - 1].numero || 3) + 1 : 4;
    setPartesMinisterio([
      ...partesMinisterio,
      {
        id: String(Date.now()),
        numero: nextNum,
        titulo: 'Iniciando conversas',
        tempoMin: 3,
        designado: '',
        ajudante: '',
      },
    ]);
  };

  const handleRemoveMinisterioParte = (id: string) => {
    setPartesMinisterio(partesMinisterio.filter((p) => p.id !== id));
  };

  const handleUpdateMinisterioParte = (id: string, field: keyof S140TMinisterioParte, val: any) => {
    setPartesMinisterio(
      partesMinisterio.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleAddVidaCristaParte = () => {
    const nextNum = partesVidaCrista.length > 0 ? (partesVidaCrista[partesVidaCrista.length - 1].numero || 6) + 1 : 7;
    setPartesVidaCrista([
      ...partesVidaCrista,
      {
        id: String(Date.now()),
        numero: nextNum,
        titulo: 'Parte temática',
        tempoMin: 15,
        designado: '',
      },
    ]);
  };

  const handleRemoveVidaCristaParte = (id: string) => {
    setPartesVidaCrista(partesVidaCrista.filter((p) => p.id !== id));
  };

  const handleUpdateVidaCristaParte = (id: string, field: keyof S140TVidaCristaParte, val: any) => {
    setPartesVidaCrista(
      partesVidaCrista.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!periodo.trim()) {
      setErrorMsg('Informe o período da semana (ex: 7-13 DE SETEMBRO).');
      setActiveTab('geral');
      return;
    }
    if (!leituraBiblica.trim()) {
      setErrorMsg('Informe a leitura bíblica da semana (ex: JEREMIAS 32-33).');
      setActiveTab('geral');
      return;
    }
    if (!presidente.trim()) {
      setErrorMsg('Informe o Presidente da reunião.');
      setActiveTab('geral');
      return;
    }

    const item: S140TSemana = {
      id: semana?.id || `sem-${Date.now()}`,
      periodo: periodo.trim().toUpperCase(),
      leituraBiblica: leituraBiblica.trim().toUpperCase(),
      ehVisita,
      dataReferencia,
      presidente: presidente.trim(),
      canticoInicial: canticoInicial || 1,
      oracaoInicial: oracaoInicial.trim(),
      comentariosIniciaisMin: Number(comentariosIniciaisMin) || 1,

      tesourosSalao: 'Salão principal',
      discursoTesourosTitulo: discursoTesourosTitulo.trim(),
      discursoTesourosTempoMin: Number(discursoTesourosTempoMin) || 10,
      discursoTesourosIrmao: discursoTesourosIrmao.trim(),
      joiasEspirituaisIrmao: joiasEspirituaisIrmao.trim(),
      joiasEspirituaisTempoMin: 10,
      leituraBibliaIrmao: leituraBibliaIrmao.trim(),
      leituraBibliaTempoMin: 4,

      ministerioSalao: 'Salão principal',
      partesMinisterio: partesMinisterio.map((p) => ({
        ...p,
        titulo: p.titulo.trim(),
        designado: p.designado.trim(),
        ajudante: p.ajudante?.trim() || undefined,
      })),

      canticoMeio: canticoMeio || 100,
      partesVidaCrista: partesVidaCrista.map((p) => ({
        ...p,
        titulo: p.titulo.trim(),
        designado: p.designado.trim(),
      })),

      estudoBiblicoTempoMin: 30,
      estudoBiblicoDirigente: estudoBiblicoDirigente.trim() || undefined,
      estudoBiblicoLeitor: estudoBiblicoLeitor.trim() || undefined,

      comentariosFinaisMin: 3,
      canticoFinal: canticoFinal || 140,
      oracaoFinal: oracaoFinal.trim(),
    };

    onSave(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {semana ? 'Editar Programação da Reunião' : 'Nova Semana na Programação'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formulário oficial S-140-T &bull; Congregação Vila Cisper
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'geral'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            1. Semana & Introdução
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tesouros')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'tesouros'
                ? 'border-slate-700 text-slate-900 dark:border-slate-400 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            2. Tesouros
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ministerio')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'ministerio'
                ? 'border-amber-600 text-amber-900 dark:border-amber-400 dark:text-amber-200'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            3. Ministério ({partesMinisterio.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vida-crista')}
            className={`border-b-2 px-3 py-2.5 transition-colors ${
              activeTab === 'vida-crista'
                ? 'border-rose-700 text-rose-900 dark:border-rose-400 dark:text-rose-200'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            4. Vida Cristã
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800 dark:bg-red-950/60 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ABA 1: GERAL & INTRODUÇÃO */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Período da Semana *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 7-13 DE SETEMBRO"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Leitura da Bíblia da Semana *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: JEREMIAS 32-33"
                    value={leituraBiblica}
                    onChange={(e) => setLeituraBiblica(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Data de Referência
                  </label>
                  <input
                    type="date"
                    value={dataReferencia}
                    onChange={(e) => setDataReferencia(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Presidente da Reunião *
                  </label>
                  <input
                    type="text"
                    required
                    list="lista-irmaos"
                    placeholder="Nome do Presidente"
                    value={presidente}
                    onChange={(e) => setPresidente(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ehVisita}
                      onChange={(e) => setEhVisita(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700"
                    />
                    <span>Semana de Visita do Superintendente</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Abertura da Reunião
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Cântico Inicial (número)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 1"
                      value={canticoInicial}
                      onChange={(e) => setCanticoInicial(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Oração Inicial (Irmão)
                    </label>
                    <input
                      type="text"
                      list="lista-irmaos"
                      placeholder="Nome do irmão que fará a oração"
                      value={oracaoInicial}
                      onChange={(e) => setOracaoInicial(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: TESOUROS */}
          {activeTab === 'tesouros' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-100 p-3 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Seção: <strong>TESOUROS DA PALAVRA DE DEUS</strong> (Salão principal)
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  1. Discurso de 10 min &bull; Tema / Título
                </label>
                <input
                  type="text"
                  placeholder="Ex: Meditar nas qualidades de Jeová fortalece a nossa fé"
                  value={discursoTesourosTitulo}
                  onChange={(e) => setDiscursoTesourosTitulo(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  1. Discurso de 10 min &bull; Orador Designado
                </label>
                <input
                  type="text"
                  list="lista-irmaos"
                  placeholder="Nome do orador"
                  value={discursoTesourosIrmao}
                  onChange={(e) => setDiscursoTesourosIrmao(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    2. Joias Espirituais (10 min) &bull; Irmão
                  </label>
                  <input
                    type="text"
                    list="lista-irmaos"
                    placeholder="Nome do irmão das Joias"
                    value={joiasEspirituaisIrmao}
                    onChange={(e) => setJoiasEspirituaisIrmao(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    3. Leitura da Bíblia (4 min) &bull; Irmão
                  </label>
                  <input
                    type="text"
                    list="lista-irmaos"
                    placeholder="Nome do leitor da Bíblia"
                    value={leituraBibliaIrmao}
                    onChange={(e) => setLeituraBibliaIrmao(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: MINISTÉRIO */}
          {activeTab === 'ministerio' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <span>Seção: <strong>FAÇA SEU MELHOR NO MINISTÉRIO</strong> (Salão principal)</span>
                <button
                  type="button"
                  onClick={handleAddMinisterioParte}
                  className="inline-flex items-center gap-1 rounded bg-[#b48214] px-2 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Parte
                </button>
              </div>

              <div className="space-y-3">
                {partesMinisterio.map((parte, idx) => (
                  <div
                    key={parte.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Parte #{parte.numero || idx + 4}
                      </span>
                      {partesMinisterio.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMinisterioParte(parte.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Título da Parte
                        </label>
                        <input
                          type="text"
                          value={parte.titulo}
                          onChange={(e) => handleUpdateMinisterioParte(parte.id, 'titulo', e.target.value)}
                          placeholder="Ex: Iniciando conversas"
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Tempo (min)
                        </label>
                        <input
                          type="number"
                          value={parte.tempoMin}
                          onChange={(e) => handleUpdateMinisterioParte(parte.id, 'tempoMin', Number(e.target.value))}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Número
                        </label>
                        <input
                          type="number"
                          value={parte.numero}
                          onChange={(e) => handleUpdateMinisterioParte(parte.id, 'numero', Number(e.target.value))}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Estudante Titular
                        </label>
                        <input
                          type="text"
                          list="lista-irmaos"
                          value={parte.designado}
                          onChange={(e) => handleUpdateMinisterioParte(parte.id, 'designado', e.target.value)}
                          placeholder="Nome do irmão ou irmã titular"
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Ajudante (opcional)
                        </label>
                        <input
                          type="text"
                          list="lista-irmaos"
                          value={parte.ajudante || ''}
                          onChange={(e) => handleUpdateMinisterioParte(parte.id, 'ajudante', e.target.value)}
                          placeholder="Nome do ajudante"
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 4: VIDA CRISTÃ */}
          {activeTab === 'vida-crista' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                Seção: <strong>NOSSA VIDA CRISTÃ</strong>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Cântico do Meio (número)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 128"
                  value={canticoMeio}
                  onChange={(e) => setCanticoMeio(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Partes Temáticas da Vida Cristã */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Partes Temáticas da Vida Cristã
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVidaCristaParte}
                    className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Parte
                  </button>
                </div>

                {partesVidaCrista.map((pvc, idx) => (
                  <div
                    key={pvc.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Discurso #{pvc.numero || idx + 7}
                      </span>
                      {partesVidaCrista.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVidaCristaParte(pvc.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={pvc.titulo}
                          onChange={(e) => handleUpdateVidaCristaParte(pvc.id, 'titulo', e.target.value)}
                          placeholder="Título da parte"
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={pvc.tempoMin || 15}
                          onChange={(e) => handleUpdateVidaCristaParte(pvc.id, 'tempoMin', Number(e.target.value))}
                          placeholder="Minutos"
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          list="lista-irmaos"
                          value={pvc.designado}
                          onChange={(e) => handleUpdateVidaCristaParte(pvc.id, 'designado', e.target.value)}
                          placeholder="Orador"
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Estudo Bíblico de Congregação */}
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Estudo Bíblico de Congregação (30 min)
                </span>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Dirigente
                    </label>
                    <input
                      type="text"
                      list="lista-irmaos"
                      placeholder="Nome do dirigente"
                      value={estudoBiblicoDirigente}
                      onChange={(e) => setEstudoBiblicoDirigente(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      Leitor
                    </label>
                    <input
                      type="text"
                      list="lista-irmaos"
                      placeholder="Nome do leitor"
                      value={estudoBiblicoLeitor}
                      onChange={(e) => setEstudoBiblicoLeitor(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Cântico final e oração */}
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Cântico Final (número)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 143"
                    value={canticoFinal}
                    onChange={(e) => setCanticoFinal(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Oração Final (Irmão)
                  </label>
                  <input
                    type="text"
                    list="lista-irmaos"
                    placeholder="Nome do irmão que fará a oração"
                    value={oracaoFinal}
                    onChange={(e) => setOracaoFinal(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Datalist auxiliar com todos os irmãos */}
          <datalist id="lista-irmaos">
            {IRMAOS_CONGREGACAO.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>

          {/* Footer de Ações */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Salvar Programação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
