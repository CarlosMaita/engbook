import { Edit2, Plus, Search, Trash2, Volume2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatNextReview, speakEnglish } from '../lib/date';
import type { Word } from '../types';

interface WordsPageProps {
  words: Word[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (word: Word) => void;
  onDelete: (word: Word) => Promise<void>;
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'due', label: 'Por repasar' },
  { key: 'learning', label: 'Aprendiendo' },
  { key: 'mastered', label: 'Dominadas' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export function WordsPage({ words, loading, onAdd, onEdit, onDelete }: WordsPageProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter((w) => {
      if (q) {
        const hay = `${w.term} ${w.translation} ${w.example} ${w.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === 'due') return w.isDue;
      if (filter === 'mastered') return w.status === 'mastered';
      if (filter === 'learning') return w.status !== 'mastered';
      return true;
    });
  }, [words, search, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mi Vocabulario</h2>
          <p className="text-xs text-slate-400">{words.length} palabras registradas</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Nueva
        </button>
      </div>

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar palabra, traducción o ejemplo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                filter === f.key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Word List */}
      {loading && words.length === 0 ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-10 text-center space-y-3">
          <p className="text-slate-300 font-medium">No hay palabras para mostrar</p>
          <p className="text-xs text-slate-500">
            Agrega tu primera palabra en inglés para empezar a construir tu hábito diario.
          </p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-semibold text-xs"
          >
            <Plus className="w-4 h-4" />
            Agregar palabra
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((word) => (
            <div
              key={word.id}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">{word.term}</h3>
                    <button
                      type="button"
                      onClick={() => speakEnglish(word.term)}
                      className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                      title="Escuchar pronunciación"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        word.status === 'mastered'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : word.isDue
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {word.status === 'mastered'
                        ? 'Dominada'
                        : word.isDue
                        ? 'Repasar hoy'
                        : formatNextReview(word.nextReviewAt)}
                    </span>
                  </div>
                  <p className="text-sm text-amber-200/90 font-medium">{word.translation}</p>
                  {word.example && (
                    <p className="text-xs text-slate-400 italic">“{word.example}”</p>
                  )}
                  {word.notes && <p className="text-xs text-slate-500">{word.notes}</p>}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(word)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(word)}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
