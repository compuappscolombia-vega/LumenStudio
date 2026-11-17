import type {
  DirectorialEnhancement,
  LearningLesson,
  PatternMetric,
  ProductionProject,
  ProductionSequence,
  StudioIntelligenceReport,
} from '../types/studio';

function pushPattern(
  map: Map<string, { detail: string; ratings: number[]; projects: Set<string> }>,
  label: string,
  detail: string,
  rating: number,
  projectTitle: string
) {
  const key = label.trim();
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    existing.ratings.push(rating);
    existing.projects.add(projectTitle);
  } else {
    map.set(key, {
      detail,
      ratings: [rating],
      projects: new Set([projectTitle]),
    });
  }
}

function finalizePatterns(
  map: Map<string, { detail: string; ratings: number[]; projects: Set<string> }>,
  limit = 3
): PatternMetric[] {
  return Array.from(map.entries())
    .map(([label, entry]) => {
      const avg =
        entry.ratings.reduce((sum, r) => sum + r, 0) / Math.max(1, entry.ratings.length);
      return {
        label,
        detail: entry.detail,
        occurrences: entry.ratings.length,
        avgRating: Math.round(avg * 10) / 10,
        sourceProjects: Array.from(entry.projects),
      };
    })
    .sort((a, b) => b.avgRating - a.avgRating || b.occurrences - a.occurrences)
    .slice(0, limit);
}

export function buildStudioIntelligence(params: {
  projects: ProductionProject[];
  lessons: LearningLesson[];
  activeProject: ProductionProject | null;
  activeSequence: ProductionSequence;
}): StudioIntelligenceReport {
  const { projects, lessons, activeProject, activeSequence } = params;

  const cameraMap = new Map<
    string,
    { detail: string; ratings: number[]; projects: Set<string> }
  >();
  const lightingMap = new Map<
    string,
    { detail: string; ratings: number[]; projects: Set<string> }
  >();
  const soundMap = new Map<
    string,
    { detail: string; ratings: number[]; projects: Set<string> }
  >();

  let finalizedSequencesCount = 0;

  for (const proj of projects) {
    for (const seq of proj.sequences) {
      const seqScore = seq.sequenceRating ?? (seq.versionStatus === 'final' ? 5 : 3);
      if (seq.versionStatus === 'final') {
        finalizedSequencesCount += 1;
      }
      if (seq.versionStatus === 'final' || (seq.sequenceRating ?? 0) >= 4) {
        pushPattern(
          cameraMap,
          seq.cameraSystem,
          `${seq.lensPackage} · ${seq.aspectRatio}`,
          seqScore,
          proj.title
        );
        if (seq.lighting?.colorTemperatureKelvin) {
          pushPattern(
            lightingMap,
            seq.lighting.colorTemperatureKelvin,
            `${seq.lighting.fillRatio} · ${seq.lighting.keyLight}`,
            seqScore,
            proj.title
          );
        }
        if (seq.soundDesign?.subBassCue) {
          pushPattern(
            soundMap,
            `${seq.soundDesign.tempoBpm} BPM · LFE`,
            seq.soundDesign.subBassCue,
            seqScore,
            proj.title
          );
        }
      }
    }
  }

  for (const lesson of lessons) {
    if (lesson.rating < 4) continue;
    if (lesson.category === 'camera' || lesson.category === 'pacing') {
      pushPattern(
        cameraMap,
        lesson.insight.slice(0, 68),
        lesson.insight,
        lesson.rating,
        lesson.sourceProjectTitle
      );
    } else if (lesson.category === 'lighting') {
      pushPattern(
        lightingMap,
        lesson.insight.slice(0, 68),
        lesson.insight,
        lesson.rating,
        lesson.sourceProjectTitle
      );
    } else if (lesson.category === 'sound') {
      pushPattern(
        soundMap,
        lesson.insight.slice(0, 68),
        lesson.insight,
        lesson.rating,
        lesson.sourceProjectTitle
      );
    }
  }

  const topCameraPatterns = finalizePatterns(cameraMap, 3);
  const topLightingSetups = finalizePatterns(lightingMap, 3);
  const topSoundscapes = finalizePatterns(soundMap, 3);

  const enhancements: DirectorialEnhancement[] = [];
  const activeTitle = activeProject?.title || '';

  // 1. Camera enhancement from cross-project high-rated outcomes or top camera lessons
  const externalCam =
    lessons.find((l) => (l.category === 'camera' || l.category === 'pacing') && l.rating >= 4) ||
    null;
  const bestCamPattern =
    topCameraPatterns.find((p) => !p.sourceProjects.includes(activeTitle)) ||
    topCameraPatterns[0];

  if (externalCam) {
    enhancements.push({
      id: `enh-cam-${externalCam.id}`,
      category: 'camera',
      title: 'Refinamiento de Óptica y Cadencia de Cámara',
      recommendation: externalCam.insight,
      rationale: `Validado con ${externalCam.rating}/5 ★ en "${externalCam.sourceProjectTitle}".`,
      sourceProjectTitle: externalCam.sourceProjectTitle,
      confidenceScore: Math.min(98, 70 + externalCam.rating * 5),
      continuitySnippet: `[Mejora de Cámara · Studio Intelligence]: ${externalCam.insight}`,
    });
  } else if (bestCamPattern) {
    enhancements.push({
      id: 'enh-cam-pattern',
      category: 'camera',
      title: `Adoptar referencia óptica (${bestCamPattern.label})`,
      recommendation: `Combinar ${activeSequence.cameraSystem} con ${bestCamPattern.detail} para reforzar el peso visual de la escena.`,
      rationale: `Promedio ${bestCamPattern.avgRating}/5 ★ en ${bestCamPattern.occurrences} producciones aprobadas.`,
      sourceProjectTitle: bestCamPattern.sourceProjects[0] || 'Archivo del Estudio',
      confidenceScore: Math.min(96, Math.round(bestCamPattern.avgRating * 18)),
      continuitySnippet: `[Mejora de Cámara · Studio Intelligence]: Referencia ${bestCamPattern.label} (${bestCamPattern.detail}).`,
    });
  }

  // 2. Lighting enhancement
  const externalLight =
    lessons.find((l) => l.category === 'lighting' && l.rating >= 4) || null;
  const bestLightPattern =
    topLightingSetups.find((p) => !p.sourceProjects.includes(activeTitle)) ||
    topLightingSetups[0];

  if (externalLight) {
    enhancements.push({
      id: `enh-light-${externalLight.id}`,
      category: 'lighting',
      title: 'Contraste Térmico e Iluminación Motivada',
      recommendation: externalLight.insight,
      rationale: `Validado con ${externalLight.rating}/5 ★ en "${externalLight.sourceProjectTitle}".`,
      sourceProjectTitle: externalLight.sourceProjectTitle,
      confidenceScore: Math.min(97, 68 + externalLight.rating * 5),
      continuitySnippet: `[Mejora de Iluminación · Studio Intelligence]: ${externalLight.insight}`,
    });
  } else if (bestLightPattern) {
    enhancements.push({
      id: 'enh-light-pattern',
      category: 'lighting',
      title: `Contraste probado (${bestLightPattern.label})`,
      recommendation: `Aplicar separación térmica (${bestLightPattern.detail}) frente a la luz principal actual (${activeSequence.lighting.colorTemperatureKelvin}).`,
      rationale: `Promedio ${bestLightPattern.avgRating}/5 ★ en "${bestLightPattern.sourceProjects[0] || 'Archivo del Estudio'}".`,
      sourceProjectTitle: bestLightPattern.sourceProjects[0] || 'Archivo del Estudio',
      confidenceScore: Math.min(95, Math.round(bestLightPattern.avgRating * 18)),
      continuitySnippet: `[Mejora de Iluminación · Studio Intelligence]: ${bestLightPattern.label} — ${bestLightPattern.detail}.`,
    });
  }

  // 3. Soundscape enhancement
  const externalSound =
    lessons.find((l) => l.category === 'sound' && l.rating >= 4) || null;
  const bestSoundPattern =
    topSoundscapes.find((p) => !p.sourceProjects.includes(activeTitle)) ||
    topSoundscapes[0];

  if (externalSound) {
    enhancements.push({
      id: `enh-sound-${externalSound.id}`,
      category: 'sound',
      title: 'Arquitectura Atmos y Subgraves Dramáticos',
      recommendation: externalSound.insight,
      rationale: `Validado con ${externalSound.rating}/5 ★ en "${externalSound.sourceProjectTitle}".`,
      sourceProjectTitle: externalSound.sourceProjectTitle,
      confidenceScore: Math.min(98, 70 + externalSound.rating * 5),
      continuitySnippet: `[Mejora Sonora · Studio Intelligence]: ${externalSound.insight}`,
    });
  } else if (bestSoundPattern) {
    enhancements.push({
      id: 'enh-sound-pattern',
      category: 'sound',
      title: `Diseño Subgrave y Silencio (${bestSoundPattern.label})`,
      recommendation: `Integrar textura LFE de referencia (${bestSoundPattern.detail}) manteniendo ${activeSequence.soundDesign.tempoBpm} BPM.`,
      rationale: `Promedio ${bestSoundPattern.avgRating}/5 ★ en "${bestSoundPattern.sourceProjects[0] || 'Archivo del Estudio'}".`,
      sourceProjectTitle: bestSoundPattern.sourceProjects[0] || 'Archivo del Estudio',
      confidenceScore: Math.min(94, Math.round(bestSoundPattern.avgRating * 18)),
      continuitySnippet: `[Mejora Sonora · Studio Intelligence]: ${bestSoundPattern.label} (${bestSoundPattern.detail}).`,
    });
  }

  return {
    totalTrackedOutcomes:
      finalizedSequencesCount + lessons.filter((l) => l.rating >= 4).length,
    finalizedSequencesCount,
    topCameraPatterns,
    topLightingSetups,
    topSoundscapes,
    enhancements,
  };
}

export function buildRatedChoiceLessons(params: {
  projectTitle: string;
  sequence: ProductionSequence;
  rating: number;
  note?: string;
}): Omit<LearningLesson, 'id' | 'createdAt'>[] {
  const safeRating = Math.min(5, Math.max(1, Math.round(params.rating)));
  const lessons: Omit<LearningLesson, 'id' | 'createdAt'>[] = [];
  const noteSuffix = params.note?.trim() ? ` Nota: ${params.note.trim()}` : '';

  lessons.push({
    category: 'camera',
    insight: `${params.sequence.cameraSystem} + ${params.sequence.lensPackage} (${params.sequence.aspectRatio}).${noteSuffix}`,
    rating: safeRating,
    sourceProjectTitle: params.projectTitle,
  });

  if (params.sequence.lighting?.colorTemperatureKelvin) {
    lessons.push({
      category: 'lighting',
      insight: `${params.sequence.lighting.colorTemperatureKelvin} · ${params.sequence.lighting.fillRatio}.${noteSuffix}`,
      rating: safeRating,
      sourceProjectTitle: params.projectTitle,
    });
  }

  if (params.sequence.soundDesign?.subBassCue) {
    lessons.push({
      category: 'sound',
      insight: `${params.sequence.soundDesign.tempoBpm} BPM · ${params.sequence.soundDesign.subBassCue}.${noteSuffix}`,
      rating: safeRating,
      sourceProjectTitle: params.projectTitle,
    });
  }

  return lessons;
}
