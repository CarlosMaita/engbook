import { ArrowLeftRight, CheckCircle2, RotateCw, Sparkles, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { speakEnglish } from '../lib/date';
import type { ReviewQuality, Word } from '../types';

interface ReviewPageProps {
  dueWords: Word[];
  loading: boolean;
  onRate: (wordId: string, quality: ReviewQuality) => Promise<void>;
  onReload: () => Promise<void>;
  onGoAddWord: () => void;
}

const RATINGS: Array<{
  quality: ReviewQuality;
  label: string;
  keyHint: string;
  style: string;
}> = [
  {
    quality: 1,
    label: 'Otra vez',
    keyHint: '1',
    style: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30',
  },
  {
    quality: 2,
    label: 'Difícil',
    keyHint: '2',
    style: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30',
  },
  {
    quality: 3,
    label: 'Bien',
    keyHint: '3',
    style: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30',
  },
  {
    quality: 4,
    label: 'Fácil',
    keyHint: '4',
    style: 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30',
  },
];

export function ReviewPage({
  dueWords,
  loading,
  onRate,
  onReload,
  onGoAddWord,
}: ReviewPageProps) {
  const [queue, setQueue] = useState<Word[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setQueue(dueWords);
    setFlipped(false);
  }, [dueWords]);

  const current = queue[0] ?? null;

  const handleRate = useCallback(
    async (quality: ReviewQuality) => {
      if (!current || submitting) return;
      setSubmitting(true);
      try {
        await onRate(current.id, quality);
        setReviewedCount((c) => c + 1);
        setQueue((prev) => prev.slice(1));
        setFlipped(false);
      } finally {
        setSubmitting(false);
      }
    },
    [current, submitting, onRate]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        handleRate(Number(e.key) as ReviewQuality);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, flipped, handleRate]);

  if (loading && queue.length === 0 && reviewedCount === 0) {
    return (
      <div className="h-80 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
    );
  }

  if (!current) {
    return (
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-10 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold">
          {reviewedCount > 0 ? '¡Sesión completada!' : 'Estás al día'}
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {reviewedCount > 0
            ? `Repasaste ${reviewedCount} ${
                reviewedCount === 1 ? 'palabra' : 'palabras'
              }. Tus próximos repasos quedaron programados automáticamente con SM-2.`
            : 'No tienes tarjetas pendientes por repasar en este momento. Agrega nuevas palabras para seguir aprendiendo.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onGoAddWord}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition"
          >
            Agregar nueva palabra
          </button>
          <button
            onClick={() => {
              setReviewedCount(0);
              onReload();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
          >
            Actualizar cola
          </button>
        </div>
      </div>
    );
  }

  const frontText = reverse ? current.translation : current.term;
  const backText = reverse ? current.term : current.translation;
  const frontLabel = reverse ? 'Español' : 'English';
  const backLabel = reverse ? 'English' : 'Español';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Repaso Flashcards</h2>
          <p className="text-xs text-slate-400">
            Restantes: {queue.length} · Completadas hoy en sesión: {reviewedCount}
          </p>
        </div>
        <button
          onClick={() => {
            setReverse((r) => !r);
            setFlipped(false);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
          {reverse ? 'ES → EN' : 'EN → ES'}
        </button>
      </div>

      {/* 3D Flip Card */}
      <div
        className="perspective-1000 cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className={`relative w-full min-h-[280px] sm:min-h-[320px] transition-transform duration-500 preserve-3d ${
            flipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800/90 border border-slate-700/80 p-8 flex flex-col items-center justify-between shadow-2xl">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
                {frontLabel}
              </span>
              {!reverse && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakEnglish(current.term);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Escuchar pronunciación"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="text-center space-y-2 my-auto">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {frontText}
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <RotateCw className="w-3.5 h-3.5" />
              Toca la tarjeta (o Espacio) para ver la respuesta
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-8 flex flex-col items-center justify-between shadow-2xl">
            <div className="w-full flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                {backLabel}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakEnglish(current.term);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                title="Escuchar en inglés"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-3 my-auto">
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-300">{backText}</p>
              {current.example && (
                <p className="text-sm text-slate-300 italic max-w-md mx-auto">
                  “{current.example}”
                </p>
              )}
              {current.notes && (
                <p className="text-xs text-slate-400 max-w-md mx-auto">{current.notes}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              ¿Qué tan bien la recordaste?
            </div>
          </div>
        </div>
      </div>

      {/* SM-2 Rating Controls */}
      {flipped ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RATINGS.map((r) => {
            const days = current.intervalPreview[r.quality];
            return (
              <button
                key={r.quality}
                disabled={submitting}
                onClick={() => handleRate(r.quality)}
                className={`p-3.5 rounded-2xl border text-center transition disabled:opacity-50 ${r.style}`}
              >
                <div className="font-bold text-sm">{r.label}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  {days === 1 ? '1 día' : `${days} días`}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <button
          onClick={() => setFlipped(true)}
          className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
        >
          Mostrar respuesta
        </button>
      )}
    </div>
  );
}
