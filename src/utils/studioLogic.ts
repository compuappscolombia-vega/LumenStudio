import type {
  DirectorStylePreset,
  ProductionProject,
  ProductionSequence,
  SourceMaterialType,
} from '../types/studio';

export const DIRECTOR_STYLES: DirectorStylePreset[] = [
  {
    id: 'epic-imax',
    label: 'Épica Monumental IMAX',
    references: 'Denis Villeneuve · Ridley Scott',
    defaultCamera: 'ARRI Alexa 65 IMAX',
    defaultLenses: 'Panavision Sphero 65 & Hasselblad Prime DNA',
    defaultRatio: '1.43:1',
    description: 'Escala colosal, arquitectura brutalista o sagrada, planos sostenidos y frecuencias subgraves.',
  },
  {
    id: 'neo-noir',
    label: 'Thriller Psicológico Neo-Noir',
    references: 'David Fincher · Christopher Nolan',
    defaultCamera: 'RED V-Raptor XL 8K VV',
    defaultLenses: 'Cooke Anamorphic /i SF',
    defaultRatio: '2.39:1',
    description: 'Precisión quirúrgica de cámara, iluminación de sodio y sombras densas, montaje tenso.',
  },
  {
    id: 'elevated-horror',
    label: 'Terror Atmosférico Elevado',
    references: 'Robert Eggers · Ari Aster',
    defaultCamera: 'ARRI Arricam LT 35mm Film',
    defaultLenses: 'Cooke Panchro/i Classic & Baltar',
    defaultRatio: '1.85:1',
    description: 'Luz natural o de vela, simetría inquietante, foley visceral y silencios opresivos.',
  },
  {
    id: 'scifi-odyssey',
    label: 'Ciencia Ficción Visionaria',
    references: 'Stanley Kubrick · Alex Garland',
    defaultCamera: 'Sony VENICE 2 8.6K',
    defaultLenses: 'Zeiss Supreme Prime Radiance',
    defaultRatio: '2.39:1',
    description: 'Simetría fría, reflejos anamórficos controlados, diseño sonoro sintético y aislamiento.',
  },
  {
    id: 'auteur-oner',
    label: 'Drama Autoral en Plano Secuencia',
    references: 'Alfonso Cuarón · Emmanuel Lubezki',
    defaultCamera: 'ARRI Alexa Mini LF (Steadicam / Trinity)',
    defaultLenses: 'Leitz Summilux-C 18mm–35mm',
    defaultRatio: '1.85:1',
    description: 'Inmersión continua en tiempo real, luz ambiente orgánica, coreografía milimétrica de actores.',
  },
  {
    id: 'classic-adventure',
    label: 'Aventura Blockbuster Clásica',
    references: 'Steven Spielberg · James Cameron',
    defaultCamera: 'Panavision Millennium DXL2',
    defaultLenses: 'Panavision C-Series Anamorphic',
    defaultRatio: '2.39:1',
    description: 'Contraluces dorados, barridos de Technocrane, ritmo trepidante y partitura sinfónica.',
  },
];

export const ASPECT_RATIO_OPTIONS = [
  { value: '2.39:1', label: '2.39:1 Anamórfico Scope' },
  { value: '1.43:1', label: '1.43:1 IMAX 65mm' },
  { value: '1.85:1', label: '1.85:1 Flat Cinematográfico' },
  { value: '16:9', label: '16:9 Widescreen Digital' },
] as const;

export function parseAspectRatio(ratioStr: string): number {
  const cleaned = ratioStr.trim();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!match) return 16 / 9;
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return 16 / 9;
  }
  return w / h;
}

export function getSourceTypeLabel(type: SourceMaterialType): string {
  switch (type) {
    case 'book':
      return 'Libro / Manuscrito';
    case 'audiobook':
      return 'Audiolibro';
    case 'story':
      return 'Historia Original';
  }
}

export function validateSequenceInput(params: {
  sequenceTitle: string;
  sourceText: string;
  hasFile: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!params.sequenceTitle.trim()) {
    errors.push('Indica un título para la secuencia o capítulo.');
  }
  if (!params.hasFile && params.sourceText.trim().length < 20) {
    errors.push(
      'Proporciona al menos 20 caracteres del texto fuente o adjunta un archivo (PDF, TXT o audio MP3/WAV/M4A).'
    );
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function filterProjects(
  projects: ProductionProject[],
  query: string
): ProductionProject[] {
  const q = query.trim().toLowerCase();
  if (!q) return projects;
  return projects.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.genreStyle.toLowerCase().includes(q) ||
      p.sequences.some((s) => s.title.toLowerCase().includes(q))
  );
}

export function computeProjectStats(project: ProductionProject): {
  sequenceCount: number;
  shotCount: number;
  estimatedMinutes: number;
} {
  const sequenceCount = project.sequences.length;
  let shotCount = 0;
  let totalSec = 0;
  for (const seq of project.sequences) {
    shotCount += seq.shotList.length;
    for (const shot of seq.shotList) {
      totalSec += Number.isFinite(shot.durationSec) ? shot.durationSec : 0;
    }
  }
  return {
    sequenceCount,
    shotCount,
    estimatedMinutes: Math.max(0, Math.round((totalSec / 60) * 10) / 10),
  };
}

export function buildContinuationContext(
  existingBible: string,
  sequenceTitle: string,
  continuitySummary: string
): string {
  const base = existingBible.trim();
  const addition = `[${sequenceTitle}]: ${continuitySummary.trim()}`;
  if (!continuitySummary.trim()) return base;
  if (!base) return addition;
  if (base.includes(addition)) return base;
  return `${base}\n\n${addition}`;
}

export function formatScreenplayMarkdown(
  projectTitle: string,
  sequence: ProductionSequence
): string {
  const lines: string[] = [];
  lines.push(`# ${projectTitle.toUpperCase()} — ${sequence.title}`);
  lines.push(
    `**Estilo:** ${sequence.directorStyle} · **Formato:** ${sequence.aspectRatio} · **Cámara:** ${sequence.cameraSystem} · **Ópticas:** ${sequence.lensPackage}`
  );
  lines.push('');
  lines.push(`> ${sequence.logline}`);
  lines.push('');
  lines.push('## 1. Visión de Dirección y Look & Feel');
  lines.push(sequence.directorVision);
  lines.push(`- **LUT / Emulsión:** ${sequence.filmStockOrLut}`);
  lines.push(
    `- **Paleta:** ${sequence.colorPalette.map((c) => `${c.name} (${c.hex})`).join(' · ')}`
  );
  lines.push('');
  lines.push('## 2. Diseño de Iluminación');
  lines.push(`- **Luz Principal:** ${sequence.lighting.keyLight}`);
  lines.push(`- **Ratio de Contraste / Relleno:** ${sequence.lighting.fillRatio}`);
  lines.push(`- **Contraluz / Rim:** ${sequence.lighting.rimAndBacklight}`);
  lines.push(`- **Temperatura:** ${sequence.lighting.colorTemperatureKelvin}`);
  lines.push(`- **Atmósfera:** ${sequence.lighting.atmosphereAndHaze}`);
  lines.push('');
  lines.push('## 3. Lista de Planos (Shot List)');
  for (const shot of sequence.shotList) {
    lines.push(
      `- **Plano ${shot.shotNumber} [${shot.shotType}]** (${shot.lensMm} · ${shot.movement} · ${shot.durationSec}s): ${shot.framingNote} — *Intención:* ${shot.psychologicalIntent}`
    );
  }
  lines.push('');
  lines.push('## 4. Diseño Sonoro, Foley y Score');
  lines.push(`- **Atmósferas Atmos:** ${sequence.soundDesign.atmosLayers.join(' | ')}`);
  lines.push(`- **Subgraves:** ${sequence.soundDesign.subBassCue}`);
  lines.push(`- **Foley:** ${sequence.soundDesign.foleyDetails.join(' | ')}`);
  lines.push(`- **Silencios:** ${sequence.soundDesign.silenceBeats}`);
  lines.push(
    `- **Score Musical (${sequence.soundDesign.tempoBpm} BPM):** ${sequence.soundDesign.musicalScore}`
  );
  lines.push('');
  lines.push('## 5. VFX, SFX y Arte');
  lines.push(`- **CGI / VFX:** ${sequence.vfx.cgiElements.join(' | ')}`);
  lines.push(`- **Efectos Prácticos:** ${sequence.vfx.practicalSfx.join(' | ')}`);
  lines.push(`- **Locaciones y Sets:** ${sequence.vfx.locationsAndSets}`);
  lines.push(`- **Vestuario y Maquillaje:** ${sequence.vfx.wardrobeAndMakeup}`);
  lines.push('');
  if (sequence.audioAnalysis) {
    lines.push('## 5B. Informe de Dirección y Transcripción del Audio Fuente');
    lines.push(`- **Narración:** ${sequence.audioAnalysis.narrationStyle}`);
    lines.push(`- **Arco Emocional:** ${sequence.audioAnalysis.emotionalArc}`);
    lines.push(`- **Ritmo:** ${sequence.audioAnalysis.rhythmAndPacing}`);
    lines.push(
      `- **Efectos Detectados:** ${sequence.audioAnalysis.detectedSoundEffects.join(' | ')}`
    );
    lines.push(
      `- **Recomendaciones de Dirección:** ${sequence.audioAnalysis.directingRecommendations}`
    );
    lines.push('');
    lines.push('### Transcripción Verbatim');
    lines.push(sequence.audioAnalysis.transcription);
    lines.push('');
  }
  lines.push('## 6. Guion Cinematográfico');
  for (const scene of sequence.screenplay) {
    lines.push('');
    lines.push(`### ESCENA ${scene.sceneNumber}: ${scene.slugline}`);
    for (const beat of scene.beats) {
      if (beat.type === 'dialogue') {
        lines.push(`**${(beat.character || 'PERSONAJE').toUpperCase()}**`);
        if (beat.parenthetical) lines.push(`*(${beat.parenthetical})*`);
        lines.push(beat.text);
        lines.push('');
      } else if (beat.type === 'camera') {
        lines.push(`**[CÁMARA]** ${beat.text}`);
        lines.push('');
      } else if (beat.type === 'sound') {
        lines.push(`**[SONIDO]** ${beat.text}`);
        lines.push('');
      } else {
        lines.push(beat.text);
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}

export function formatFountainScreenplay(
  projectTitle: string,
  sequence: ProductionSequence
): string {
  const lines: string[] = [];
  lines.push(`Title: ${projectTitle}`);
  lines.push(`Credit: Adaptación cinematográfica por LumenReel Studio`);
  lines.push(`Draft date: ${new Date(sequence.createdAt).toLocaleDateString('es-ES')}`);
  lines.push(`Notes: ${sequence.title} (${sequence.aspectRatio})`);
  lines.push('');
  lines.push(`= ${sequence.logline}`);
  lines.push('');

  for (const scene of sequence.screenplay) {
    lines.push(scene.slugline.toUpperCase());
    lines.push('');
    for (const beat of scene.beats) {
      if (beat.type === 'dialogue') {
        lines.push((beat.character || 'PERSONAJE').toUpperCase());
        if (beat.parenthetical) {
          lines.push(`(${beat.parenthetical})`);
        }
        lines.push(beat.text);
        lines.push('');
      } else if (beat.type === 'camera') {
        lines.push(`[[CÁMARA: ${beat.text}]]`);
        lines.push('');
      } else if (beat.type === 'sound') {
        lines.push(`[[SONIDO: ${beat.text}]]`);
        lines.push('');
      } else {
        lines.push(beat.text);
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}
