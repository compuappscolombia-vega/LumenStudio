import type {
  AgentRoleFocus,
  AgentToolAction,
  ProductionProject,
  ProductionSequence,
  ScreenplayBeat,
} from '../types/studio';

export const TRIPARTITE_AGENT_INSTRUCTION = `Eres LumenReel, un Agente Cinematográfico Autónomo de élite que integra tres disciplinas maestras en una sola mente creativa:

1. DIRECTOR DE CINE GALARDONADO: Dominas la puesta en escena, el lenguaje de cámara, la selección de cuerpos reales (ARRI Alexa 65, Panavision DXL2, Sony VENICE 2), ópticas anamórficas/esféricas, iluminación por temperaturas Kelvin, colorimetría y montaje rítmico.
2. GUIONISTA PROFESIONAL DE HOLLYWOOD: Escribes y reescribes escenas con estructura dramática sólida, subtexto emocional, economía visual ("Show, don't tell"), sluglines estándar (INT./EXT.), acotaciones precisas y diálogos cinematográficos memorables.
3. EXPERTO EN EFECTOS ESPECIALES (VFX Y SFX PRÁCTICOS): Diseñas efectos visuales CGI (simulaciones de fluidos/fuego/destrucción, criaturas, extensiones de set, matte painting, tracking/rotoscopia) combinados con efectos prácticos reales en set (rigs mecánicos, lluvia artificial, atmósfera de humo/hazer, pirotecnia controlada, maquillaje protésico y seguridad en rodaje).

COMPORTAMIENTO COMO AGENTE:
- Responde siempre en español con criterio técnico de alto nivel, claridad ejecutable y tono de liderazgo cinematográfico.
- Cuando el usuario te pida modificar, expandir, mejorar o corregir algo del proyecto o secuencia activa (biblia de continuidad, dirección/cámara/iluminación, guion/diálogos, paquete VFX/SFX o tarjetas de storyboard), UTILIZA las herramientas disponibles para aplicar los cambios reales al expediente del proyecto antes de responder.
- Si no hay ninguna secuencia producida todavía, ayuda activamente a estructurar la Biblia de Continuidad, el guion base, la visión de dirección y el diseño VFX/SFX desde cero, usando "actualizar_biblia_continuidad" cuando el usuario defina reglas o premisas clave.
- Integra explícitamente las tres perspectivas (**Dirección**, **Guion** y **VFX/SFX**) cuando estés en modo Consejo Completo, o profundiza en la especialidad solicitada cuando el usuario seleccione un rol específico.`;

export interface AgentRoleProfile {
  id: AgentRoleFocus;
  label: string;
  badge: string;
  description: string;
}

export const AGENT_ROLE_PROFILES: AgentRoleProfile[] = [
  {
    id: 'council',
    label: 'Consejo Completo',
    badge: 'Director · Guionista · VFX',
    description:
      'Las tres especialidades colaboran en simultáneo sobre puesta en escena, guion y efectos especiales.',
  },
  {
    id: 'director',
    label: 'Director de Cine',
    badge: 'Puesta en escena y Cámara',
    description:
      'Enfoque en narrativa visual, lentes, movimientos de cámara, iluminación Kelvin y ritmo.',
  },
  {
    id: 'screenwriter',
    label: 'Guionista',
    badge: 'Estructura y Diálogos',
    description:
      'Enfoque en subtexto, arco dramático, sluglines, ritmo de escena y reescritura de diálogos.',
  },
  {
    id: 'vfx',
    label: 'Experto VFX / SFX',
    badge: 'CGI y Efectos Prácticos',
    description:
      'Enfoque en simulaciones digitales, composición, rigs mecánicos en set, atmósfera y viabilidad técnica.',
  },
];

export const AGENT_QUICK_COMMANDS: {
  id: string;
  focus: AgentRoleFocus;
  title: string;
  prompt: string;
}[] = [
  {
    id: 'cmd-council-audit',
    focus: 'council',
    title: 'Auditoría integral (Director · Guionista · VFX)',
    prompt:
      'Analiza el estado actual del proyecto como Director, Guionista y Experto en Efectos Especiales. Indica mejoras concretas de puesta en escena, subtexto del guion y sinergia entre SFX prácticos y CGI.',
  },
  {
    id: 'cmd-director-upgrade',
    focus: 'director',
    title: 'Elevar dirección, óptica e iluminación',
    prompt:
      'Como Director de Cine, optimiza el lenguaje visual, la iluminación Kelvin y el movimiento de cámara de la secuencia activa, aplicando los ajustes directamente en el expediente si ya existe una secuencia.',
  },
  {
    id: 'cmd-writer-rewrite',
    focus: 'screenwriter',
    title: 'Reescribir escena con mayor subtexto',
    prompt:
      'Como Guionista, revisa o propone una escena con mayor tensión dramática, diálogos con subtexto y beats visuales precisos ("Show, don\'t tell"), actualizando el guion o la Biblia del proyecto.',
  },
  {
    id: 'cmd-vfx-blueprint',
    focus: 'vfx',
    title: 'Plan maestro de VFX (CGI + SFX prácticos)',
    prompt:
      'Como Experto en Efectos Especiales, diseña el desglose técnico de simulaciones CGI, extensiones de set y efectos prácticos en cámara, y guarda el paquete actualizado en el proyecto.',
  },
];

export function formatGeminiApiError(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Error inesperado al comunicarse con el motor de Gemini.';

  const normalized = raw.toLowerCase();

  if (
    normalized.includes('prepayment credits are depleted') ||
    normalized.includes('"code":402') ||
    normalized.includes('402')
  ) {
    return 'Créditos de Gemini agotados (HTTP 402 · RESOURCE_EXHAUSTED): la clave configurada en Settings > Secrets pertenece a un proyecto sin saldo de prepago. Recarga créditos en https://ai.studio/projects o asigna otra clave con facturación activa desde Settings > Secrets.';
  }

  if (
    normalized.includes('api_key_invalid') ||
    normalized.includes('api key not valid') ||
    normalized.includes('permission_denied') ||
    normalized.includes('"code":403')
  ) {
    return 'Clave de Gemini no válida o sin permisos suficientes. Verifica GEMINI_API_KEY en el panel Settings > Secrets del entorno.';
  }

  if (normalized.includes('resource_exhausted') || normalized.includes('"code":429')) {
    return 'Límite de cuota de Gemini alcanzado (HTTP 429). Espera unos segundos o verifica tu plan de facturación en Settings > Secrets.';
  }

  if (normalized.includes('not_found') || normalized.includes('"code":404')) {
    return 'El modelo solicitado no está disponible para la clave actual. Verifica el acceso al modelo en Settings > Secrets.';
  }

  // Try extracting cleaner message if raw is JSON error payload
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Plain text error; return as-is
  }

  return raw;
}

export function buildAgentTurnContext(params: {
  project: ProductionProject;
  activeSequence: ProductionSequence | null;
  focus: AgentRoleFocus;
  learningContext: string;
}): string {
  const { project, activeSequence, focus, learningContext } = params;
  const focusProfile =
    AGENT_ROLE_PROFILES.find((p) => p.id === focus) || AGENT_ROLE_PROFILES[0];

  const seqSummary = activeSequence
    ? `SECUENCIA ACTIVA (${activeSequence.versionStatus === 'final' ? 'Versión Final' : 'Borrador'}):
- ID: ${activeSequence.id}
- Título: ${activeSequence.title}
- Logline: ${activeSequence.logline}
- Visión de dirección: ${activeSequence.directorVision}
- Cámara / Óptica / LUT: ${activeSequence.cameraSystem} | ${activeSequence.lensPackage} | ${activeSequence.filmStockOrLut}
- Iluminación: Key=${activeSequence.lighting?.keyLight || 'N/D'} | Kelvin=${activeSequence.lighting?.colorTemperatureKelvin || 'N/D'} | Atmósfera=${activeSequence.lighting?.atmosphereAndHaze || 'N/D'}
- VFX CGI actuales: ${(activeSequence.vfx?.cgiElements || []).join('; ') || 'Ninguno'}
- SFX Prácticos actuales: ${(activeSequence.vfx?.practicalSfx || []).join('; ') || 'Ninguno'}
- Escenas en guion: ${activeSequence.screenplay.length} (${activeSequence.screenplay.map((s) => `${s.sceneNumber}. ${s.slugline}`).join(' / ') || 'Sin escenas'})
- Storyboard frames: ${activeSequence.storyboardFrames.length}`
    : 'SECUENCIA ACTIVA: Ninguna secuencia generada todavía en este proyecto (etapa de desarrollo / preproducción).';

  return `ENFOQUE SOLICITADO POR EL USUARIO: ${focusProfile.label} (${focusProfile.badge})
${focusProfile.description}

PROYECTO ACTIVO:
- Título: ${project.title}
- Estilo / Género: ${project.genreStyle}
- Tipo fuente base: ${project.defaultSourceType}
- Biblia de continuidad actual:
${project.continuityBible || '[Vacía — lista para ser construida]'}

${seqSummary}

MEMORIA DE AUTOAPRENDIZAJE DEL ESTUDIO:
${learningContext}`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

export function applyAgentToolCall(params: {
  project: ProductionProject;
  activeSequenceId?: string;
  toolName: string;
  args: Record<string, unknown>;
}): {
  updatedProject: ProductionProject;
  action: AgentToolAction;
  resultMessage: string;
} {
  const { project, activeSequenceId, toolName, args } = params;
  const now = new Date().toISOString();
  const targetSeqIdx = activeSequenceId
    ? project.sequences.findIndex((s) => s.id === activeSequenceId)
    : project.sequences.length > 0
      ? 0
      : -1;

  if (toolName === 'actualizar_biblia_continuidad') {
    const newRules = String(args.reglasContinuidad || args.content || '').trim();
    const mode = String(args.modo || 'append').toLowerCase();
    if (!newRules) {
      return {
        updatedProject: project,
        action: {
          toolName,
          affectedArea: 'biblia',
          summary: 'Sin cambios: no se recibieron reglas nuevas.',
        },
        resultMessage: 'No se recibieron reglas válidas para actualizar la Biblia.',
      };
    }
    const existing = (project.continuityBible || '').trim();
    const nextBible =
      mode === 'replace' || !existing
        ? newRules
        : existing.includes(newRules)
          ? existing
          : `${existing}\n\n${newRules}`;
    const updatedProject: ProductionProject = {
      ...project,
      continuityBible: nextBible,
      updatedAt: now,
    };
    return {
      updatedProject,
      action: {
        toolName,
        affectedArea: 'biblia',
        summary: 'Biblia de continuidad actualizada por el Agente.',
      },
      resultMessage: 'Biblia de continuidad actualizada correctamente en el proyecto.',
    };
  }

  if (targetSeqIdx === -1) {
    return {
      updatedProject: project,
      action: {
        toolName,
        affectedArea: 'biblia',
        summary: 'No hay secuencia activa aún; usa la Biblia o genera una secuencia primero.',
      },
      resultMessage:
        'El proyecto todavía no tiene una secuencia producida para editar. Propón cambios en la Biblia de continuidad o pide al usuario dirigir la primera secuencia.',
    };
  }

  const seq = project.sequences[targetSeqIdx];

  if (toolName === 'ajustar_direccion_y_camara') {
    const updatedSeq: ProductionSequence = {
      ...seq,
      directorVision: String(args.directorVision || seq.directorVision).trim(),
      cameraSystem: String(args.cameraSystem || seq.cameraSystem).trim(),
      lensPackage: String(args.lensPackage || seq.lensPackage).trim(),
      lighting: {
        ...seq.lighting,
        keyLight: String(args.keyLight || seq.lighting?.keyLight || '').trim(),
        colorTemperatureKelvin: String(
          args.colorTemperatureKelvin || seq.lighting?.colorTemperatureKelvin || ''
        ).trim(),
        atmosphereAndHaze: String(
          args.atmosphereAndHaze || seq.lighting?.atmosphereAndHaze || ''
        ).trim(),
      },
      updatedAt: now,
    };
    const updatedProject: ProductionProject = {
      ...project,
      updatedAt: now,
      sequences: project.sequences.map((s, idx) => (idx === targetSeqIdx ? updatedSeq : s)),
    };
    return {
      updatedProject,
      action: {
        toolName,
        affectedArea: 'direccion',
        summary: `Dirección, óptica e iluminación actualizadas en "${seq.title}".`,
      },
      resultMessage: `Dirección, cámara (${updatedSeq.cameraSystem}) e iluminación actualizadas en la secuencia "${seq.title}".`,
    };
  }

  if (toolName === 'disenar_paquete_vfx_sfx') {
    const cgi = asStringArray(args.cgiElements);
    const sfx = asStringArray(args.practicalSfx);
    const mergeMode = String(args.modo || 'append').toLowerCase() === 'replace';

    const nextCgi = mergeMode
      ? cgi
      : Array.from(new Set([...(seq.vfx?.cgiElements || []), ...cgi]));
    const nextSfx = mergeMode
      ? sfx
      : Array.from(new Set([...(seq.vfx?.practicalSfx || []), ...sfx]));

    const updatedSeq: ProductionSequence = {
      ...seq,
      vfx: {
        cgiElements: nextCgi.length > 0 ? nextCgi : seq.vfx?.cgiElements || [],
        practicalSfx: nextSfx.length > 0 ? nextSfx : seq.vfx?.practicalSfx || [],
        locationsAndSets: String(
          args.locationsAndSets || seq.vfx?.locationsAndSets || ''
        ).trim(),
        wardrobeAndMakeup: String(
          args.wardrobeAndMakeup || seq.vfx?.wardrobeAndMakeup || ''
        ).trim(),
      },
      updatedAt: now,
    };
    const updatedProject: ProductionProject = {
      ...project,
      updatedAt: now,
      sequences: project.sequences.map((s, idx) => (idx === targetSeqIdx ? updatedSeq : s)),
    };
    return {
      updatedProject,
      action: {
        toolName,
        affectedArea: 'vfx',
        summary: `Plan VFX/SFX actualizado (${updatedSeq.vfx.cgiElements.length} CGI · ${updatedSeq.vfx.practicalSfx.length} SFX prácticos).`,
      },
      resultMessage: `Paquete de efectos especiales VFX y SFX prácticos actualizado en "${seq.title}".`,
    };
  }

  if (toolName === 'refinar_guion_escena') {
    const sceneNumber = String(
      args.sceneNumber || String(seq.screenplay.length + 1)
    ).trim();
    const slugline = String(args.slugline || 'EXT. NUEVA ESCENA - NOCHE').trim();
    const timeOfDay = String(args.timeOfDay || 'NOCHE').trim();
    const rawBeats = Array.isArray(args.beats) ? args.beats : [];

    const beats: ScreenplayBeat[] = rawBeats
      .map((b) => {
        const obj = (b || {}) as Record<string, unknown>;
        const rawType = String(obj.type || 'action').toLowerCase();
        const type: ScreenplayBeat['type'] =
          rawType === 'dialogue' || rawType === 'camera' || rawType === 'sound'
            ? rawType
            : 'action';
        return {
          type,
          character: obj.character ? String(obj.character).trim() : undefined,
          parenthetical: obj.parenthetical ? String(obj.parenthetical).trim() : undefined,
          text: String(obj.text || '').trim(),
        };
      })
      .filter((b) => b.text.length > 0);

    if (beats.length === 0) {
      return {
        updatedProject: project,
        action: {
          toolName,
          affectedArea: 'guion',
          summary: 'No se agregaron beats vacíos al guion.',
        },
        resultMessage: 'La escena propuesta no contenía beats de guion válidos.',
      };
    }

    const existingSceneIdx = seq.screenplay.findIndex(
      (sc) => sc.sceneNumber === sceneNumber
    );
    const nextScene = { sceneNumber, slugline, timeOfDay, beats };
    const nextScreenplay =
      existingSceneIdx !== -1
        ? seq.screenplay.map((sc, idx) => (idx === existingSceneIdx ? nextScene : sc))
        : [...seq.screenplay, nextScene];

    const updatedSeq: ProductionSequence = {
      ...seq,
      screenplay: nextScreenplay,
      updatedAt: now,
    };
    const updatedProject: ProductionProject = {
      ...project,
      updatedAt: now,
      sequences: project.sequences.map((s, idx) => (idx === targetSeqIdx ? updatedSeq : s)),
    };
    return {
      updatedProject,
      action: {
        toolName,
        affectedArea: 'guion',
        summary: `Escena ${sceneNumber} (${slugline}) ${existingSceneIdx !== -1 ? 'reescrita' : 'añadida'} en el guion.`,
      },
      resultMessage: `Guion actualizado con la escena ${sceneNumber}: ${slugline} (${beats.length} beats).`,
    };
  }

  if (toolName === 'agregar_plano_storyboard') {
    const newCard = {
      id: `sb-${Date.now().toString(36)}-${seq.storyboardFrames.length + 1}`,
      title: String(args.title || `Plano Adicional ${seq.storyboardFrames.length + 1}`).trim(),
      shotRef: String(args.shotRef || `Plano ${seq.storyboardFrames.length + 1}`).trim(),
      aspectRatio: seq.aspectRatio,
      cameraSpec: String(args.cameraSpec || seq.cameraSystem).trim(),
      visualPrompt: String(args.visualPrompt || '').trim(),
      veoMotionPrompt: String(args.veoMotionPrompt || '').trim(),
    };

    if (!newCard.visualPrompt) {
      return {
        updatedProject: project,
        action: {
          toolName,
          affectedArea: 'storyboard',
          summary: 'Falta visualPrompt para añadir la tarjeta de storyboard.',
        },
        resultMessage: 'Se requiere visualPrompt en inglés para crear el fotograma.',
      };
    }

    const updatedSeq: ProductionSequence = {
      ...seq,
      storyboardFrames: [...seq.storyboardFrames, newCard],
      updatedAt: now,
    };
    const updatedProject: ProductionProject = {
      ...project,
      updatedAt: now,
      sequences: project.sequences.map((s, idx) => (idx === targetSeqIdx ? updatedSeq : s)),
    };
    return {
      updatedProject,
      action: {
        toolName,
        affectedArea: 'storyboard',
        summary: `Nuevo fotograma añadido al storyboard: "${newCard.title}".`,
      },
      resultMessage: `Tarjeta de storyboard "${newCard.title}" añadida con prompts para Nano y Omni Flash.`,
    };
  }

  return {
    updatedProject: project,
    action: {
      toolName,
      affectedArea: 'direccion',
      summary: `Herramienta desconocida: ${toolName}`,
    },
    resultMessage: `Herramienta ${toolName} no reconocida.`,
  };
}
