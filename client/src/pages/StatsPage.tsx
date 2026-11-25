import {
  Award,
  BookOpen,
  CalendarCheck2,
  Flame,
  LogOut,
  Save,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Heatmap } from '../components/Heatmap';
import { WeeklyChart } from '../components/WeeklyChart';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { HeatmapCell, StatsOverview, WeeklyPoint } from '../types';

interface StatsPageProps {
  overview: StatsOverview | null;
  onSettingsUpdated: () => Promise<void>;
}

export function StatsPage({ overview, onSettingsUpdated }: StatsPageProps) {
  const { user, updateSettings, logout } = useAuth();
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);

  const [dailyGoal, setDailyGoal] = useState(user?.dailyGoal ?? 5);
  const [savingGoal, setSavingGoal] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    setDailyGoal(user?.dailyGoal ?? 5);
  }, [user?.dailyGoal]);

  useEffect(() => {
    setLoadingCharts(true);
    Promise.all([api.getHeatmap(182), api.getWeekly(14)])
      .then(([hm, wk]) => {
        setHeatmap(hm.cells);
        setWeekly(wk.series);
      })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));
  }, [overview]);

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    setSavingGoal(true);
    setSavedMsg(false);
    try {
      await updateSettings({ dailyGoal });
      await onSettingsUpdated();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } finally {
      setSavingGoal(false);
    }
  };

  const kpis = [
    {
      label: 'Racha actual',
      value: `${overview?.streak.currentStreak ?? 0} d`,
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/15',
    },
    {
      label: 'Mejor racha',
      value: `${overview?.streak.bestStreak ?? 0} d`,
      icon: Award,
      color: 'text-orange-400 bg-orange-500/15',
    },
    {
      label: 'Palabras totales',
      value: overview?.totals.totalWords ?? 0,
      icon: BookOpen,
      color: 'text-sky-400 bg-sky-500/15',
    },
    {
      label: 'Dominadas',
      value: overview?.totals.masteredWords ?? 0,
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/15',
    },
    {
      label: 'Días cumplidos',
      value: overview?.streak.totalCompletedDays ?? 0,
      icon: CalendarCheck2,
      color: 'text-violet-400 bg-violet-500/15',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Estadísticas y Hábito</h2>
        <p className="text-xs text-slate-400">
          Tu constancia diaria registrada en el tiempo
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold">{value}</div>
            <div className="text-[11px] text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Actividad reciente (últimos 6 meses)</h3>
          <span className="text-xs text-slate-400">Estilo GitHub</span>
        </div>
        {loadingCharts && heatmap.length === 0 ? (
          <div className="h-28 rounded-xl bg-slate-800/50 animate-pulse" />
        ) : (
          <Heatmap cells={heatmap} />
        )}
      </div>

      {/* 14-day Activity Chart */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Últimos 14 días</h3>
          <span className="text-xs text-slate-400">
            Total repasos: {overview?.totals.totalReviews ?? 0}
          </span>
        </div>
        {loadingCharts && weekly.length === 0 ? (
          <div className="h-48 rounded-xl bg-slate-800/50 animate-pulse" />
        ) : (
          <WeeklyChart series={weekly} />
        )}
      </div>

      {/* Goal & Account Settings */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-semibold">Configuración de hábito y cuenta</h3>
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-medium">Meta diaria para mantener racha</span>
              <span className="text-amber-400 font-bold">{dailyGoal} acciones / día</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingGoal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                {savingGoal ? 'Guardando...' : 'Guardar meta'}
              </button>
              {savedMsg && (
                <span className="text-xs text-emerald-400">¡Meta actualizada!</span>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-medium transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión ({user?.email})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
