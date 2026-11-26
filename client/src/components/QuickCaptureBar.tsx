import { Check, Inbox, Zap } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';

interface QuickCaptureBarProps {
  onCapture: (term: string, source: string) => Promise<void>;
  inboxCount?: number;
  onViewInbox?: () => void;
}

export function QuickCaptureBar({
  onCapture,
  inboxCount = 0,
  onViewInbox,
}: QuickCaptureBarProps) {
  const [term, setTerm] = useState('');
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = term.trim();
    if (!cleaned || saving) return;

    setSaving(true);
    try {
      await onCapture(cleaned, source.trim());
      setJustAdded(cleaned);
      setTerm('');
      inputRef.current?.focus();
      setTimeout(() => setJustAdded(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-900 border border-violet-500/30 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Recolector rápido</h3>
            <p className="text-[11px] text-slate-400">
              Anota palabras mientras ves un video o lees para investigarlas después
            </p>
          </div>
        </div>

        {onViewInbox && inboxCount > 0 && (
          <button
            type="button"
            onClick={onViewInbox}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs font-semibold transition"
          >
            <Inbox className="w-3.5 h-3.5" />
            {inboxCount} por investigar
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ej. Overwhelmed, Subtle, Catch up..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-violet-400 focus:outline-none text-sm"
        />
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Origen opcional (video, libro...)"
          className="sm:w-48 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-violet-400 focus:outline-none text-xs text-slate-300"
        />
        <button
          type="submit"
          disabled={saving || !term.trim()}
          className="px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold text-sm disabled:opacity-40 transition shrink-0"
        >
          {saving ? '...' : 'Anotar'}
        </button>
      </form>

      {justAdded && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-300">
          <Check className="w-3.5 h-3.5" />
          <span>
            <strong>“{justAdded}”</strong> guardada en tu bandeja <em>Por investigar</em>.
          </span>
        </div>
      )}
    </div>
  );
}
