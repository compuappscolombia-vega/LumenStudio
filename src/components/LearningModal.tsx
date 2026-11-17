import { useState } from 'react';
import { Brain, Plus, Star, Trash2, X } from 'lucide-react';
import type { LearningCategory, LearningLesson } from '../types/studio';
import {
  LEARNING_CATEGORY_LABELS,
  validateLessonInput,
} from '../utils/learningEngine';

interface LearningModalProps {
  open: boolean;
  lessons: LearningLesson[];
  activeProjectTitle: string;
  onClose: () => void;
  onAddLesson: (payload: {
    category: LearningCategory;
    insight: string;
    rating: number;
    sourceProjectTitle: string;
  }) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
}

const CATEGORIES = Object.keys(LEARNING_CATEGORY_LABELS) as LearningCategory[];

export function LearningModal({
  open,
  lessons,
  activeProjectTitle,
  onClose,
  onAddLesson,
  onDeleteLesson,
}: LearningModalProps) {
  const [category, setCategory] = useState<LearningCategory>('camera');
  const [rating, setRating] = useState(5);
  const [insight, setInsight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const check = validateLessonInput({ insight, rating });
    if (!check.valid) {
      setError(check.error || 'Datos inválidos.');
      return;
    }

    setBusy(true);
    try {
      await onAddLesson({
        category,
        insight: insight.trim(),
        rating,
        sourceProjectTitle: activeProjectTitle || 'LumenReel Studio',
      });
      setInsight('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la lección.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="learning-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border border-white/12 bg-[#121218] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-[#E5A93C]" />
            <div>
              <h2
                id="learning-modal-title"
                className="font-display text-lg font-semibold text-[#F2F0EB]"
              >
                Autoaprendizaje y Mejora Continua
              </h2>
              <p className="text-xs text-[#8D8981] mt-0.5">
                Las lecciones mejor valoradas y las versiones finales aprobadas entrenan al productor para próximas secuencias.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de aprendizaje"
            className="p-2 rounded-lg text-[#9A968E] hover:text-[#F2F0EB] hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl border border-white/10 bg-[#0B0B0E] space-y-3"
          >
            <div className="text-xs font-semibold text-[#F2F0EB]">
              Registrar nueva regla o mejora de dirección
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="learning-category"
                  className="block text-[11px] font-medium text-[#9A968E] mb-1"
                >
                  Disciplina cinematográfica
                </label>
                <select
                  id="learning-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as LearningCategory)}
                  className="w-full rounded-lg border border-white/12 bg-[#14141B] px-3 py-2 text-xs text-[#F2F0EB] focus:border-[#E5A93C] focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {LEARNING_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="learning-rating"
                  className="block text-[11px] font-medium text-[#9A968E] mb-1"
                >
                  Prioridad / Calificación (1–5)
                </label>
                <select
                  id="learning-rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/12 bg-[#14141B] px-3 py-2 text-xs text-[#F2F0EB] font-mono-tech focus:border-[#E5A93C] focus:outline-none"
                >
                  <option value={5}>5 — Criterio maestro obligatorio</option>
                  <option value={4}>4 — Muy recomendado</option>
                  <option value={3}>3 — Referencia útil</option>
                  <option value={2}>2 — Ajuste menor</option>
                  <option value={1}>1 — Nota experimental</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="learning-insight"
                className="block text-[11px] font-medium text-[#9A968E] mb-1"
              >
                Aprendizaje técnico o corrección para el productor
              </label>
              <textarea
                id="learning-insight"
                rows={2}
                value={insight}
                onChange={(e) => setInsight(e.target.value)}
                placeholder="Ej: En diálogos nocturnos con lluvia, usar contraste 6:1 a 5600K y reducir diálogos expositivos en favor de planos detalle."
                className="w-full rounded-lg border border-white/12 bg-[#14141B] p-2.5 text-xs text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#EF4444]/35 bg-[#3B1515]/50 px-3 py-2 text-xs text-[#FCA5A5]"
              >
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] disabled:opacity-60 text-[#0B0B0E] text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{busy ? 'Guardando...' : 'Incorporar a la memoria'}</span>
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9A968E]">
              <span>Memoria activa inyectada en nuevas producciones</span>
              <span className="font-mono-tech tabular-nums">{lessons.length} lecciones</span>
            </div>

            {lessons.length === 0 ? (
              <p className="text-xs text-[#8D8981] py-6 text-center">
                Aún no hay lecciones registradas. Aprueba una Versión Final o añade un criterio arriba.
              </p>
            ) : (
              <div className="space-y-2.5">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="p-3.5 rounded-lg border border-white/10 bg-[#17171F] flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tech">
                        <span className="text-[#E5A93C] font-semibold">
                          {LEARNING_CATEGORY_LABELS[lesson.category] || lesson.category}
                        </span>
                        <span aria-hidden="true" className="text-[#6E6A63]">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#C8C3BA]">
                          <Star className="w-3 h-3 text-[#E5A93C]" />
                          {lesson.rating}/5
                        </span>
                        <span aria-hidden="true" className="text-[#6E6A63]">
                          ·
                        </span>
                        <span className="text-[#8D8981] truncate max-w-[240px]">
                          {lesson.sourceProjectTitle}
                        </span>
                      </div>
                      <p className="text-xs text-[#EAE6DE] leading-relaxed">{lesson.insight}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteLesson(lesson.id)}
                      aria-label="Eliminar lección"
                      className="p-1.5 rounded-md text-[#8D8981] hover:text-[#FCA5A5] hover:bg-white/5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
