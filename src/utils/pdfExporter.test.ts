import test from 'node:test';
import assert from 'node:assert/strict';
import { exportSequencePdf, exportLibraryPdf } from './pdfExporter';
import type { ProductionProject, ProductionSequence } from '../types/studio';

function makeSequence(versionStatus: 'draft' | 'final'): ProductionSequence {
  return {
    id: 'seq-test-1',
    title: 'Escena I: El Puerto en Bruma',
    versionStatus,
    sourceType: 'book',
    directorStyle: 'Drama Autoral',
    aspectRatio: '2.39:1',
    cameraSystem: 'ARRI Alexa 35',
    lensPackage: 'Cooke Anamorphic /i',
    filmStockOrLut: 'Kodak 2383 LUT',
    logline: 'Una capitana regresa al muelle abandonado.',
    directorVision: 'Planos sostenidos y luz natural fría.',
    colorPalette: [{ name: 'Bruma', hex: '#2B3540', role: 'Atmósfera' }],
    lighting: {
      keyLight: 'Luz difusa de amanecer',
      fillRatio: '6:1',
      rimAndBacklight: 'Contraluz tenue desde faro',
      colorTemperatureKelvin: '5400K',
      atmosphereAndHaze: 'Niebla marina',
    },
    shotList: [],
    soundDesign: {
      atmosLayers: ['Oleaje suave'],
      subBassCue: '32 Hz continuo',
      foleyDetails: ['Madera mojada'],
      silenceBeats: '1.5s antes del diálogo',
      musicalScore: 'Cuerdas minimalistas',
      tempoBpm: 60,
    },
    vfx: {
      cgiElements: ['Extensión de horizonte'],
      practicalSfx: ['Humo atmosférico'],
      locationsAndSets: 'Muelle industrial',
      wardrobeAndMakeup: 'Abrigo de lana húmedo',
    },
    screenplay: [],
    storyboardFrames: [],
    continuitySummary: 'Inicio de acto I en el puerto.',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeProject(versionStatus: 'draft' | 'final'): ProductionProject {
  return {
    id: 'proj-test-1',
    title: 'Crónicas del Puerto',
    genreStyle: 'Drama Autoral',
    defaultSourceType: 'book',
    continuityBible: 'Luz natural fría y paleta desaturada.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sequences: [makeSequence(versionStatus)],
  };
}

test('exportSequencePdf rejects draft sequences strictly', async () => {
  const draftProject = makeProject('draft');
  const draftSeq = draftProject.sequences[0];

  await assert.rejects(
    () => exportSequencePdf(draftProject, draftSeq),
    /Versión Final/i
  );
});

test('exportLibraryPdf rejects projects with no final sequences', async () => {
  const draftOnlyProject = makeProject('draft');

  await assert.rejects(
    () => exportLibraryPdf(draftOnlyProject),
    /Versión Final/i
  );
});
