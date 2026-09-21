import React, { useState } from 'react';
import { S140TSemana, S140TMinisterioParte, S140TVidaCristaParte } from '../data/s140tStorage';
import { IRMAOS_CONGREGACAO } from '../data/irmaos';
import { X, AlertCircle, Save } from 'lucide-react';

interface VidaEMinisterioEditorModalProps {
  semana: S140TSemana | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (semana: S140TSemana) => void;
}

export const VidaEMinisterioEditorModal: React.FC<VidaEMinisterioEditorModalProps> = ({
  semana,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [errorMsg, setErrorMsg] = useState<string>('');

  // 1. Reunião da Semana
  const [dataReuniao, setDataReuniao] = useState<string>(
    semana?.dataReuniao || semana?.periodo || ''
  );
  const [dataReferencia, setDataReferencia] = useState<string>(
    semana?.dataReferencia || new Date().toISOString().slice(0, 10)
  );
  const [presidente, setPresidente] = useState<string>(semana?.presidente || '');
  const [oracaoInicial, setOracaoInicial] = useState<string>(semana?.oracaoInicial || '');
  const [oracaoFinal, setOracaoFinal] = useState<string>(semana?.oracaoFinal || '');

  // 2. Tesouros da Palavra de Deus
  const [tesourosTema, setTesourosTema] = useState<string>(
    semana?.discursoTesourosTitulo || ''
  );
  const [tesourosIrmao, setTesourosIrmao] = useState<string>(
    semana?.discursoTesourosIrmao || ''
  );

  // 3. Joias espirituais
  const [joiasTema, setJoiasTema] = useState<string>(
    semana?.joiasEspirituaisTitulo || 'Joias espirituais'
  );
  const [joiasIrmao, setJoiasIrmao] = useState<string>(
    semana?.joiasEspirituaisIrmao || ''
  );

  // 4. Leitura da Bíblia
  const [leituraBibliaIrmao, setLeituraBibliaIrmao] = useState<string>(
    semana?.leituraBibliaIrmao || ''
  );

  // 5. Faça seu melhor no ministério (4 partes)
  const [partesMinisterio, setPartesMinisterio] = useState<
    { tema: string; tempo: string; estudante: string; ajudante: string }[]
  >(() => {
    const existentes = semana?.partesMinisterio || [];
    const partes: { tema: string; tempo: string; estudante: string; ajudante: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const p = existentes[i];
      partes.push({
        tema: p?.titulo || '',
        tempo: p?.tempoMin ? `${p.tempoMin} min` : '',
        estudante: p?.designado || '',
        ajudante: p?.ajudante || '',
      });
    }
    return partes;
  });

  // 6. Nossa Vida Cristã (3 partes)
  const [partesVidaCrista, setPartesVidaCrista] = useState<
    { tema: string; irmao: string }[]
  >(() => {
    const existentes = semana?.partesVidaCrista || [];
    const partes: { tema: string; irmao: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const p = existentes[i];
      partes.push({
        tema: p?.titulo || '',
        irmao: p?.designado || '',
      });
    }
    return partes;
  });

  // 7. Estudo bíblico de congregação
  const [estudoDirigente, setEstudoDirigente] = useState<string>(
    semana?.estudoBiblicoDirigente || ''
  );
  const [estudoLeitor, setEstudoLeitor] = useState<string>(
    semana?.estudoBiblicoLeitor || ''
  );

  const handleUpdateMinisterio = (
    index: number,
    field: 'tema' | 'tempo' | 'estudante' | 'ajudante',
    value: string
  ) => {
    setPartesMinisterio((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleUpdateVidaCrista = (
    index: number,
    field: 'tema' | 'irmao',
    value: string
  ) => {
    setPartesVidaCrista((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!dataReuniao.trim()) {
      setErrorMsg('Informe a data da reunião.');
      return;
    }

    if (!presidente.trim()) {
      setErrorMsg('Informe o Presidente da reunião.');
      return;
    }

    const ministerioMapeado: S140TMinisterioParte[] = partesMinisterio
      .filter((p) => p.tema.trim() || p.estudante.trim())
      .map((p, index) => {
        const tempoNum = parseInt(p.tempo.replace(/\D/g, ''), 10) || 4;
        return {
          id: semana?.partesMinisterio?.[index]?.id || `pm-${Date.now()}-${index}`,
          numero: index + 1,
          titulo: p.tema.trim() || `Parte ${index + 1}`,
          tempoMin: tempoNum,
          designado: p.estudante.trim(),
          ajudante: p.ajudante.trim() || undefined,
          salao: 'Salão principal',
        };
      });

    const vidaCristaMapeada: S140TVidaCristaParte[] = partesVidaCrista
      .filter((p) => p.tema.trim() || p.irmao.trim())
      .map((p, index) => ({
        id: semana?.partesVidaCrista?.[index]?.id || `pvc-${Date.now()}-${index}`,
        numero: index + 1,
        titulo: p.tema.trim() || `Parte ${index + 1}`,
        designado: p.irmao.trim(),
      }));

    const item: S140TSemana = {
      id: semana?.id || `sem-${Date.now()}`,
      periodo: dataReuniao.trim(),
      dataReuniao: dataReuniao.trim(),
      dataReferencia: dataReferencia || new Date().toISOString().slice(0, 10),
      leituraBiblica: semana?.leituraBiblica || '',
      presidente: presidente.trim(),
      oracaoInicial: oracaoInicial.trim(),
      oracaoFinal: oracaoFinal.trim(),

      canticoInicial: semana?.canticoInicial || 1,
      canticoMeio: semana?.canticoMeio || 100,
      canticoFinal: semana?.canticoFinal || 140,

      tesourosSalao: 'Salão principal',
      discursoTesourosTitulo: tesourosTema.trim(),
      discursoTesourosTempoMin: 10,
      discursoTesourosIrmao: tesourosIrmao.trim(),

      joiasEspirituaisTitulo: joiasTema.trim() || 'Joias espirituais',
      joiasEspirituaisIrmao: joiasIrmao.trim(),
      joiasEspirituaisTempoMin: 10,

      leituraBibliaIrmao: leituraBibliaIrmao.trim(),
      leituraBibliaTempoMin: 4,

      ministerioSalao: 'Salão principal',
      partesMinisterio: ministerioMapeado,

      partesVidaCrista: vidaCristaMapeada,

      estudoBiblicoTempoMin: 30,
      estudoBiblicoDirigente: estudoDirigente.trim(),
      estudoBiblicoLeitor: estudoLeitor.trim(),
    };

    onSave(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {semana ? 'Editar Programação da Reunião' : 'Cadastrar Nova Programação'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vida e Ministério &bull; Congregação Vila Cisper
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Datalist para autocomplete dos irmãos */}
        <datalist id="lista-irmaos-ministrio">
          {IRMAOS_CONGREGACAO.map((nome) => (
            <option key={nome} value={nome} />
          ))}
        </datalist>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. REUNIÃO DA SEMANA */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              1. Reunião da Semana
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Data da Reunião *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Quinta-feira, 10 de Setembro"
                  value={dataReuniao}
                  onChange={(e) => setDataReuniao(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Presidente *
                </label>
                <input
                  type="text"
                  required
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do Presidente"
                  value={presidente}
                  onChange={(e) => setPresidente(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Oração Inicial
                </label>
                <input
                  type="text"
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do irmão"
                  value={oracaoInicial}
                  onChange={(e) => setOracaoInicial(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Oração Final
                </label>
                <input
                  type="text"
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do irmão"
                  value={oracaoFinal}
                  onChange={(e) => setOracaoFinal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </fieldset>

          {/* 2. TESOUROS DA PALAVRA DE DEUS */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              2. Tesouros da Palavra de Deus
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tema
                </label>
                <input
                  type="text"
                  placeholder="Tema de Tesouros da Palavra de Deus"
                  value={tesourosTema}
                  onChange={(e) => setTesourosTema(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Irmão Responsável
                </label>
                <input
                  type="text"
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do orador"
                  value={tesourosIrmao}
                  onChange={(e) => setTesourosIrmao(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </fieldset>

          {/* 3. JOIAS ESPIRITUAIS */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              3. Joias Espirituais
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Tema
                </label>
                <input
                  type="text"
                  placeholder="Tema das joias"
                  value={joiasTema}
                  onChange={(e) => setJoiasTema(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Irmão Responsável
                </label>
                <input
                  type="text"
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do irmão"
                  value={joiasIrmao}
                  onChange={(e) => setJoiasIrmao(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </fieldset>

          {/* 4. LEITURA DA BÍBLIA */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              4. Leitura da Bíblia
            </legend>
            <div className="mt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Irmão Leitor
              </label>
              <input
                type="text"
                list="lista-irmaos-ministrio"
                placeholder="Nome do leitor"
                value={leituraBibliaIrmao}
                onChange={(e) => setLeituraBibliaIrmao(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </fieldset>

          {/* 5. FAÇA SEU MELHOR NO MINISTÉRIO (4 PARTES) */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              5. Faça Seu Melhor no Ministério (4 partes)
            </legend>
            <div className="mt-2 space-y-4">
              {partesMinisterio.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 space-y-2"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Parte {idx + 1}
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                        Tema
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Iniciando conversas"
                        value={p.tema}
                        onChange={(e) => handleUpdateMinisterio(idx, 'tema', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                        Tempo
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 3 min"
                        value={p.tempo}
                        onChange={(e) => handleUpdateMinisterio(idx, 'tempo', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                        Estudante
                      </label>
                      <input
                        type="text"
                        list="lista-irmaos-ministrio"
                        placeholder="Nome do estudante"
                        value={p.estudante}
                        onChange={(e) => handleUpdateMinisterio(idx, 'estudante', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                        Ajudante
                      </label>
                      <input
                        type="text"
                        list="lista-irmaos-ministrio"
                        placeholder="Nome do ajudante"
                        value={p.ajudante}
                        onChange={(e) => handleUpdateMinisterio(idx, 'ajudante', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {/* 6. NOSSA VIDA CRISTÃ (3 PARTES) */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              6. Nossa Vida Cristã (3 partes)
            </legend>
            <div className="mt-2 space-y-4">
              {partesVidaCrista.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40 space-y-2"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800 dark:text-rose-400">
                    Parte {idx + 1}
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                        Tema
                      </label>
                      <input
                        type="text"
                        placeholder="Tema da parte"
                        value={p.tema}
                        onChange={(e) => handleUpdateVidaCrista(idx, 'tema', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-0.5">
                        Irmão Responsável
                      </label>
                      <input
                        type="text"
                        list="lista-irmaos-ministrio"
                        placeholder="Nome do irmão"
                        value={p.irmao}
                        onChange={(e) => handleUpdateVidaCrista(idx, 'irmao', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {/* 7. ESTUDO BÍBLICO DE CONGREGAÇÃO */}
          <fieldset className="rounded-xl border border-slate-300 p-4 dark:border-slate-700">
            <legend className="px-2 text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              7. Estudo Bíblico de Congregação
            </legend>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Dirigente
                </label>
                <input
                  type="text"
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do dirigente"
                  value={estudoDirigente}
                  onChange={(e) => setEstudoDirigente(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Leitor
                </label>
                <input
                  type="text"
                  list="lista-irmaos-ministrio"
                  placeholder="Nome do leitor"
                  value={estudoLeitor}
                  onChange={(e) => setEstudoLeitor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </fieldset>

          {/* Botões do Rodapé do Modal */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-xs hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              <span>Salvar Programação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
