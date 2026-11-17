import type {
  LearningCategory,
  LearningLesson,
  ProductionProject,
  ProductionSequence,
} from '../types/studio';

export const LEARNING_CATEGORY_LABELS: Record<LearningCategory, string> = {
  camera: 'Cámara y Óptica',
  lighting: 'Iluminación',
  sound: 'Diseño Sonoro',
  screenplay: 'Guion',
  pacing: 'Ritmo y Montaje',
  continuity: 'Continuidad',
};

export function canExportPdfForSequence(
  sequence: ProductionSequence | null | undefined
): boolean {
  return Boolean(sequence && sequence.versionStatus === 'final');
}

export function getFinalSequences(project: ProductionProject | null | undefined): ProductionSequence[] {
  if (!project) return [];
  return project.sequences.filter((seq) => seq.versionStatus === 'final');
}

export function extractAutomaticLessons(
  projectTitle: string,
  sequence: ProductionSequence
): Omit<LearningLesson, 'id' | 'createdAt'>[] {
  const lessons: Omit<LearningLesson, 'id' | 'createdAt'>[] = [];

  if (sequence.cameraSystem && sequence.lensPackage) {
    lessons.push({
      category: 'camera',
      insight: `Combinación aprobada en versión final (${sequence.aspectRatio}): ${sequence.cameraSystem} con ${sequence.lensPackage} para estilo ${sequence.directorStyle}.`,
      rating: 5,
      sourceProjectTitle: projectTitle,
    });
  }

  if (sequence.lighting?.colorTemperatureKelvin) {
    lessons.push({
      category: 'lighting',
      insight: `Esquema cromático aprobado: ${sequence.lighting.colorTemperatureKelvin} · ${sequence.lighting.fillRatio}.`,
      rating: 5,
      sourceProjectTitle: projectTitle,
    });
  }

  if (sequence.soundDesign?.subBassCue) {
    lessons.push({
      category: 'sound',
      insight: `Diseño sonoro aprobado (${sequence.soundDesign.tempoBpm} BPM): ${sequence.soundDesign.subBassCue}.`,
      rating: 5,
      sourceProjectTitle: projectTitle,
    });
  }

  return lessons;
}

export function buildLearningPromptContext(lessons: LearningLesson[], limit = 8): string {
  if (!lessons || lessons.length === 0) {
    return 'Sin lecciones previas registradas todavía.';
  }

  const prioritized = [...lessons]
    .sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return prioritized
    .map(
      (l, idx) =>
        `${idx + 1}. [${LEARNING_CATEGORY_LABELS[l.category] || l.category} · Val. ${l.rating}/5 · ${l.sourceProjectTitle}]: ${l.insight}`
    )
    .join('\n');
}

export function validateLessonInput(params: {
  insight: string;
  rating: number;
}): { valid: boolean; error?: string } {
  if (params.insight.trim().length < 5) {
    return {
      valid: false,
      error: 'Escribe una observación o mejora de al menos 5 caracteres.',
    };
  }
  if (!Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5) {
    return {
      valid: false,
      error: 'La valoración debe estar entre 1 y 5.',
    };
  }
  return { valid: true };
}
