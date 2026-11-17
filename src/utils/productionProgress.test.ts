import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProductionRadarMetrics } from './productionProgress';
import type { ProductionProject, ProductionSequence } from '../types/studio';

function buildSampleSequence(overrides?: Partial<ProductionSequence>): ProductionSequence {
  return {
    id: 'seq-1',
    title: 'Secuencia de Prueba',
    versionStatus: 'draft',
    sourceType: 'book',
    directorStyle: 'Thriller Psicológico Neo-Noir',
    aspectRatio: '2.39:1',
    cameraSystem: 'RED V-Raptor',
    lensPackage: 'Cooke Anamorphic',
    filmStockOrLut: 'Kodak 2383 Print LUT',
    logline: 'Logline de prueba cinematográfica.',
    directorVision: 'Visión de dirección detallada.',
    colorPalette: [
      { name: 'Obsidiana', hex: '#0B0B0E', role: 'Sombras' },
      { name: 'Ámbar', hex: '#E5A93C', role: 'Acentos' },
      { name: 'Cian', hex: '#38B2AC', role: 'Frío' },
      { name: 'Grafito', hex: '#2B2B35', role: 'Medios' },
    ],
    lighting: {
      keyLight: 'Luz lateral dura desde ventana alta con difusor 4x4.',
      fillRatio: '6:1 contraste marcado',
      rimAndBacklight: 'Contraluz cálido 3200K perfilando silueta.',
      colorTemperatureKelvin: '3200K / 5600K',
      atmosphereAndHaze: 'Neblina ligera controlada con hazer.',
    },
    shotList: [],
    soundDesign: {
      atmosLayers: ['Lluvia fina exterior', 'Zumbido eléctrico distante', 'Viento bajo'],
      subBassCue: 'Pulso LFE 34Hz previo al corte.',
      foleyDetails: ['Pasos sobre asfalto húmedo', 'Chasquido metálico'],
      silenceBeats: 'Silencio absoluto de 1.5s antes del diálogo clave.',
      musicalScore: 'Cuerdas graves sostenidas con sintetizador análogo.',
      tempoBpm: 72,
    },
    vfx: {
      cgiElements: ['Extensión de horizonte nocturno', 'Partículas atmosféricas'],
      practicalSfx: ['Lluvia en set con torres', 'Humo bajo real'],
      locationsAndSets: 'Muelle industrial de hormigón y metal oxidado.',
      wardrobeAndMakeup: 'Gabardina impermeable húmeda y tonos oscuros.',
    },
    screenplay: [
      {
        sceneNumber: '1',
        slugline: 'EXT. MUELLE INDUSTRIAL - NOCHE',
        timeOfDay: 'NOCHE',
        beats: [
          { type: 'action', text: 'La lluvia golpea el acero del muelle.' },
          { type: 'camera', text: 'Dolly lento hacia el rostro.' },
          { type: 'sound', text: 'Subgrave a 34Hz.' },
          { type: 'dialogue', character: 'ELENA', text: 'No queda tiempo.' },
        ],
      },
      {
        sceneNumber: '2',
        slugline: 'INT. FARO - NOCHE',
        timeOfDay: 'NOCHE',
        beats: [
          { type: 'action', text: 'La linterna barre los planos.' },
          { type: 'dialogue', character: 'MARCO', text: 'Lo encontramos.' },
        ],
      },
    ],
    storyboardFrames: [
      {
        id: 'f1',
        title: 'Plano Maestro',
        shotRef: '1A',
        cameraSpec: '35mm',
        aspectRatio: '2.39:1',
        visualPrompt: 'Wide atmospheric shot of wet industrial pier at night.',
        veoMotionPrompt: 'Slow push in across rain.',
        imageUrl: '/workspace-assets/u/p/frame1.jpg',
      },
    ],
    continuitySummary: 'Muelle mojado bajo lluvia nocturna.',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

test('computeProductionRadarMetrics returns zeroed 4 axes for empty or null project', () => {
  const emptyProject: ProductionProject = {
    id: 'p-empty',
    title: 'Proyecto en Cero',
    genreStyle: 'Drama',
    defaultSourceType: 'book',
    continuityBible: '',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    sequences: [],
  };

  const report = computeProductionRadarMetrics(emptyProject);
  assert.equal(report.hasContent, false);
  assert.equal(report.overallProjectScore, 0);
  assert.equal(report.axes.length, 4);
  assert.deepEqual(
    report.axes.map((a) => a.axis),
    ['Guion', 'Diseño de iluminación', 'Efectos visuales', 'Diseño sonoro']
  );
  assert.ok(report.axes.every((a) => a.projectScore === 0));
});

test('computeProductionRadarMetrics evaluates all 4 production dimensions within 0-100', () => {
  const seq = buildSampleSequence();
  const project: ProductionProject = {
    id: 'p-1',
    title: 'Muelle Nocturno',
    genreStyle: 'Neo-Noir',
    defaultSourceType: 'book',
    continuityBible: 'Continuidad verificada con gabardina húmeda y muelle metálico bajo lluvia.',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    sequences: [seq],
  };

  const report = computeProductionRadarMetrics(project, seq);
  assert.equal(report.hasContent, true);
  assert.equal(report.sequencesCount, 1);
  assert.ok(report.overallProjectScore > 50);

  for (const axis of report.axes) {
    assert.ok(axis.projectScore > 0 && axis.projectScore <= 100);
    assert.ok(axis.sequenceScore > 0 && axis.sequenceScore <= 100);
    assert.ok(axis.detailSummary.length > 0);
  }
});
