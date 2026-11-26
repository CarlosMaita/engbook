import {
  Edit2,
  ExternalLink,
  Inbox,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { QuickCaptureBar } from '../components/QuickCaptureBar';
import { formatNextReview, speakEnglish } from '../lib/date';
import type { Word } from '../types';

export type WordFilterKey = 'all' | 'inbox' | 'due' | 'learning' | 'mastered';

interface WordsPageProps {
  words: Word[];
  loading: boolean;
  initialFilter?: WordFilterKey;
  onAdd: () => void;
  onQuickCapture: (term: string, source: string) => Promise<void>;
  onEdit: (word: Word) => void;
  onDelete: (word: Word) => Promise<void>;
}

const FILTERS: Array<{ key: WordFilterKey; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'inbox', label: 'Por investigar' },
  { key: 'due', label: 'Por repasar' },
  { key: 'learning', label: 'Aprendiendo' },
  { key: 'mastered', label: 'Dominadas' },
];

export function WordsPage({
  words,
  loading,
  initialFilter = 'all',
  onAdd,
  onQuickCapture,
  onEdit,
  onDelete,
}: WordsPageProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WordFilterKey>(initialFilter);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const inboxCount = useMemo(
    () => words.filter((w) => w.status === 'inbox').length,
    [words]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return words.filter((w) => {
      if (q) {
        const hay = `${w.term} ${w.translation} ${w.example} ${w.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === 'inbox') return w.status === 'inbox';
      if (filter === 'due') return w.isDue;
      if (filter === 'mastered') return w.status === 'mastered';
      if (filter === 'learning') return w.status !== 'mastered' && w.status !== 'inbox';
      return true;
    });
  }, [words, search, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mi Vocabulario</h2>
          <p className="text-xs text-slate-400">
            {words.length - inboxCount} activas · {inboxCount} por investigar
          </p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Completa
        </button>
      </div>

      {/* Quick Capture Bar */}
      <QuickCaptureBar
        onCapture={onQuickCapture}
        inboxCount={inboxCount}
        onViewInbox={() => setFilter('inbox')}
      />

      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar palabra, traducción, origen o ejemplo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const isInboxTab = f.key === 'inbox';
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  active
                    ? isInboxTab
                      ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {isInboxTab && <Inbox className="w-3.5 h-3.5" />}
                {f.label}
                {isInboxTab && inboxCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-violet-500 text-slate-950 font-bold text-[10px]">
                    {inboxCount}
                  </span>
                )}
              </button>
            );
          })}
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
          <p className="text-slate-300 font-medium">
            {filter === 'inbox'
              ? 'Tu bandeja Por investigar está limpia'
              : 'No hay palabras para mostrar'}
          </p>
          <p className="text-xs text-slate-500">
            {filter === 'inbox'
              ? 'Usa el Recolector rápido arriba para anotar palabras mientras ves videos o lees.'
              : 'Agrega tu primera palabra en inglés para empezar a construir tu hábito diario.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((word) => {
            const isInbox = word.status === 'inbox';
            return (
              <div
                key={word.id}
                className={`rounded-2xl bg-slate-900 border p-4 transition ${
                  isInbox
                    ? 'border-violet-500/35 hover:border-violet-400/60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
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
                          isInbox
                            ? 'bg-violet-500/20 text-violet-300'
                            : word.status === 'mastered'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : word.isDue
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isInbox
                          ? 'Por investigar'
                          : word.status === 'mastered'
                          ? 'Dominada'
                          : word.isDue
                          ? 'Repasar hoy'
                          : formatNextReview(word.nextReviewAt)}
                      </span>
                    </div>

                    {isInbox ? (
                      <div className="space-y-2 pt-0.5">
                        {word.notes && (
                          <p className="text-xs text-slate-400">Origen: {word.notes}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(word)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold text-xs transition"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Definir significado
                          </button>
                          <a
                            href={`https://translate.google.com/?sl=en&tl=es&text=${encodeURIComponent(
                              word.term
                            )}&op=translate`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs transition"
                          >
                            Traductor <ExternalLink className="w-3 h-3" />
                          </a>
                          <a
                            href={`https://dictionary.cambridge.org/dictionary/english-spanish/${encodeURIComponent(
                              word.term.toLowerCase().replace(/\s+/g, '-')
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-violet-300 text-xs transition"
                          >
                            Cambridge <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-amber-200/90 font-medium">
                          {word.translation}
                        </p>
                        {word.example && (
                          <p className="text-xs text-slate-400 italic">“{word.example}”</p>
                        )}
                        {word.notes && <p className="text-xs text-slate-500">{word.notes}</p>}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEdit(word)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title={isInbox ? 'Definir significado' : 'Editar'}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
