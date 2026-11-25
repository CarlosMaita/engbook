import { formatDayMonth } from '../lib/date';
import type { WeeklyPoint } from '../types';

interface WeeklyChartProps {
  series: WeeklyPoint[];
}

export function WeeklyChart({ series }: WeeklyChartProps) {
  const maxVal = Math.max(
    5,
    ...series.map((d) => Math.max(d.wordsAdded + d.reviewsDone, d.goalTarget))
  );

  return (
    <div className="space-y-3">
      <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-4">
        {series.map((point) => {
          const total = point.wordsAdded + point.reviewsDone;
          const totalPct = Math.round((total / maxVal) * 100);
          const addedPct = total > 0 ? Math.round((point.wordsAdded / total) * 100) : 0;
          const reviewPct = 100 - addedPct;

          return (
            <div
              key={point.date}
              className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
            >
              <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">
                {total}
              </span>
              <div className="w-full max-w-8 flex-1 flex items-end">
                <div
                  style={{ height: `${Math.max(total > 0 ? 8 : 3, totalPct)}%` }}
                  className={`w-full rounded-t-md overflow-hidden flex flex-col justify-end transition-all ${
                    total === 0 ? 'bg-slate-800/70' : ''
                  }`}
                  title={`${formatDayMonth(point.date)}: ${point.wordsAdded} nuevas, ${point.reviewsDone} repasos`}
                >
                  {point.reviewsDone > 0 && (
                    <div
                      style={{ height: `${reviewPct}%` }}
                      className="w-full bg-emerald-500/90"
                    />
                  )}
                  {point.wordsAdded > 0 && (
                    <div
                      style={{ height: `${addedPct}%` }}
                      className="w-full bg-amber-400"
                    />
                  )}
                </div>
              </div>
              <span className="text-[10px] text-slate-500 truncate max-w-full">
                {point.date.slice(8)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          Palabras nuevas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          Repasos Flashcards
        </span>
      </div>
    </div>
  );
}
