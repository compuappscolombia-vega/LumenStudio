import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRatedChoiceLessons,
  buildStudioIntelligence,
} from './studioIntelligence';
import type {
  LearningLesson,
  ProductionProject,
  ProductionSequence,
} from '../types/studio';

function makeFixtureSequence(params: {
  id: string;
  title: string;
  cameraSystem: string;
  kelvin: string;
  bpm: number;
  versionStatus: 'draft' | 'final';
}): ProductionSequence {
  return {
    id: params.id,
    title: params.title,
    versionStatus: params.versionStatus,
    sourceType: 'story',
    directorStyle: 'Ciencia Ficción Visionaria',
    aspectRatio: '1.43:1',
    cameraSystem: params.cameraSystem,
    lensPackage: 'Zeiss Supreme Prime (29mm, 50mm)',
    filmStockOrLut: 'Kodak 2383 LUT',
    logline: 'Una ingeniera repara una antena orbital antes de la tormenta.',
    directorVision: 'Escala industrial y silencio espacial.',
    colorPalette: [{ name: 'Titanio', hex: '#14161A', role: 'Estructura' }],
    lighting: {
      keyLight: 'Luz solar directa dura',
      fillRatio: '10:1',
      rimAndBacklight: 'Contraluz cálido de baliza',
      colorTemperatureKelvin: params.kelvin,
      atmosphereAndHaze: 'Vacío limpio',
    },
    shotList: [],
    soundDesign: {
      atmosLayers: ['Resonancia metálica'],
      subBassCue: 'Vibración estructural de 28 Hz',
      foleyDetails: ['Anclaje magnético'],
      silenceBeats: 'Silencio total antes de cortar',
      musicalScore: 'Sintetizador modular grave',
      tempoBpm: params.bpm,
    },
    vfx: {
      cgiElements: ['Extensión orbital'],
      practicalSfx: ['Pasarela en gimbal'],
      locationsAndSets: 'Set de pasarela espacial',
      wardrobeAndMakeup: 'Traje EVA gris carbón',
    },
    screenplay: [],
    storyboardFrames: [],
    continuitySummary: 'Reparación completada en órbita.',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

const SAMPLE_PROJECTS: ProductionProject[] = [
  {
    id: 'proj-alpha',
    title: 'Horizonte Norte',
    genreStyle: 'Épica Monumental IMAX',
    defaultSourceType: 'book',
    continuityBible: 'Lentes anamórficos y alto contraste.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sequences: [
      makeFixtureSequence({
        id: 'seq-a1',
        title: 'Escena 1',
        cameraSystem: 'ARRI Alexa 65 IMAX',
        kelvin: '6200K exterior · 2900K antorchas',
        bpm: 54,
        versionStatus: 'final',
      }),
    ],
  },
  {
    id: 'proj-beta',
    title: 'La Última Frecuencia',
    genreStyle: 'Thriller Psicológico Neo-Noir',
    defaultSourceType: 'audiobook',
    continuityBible: 'Iluminación de tungsteno cálido.',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    sequences: [
      makeFixtureSequence({
        id: 'seq-b1',
        title: 'Cinta 14-B',
        cameraSystem: 'RED V-Raptor XL 8K VV',
        kelvin: '2600K interior · 5600K tormenta',
        bpm: 68,
        versionStatus: 'draft',
      }),
    ],
  },
  {
    id: 'proj-gamma',
    title: 'Órbita Silenciosa',
    genreStyle: 'Ciencia Ficción Visionaria',
    defaultSourceType: 'story',
    continuityBible: 'Solo luz práctica de consola.',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    sequences: [
      makeFixtureSequence({
        id: 'seq-g1',
        title: 'Secuencia 04',
        cameraSystem: 'Sony VENICE 2 8.6K',
        kelvin: '3800K corona · 5500K balizas',
        bpm: 48,
        versionStatus: 'final',
      }),
    ],
  },
];

const SAMPLE_LESSONS: LearningLesson[] = [
  {
    id: 'l-1',
    category: 'camera',
    insight: 'Sostener planos IMAX 1.43:1 de 10s con grúa lenta antes del corte.',
    rating: 5,
    sourceProjectTitle: 'Horizonte Norte',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'l-2',
    category: 'lighting',
    insight: 'Contraste térmico 2900K vs 6200K para separar interiores y exterior.',
    rating: 5,
    sourceProjectTitle: 'Horizonte Norte',
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'l-3',
    category: 'sound',
    insight: 'Silencio de 1.5s antes del golpe LFE a 32 Hz.',
    rating: 4,
    sourceProjectTitle: 'La Última Frecuencia',
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];

test('buildStudioIntelligence aggregates cross-project camera, lighting, and sound patterns', () => {
  const activeProject = SAMPLE_PROJECTS[1];
  const activeSequence = activeProject.sequences[0];

  const report = buildStudioIntelligence({
    projects: SAMPLE_PROJECTS,
    lessons: SAMPLE_LESSONS,
    activeProject,
    activeSequence,
  });

  assert.ok(report.finalizedSequencesCount >= 2);
  assert.ok(report.totalTrackedOutcomes >= 5);
  assert.ok(report.topCameraPatterns.length > 0);
  assert.ok(report.topLightingSetups.length > 0);
  assert.ok(report.topSoundscapes.length > 0);
  assert.equal(report.enhancements.length, 3);
  assert.deepEqual(
    report.enhancements.map((e) => e.category),
    ['camera', 'lighting', 'sound']
  );
});

test('buildRatedChoiceLessons extracts camera, lighting, and sound lessons with clamped rating', () => {
  const seq = SAMPLE_PROJECTS[0].sequences[0];
  const lessons = buildRatedChoiceLessons({
    projectTitle: SAMPLE_PROJECTS[0].title,
    sequence: seq,
    rating: 5,
    note: 'Funciona excelente en IMAX',
  });

  assert.equal(lessons.length, 3);
  assert.equal(lessons[0].category, 'camera');
  assert.equal(lessons[1].category, 'lighting');
  assert.equal(lessons[2].category, 'sound');
  assert.ok(lessons[0].insight.includes('Funciona excelente en IMAX'));
});
