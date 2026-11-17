import { useState } from 'react';
import { X } from 'lucide-react';
import type { SourceMaterialType } from '../types/studio';
import { DIRECTOR_STYLES } from '../utils/studioLogic';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    genreStyle: string;
    defaultSourceType: SourceMaterialType;
    continuityBible: string;
  }) => Promise<void>;
}

export function NewProjectModal({ open, onClose, onCreate }: NewProjectModalProps) {
  const [title, setTitle] = useState('');
  const [genreStyle, setGenreStyle] = useState(DIRECTOR_STYLES[0].label);
  const [defaultSourceType, setDefaultSourceType] = useState<SourceMaterialType>('book');
  const [continuityBible, setContinuityBible] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Escribe un título para la producción.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onCreate({
        title: title.trim(),
        genreStyle,
        defaultSourceType,
        continuityBible: continuityBible.trim(),
      });
      setTitle('');
      setContinuityBible('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la producción.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-lg rounded-xl border border-white/15 bg-[#131318] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="new-project-heading" className="font-display text-lg font-semibold text-[#F2F0EB]">
            Nueva Producción Cinematográfica
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-2 rounded-lg text-[#9A968E] hover:text-[#F2F0EB] hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-proj-title" className="block text-xs font-medium text-[#C8C3BA] mb-1.5">
              Título de la obra o película
            </label>
            <input
              id="new-proj-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Crónicas de Marte · Audiolibro El Abismo"
              className="w-full rounded-lg border border-white/15 bg-[#0B0B0E] px-3 py-2.5 text-sm text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-proj-source" className="block text-xs font-medium text-[#C8C3BA] mb-1.5">
                Formato de origen principal
              </label>
              <select
                id="new-proj-source"
                value={defaultSourceType}
                onChange={(e) => setDefaultSourceType(e.target.value as SourceMaterialType)}
                className="w-full rounded-lg border border-white/15 bg-[#0B0B0E] px-3 py-2.5 text-sm text-[#F2F0EB] focus:border-[#E5A93C] focus:outline-none"
              >
                <option value="book">Libro / Manuscrito</option>
                <option value="audiobook">Audiolibro (Audio)</option>
                <option value="story">Historia Original</option>
              </select>
            </div>

            <div>
              <label htmlFor="new-proj-style" className="block text-xs font-medium text-[#C8C3BA] mb-1.5">
                Estilo de dirección base
              </label>
              <select
                id="new-proj-style"
                value={genreStyle}
                onChange={(e) => setGenreStyle(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0B0B0E] px-3 py-2.5 text-sm text-[#F2F0EB] focus:border-[#E5A93C] focus:outline-none"
              >
                {DIRECTOR_STYLES.map((style) => (
                  <option key={style.id} value={`${style.label} (${style.references})`}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="new-proj-bible" className="block text-xs font-medium text-[#C8C3BA] mb-1.5">
              Biblia de continuidad inicial (opcional)
            </label>
            <textarea
              id="new-proj-bible"
              rows={3}
              value={continuityBible}
              onChange={(e) => setContinuityBible(e.target.value)}
              placeholder="Reglas visuales, época, reparto imaginado, estética de luz o sonido..."
              className="w-full rounded-lg border border-white/15 bg-[#0B0B0E] px-3 py-2.5 text-sm text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-[#F87171] bg-[#451A1A]/40 border border-[#EF4444]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#C8C3BA] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] disabled:opacity-50 text-[#0B0B0E] text-xs font-semibold"
            >
              {submitting ? 'Creando...' : 'Crear producción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
