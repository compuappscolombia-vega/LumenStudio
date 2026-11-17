import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canExportPdfForSequence,
  getFinalSequences,
  extractAutomaticLessons,
  buildLearningPromptContext,
  validateLessonInput,
} from './learningEngine';
import type { LearningLesson, ProductionProject, ProductionSequence } from '../types/studio';

const baseSeq: ProductionSequence = {
  id: 'seq-a',
  title: 'Secuencia Finalizada',
  versionStatus: 'final',
  sourceType: 'audiobook',
  directorStyle: 'Thriller Psicológico Neo-Noir',
  aspectRatio: '2.39:1',
  cameraSystem: 'RED V-Raptor XL',
  lensPackage: 'Cooke Anamorphic /i SF',
  filmStockOrLut: 'Kodak 2383',
  logline: 'Logline de prueba',
  directorVision: 'Visión de prueba',
  colorPalette: [],
  lighting: {
    keyLight: 'Tungsteno',
    fillRatio: '6:1',
    rimAndBacklight: 'Contraluz azul',
    colorTemperatureKelvin: '2600K / 5600K',
    atmosphereAndHaze: 'Niebla ligera',
  },
  shotList: [],
  soundDesign: {
    atmosLayers: ['Lluvia'],
    subBassCue: '32 Hz constante',
    foleyDetails: ['Clic de cinta'],
    silenceBeats: '2s antes de cortar',
    musicalScore: 'Chelo solista',
    tempoBpm: 68,
  },
  vfx: {
    cgiElements: [],
    practicalSfx: [],
    locationsAndSets: 'Faro costero',
    wardrobeAndMakeup: 'Parka mojada',
  },
  screenplay: [],
  storyboardFrames: [],
  continuitySummary: 'Resumen.',
  createdAt: '2026-11-16T10:00:00.000Z',
};

test('canExportPdfForSequence restricts export strictly to final version', () => {
  assert.equal(canExportPdfForSequence(baseSeq), true);
  assert.equal(canExportPdfForSequence({ ...baseSeq, versionStatus: 'draft' }), false);
  assert.equal(canExportPdfForSequence(null), false);
});

test('getFinalSequences returns only finalized sequences in a project', () => {
  const proj: ProductionProject = {
    id: 'p1',
    title: 'Proyecto',
    genreStyle: 'Neo-Noir',
    defaultSourceType: 'audiobook',
    continuityBible: '',
    createdAt: '2026-11-16T10:00:00.000Z',
    updatedAt: '2026-11-16T10:00:00.000Z',
    sequences: [baseSeq, { ...baseSeq, id: 'seq-b', versionStatus: 'draft' }],
  };
  assert.equal(getFinalSequences(proj).length, 1);
  assert.equal(getFinalSequences(proj)[0].id, 'seq-a');
});

test('extractAutomaticLessons distills camera, lighting, and sound insights', () => {
  const lessons = extractAutomaticLessons('La Última Frecuencia', baseSeq);
  assert.equal(lessons.length, 3);
  assert.equal(lessons[0].category, 'camera');
  assert.match(lessons[0].insight, /RED V-Raptor XL/);
});

test('buildLearningPromptContext orders highest rated lessons first', () => {
  const lessons: LearningLesson[] = [
    {
      id: 'l1',
      category: 'sound',
      insight: 'Evitar exceso de percusión en escenas íntimas.',
      rating: 3,
      sourceProjectTitle: 'A',
      createdAt: '2026-11-15T10:00:00.000Z',
    },
    {
      id: 'l2',
      category: 'camera',
      insight: 'Usar Cooke 40mm para primeros planos con tensión.',
      rating: 5,
      sourceProjectTitle: 'B',
      createdAt: '2026-11-16T10:00:00.000Z',
    },
  ];
  const promptCtx = buildLearningPromptContext(lessons, 5);
  assert.ok(promptCtx.indexOf('Cooke 40mm') < promptCtx.indexOf('percusión'));
});

test('validateLessonInput rejects short text and out-of-range ratings', () => {
  assert.equal(validateLessonInput({ insight: 'abc', rating: 5 }).valid, false);
  assert.equal(validateLessonInput({ insight: 'Buena iluminación.', rating: 6 }).valid, false);
  assert.equal(validateLessonInput({ insight: 'Buena iluminación.', rating: 4 }).valid, true);
});
