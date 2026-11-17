import type { ProductionProject, ProductionSequence } from '../types/studio';

export type ProductionAxisKey = 'screenplay' | 'lighting' | 'vfx' | 'sound';

export interface ProductionRadarAxis {
  key: ProductionAxisKey;
  axis: string;
  projectScore: number;
  sequenceScore: number;
  detailSummary: string;
}

export interface ProductionRadarReport {
  axes: ProductionRadarAxis[];
  overallProjectScore: number;
  sequencesCount: number;
  finalCount: number;
  hasContent: boolean;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreNonEmpty(text: string | undefined, minRichLength = 18): number {
  const clean = (text || '').trim();
  if (!clean) return 0;
  if (clean.length >= minRichLength) return 1;
  return 0.6;
}

function scoreSequenceAxes(seq: ProductionSequence): {
  screenplay: number;
  lighting: number;
  vfx: number;
  sound: number;
  counts: {
    scenes: number;
    beats: number;
    paletteCount: number;
    vfxItems: number;
    renderedFrames: number;
    soundItems: number;
  };
} {
  // 1. Guion (screenplay)
  const scenes = seq.screenplay || [];
  const totalBeats = scenes.reduce((acc, sc) => acc + (sc.beats?.length || 0), 0);
  const dialogueBeats = scenes.reduce(
    (acc, sc) => acc + (sc.beats?.filter((b) => b.type === 'dialogue').length || 0),
    0
  );
  const technicalBeats = scenes.reduce(
    (acc, sc) =>
      acc +
      (sc.beats?.filter((b) => b.type === 'camera' || b.type === 'sound').length || 0),
    0
  );
  const screenplayRaw =
    Math.min(35, scenes.length * 14) +
    Math.min(35, totalBeats * 3.5) +
    Math.min(15, dialogueBeats * 5) +
    Math.min(15, technicalBeats * 5);

  // 2. Diseño de iluminación (lighting + colorimetry)
  const lightingFields = [
    scoreNonEmpty(seq.lighting?.keyLight, 15),
    scoreNonEmpty(seq.lighting?.fillRatio, 8),
    scoreNonEmpty(seq.lighting?.rimAndBacklight, 12),
    scoreNonEmpty(seq.lighting?.colorTemperatureKelvin, 4),
    scoreNonEmpty(seq.lighting?.atmosphereAndHaze, 12),
  ];
  const lightingFieldScore = (lightingFields.reduce((a, b) => a + b, 0) / 5) * 60;
  const paletteScore = Math.min(25, (seq.colorPalette?.length || 0) * 5);
  const lutScore = scoreNonEmpty(seq.filmStockOrLut, 6) * 15;
  const lightingRaw = lightingFieldScore + paletteScore + lutScore;

  // 3. Efectos visuales (vfx + SFX + storyboard visual frames)
  const cgiCount = seq.vfx?.cgiElements?.length || 0;
  const sfxCount = seq.vfx?.practicalSfx?.length || 0;
  const frames = seq.storyboardFrames || [];
  const promptFrames = frames.filter((f) => (f.visualPrompt || '').trim().length > 10).length;
  const renderedFrames = frames.filter((f) => Boolean(f.imageUrl || f.videoUrl)).length;
  const vfxRaw =
    Math.min(24, cgiCount * 8) +
    Math.min(20, sfxCount * 7) +
    scoreNonEmpty(seq.vfx?.locationsAndSets, 15) * 14 +
    scoreNonEmpty(seq.vfx?.wardrobeAndMakeup, 15) * 12 +
    Math.min(15, promptFrames * 5) +
    Math.min(15, renderedFrames * 7.5);

  // 4. Diseño sonoro (soundDesign + audioAnalysis)
  const atmosCount = seq.soundDesign?.atmosLayers?.length || 0;
  const foleyCount = seq.soundDesign?.foleyDetails?.length || 0;
  const audioBonus = seq.audioAnalysis
    ? 10 + Math.min(5, (seq.audioAnalysis.detectedSoundEffects?.length || 0) * 2)
    : 0;
  const soundRaw =
    Math.min(25, atmosCount * 8.5) +
    Math.min(20, foleyCount * 7) +
    scoreNonEmpty(seq.soundDesign?.subBassCue, 10) * 15 +
    scoreNonEmpty(seq.soundDesign?.silenceBeats, 10) * 12 +
    scoreNonEmpty(seq.soundDesign?.musicalScore, 10) * 13 +
    (seq.soundDesign?.tempoBpm ? 5 : 0) +
    audioBonus;

  return {
    screenplay: clampScore(screenplayRaw),
    lighting: clampScore(lightingRaw),
    vfx: clampScore(vfxRaw),
    sound: clampScore(soundRaw),
    counts: {
      scenes: scenes.length,
      beats: totalBeats,
      paletteCount: seq.colorPalette?.length || 0,
      vfxItems: cgiCount + sfxCount,
      renderedFrames,
      soundItems: atmosCount + foleyCount,
    },
  };
}

export function computeProductionRadarMetrics(
  project: ProductionProject | null,
  activeSequence?: ProductionSequence | null
): ProductionRadarReport {
  if (!project || project.sequences.length === 0) {
    return {
      axes: [
        {
          key: 'screenplay',
          axis: 'Guion',
          projectScore: 0,
          sequenceScore: 0,
          detailSummary: '0 escenas · 0 beats',
        },
        {
          key: 'lighting',
          axis: 'Diseño de iluminación',
          projectScore: 0,
          sequenceScore: 0,
          detailSummary: 'Sin esquema Kelvin ni paleta',
        },
        {
          key: 'vfx',
          axis: 'Efectos visuales',
          projectScore: 0,
          sequenceScore: 0,
          detailSummary: '0 VFX/SFX · 0 frames',
        },
        {
          key: 'sound',
          axis: 'Diseño sonoro',
          projectScore: 0,
          sequenceScore: 0,
          detailSummary: '0 capas Atmos/Foley',
        },
      ],
      overallProjectScore: 0,
      sequencesCount: 0,
      finalCount: 0,
      hasContent: false,
    };
  }

  const scored = project.sequences.map((seq) => ({
    id: seq.id,
    ...scoreSequenceAxes(seq),
  }));

  const count = scored.length;
  const avg = (picker: (item: (typeof scored)[number]) => number) =>
    clampScore(scored.reduce((acc, item) => acc + picker(item), 0) / count);

  const targetSeqScore = activeSequence
    ? scored.find((s) => s.id === activeSequence.id) || scored[0]
    : scored[0];

  const totalScenes = scored.reduce((acc, s) => acc + s.counts.scenes, 0);
  const totalBeats = scored.reduce((acc, s) => acc + s.counts.beats, 0);
  const totalVfx = scored.reduce((acc, s) => acc + s.counts.vfxItems, 0);
  const totalFrames = scored.reduce((acc, s) => acc + s.counts.renderedFrames, 0);
  const totalSound = scored.reduce((acc, s) => acc + s.counts.soundItems, 0);
  const avgPalette = Math.round(
    scored.reduce((acc, s) => acc + s.counts.paletteCount, 0) / count
  );

  // Small continuity bonus up to +5 if project has a populated continuityBible
  const bibleBonus = (project.continuityBible || '').trim().length >= 40 ? 4 : 0;

  const projectScreenplay = clampScore(avg((s) => s.screenplay) + bibleBonus);
  const projectLighting = avg((s) => s.lighting);
  const projectVfx = avg((s) => s.vfx);
  const projectSound = avg((s) => s.sound);

  const axes: ProductionRadarAxis[] = [
    {
      key: 'screenplay',
      axis: 'Guion',
      projectScore: projectScreenplay,
      sequenceScore: targetSeqScore.screenplay,
      detailSummary: `${totalScenes} ${totalScenes === 1 ? 'escena' : 'escenas'} · ${totalBeats} beats`,
    },
    {
      key: 'lighting',
      axis: 'Diseño de iluminación',
      projectScore: projectLighting,
      sequenceScore: targetSeqScore.lighting,
      detailSummary: `${avgPalette} tonos · esquema Kelvin y contraste`,
    },
    {
      key: 'vfx',
      axis: 'Efectos visuales',
      projectScore: projectVfx,
      sequenceScore: targetSeqScore.vfx,
      detailSummary: `${totalVfx} CGI/SFX · ${totalFrames} visuales generados`,
    },
    {
      key: 'sound',
      axis: 'Diseño sonoro',
      projectScore: projectSound,
      sequenceScore: targetSeqScore.sound,
      detailSummary: `${totalSound} capas Atmos/Foley · score`,
    },
  ];

  const overallProjectScore = clampScore(
    (projectScreenplay + projectLighting + projectVfx + projectSound) / 4
  );

  return {
    axes,
    overallProjectScore,
    sequencesCount: count,
    finalCount: project.sequences.filter((s) => s.versionStatus === 'final').length,
    hasContent: true,
  };
}
