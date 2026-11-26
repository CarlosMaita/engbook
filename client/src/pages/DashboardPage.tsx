import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Flame,
  Layers,
  Plus,
  Trophy,
} from 'lucide-react';
import { QuickCaptureBar } from '../components/QuickCaptureBar';
import { useAuth } from '../context/AuthContext';
import { formatShortDay } from '../lib/date';
import type { StatsOverview } from '../types';

interface DashboardPageProps {
  overview: StatsOverview | null;
  loading: boolean;
  onOpenAddWord: () => void;
  onStartReview: () => void;
  onQuickCapture: (term: string, source: string) => Promise<void>;
  onOpenInbox: () => void;
}

export function DashboardPage({
  overview,
  loading,
  onOpenAddWord,
  onStartReview,
  onQuickCapture,
  onOpenInbox,
}: DashboardPageProps) {
  const { user } = useAuth();

  if (loading && !overview) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-900 border border-slate-800" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 rounded-2xl bg-slate-900 border border-slate-800" />
          <div className="h-28 rounded-2xl bg-slate-900 border border-slate-800" />
        </div>
      </div>
    );
  }

  const today = overview?.todayProgress;
  const streak = overview?.streak;
  const totals = overview?.totals;

  const progressPct = today
    ? Math.min(100, Math.round((today.totalActions / Math.max(1, today.goalTarget)) * 100))
    : 0;

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Hola, {user?.name}
          </p>
          <h2 className="text-2xl font-bold tracking-tight mt-0.5">Tu hábito de hoy</h2>
        </div>
        <button
          onClick={onOpenAddWord}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          Agregar palabra
        </button>
      </div>

      {/* Quick Capture Bar */}
      <QuickCaptureBar
        onCapture={onQuickCapture}
        inboxCount={totals?.inboxWords ?? 0}
        onViewInbox={onOpenInbox}
      />

      {/* Streak & Daily Progress Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border border-slate-800 p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-slate-800"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className={`transition-all duration-500 ${
                today?.completed ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold">
              {today?.totalActions ?? 0}/{today?.goalTarget ?? user?.dailyGoal ?? 5}
            </span>
            <span className="text-[11px] text-slate-400">acciones</span>
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-3">
          {today?.completed ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ¡Meta diaria cumplida!
            </div>
          ) : streak?.streakAtRisk ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Completa tu meta hoy para mantener tu racha
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-medium">
              Agrega o repasa palabras para sumar hoy
            </div>
          )}

          <div className="flex items-baseline justify-center sm:justify-start gap-3">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-7 h-7 fill-amber-400" />
              <span className="text-4xl font-extrabold">{streak?.currentStreak ?? 0}</span>
            </div>
            <span className="text-sm text-slate-400">
              {streak?.currentStreak === 1 ? 'día de racha' : 'días de racha'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Hoy: <strong className="text-slate-200">{today?.wordsAdded ?? 0}</strong> palabras
            nuevas · <strong className="text-slate-200">{today?.reviewsDone ?? 0}</strong> repasos
            · Récord: <strong className="text-amber-300">{streak?.bestStreak ?? 0} días</strong>
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onStartReview}
          className="text-left p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300">
              {totals?.dueCount ?? 0} pendientes
            </span>
          </div>
          <h3 className="font-semibold text-base group-hover:text-amber-300 transition">
            Repasar Flashcards
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Practica tus palabras pendientes con repetición espaciada SM-2.
          </p>
        </button>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs text-slate-400">
              {totals?.masteredWords ?? 0} dominadas
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-base">
              {totals?.totalWords ?? 0} palabras guardadas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {totals?.totalReviews ?? 0} repasos completados en total.
            </p>
          </div>
        </div>
      </div>

      {/* Last 7 Days Habit Strip */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Últimos 7 días</h3>
          <span className="text-xs text-slate-400">
            {streak?.totalCompletedDays ?? 0} días cumplidos en total
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {(overview?.last7Days ?? []).map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  day.completed
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : day.actions > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {day.completed ? <Check className="w-4 h-4 stroke-[3]" /> : day.actions}
              </div>
              <span className="text-[11px] text-slate-400 capitalize">
                {formatShortDay(day.date)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
