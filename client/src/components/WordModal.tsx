import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Word } from '../types';

interface WordModalProps {
  initialWord?: Word | null;
  onClose: () => void;
  onSave: (data: {
    term: string;
    translation: string;
    example: string;
    notes: string;
  }) => Promise<void>;
}

export function WordModal({ initialWord, onClose, onSave }: WordModalProps) {
  const [term, setTerm] = useState(initialWord?.term ?? '');
  const [translation, setTranslation] = useState(initialWord?.translation ?? '');
  const [example, setExample] = useState(initialWord?.example ?? '');
  const [notes, setNotes] = useState(initialWord?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !translation.trim()) {
      setError('Ingresa la palabra en inglés y su traducción.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        term: term.trim(),
        translation: translation.trim(),
        example: example.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold">
            {initialWord ? 'Editar palabra' : 'Nueva palabra en inglés'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Palabra o expresión (Inglés) *
            </label>
            <input
              type="text"
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Ej. Breakthrough, To figure out..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Traducción / Significado (Español) *
            </label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Ej. Avance importante, Descubrir / resolver"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Frase de ejemplo (opcional)
            </label>
            <textarea
              rows={2}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="Ej. Scientists made a major breakthrough in AI."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Notas o contexto (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Phrasal verb muy común en trabajo"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 transition"
            >
              {saving ? 'Guardando...' : initialWord ? 'Guardar cambios' : 'Agregar (+1 hoy)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
