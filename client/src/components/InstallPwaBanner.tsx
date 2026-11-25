import { Download, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'engbook_pwa_banner_dismissed';

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    nav.standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPwaBanner() {
  const [installed, setInstalled] = useState<boolean>(() => isRunningStandalone());
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios] = useState<boolean>(() => isIosDevice());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-slate-900 border-b border-amber-500/30 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-200 leading-snug">
            <span className="font-semibold text-amber-300">Instala EngBook como App</span>
            {deferredPrompt ? (
              <span className="text-slate-300">
                {' '}
                — Accede desde tu pantalla de inicio y repasa sin conexión.
              </span>
            ) : ios ? (
              <span className="text-slate-300 inline-flex items-center gap-1 flex-wrap">
                {' '}
                — Toca <Share className="w-3.5 h-3.5 inline text-amber-400" />{' '}
                <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
              </span>
            ) : (
              <span className="text-slate-300">
                {' '}
                — Usa el ícono de instalar en la barra de tu navegador para tenerla como app.
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition"
            aria-label="Cerrar notificación de instalación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
