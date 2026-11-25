import { useState } from 'react';
import { formatDayMonth } from '../lib/date';
import type { HeatmapCell } from '../types';

interface HeatmapProps {
  cells: HeatmapCell[];
}

const LEVEL_COLORS: Record<HeatmapCell['level'], string> = {
  0: 'bg-slate-800/80',
  1: 'bg-emerald-950 border border-emerald-800/60',
  2: 'bg-emerald-800/80',
  3: 'bg-emerald-500',
  4: 'bg-amber-400',
};

export function Heatmap({ cells }: HeatmapProps) {
  const [selected, setSelected] = useState<HeatmapCell | null>(
    cells.length > 0 ? cells[cells.length - 1] : null
  );

  // Organize cells into columns of 7 days (weeks)
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1 min-w-max">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((cell) => {
                const isSelected = selected?.date === cell.date;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onMouseEnter={() => setSelected(cell)}
                    onClick={() => setSelected(cell)}
                    title={`${cell.date}: ${cell.totalActions} acciones`}
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-transform ${
                      LEVEL_COLORS[cell.level]
                    } ${isSelected ? 'ring-2 ring-white scale-110' : ''}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div>
          {selected ? (
            <span>
              <strong className="text-slate-200">{formatDayMonth(selected.date)}</strong>:{' '}
              {selected.totalActions} acciones ({selected.wordsAdded} nuevas,{' '}
              {selected.reviewsDone} repasos){' '}
              {selected.goalCompleted ? (
                <span className="text-emerald-400 font-medium">· Meta cumplida</span>
              ) : null}
            </span>
          ) : (
            <span>Toca o pasa el cursor por un día para ver el detalle.</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span>Menos</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span key={lvl} className={`w-3 h-3 rounded-[3px] ${LEVEL_COLORS[lvl]}`} />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}
