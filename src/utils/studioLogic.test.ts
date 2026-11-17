import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAspectRatio,
  validateSequenceInput,
  filterProjects,
  computeProjectStats,
  buildContinuationContext,
  formatScreenplayMarkdown,
  formatFountainScreenplay,
} from './studioLogic';
import type { ProductionProject, ProductionSequence } from '../types/studio';

const sampleSequence: ProductionSequence = {
  id: 'seq-1',
  title: 'Capítulo I: El Cruce del Puente',
  versionStatus: 'final',
  sourceType: 'book',
  directorStyle: 'Épica Monumental IMAX',
  aspectRatio: '1.43:1',
  cameraSystem: 'ARRI Alexa 65',
  lensPackage: 'Panavision Sphero 65',
  filmStockOrLut: 'Kodak 2383 Contrast',
  logline: 'Dos viajeros cruzan un puente colgante bajo la tormenta invernal.',
  directorVision: 'Escala monumental y silencio tenso.',
  colorPalette: [{ name: 'Obsidiana', hex: '#0E1015', role: 'Roca y sombras' }],
  lighting: {
    keyLight: 'Luz lunar cenital fría',
    fillRatio: '8:1 Chiaroscuro',
    rimAndBacklight: 'Halo plateado a contraluz',
    colorTemperatureKelvin: '5800K / 2900K',
    atmosphereAndHaze: 'Niebla densa sobre el cañón',
  },
  shotList: [
    {
      shotNumber: '01A',
      shotType: 'EWS',
      lensMm: '24mm',
      movement: 'Technocrane descendente',
      durationSec: 18,
      framingNote: 'Puente rodeado de niebla',
      psychologicalIntent: 'Aislamiento ante la inmensidad',
    },
    {
      shotNumber: '01B',
      shotType: 'ECU',
      lensMm: '85mm',
      movement: 'Fijo en trípode pesado',
      durationSec: 12,
      framingNote: 'Mano sujetando la cuerda',
      psychologicalIntent: 'Tensión inminente',
    },
  ],
  soundDesign: {
    atmosLayers: ['Viento de cañón'],
    subBassCue: '22 Hz constante',
    foleyDetails: ['Madera crujiendo'],
    silenceBeats: '2 segundos antes del paso final',
    musicalScore: 'Coro disonante y cuerno de bronce',
    tempoBpm: 56,
  },
  vfx: {
    cgiElements: ['Extensión de abismo'],
    practicalSfx: ['Nieve artificial en set'],
    locationsAndSets: 'Cañón rocoso norteño',
    wardrobeAndMakeup: 'Abrigos de cuero y lana oscura',
  },
  screenplay: [
    {
      sceneNumber: '01',
      slugline: 'EXT. PUENTE COLGANTE DEL NORTE - NOCHE',
      timeOfDay: 'NOCHE',
      beats: [
        { type: 'camera', text: 'Plano aéreo IMAX descendiendo sobre el puente.' },
        {
          type: 'dialogue',
          character: 'ELENA',
          parenthetical: 'voz firme',
          text: 'No mires hacia abajo hasta alcanzar el otro lado.',
        },
      ],
    },
  ],
  storyboardFrames: [],
  continuitySummary: 'Los viajeros logran cruzar antes del colapso.',
  createdAt: '2026-11-16T10:00:00.000Z',
};

const sampleProject: ProductionProject = {
  id: 'proj-sample',
  title: 'Crónicas del Invierno',
  genreStyle: 'Épica IMAX',
  defaultSourceType: 'book',
  continuityBible: 'Contraste frío en exteriores.',
  createdAt: '2026-11-16T10:00:00.000Z',
  updatedAt: '2026-11-16T10:00:00.000Z',
  sequences: [sampleSequence],
};

test('parseAspectRatio parses valid ratios and falls back on malformed values', () => {
  assert.equal(parseAspectRatio('2.39:1'), 2.39);
  assert.equal(parseAspectRatio('1.43:1'), 1.43);
  assert.ok(Math.abs(parseAspectRatio('16:9') - 16 / 9) < 0.0001);
  assert.ok(Math.abs(parseAspectRatio('invalid') - 16 / 9) < 0.0001);
});

test('validateSequenceInput enforces title and text/file presence', () => {
  const emptyRes = validateSequenceInput({
    sequenceTitle: '',
    sourceText: 'corto',
    hasFile: false,
  });
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.errors.length, 2);

  const fileOk = validateSequenceInput({
    sequenceTitle: 'Escena de Audiolibro',
    sourceText: '',
    hasFile: true,
  });
  assert.equal(fileOk.valid, true);
});

test('filterProjects filters by title, genre, or sequence title', () => {
  const other: ProductionProject = {
    ...sampleProject,
    id: 'proj-2',
    title: 'La Última Frecuencia',
    genreStyle: 'Neo-Noir',
    sequences: [],
  };
  assert.equal(filterProjects([sampleProject, other], 'puente').length, 1);
  assert.equal(filterProjects([sampleProject, other], 'noir').length, 1);
  assert.equal(filterProjects([sampleProject, other], '').length, 2);
});

test('computeProjectStats aggregates shots and duration accurately', () => {
  const stats = computeProjectStats(sampleProject);
  assert.equal(stats.sequenceCount, 1);
  assert.equal(stats.shotCount, 2);
  assert.equal(stats.estimatedMinutes, 0.5);
});

test('buildContinuationContext appends without duplicating', () => {
  const updated = buildContinuationContext(
    'Regla base.',
    'Cap. I',
    'Cruce completado.'
  );
  assert.match(updated, /\[Cap\. I\]: Cruce completado\./);
  const deduplicated = buildContinuationContext(updated, 'Cap. I', 'Cruce completado.');
  assert.equal(deduplicated, updated);
});

test('formatScreenplayMarkdown and formatFountainScreenplay emit structured exports', () => {
  const md = formatScreenplayMarkdown(sampleProject.title, sampleSequence);
  assert.match(md, /CRÓNICAS DEL INVIERNO/);
  assert.match(md, /EXT\. PUENTE COLGANTE DEL NORTE - NOCHE/);
  assert.match(md, /\*\*ELENA\*\*/);

  const fountain = formatFountainScreenplay(sampleProject.title, sampleSequence);
  assert.match(fountain, /Title: Crónicas del Invierno/);
  assert.match(fountain, /ELENA/);
});
