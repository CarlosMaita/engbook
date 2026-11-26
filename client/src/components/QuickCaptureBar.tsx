import { Check, Inbox, Languages, Loader2, Volume2, Zap } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { speakEnglish } from '../lib/date';

interface QuickCaptureBarProps {
  onCapture: (term: string, source: string, translation?: string) => Promise<void>;
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
  const [translation, setTranslation] = useState('');
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [showTranslationBox, setShowTranslationBox] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState<{ term: string; withTranslation: boolean } | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTermChange = (value: string) => {
    setTerm(value);
    if (!value.trim()) {
      setTranslation('');
      setAlternatives([]);
      setShowTranslationBox(false);
      setTranslateError(null);
    }
  };

  const handleTranslate = async () => {
    const cleaned = term.trim();
    if (!cleaned || translating) return;
    setTranslating(true);
    setTranslateError(null);
    setShowTranslationBox(true);
    try {
      const res = await api.translate(cleaned);
      setTranslation(res.translation);
      setAlternatives(res.alternatives);
    } catch {
      setTranslateError('No se pudo traducir ahora. Puedes escribir la traducción manualmente.');
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = term.trim();
    if (!cleaned || saving) return;

    const finalTranslation = translation.trim();
    setSaving(true);
    try {
      await onCapture(cleaned, source.trim(), finalTranslation);
      setJustAdded({ term: cleaned, withTranslation: finalTranslation.length > 0 });
      setTerm('');
      setTranslation('');
      setAlternatives([]);
      setShowTranslationBox(false);
      setTranslateError(null);
      inputRef.current?.focus();
      setTimeout(() => setJustAdded(null), 3000);
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
              Anota una palabra, tradúcela con un clic si quieres y regístrala
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

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={term}
              onChange={(e) => handleTermChange(e.target.value)}
              placeholder="Ej. Overwhelmed, Subtle, Catch up..."
              className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-violet-400 focus:outline-none text-sm"
            />
            {term.trim() && (
              <button
                type="button"
                onClick={() => speakEnglish(term.trim())}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-amber-400"
                title="Escuchar pronunciación"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Origen opcional (video, libro...)"
            className="sm:w-44 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-violet-400 focus:outline-none text-xs text-slate-300"
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={translating || !term.trim()}
              onClick={handleTranslate}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-semibold text-sm disabled:opacity-40 transition"
            >
              {translating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Languages className="w-4 h-4" />
              )}
              Traducir
            </button>

            <button
              type="submit"
              disabled={saving || !term.trim()}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold text-sm disabled:opacity-40 transition"
            >
              {saving ? '...' : translation.trim() ? 'Anotar (+1)' : 'Anotar'}
            </button>
          </div>
        </div>

        {/* Translation box shown after clicking Traducir */}
        {showTranslationBox && (
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-300">
                <Languages className="w-3.5 h-3.5" />
                {translating ? 'Traduciendo al español...' : 'Traducción al español (editable):'}
              </span>
              {translation.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setTranslation('');
                    setAlternatives([]);
                    setShowTranslationBox(false);
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                >
                  Quitar traducción
                </button>
              )}
            </div>

            {translateError && <p className="text-xs text-rose-300">{translateError}</p>}

            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Escribe o ajusta la traducción..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-400 focus:outline-none text-sm text-amber-200 font-medium"
            />

            {alternatives.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500">Otras opciones:</span>
                {alternatives.map((alt) => (
                  <button
                    key={alt}
                    type="button"
                    onClick={() => setTranslation(alt)}
                    className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition"
                  >
                    {alt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {justAdded && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-300">
          <Check className="w-3.5 h-3.5" />
          <span>
            <strong>“{justAdded.term}”</strong>{' '}
            {justAdded.withTranslation
              ? 'anotada con traducción (+1 a tu meta diaria).'
              : 'anotada en tu bandeja Por investigar.'}
          </span>
        </div>
      )}
    </div>
  );
}
