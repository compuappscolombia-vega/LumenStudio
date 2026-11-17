import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAgentToolCall,
  buildAgentTurnContext,
  formatGeminiApiError,
} from './agentLogic';
import type { ProductionProject, ProductionSequence } from '../types/studio';

function makeFixtureProject(): ProductionProject {
  const seq: ProductionSequence = {
    id: 'seq-1',
    title: 'Capítulo I: Tormenta en el Faro',
    versionStatus: 'draft',
    sourceType: 'book',
    directorStyle: 'Épica Monumental IMAX',
    aspectRatio: '2.39:1',
    cameraSystem: 'ARRI Alexa 65',
    lensPackage: 'Panavision Sphero 65',
    filmStockOrLut: 'Kodak 2383',
    logline: 'Una vigía enfrenta una tormenta imposible.',
    directorVision: 'Planos amplios y tensión atmosférica.',
    colorPalette: [{ name: 'Ámbar', hex: '#E5A93C', role: 'Faro' }],
    lighting: {
      keyLight: 'Haz rotatorio 18K',
      fillRatio: '6:1',
      rimAndBacklight: 'Relámpagos 5600K',
      colorTemperatureKelvin: '2900K / 5600K',
      atmosphereAndHaze: 'Niebla densa',
    },
    shotList: [],
    soundDesign: {
      atmosLayers: ['Viento marino'],
      subBassCue: 'LFE 30Hz',
      foleyDetails: ['Lluvia sobre vidrio'],
      silenceBeats: 'Silencio antes del impacto',
      musicalScore: 'Cuerdas graves',
      tempoBpm: 70,
    },
    vfx: {
      cgiElements: ['Olas de 20 metros'],
      practicalSfx: ['Torres de lluvia en set'],
      locationsAndSets: 'Faro costero real',
      wardrobeAndMakeup: 'Impermeable húmedo',
    },
    screenplay: [
      {
        sceneNumber: '1',
        slugline: 'EXT. FARO - NOCHE',
        timeOfDay: 'NOCHE',
        beats: [{ type: 'action', text: 'El viento sacude la linterna del faro.' }],
      },
    ],
    storyboardFrames: [],
    continuitySummary: 'Faro iluminado en ámbar 2900K.',
    createdAt: '2026-11-16T00:00:00.000Z',
  };

  return {
    id: 'proj-1',
    title: 'El Faro del Abismo',
    genreStyle: 'Thriller Marítimo',
    defaultSourceType: 'book',
    continuityBible: 'Lente principal 40mm anamórfico.',
    createdAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
    sequences: [seq],
  };
}

test('formatGeminiApiError translates 402 prepayment credit errors into clear Spanish guidance', () => {
  const raw =
    '{"error":{"code":402,"message":"Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.","status":"RESOURCE_EXHAUSTED"}}';
  const formatted = formatGeminiApiError(new Error(raw));
  assert.match(formatted, /HTTP 402/i);
  assert.match(formatted, /Settings > Secrets/i);
  assert.match(formatted, /ai\.studio\/projects/i);
});

test('applyAgentToolCall updates continuity bible without mutating original project', () => {
  const proj = makeFixtureProject();
  const res = applyAgentToolCall({
    project: proj,
    activeSequenceId: 'seq-1',
    toolName: 'actualizar_biblia_continuidad',
    args: {
      reglasContinuidad: 'VFX: mantener gotas reales en lente en todo plano exterior.',
      modo: 'append',
    },
  });

  assert.equal(res.action.affectedArea, 'biblia');
  assert.match(res.updatedProject.continuityBible, /Lente principal 40mm/);
  assert.match(res.updatedProject.continuityBible, /gotas reales en lente/);
  assert.equal(proj.continuityBible, 'Lente principal 40mm anamórfico.');
});

test('applyAgentToolCall updates VFX package, screenplay scenes, direction, and storyboard frames', () => {
  const proj = makeFixtureProject();

  const afterVfx = applyAgentToolCall({
    project: proj,
    activeSequenceId: 'seq-1',
    toolName: 'disenar_paquete_vfx_sfx',
    args: {
      cgiElements: ['Relámpago volumétrico en nubes'],
      practicalSfx: ['Cañón de viento industrial con espray salino'],
    },
  });
  assert.equal(afterVfx.updatedProject.sequences[0].vfx.cgiElements.length, 2);
  assert.equal(afterVfx.updatedProject.sequences[0].vfx.practicalSfx.length, 2);

  const afterScript = applyAgentToolCall({
    project: afterVfx.updatedProject,
    activeSequenceId: 'seq-1',
    toolName: 'refinar_guion_escena',
    args: {
      sceneNumber: '2',
      slugline: 'INT. SALA DE LÁMPARAS - CONTINUO',
      timeOfDay: 'NOCHE',
      beats: [
        { type: 'action', text: 'ELENA ajusta la válvula de presión.' },
        { type: 'dialogue', character: 'ELENA', text: 'El haz no puede apagarse.' },
      ],
    },
  });
  assert.equal(afterScript.updatedProject.sequences[0].screenplay.length, 2);
  assert.equal(afterScript.updatedProject.sequences[0].screenplay[1].beats.length, 2);

  const afterDir = applyAgentToolCall({
    project: afterScript.updatedProject,
    activeSequenceId: 'seq-1',
    toolName: 'ajustar_direccion_y_camara',
    args: {
      cameraSystem: 'Sony VENICE 2 8K',
      keyLight: 'Fresnel 20K giratorio',
    },
  });
  assert.equal(afterDir.updatedProject.sequences[0].cameraSystem, 'Sony VENICE 2 8K');
  assert.equal(
    afterDir.updatedProject.sequences[0].lighting.keyLight,
    'Fresnel 20K giratorio'
  );

  const afterSb = applyAgentToolCall({
    project: afterDir.updatedProject,
    activeSequenceId: 'seq-1',
    toolName: 'agregar_plano_storyboard',
    args: {
      title: 'Explosión de ola contra el cristal',
      shotRef: 'Plano 4B',
      visualPrompt: 'Dramatic wave crashing onto lighthouse glass at night, 65mm film still',
      veoMotionPrompt: 'Dynamic push-in toward lighthouse glass during storm surge',
    },
  });
  assert.equal(afterSb.updatedProject.sequences[0].storyboardFrames.length, 1);
  assert.equal(afterSb.action.affectedArea, 'storyboard');
});

test('buildAgentTurnContext includes focus role and project continuity bible', () => {
  const proj = makeFixtureProject();
  const ctx = buildAgentTurnContext({
    project: proj,
    activeSequence: proj.sequences[0],
    focus: 'vfx',
    learningContext: 'Usar agua real en primer plano antes de añadir simulación CGI.',
  });
  assert.match(ctx, /Experto VFX \/ SFX/);
  assert.match(ctx, /El Faro del Abismo/);
  assert.match(ctx, /Torres de lluvia en set/);
});
