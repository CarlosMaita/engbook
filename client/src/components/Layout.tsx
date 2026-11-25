import {
  BarChart3,
  BookOpen,
  Download,
  Eye,
  Flame,
  Home,
  Layers,
  WifiOff,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { InstallPwaBanner } from './InstallPwaBanner';

export type TabKey = 'dashboard' | 'words' | 'review' | 'stats';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface LayoutProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  streakCount?: number;
  dueCount?: number;
  onSynced?: () => void;
  children: ReactNode;
}

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: typeof Home }> = [
  { key: 'dashboard', label: 'Inicio', icon: Home },
  { key: 'words', label: 'Palabras', icon: BookOpen },
  { key: 'review', label: 'Repasar', icon: Layers },
  { key: 'stats', label: 'Estadísticas', icon: BarChart3 },
];

export function Layout({
  activeTab,
  onTabChange,
  streakCount = 0,
  dueCount = 0,
  onSynced,
  children,
}: LayoutProps) {
  const { isDemo, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const count = await api.syncPendingQueue();
      if (count > 0) {
        setSyncBanner(`Se sincronizaron ${count} acciones guardadas offline.`);
        onSynced?.();
        setTimeout(() => setSyncBanner(null), 4000);
      }
    };
    const handleOffline = () => setIsOnline(false);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [onSynced]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">EngBook</h1>
              <p className="text-[11px] text-slate-400 -mt-0.5">Hábito diario</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{streakCount}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                {key === 'review' && dueCount > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500 text-slate-950">
                    {dueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {installPrompt && (
          <div className="p-4">
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Instalar App (PWA)
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/90 backdrop-blur border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="font-bold tracking-tight">EngBook</span>
        </div>
        <div className="flex items-center gap-2">
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="p-2 rounded-lg bg-slate-800 text-amber-400"
              title="Instalar app"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 fill-amber-400" />
            <span>{streakCount} días</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:pl-64 pb-24 md:pb-10">
        <InstallPwaBanner />
        {isDemo && (
          <div className="bg-sky-500/15 border-b border-sky-500/30 px-4 py-2 text-xs text-sky-200 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <strong>Modo Demo</strong> — Estás probando datos de ejemplo (no se guardan al salir).
            </span>
            <button
              type="button"
              onClick={logout}
              className="px-2.5 py-0.5 rounded-md bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold transition"
            >
              Crear mi cuenta
            </button>
          </div>
        )}
        {!isOnline && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            Modo sin conexión: tus nuevas palabras y repasos se sincronizarán al reconectar.
          </div>
        )}
        {syncBanner && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-200 text-center">
            {syncBanner}
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium transition ${
                active ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
              {key === 'review' && dueCount > 0 && (
                <span className="absolute top-0.5 right-1.5 min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
