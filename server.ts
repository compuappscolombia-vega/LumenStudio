import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { FunctionDeclaration, GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AgentMessage,
  AgentRoleFocus,
  AgentToolAction,
  AudioAnalysisReport,
  LearningCategory,
  LearningLesson,
  ProductionProject,
  ProductionSequence,
  ProjectAsset,
  SourceMaterialType,
} from './src/types/studio';
import { buildContinuationContext } from './src/utils/studioLogic';
import {
  buildLearningPromptContext,
  extractAutomaticLessons,
  validateLessonInput,
} from './src/utils/learningEngine';
import { buildRatedChoiceLessons } from './src/utils/studioIntelligence';
import {
  TRIPARTITE_AGENT_INSTRUCTION,
  applyAgentToolCall,
  buildAgentTurnContext,
  formatGeminiApiError,
} from './src/utils/agentLogic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const WORKSPACE_DIR = path.resolve(__dirname, 'workspace');
const USERS_WORKSPACE_ROOT = path.join(WORKSPACE_DIR, 'users');

const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.aac',
  '.flac',
  '.webm',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 24 * 1024 * 1024 },
});

function sanitizeSlug(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getRequestUserId(req: express.Request): string {
  const fromHeader = req.headers['x-user-id'];
  const headerVal = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
  const queryVal = typeof req.query?.userId === 'string' ? req.query.userId : '';
  const bodyVal = typeof req.body?.userId === 'string' ? req.body.userId : '';
  const raw = (headerVal || queryVal || bodyVal || 'default').trim();
  return sanitizeSlug(raw).slice(0, 120) || 'default';
}

function getUserProjectsRoot(userId: string): string {
  return path.join(USERS_WORKSPACE_ROOT, sanitizeSlug(userId), 'projects');
}

function getProjectDir(userId: string, projectId: string): string {
  return path.join(getUserProjectsRoot(userId), sanitizeSlug(projectId));
}

function getProjectJsonPath(userId: string, projectId: string): string {
  return path.join(getProjectDir(userId, projectId), 'project.json');
}

function getProjectAssetsDir(userId: string, projectId: string): string {
  return path.join(getProjectDir(userId, projectId), 'assets');
}

function getLearningFile(userId: string): string {
  return path.join(USERS_WORKSPACE_ROOT, sanitizeSlug(userId), 'learning_memory.json');
}

function writeProjectFolder(userId: string, project: ProductionProject): void {
  const assetsDir = getProjectAssetsDir(userId, project.id);
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(
    getProjectJsonPath(userId, project.id),
    JSON.stringify(project, null, 2),
    'utf-8'
  );
}

function ensureWorkspaceProjects(userId: string): ProductionProject[] {
  const root = getUserProjectsRoot(userId);
  fs.mkdirSync(root, { recursive: true });
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory());

  const projects: ProductionProject[] = [];
  for (const folder of folders) {
    const jsonPath = path.join(root, folder.name, 'project.json');
    if (!fs.existsSync(jsonPath)) continue;
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as ProductionProject;
      if (parsed && parsed.id) {
        parsed.sequences = (parsed.sequences || []).map((seq) => ({
          ...seq,
          versionStatus: seq.versionStatus === 'final' ? 'final' : 'draft',
        }));
        projects.push(parsed);
      }
    } catch {
      // Skip malformed project file
    }
  }

  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function readProjectById(userId: string, projectId: string): ProductionProject | null {
  ensureWorkspaceProjects(userId);
  const jsonPath = getProjectJsonPath(userId, projectId);
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(raw) as ProductionProject;
  } catch {
    return null;
  }
}

function ensureLearningMemory(userId: string): LearningLesson[] {
  const file = getLearningFile(userId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as LearningLesson[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLearningMemory(userId: string, lessons: LearningLesson[]): void {
  const file = getLearningFile(userId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(lessons, null, 2), 'utf-8');
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY no está configurada en el servidor. Configura tu clave en Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function inferMimeType(filename: string, providedMime: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.ogg') return 'audio/ogg';
  if (ext === '.aac') return 'audio/aac';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.webm') return 'audio/webm';
  return providedMime || 'application/octet-stream';
}

function isAudioFilename(filename: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function saveUploadedAsset(
  userId: string,
  project: ProductionProject,
  file: Express.Multer.File
): { updatedProject: ProductionProject; asset: ProjectAsset } {
  const assetsDir = getProjectAssetsDir(userId, project.id);
  fs.mkdirSync(assetsDir, { recursive: true });
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = sanitizeSlug(path.basename(file.originalname, ext)).slice(0, 60);
  const storedName = `${Date.now().toString(36)}-${baseName}${ext}`;
  const fullPath = path.join(assetsDir, storedName);
  fs.writeFileSync(fullPath, file.buffer);

  const kind: ProjectAsset['kind'] = isAudioFilename(file.originalname)
    ? 'audio'
    : ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp'
      ? 'image'
      : 'document';

  const asset: ProjectAsset = {
    id: `asset-${Date.now().toString(36)}`,
    filename: file.originalname,
    kind,
    mimeType: inferMimeType(file.originalname, file.mimetype),
    sizeBytes: file.size,
    url: `/workspace-assets/${encodeURIComponent(userId)}/${encodeURIComponent(project.id)}/${encodeURIComponent(storedName)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedProject: ProductionProject = {
    ...project,
    assets: [asset, ...(project.assets || [])],
    updatedAt: new Date().toISOString(),
  };
  writeProjectFolder(userId, updatedProject);
  return { updatedProject, asset };
}

function saveGeneratedAssetBuffer(
  userId: string,
  project: ProductionProject,
  params: {
    baseName: string;
    ext: string;
    mimeType: string;
    buffer: Buffer;
    kind: ProjectAsset['kind'];
  }
): { updatedProject: ProductionProject; asset: ProjectAsset } {
  const assetsDir = getProjectAssetsDir(userId, project.id);
  fs.mkdirSync(assetsDir, { recursive: true });
  const safeBase = sanitizeSlug(params.baseName).slice(0, 50) || 'asset';
  const storedName = `${Date.now().toString(36)}-${safeBase}${params.ext}`;
  const fullPath = path.join(assetsDir, storedName);
  fs.writeFileSync(fullPath, params.buffer);

  const asset: ProjectAsset = {
    id: `asset-${Date.now().toString(36)}`,
    filename: storedName,
    kind: params.kind,
    mimeType: params.mimeType,
    sizeBytes: params.buffer.byteLength,
    url: `/workspace-assets/${encodeURIComponent(userId)}/${encodeURIComponent(project.id)}/${encodeURIComponent(storedName)}`,
    createdAt: new Date().toISOString(),
  };

  const updatedProject: ProductionProject = {
    ...project,
    assets: [asset, ...(project.assets || [])],
    updatedAt: new Date().toISOString(),
  };
  writeProjectFolder(userId, updatedProject);
  return { updatedProject, asset };
}

function normalizeNanoAspectRatio(rawRatio: string): '16:9' | '4:3' | '1:1' | '3:4' | '9:16' {
  const r = (rawRatio || '').trim();
  if (r === '9:16') return '9:16';
  if (r === '3:4') return '3:4';
  if (r === '1:1') return '1:1';
  if (r === '4:3' || r === '1.43:1') return '4:3';
  return '16:9';
}

function normalizeOmniAspectRatio(rawRatio: string): '16:9' | '9:16' {
  const r = (rawRatio || '').trim();
  if (r === '9:16' || r === '3:4') return '9:16';
  return '16:9';
}

function resolveLocalImageBase64(imageUrl?: string): { data: string; mimeType: string } | null {
  if (!imageUrl) return null;
  try {
    let targetPath: string | null = null;
    if (imageUrl.startsWith('/workspace-assets/')) {
      const parts = imageUrl.replace('/workspace-assets/', '').split('/');
      if (parts.length === 3) {
        const uid = sanitizeSlug(decodeURIComponent(parts[0]));
        const pid = sanitizeSlug(decodeURIComponent(parts[1]));
        const fname = sanitizeSlug(decodeURIComponent(parts[2]));
        targetPath = path.join(getProjectAssetsDir(uid, pid), fname);
      }
    } else if (imageUrl.startsWith('/src/assets/')) {
      const rel = imageUrl.replace(/^\/+/, '');
      targetPath = path.resolve(__dirname, rel);
    }
    if (!targetPath || !fs.existsSync(targetPath)) return null;
    const ext = path.extname(targetPath).toLowerCase();
    const mimeType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const data = fs.readFileSync(targetPath).toString('base64');
    return { data, mimeType };
  } catch {
    return null;
  }
}

async function transcribeAudioWithGemini(
  ai: GoogleGenAI,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Transcribe íntegramente este archivo de audio en su idioma original, preservando pausas dramáticas, entonaciones relevantes o anotaciones de efectos sonoros audibles entre corchetes.',
            },
            {
              inlineData: {
                mimeType,
                data: fileBuffer.toString('base64'),
              },
            },
          ],
        },
      ],
    });
    return (response.text ?? '').trim();
  } catch (err) {
    console.warn('Fallback: gemini-3.5-transcribe no devolvió texto:', err);
    return '';
  }
}

const AUDIO_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcription: { type: Type.STRING },
    narrationStyle: { type: Type.STRING },
    emotionalArc: { type: Type.STRING },
    rhythmAndPacing: { type: Type.STRING },
    detectedSoundEffects: { type: Type.ARRAY, items: { type: Type.STRING } },
    directingRecommendations: { type: Type.STRING },
  },
  required: [
    'transcription',
    'narrationStyle',
    'emotionalArc',
    'rhythmAndPacing',
    'detectedSoundEffects',
    'directingRecommendations',
  ],
};

const PRODUCER_SYSTEM_INSTRUCTION = `Eres LumenReel, un Agente Cinematográfico de élite en Hollywood que combina tres maestrías galardonadas: Director de Cine, Guionista Profesional y Experto en Efectos Especiales (VFX & SFX Prácticos).
Tu sello personal es convertir cualquier material fuente —capítulos de libros, audiolibros narrados, relatos cortos o sinopsis— en una producción cinematográfica monumental de clase mundial.

REGLAS DE ORO DEL AGENTE (DIRECTOR · GUIONISTA · EXPERTO VFX/SFX):
1. FIDELIDAD ABSOLUTA AL MATERIAL FUENTE: Respeta los eventos, nombres propios, tono emocional, diálogos clave y atmósfera de la obra proporcionada. Si recibes un archivo de audio (MP3, WAV, M4A, OGG), escucha no solo las palabras sino la narración, el tono emocional, el ritmo, las pausas y los efectos sonoros para elaborar un informe de dirección y diseño sonoro preciso junto con la transcripción.
2. DIRECCIÓN DE FOTOGRAFÍA Y PUESTA EN ESCENA (DIRECTOR): Especifica cuerpos de cámara reales (ARRI Alexa 65, Panavision Millennium DXL2, RED V-Raptor XL, Sony VENICE 2), ópticas concretas (Cooke Anamorphic, Panavision Sphero 65, Leitz Summilux-C), distancias focales en mm, iluminación por temperaturas Kelvin y movimientos motivados.
3. INGENIERÍA DE EFECTOS ESPECIALES (EXPERTO VFX/SFX): Detalla simulaciones CGI (fluidos, destrucción, criaturas, extensiones de set), composición digital e integración directa con efectos prácticos en set (rigs mecánicos, lluvia controlada, atmósferas de hazer/humo, pirotecnia, vestuario y caracterización).
4. GUION CINEMATOGRÁFICO PROFESIONAL (GUIONISTA): Redacta escenas completas en español con sluglines estándar, subtexto dramático, beats de acción visual pura ("Show, don't tell"), indicaciones técnicas de cámara y sonido, y diálogos con acotaciones precisas.
5. INGENIERÍA SONORA DOLBY ATMOS: Diseña capas ambientales, frecuencias subgraves concretas (Hz), foley hiperrealista, silencios dramáticos y score musical con tempo en BPM.
6. STORYBOARD PROMPTS: Para cada tarjeta de storyboard, escribe el prompt visual detallado en inglés y el prompt de movimiento de cámara en inglés.
7. AUTOAPRENDIZAJE CONTINUO: Aplica activamente las lecciones acumuladas por el estudio que recibes en el contexto para mejorar tu criterio en cada nueva producción.`;

const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'actualizar_biblia_continuidad',
    description:
      'Guarda o amplía reglas narrativas, visuales, de estilo o de efectos especiales en la Biblia de Continuidad del proyecto activo.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reglasContinuidad: {
          type: Type.STRING,
          description: 'Texto claro con las reglas o notas de continuidad a registrar.',
        },
        modo: {
          type: Type.STRING,
          description: '"append" para añadir al historial existente o "replace" para reescribir.',
        },
      },
      required: ['reglasContinuidad'],
    },
  },
  {
    name: 'ajustar_direccion_y_camara',
    description:
      'Actualiza la visión de dirección, sistema de cámara, lentes o esquema de iluminación Kelvin de la secuencia activa (rol Director de Cine).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        directorVision: { type: Type.STRING },
        cameraSystem: { type: Type.STRING },
        lensPackage: { type: Type.STRING },
        keyLight: { type: Type.STRING },
        colorTemperatureKelvin: { type: Type.STRING },
        atmosphereAndHaze: { type: Type.STRING },
      },
    },
  },
  {
    name: 'disenar_paquete_vfx_sfx',
    description:
      'Agrega o actualiza elementos de CGI/simulación digital, efectos prácticos en set (SFX), locaciones o caracterización en la secuencia activa (rol Experto en Efectos Especiales).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cgiElements: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de simulaciones CGI, composición o extensiones digitales.',
        },
        practicalSfx: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Lista de efectos físicos prácticos en rodaje (rigs, lluvia, humo, pirotecnia).',
        },
        locationsAndSets: { type: Type.STRING },
        wardrobeAndMakeup: { type: Type.STRING },
        modo: {
          type: Type.STRING,
          description: '"append" para combinar con los existentes o "replace" para sustituir.',
        },
      },
    },
  },
  {
    name: 'refinar_guion_escena',
    description:
      'Reescribe una escena existente por sceneNumber o añade una nueva escena con slugline y beats dramáticos al guion de la secuencia activa (rol Guionista).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sceneNumber: { type: Type.STRING },
        slugline: { type: Type.STRING },
        timeOfDay: { type: Type.STRING },
        beats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: 'Uno de: action, dialogue, camera, sound',
              },
              character: { type: Type.STRING },
              parenthetical: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ['type', 'text'],
          },
        },
      },
      required: ['sceneNumber', 'slugline', 'beats'],
    },
  },
  {
    name: 'agregar_plano_storyboard',
    description:
      'Añade una nueva tarjeta de storyboard a la secuencia activa con prompts en inglés para Nano y Omni Flash.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        shotRef: { type: Type.STRING },
        cameraSpec: { type: Type.STRING },
        visualPrompt: { type: Type.STRING },
        veoMotionPrompt: { type: Type.STRING },
      },
      required: ['title', 'visualPrompt', 'veoMotionPrompt'],
    },
  },
];

const PRODUCTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    cameraSystem: { type: Type.STRING },
    lensPackage: { type: Type.STRING },
    filmStockOrLut: { type: Type.STRING },
    logline: { type: Type.STRING },
    directorVision: { type: Type.STRING },
    colorPalette: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          hex: { type: Type.STRING },
          role: { type: Type.STRING },
        },
        required: ['name', 'hex', 'role'],
      },
    },
    lighting: {
      type: Type.OBJECT,
      properties: {
        keyLight: { type: Type.STRING },
        fillRatio: { type: Type.STRING },
        rimAndBacklight: { type: Type.STRING },
        colorTemperatureKelvin: { type: Type.STRING },
        atmosphereAndHaze: { type: Type.STRING },
      },
      required: [
        'keyLight',
        'fillRatio',
        'rimAndBacklight',
        'colorTemperatureKelvin',
        'atmosphereAndHaze',
      ],
    },
    shotList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          shotNumber: { type: Type.STRING },
          shotType: { type: Type.STRING },
          lensMm: { type: Type.STRING },
          movement: { type: Type.STRING },
          durationSec: { type: Type.NUMBER },
          framingNote: { type: Type.STRING },
          psychologicalIntent: { type: Type.STRING },
        },
        required: [
          'shotNumber',
          'shotType',
          'lensMm',
          'movement',
          'durationSec',
          'framingNote',
          'psychologicalIntent',
        ],
      },
    },
    soundDesign: {
      type: Type.OBJECT,
      properties: {
        atmosLayers: { type: Type.ARRAY, items: { type: Type.STRING } },
        subBassCue: { type: Type.STRING },
        foleyDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
        silenceBeats: { type: Type.STRING },
        musicalScore: { type: Type.STRING },
        tempoBpm: { type: Type.NUMBER },
      },
      required: [
        'atmosLayers',
        'subBassCue',
        'foleyDetails',
        'silenceBeats',
        'musicalScore',
        'tempoBpm',
      ],
    },
    audioAnalysis: AUDIO_ANALYSIS_SCHEMA,
    vfx: {
      type: Type.OBJECT,
      properties: {
        cgiElements: { type: Type.ARRAY, items: { type: Type.STRING } },
        practicalSfx: { type: Type.ARRAY, items: { type: Type.STRING } },
        locationsAndSets: { type: Type.STRING },
        wardrobeAndMakeup: { type: Type.STRING },
      },
      required: ['cgiElements', 'practicalSfx', 'locationsAndSets', 'wardrobeAndMakeup'],
    },
    screenplay: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.STRING },
          slugline: { type: Type.STRING },
          timeOfDay: { type: Type.STRING },
          beats: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                character: { type: Type.STRING },
                parenthetical: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ['type', 'text'],
            },
          },
        },
        required: ['sceneNumber', 'slugline', 'timeOfDay', 'beats'],
      },
    },
    storyboardFrames: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          shotRef: { type: Type.STRING },
          cameraSpec: { type: Type.STRING },
          visualPrompt: { type: Type.STRING },
          veoMotionPrompt: { type: Type.STRING },
        },
        required: ['title', 'shotRef', 'cameraSpec', 'visualPrompt', 'veoMotionPrompt'],
      },
    },
    continuitySummary: { type: Type.STRING },
  },
  required: [
    'cameraSystem',
    'lensPackage',
    'filmStockOrLut',
    'logline',
    'directorVision',
    'colorPalette',
    'lighting',
    'shotList',
    'soundDesign',
    'vfx',
    'screenplay',
    'storyboardFrames',
    'continuitySummary',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Serve per-user project saved assets safely
  app.get('/workspace-assets/:userId/:projectId/:filename', (req, res) => {
    const userId = sanitizeSlug(req.params.userId);
    const projectId = sanitizeSlug(req.params.projectId);
    const filename = sanitizeSlug(req.params.filename);
    const filePath = path.join(getProjectAssetsDir(userId, projectId), filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Asset no encontrado.' });
      return;
    }
    res.sendFile(filePath);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Projects CRUD (per-user folder + project.json)
  app.get('/api/projects', (req, res) => {
    const userId = getRequestUserId(req);
    const projects = ensureWorkspaceProjects(userId);
    res.json({ projects });
  });

  app.post('/api/projects', (req, res) => {
    const userId = getRequestUserId(req);
    const { title, genreStyle, defaultSourceType, continuityBible } = req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'El título del proyecto es obligatorio.' });
      return;
    }
    ensureWorkspaceProjects(userId);
    const now = new Date().toISOString();
    const newProject: ProductionProject = {
      id: `proj-${Date.now().toString(36)}`,
      title: title.trim(),
      genreStyle:
        typeof genreStyle === 'string' && genreStyle.trim()
          ? genreStyle.trim()
          : 'Épica Monumental IMAX',
      defaultSourceType:
        defaultSourceType === 'audiobook' || defaultSourceType === 'story'
          ? defaultSourceType
          : 'book',
      continuityBible: typeof continuityBible === 'string' ? continuityBible.trim() : '',
      assets: [],
      createdAt: now,
      updatedAt: now,
      sequences: [],
    };
    writeProjectFolder(userId, newProject);
    res.status(201).json({ project: newProject });
  });

  app.patch('/api/projects/:id', (req, res) => {
    const userId = getRequestUserId(req);
    const { id } = req.params;
    const { title, genreStyle, continuityBible } = req.body ?? {};
    const existing = readProjectById(userId, id);
    if (!existing) {
      res.status(404).json({ error: 'Proyecto no encontrado.' });
      return;
    }
    const updatedProject: ProductionProject = {
      ...existing,
      title: typeof title === 'string' && title.trim() ? title.trim() : existing.title,
      genreStyle:
        typeof genreStyle === 'string' && genreStyle.trim()
          ? genreStyle.trim()
          : existing.genreStyle,
      continuityBible:
        typeof continuityBible === 'string' ? continuityBible : existing.continuityBible,
      updatedAt: new Date().toISOString(),
    };
    writeProjectFolder(userId, updatedProject);
    res.json({ project: updatedProject });
  });

  app.delete('/api/projects/:id', (req, res) => {
    const userId = getRequestUserId(req);
    const { id } = req.params;
    const dir = getProjectDir(userId, id);
    if (!fs.existsSync(dir)) {
      res.status(404).json({ error: 'Proyecto no encontrado.' });
      return;
    }
    fs.rmSync(dir, { recursive: true, force: true });
    res.json({ ok: true });
  });

  // Finalize a sequence (Draft -> Final Version) + extract automatic self-learning lessons
  app.patch('/api/projects/:id/sequences/:seqId/finalize', (req, res) => {
    const userId = getRequestUserId(req);
    const { id, seqId } = req.params;
    const project = readProjectById(userId, id);
    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado.' });
      return;
    }
    const seqIdx = project.sequences.findIndex((s) => s.id === seqId);
    if (seqIdx === -1) {
      res.status(404).json({ error: 'Secuencia no encontrada.' });
      return;
    }

    const currentSeq = project.sequences[seqIdx];
    const finalizedSeq: ProductionSequence = {
      ...currentSeq,
      versionStatus: 'final',
      updatedAt: new Date().toISOString(),
    };

    const updatedSequences = [...project.sequences];
    updatedSequences[seqIdx] = finalizedSeq;
    const updatedProject: ProductionProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      sequences: updatedSequences,
    };
    writeProjectFolder(userId, updatedProject);

    // Extract automatic lessons into self-learning memory if not already final
    let lessons = ensureLearningMemory(userId);
    if (currentSeq.versionStatus !== 'final') {
      const autoLessons = extractAutomaticLessons(project.title, finalizedSeq).map((item, i) => ({
        ...item,
        id: `lesson-auto-${Date.now().toString(36)}-${i}`,
        createdAt: new Date().toISOString(),
      }));
      lessons = [...autoLessons, ...lessons];
      saveLearningMemory(userId, lessons);
    }

    res.json({
      project: updatedProject,
      sequence: finalizedSeq,
      lessons,
    });
  });

  // Studio Intelligence: Rate a sequence's camera, lighting & soundscape outcomes (1-5)
  app.patch('/api/projects/:id/sequences/:seqId/rate', (req, res) => {
    const userId = getRequestUserId(req);
    const { id, seqId } = req.params;
    const rating = Number(req.body?.rating);
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'La valoración debe ser un entero entre 1 y 5.' });
      return;
    }

    const project = readProjectById(userId, id);
    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado.' });
      return;
    }
    const seqIdx = project.sequences.findIndex((s) => s.id === seqId);
    if (seqIdx === -1) {
      res.status(404).json({ error: 'Secuencia no encontrada.' });
      return;
    }

    const currentSeq = project.sequences[seqIdx];
    const ratedSeq: ProductionSequence = {
      ...currentSeq,
      sequenceRating: rating,
      updatedAt: new Date().toISOString(),
    };
    const updatedSequences = [...project.sequences];
    updatedSequences[seqIdx] = ratedSeq;
    const updatedProject: ProductionProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      sequences: updatedSequences,
    };
    writeProjectFolder(userId, updatedProject);

    let lessons = ensureLearningMemory(userId);
    if (rating >= 4) {
      const extracted = buildRatedChoiceLessons({
        projectTitle: project.title,
        sequence: ratedSeq,
        rating,
        note,
      }).map((item, idx) => ({
        ...item,
        id: `lesson-rate-${Date.now().toString(36)}-${idx}`,
        createdAt: new Date().toISOString(),
      }));
      lessons = [...extracted, ...lessons];
      saveLearningMemory(userId, lessons);
    }

    res.json({
      project: updatedProject,
      sequence: ratedSeq,
      lessons,
    });
  });

  // Nano Image Generation (gemini-nano-banana-2.1 / gemini-3.1-flash-lite-image)
  app.post('/api/generate-image', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const { projectId, sequenceId, frameId, prompt, aspectRatio, quality } = req.body ?? {};
      const pid = String(projectId || '').trim();
      const sid = String(sequenceId || '').trim();
      const fid = String(frameId || '').trim();
      const visualPrompt = String(prompt || '').trim();

      if (!pid || !visualPrompt) {
        res.status(400).json({ error: 'Se requiere el proyecto y el prompt visual.' });
        return;
      }

      let project = readProjectById(userId, pid);
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado.' });
        return;
      }

      const ai = getGenAIClient();
      const modelName =
        quality === 'lite' ? 'gemini-3.1-flash-lite-image' : 'gemini-nano-banana-2.1';
      const nanoRatio = normalizeNanoAspectRatio(String(aspectRatio || '16:9'));

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              text: `${visualPrompt}\n\nPhotorealistic 65mm film still, cinematic color grading, no text overlays or watermarks.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: nanoRatio,
            ...(modelName === 'gemini-nano-banana-2.1' ? { imageSize: '1K' } : {}),
          },
        },
      });

      let imageBase64 = '';
      let mimeType = 'image/png';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!imageBase64) {
        throw new Error('Nano no devolvió ninguna imagen en la respuesta.');
      }

      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? '.jpg' : '.png';
      const buffer = Buffer.from(imageBase64, 'base64');
      const saved = saveGeneratedAssetBuffer(userId, project, {
        baseName: `nano-${fid || 'frame'}`,
        ext,
        mimeType,
        buffer,
        kind: 'image',
      });
      project = saved.updatedProject;

      // Update sequence storyboard frame imageUrl in project.json
      if (sid && fid) {
        const seqIdx = project.sequences.findIndex((s) => s.id === sid);
        if (seqIdx !== -1) {
          const seq = project.sequences[seqIdx];
          const updatedFrames = seq.storyboardFrames.map((fr) =>
            fr.id === fid ? { ...fr, imageUrl: saved.asset.url } : fr
          );
          project = {
            ...project,
            sequences: project.sequences.map((s, idx) =>
              idx === seqIdx
                ? { ...s, storyboardFrames: updatedFrames, updatedAt: new Date().toISOString() }
                : s
            ),
          };
          writeProjectFolder(userId, project);
        }
      }

      res.json({
        imageUrl: saved.asset.url,
        model: modelName,
        project,
      });
    } catch (error) {
      const message = formatGeminiApiError(error);
      console.error('Error en /api/generate-image:', error);
      res.status(500).json({ error: message });
    }
  });

  // Omni Flash Video Generation (gemini-omni-1.2-flash via Interactions API)
  app.post('/api/generate-video', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const { projectId, sequenceId, frameId, prompt, aspectRatio, duration, imageUrl } =
        req.body ?? {};
      const pid = String(projectId || '').trim();
      const sid = String(sequenceId || '').trim();
      const fid = String(frameId || '').trim();
      const motionPrompt = String(prompt || '').trim();

      if (!pid || !motionPrompt) {
        res.status(400).json({ error: 'Se requiere el proyecto y el prompt de movimiento.' });
        return;
      }

      let project = readProjectById(userId, pid);
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado.' });
        return;
      }

      const ai = getGenAIClient();
      const omniRatio = normalizeOmniAspectRatio(String(aspectRatio || '16:9'));
      const videoDuration =
        typeof duration === 'string' && /^(3|4|5|6|7|8|9|10)s$/.test(duration)
          ? duration
          : '6s';

      const sourceImage = resolveLocalImageBase64(
        typeof imageUrl === 'string' ? imageUrl : undefined
      );

      const inputPayload = sourceImage
        ? [
            {
              type: 'image' as const,
              mime_type: sourceImage.mimeType,
              data: sourceImage.data,
            },
            {
              type: 'text' as const,
              text: motionPrompt,
            },
          ]
        : motionPrompt;

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: inputPayload,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: omniRatio,
            duration: videoDuration,
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart || (!videoPart.data && !videoPart.uri)) {
        throw new Error('Omni Flash no devolvió un archivo de video válido.');
      }

      let videoBuffer: Buffer;
      let mimeType = videoPart.mime_type || 'video/mp4';

      if (videoPart.data) {
        videoBuffer = Buffer.from(videoPart.data, 'base64');
      } else if (videoPart.uri) {
        const fetched = await fetch(videoPart.uri);
        if (!fetched.ok) {
          throw new Error('No se pudo descargar el video generado por Omni Flash.');
        }
        mimeType = fetched.headers.get('content-type') || mimeType;
        videoBuffer = Buffer.from(await fetched.arrayBuffer());
      } else {
        throw new Error('Respuesta de video vacía.');
      }

      const saved = saveGeneratedAssetBuffer(userId, project, {
        baseName: `omniflash-${fid || 'clip'}`,
        ext: '.mp4',
        mimeType,
        buffer: videoBuffer,
        kind: 'video',
      });
      project = saved.updatedProject;

      if (sid && fid) {
        const seqIdx = project.sequences.findIndex((s) => s.id === sid);
        if (seqIdx !== -1) {
          const seq = project.sequences[seqIdx];
          const updatedFrames = seq.storyboardFrames.map((fr) =>
            fr.id === fid ? { ...fr, videoUrl: saved.asset.url } : fr
          );
          project = {
            ...project,
            sequences: project.sequences.map((s, idx) =>
              idx === seqIdx
                ? { ...s, storyboardFrames: updatedFrames, updatedAt: new Date().toISOString() }
                : s
            ),
          };
          writeProjectFolder(userId, project);
        }
      }

      res.json({
        videoUrl: saved.asset.url,
        model: 'gemini-omni-1.2-flash',
        project,
      });
    } catch (error) {
      const message = formatGeminiApiError(error);
      console.error('Error en /api/generate-video:', error);
      res.status(500).json({ error: message });
    }
  });

  // Self-Learning Memory Endpoints
  app.get('/api/learning', (req, res) => {
    const userId = getRequestUserId(req);
    const lessons = ensureLearningMemory(userId);
    res.json({ lessons });
  });

  app.post('/api/learning', (req, res) => {
    const userId = getRequestUserId(req);
    const { category, insight, rating, sourceProjectTitle } = req.body ?? {};
    const validCategories: LearningCategory[] = [
      'camera',
      'lighting',
      'sound',
      'screenplay',
      'pacing',
      'continuity',
    ];
    const check = validateLessonInput({
      insight: String(insight || ''),
      rating: Number(rating),
    });
    if (!check.valid) {
      res.status(400).json({ error: check.error });
      return;
    }

    const lessons = ensureLearningMemory(userId);
    const newLesson: LearningLesson = {
      id: `lesson-${Date.now().toString(36)}`,
      category: validCategories.includes(category) ? category : 'camera',
      insight: String(insight).trim(),
      rating: Number(rating),
      sourceProjectTitle: String(sourceProjectTitle || 'LumenReel Studio').trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newLesson, ...lessons];
    saveLearningMemory(userId, updated);
    res.status(201).json({ lesson: newLesson, lessons: updated });
  });

  app.delete('/api/learning/:id', (req, res) => {
    const userId = getRequestUserId(req);
    const { id } = req.params;
    const lessons = ensureLearningMemory(userId);
    const filtered = lessons.filter((l) => l.id !== id);
    if (filtered.length === lessons.length) {
      res.status(404).json({ error: 'Lección no encontrada.' });
      return;
    }
    saveLearningMemory(userId, filtered);
    res.json({ ok: true, lessons: filtered });
  });

  // Standalone Audio Analysis & Transcription endpoint
  app.post('/api/analyze-audio', upload.single('audioFile'), async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const file = req.file;
      const projectId = String(req.body?.projectId || '').trim();
      if (!file) {
        res.status(400).json({ error: 'Adjunta un archivo de audio MP3, WAV, M4A u OGG.' });
        return;
      }
      if (!isAudioFilename(file.originalname)) {
        res.status(400).json({
          error: 'Formato de audio no compatible. Usa MP3, WAV, M4A, OGG, AAC, FLAC o WEBM.',
        });
        return;
      }

      let activeProject = projectId ? readProjectById(userId, projectId) : null;
      if (activeProject) {
        const saved = saveUploadedAsset(userId, activeProject, file);
        activeProject = saved.updatedProject;
      }

      const ai = getGenAIClient();
      const mimeType = inferMimeType(file.originalname, file.mimetype);
      const verbatimTranscript = await transcribeAudioWithGemini(ai, file.buffer, mimeType);
      const lessons = ensureLearningMemory(userId);
      const learningContext = buildLearningPromptContext(lessons, 6);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: file.buffer.toString('base64'),
              },
            },
            {
              text: `Analiza este archivo de audio cinematográfico (${file.originalname}).
TRANSCRIPCIÓN BASE DETECTADA:
${verbatimTranscript || '[Extrae la transcripción verbatim escuchando directamente el audio.]'}

MEMORIA DE AUTOAPRENDIZAJE DEL ESTUDIO:
${learningContext}

Genera un informe profesional en español que capture:
1) transcription: transcripción fiel y completa del audio.
2) narrationStyle: cadencia vocal, dicción, timbre, proximidad al micrófono e intención actoral.
3) emotionalArc: evolución emocional y subtexto dramático de principio a fin.
4) rhythmAndPacing: estructura rítmica, pausas, aceleraciones y cortes recomendados para montaje.
5) detectedSoundEffects: lista detallada de efectos sonoros, ambientes o ruidos reales detectados o sugeridos.
6) directingRecommendations: indicaciones concretas de cámara, luz y mezcla Dolby Atmos basadas en la escucha.`,
            },
          ],
        },
        config: {
          systemInstruction: PRODUCER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: AUDIO_ANALYSIS_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      const raw = (response.text ?? '').trim();
      if (!raw) throw new Error('No se recibió análisis de audio del modelo.');
      const report = JSON.parse(raw) as AudioAnalysisReport;
      if (!report.transcription && verbatimTranscript) {
        report.transcription = verbatimTranscript;
      }

      res.json({ report, project: activeProject });
    } catch (error) {
      const message = formatGeminiApiError(error);
      console.error('Error en /api/analyze-audio:', error);
      res.status(500).json({ error: message });
    }
  });

  // Full Production Generation (Book, Audio MP3/WAV/M4A/OGG, or Story)
  app.post('/api/produce', upload.single('sourceFile'), async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const body = req.body ?? {};
      const projectId = String(body.projectId || '').trim();
      const sequenceTitle = String(body.sequenceTitle || '').trim();
      const sourceType = (String(body.sourceType || 'book').trim() || 'book') as SourceMaterialType;
      const directorStyle = String(body.directorStyle || 'Épica Monumental IMAX').trim();
      const aspectRatio = String(body.aspectRatio || '2.39:1').trim();
      const thinkingDepth = String(body.thinkingDepth || 'standard').trim();
      const continuityBible = String(body.continuityBible || '').trim();
      let sourceText = String(body.sourceText || '').trim();

      if (!projectId) {
        res.status(400).json({ error: 'Falta el identificador del proyecto.' });
        return;
      }
      if (!sequenceTitle) {
        res.status(400).json({ error: 'El título de la secuencia o capítulo es obligatorio.' });
        return;
      }

      const file = req.file;
      if (!file && sourceText.length < 20) {
        res.status(400).json({
          error:
            'Proporciona al menos 20 caracteres del texto fuente o adjunta un archivo PDF, TXT o audio.',
        });
        return;
      }

      let project = readProjectById(userId, projectId);
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado en el estudio.' });
        return;
      }

      const ai = getGenAIClient();
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      let sourceFilename: string | undefined;
      let isAudioUpload = false;
      let verbatimTranscript = '';

      if (file) {
        sourceFilename = file.originalname;
        const saved = saveUploadedAsset(userId, project, file);
        project = saved.updatedProject;

        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.txt' || ext === '.md' || ext === '.fountain') {
          const decodedText = file.buffer.toString('utf-8');
          sourceText = sourceText
            ? `${sourceText}\n\n--- CONTENIDO DEL ARCHIVO (${file.originalname}) ---\n${decodedText}`
            : decodedText;
        } else {
          const mimeType = inferMimeType(file.originalname, file.mimetype);
          isAudioUpload = isAudioFilename(file.originalname);
          if (isAudioUpload) {
            verbatimTranscript = await transcribeAudioWithGemini(ai, file.buffer, mimeType);
          }
          parts.push({
            inlineData: {
              mimeType,
              data: file.buffer.toString('base64'),
            },
          });
        }
      }

      const lessons = ensureLearningMemory(userId);
      const learningContext = buildLearningPromptContext(lessons, 8);

      const audioInstructions = isAudioUpload
        ? `\nMATERIAL DE AUDIO DETECTADO (${sourceFilename}):
Transcripción inicial capturada: ${verbatimTranscript || '[Escucha directamente el audio adjunto]'}
OBLIGATORIO: Completa el bloque "audioAnalysis" en el JSON con: transcription (transcripción completa), narrationStyle, emotionalArc, rhythmAndPacing, detectedSoundEffects y directingRecommendations.`
        : '';

      const promptText = `PRODUCCIÓN ACTIVA: ${project.title}
SECUENCIA / CAPÍTULO: ${sequenceTitle}
TIPO DE MATERIAL FUENTE: ${sourceType === 'audiobook' ? 'Audiolibro / Relato Narrado' : sourceType === 'book' ? 'Libro / Manuscrito Literario' : 'Historia Original / Sinopsis'}
ESTILO CINEMATOGRÁFICO OBJETIVO: ${directorStyle}
RELACIÓN DE ASPECTO OBJETIVO: ${aspectRatio}

MEMORIA DE AUTOAPRENDIZAJE Y MEJORA DEL ESTUDIO:
${learningContext}

BIBLIA DE CONTINUIDAD DEL PROYECTO:
${continuityBible || project.continuityBible || 'Establecer el estándar visual y sonoro desde cero manteniendo coherencia de Hollywood.'}
${audioInstructions}

MATERIAL FUENTE ESCRITO / NOTAS DEL CLIENTE:
${sourceText || '[El material fuente principal está adjunto como archivo binario PDF o Audio. Procésalo íntegramente.]'}

Genera el expediente completo de dirección en JSON estructurado siguiendo el esquema solicitado. Incluye al menos 4 planos en shotList, al menos 1 escena detallada con múltiples beats (action, camera, sound, dialogue) en screenplay, y 3 tarjetas de storyboardFrames.`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction: PRODUCER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: PRODUCTION_RESPONSE_SCHEMA,
          thinkingConfig: {
            thinkingLevel:
              thinkingDepth === 'deep' ? ThinkingLevel.HIGH : ThinkingLevel.MEDIUM,
          },
        },
      });

      const rawJson = (response.text ?? '').trim();
      if (!rawJson) {
        throw new Error('El motor cinematográfico devolvió una respuesta vacía.');
      }

      const parsed = JSON.parse(rawJson);

      const audioAnalysis: AudioAnalysisReport | undefined = isAudioUpload
        ? parsed.audioAnalysis || {
            transcription: verbatimTranscript || sourceText,
            narrationStyle: 'Narración expresiva capturada del audio fuente.',
            emotionalArc: 'Progresión dramática analizada en la pista vocal.',
            rhythmAndPacing: 'Cadencia y pausas integradas en el montaje.',
            detectedSoundEffects: [],
            directingRecommendations: parsed.directorVision || '',
          }
        : undefined;

      if (audioAnalysis && !audioAnalysis.transcription && verbatimTranscript) {
        audioAnalysis.transcription = verbatimTranscript;
      }

      const now = new Date().toISOString();
      const createdSequence: ProductionSequence = {
        id: `seq-${Date.now().toString(36)}`,
        title: sequenceTitle,
        versionStatus: 'draft',
        sourceType,
        sourceFilename,
        directorStyle,
        aspectRatio,
        cameraSystem: parsed.cameraSystem || 'ARRI Alexa 65',
        lensPackage: parsed.lensPackage || 'Cooke Anamorphic /i',
        filmStockOrLut: parsed.filmStockOrLut || 'Kodak 2383 Print LUT',
        logline: parsed.logline || '',
        directorVision: parsed.directorVision || '',
        colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : [],
        lighting: parsed.lighting,
        shotList: Array.isArray(parsed.shotList) ? parsed.shotList : [],
        soundDesign: parsed.soundDesign,
        audioAnalysis,
        vfx: parsed.vfx,
        screenplay: Array.isArray(parsed.screenplay) ? parsed.screenplay : [],
        storyboardFrames: Array.isArray(parsed.storyboardFrames)
          ? parsed.storyboardFrames.map((frame: Record<string, string>, idx: number) => ({
              id: `sb-${Date.now().toString(36)}-${idx}`,
              title: frame.title || `Fotograma ${idx + 1}`,
              shotRef: frame.shotRef || `Plano 0${idx + 1}`,
              aspectRatio,
              cameraSpec: frame.cameraSpec || parsed.cameraSystem || '65mm IMAX',
              visualPrompt: frame.visualPrompt || '',
              veoMotionPrompt: frame.veoMotionPrompt || '',
            }))
          : [],
        continuitySummary: parsed.continuitySummary || '',
        createdAt: now,
        updatedAt: now,
      };

      const updatedBible = buildContinuationContext(
        continuityBible || project.continuityBible,
        sequenceTitle,
        createdSequence.continuitySummary
      );

      const updatedProject: ProductionProject = {
        ...project,
        continuityBible: updatedBible,
        updatedAt: now,
        sequences: [createdSequence, ...project.sequences],
      };

      writeProjectFolder(userId, updatedProject);

      res.json({
        project: updatedProject,
        sequence: createdSequence,
      });
    } catch (error) {
      const message = formatGeminiApiError(error);
      console.error('Error en /api/produce:', error);
      res.status(500).json({ error: message });
    }
  });

  // Tripartite Agent Chat & Tool Execution (Director · Guionista · Experto en Efectos Especiales)
  app.post('/api/agent/chat', async (req, res) => {
    try {
      const userId = getRequestUserId(req);
      const { projectId, sequenceId, message, focus } = req.body ?? {};
      const pid = String(projectId || '').trim();
      const sid = String(sequenceId || '').trim();
      const userMessageText = String(message || '').trim();
      const roleFocus: AgentRoleFocus =
        focus === 'director' || focus === 'screenwriter' || focus === 'vfx'
          ? focus
          : 'council';

      if (!pid || !userMessageText) {
        res.status(400).json({
          error: 'Se requiere un proyecto activo y una instrucción para el Agente.',
        });
        return;
      }

      let project = readProjectById(userId, pid);
      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado en el estudio.' });
        return;
      }

      const activeSequence =
        (sid ? project.sequences.find((s) => s.id === sid) : undefined) ||
        project.sequences[0] ||
        null;

      const ai = getGenAIClient();
      const lessons = ensureLearningMemory(userId);
      const learningContext = buildLearningPromptContext(lessons, 6);
      const systemContext = buildAgentTurnContext({
        project,
        activeSequence,
        focus: roleFocus,
        learningContext,
      });

      const historyMessages = (project.agentMessages || []).slice(-10).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      }));

      const conversationContents: Array<{
        role?: 'user' | 'model';
        parts?: unknown[];
        [key: string]: unknown;
      }> = [
        ...historyMessages,
        {
          role: 'user',
          parts: [
            {
              text: `${systemContext}\n\nINSTRUCCIÓN DEL USUARIO:\n${userMessageText}`,
            },
          ],
        },
      ];

      const executedActions: AgentToolAction[] = [];
      let response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: conversationContents as never,
        config: {
          systemInstruction: TRIPARTITE_AGENT_INSTRUCTION,
          tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      let round = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && round < 3) {
        round += 1;
        const previousContent = response.candidates?.[0]?.content;
        if (!previousContent) break;

        const functionResponseParts = [];
        for (const fnCall of response.functionCalls) {
          const toolName = fnCall.name || '';
          const args = (fnCall.args || {}) as Record<string, unknown>;
          const outcome = applyAgentToolCall({
            project,
            activeSequenceId: activeSequence?.id,
            toolName,
            args,
          });
          project = outcome.updatedProject;
          executedActions.push(outcome.action);

          functionResponseParts.push({
            functionResponse: {
              id: fnCall.id,
              name: toolName,
              response: { result: outcome.resultMessage },
            },
          });
        }

        conversationContents.push(previousContent as unknown as Record<string, unknown>);
        conversationContents.push({
          role: 'user',
          parts: functionResponseParts,
        });

        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: conversationContents as never,
          config: {
            systemInstruction: TRIPARTITE_AGENT_INSTRUCTION,
            tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          },
        });
      }

      const replyText =
        (response.text ?? '').trim() ||
        (executedActions.length > 0
          ? 'He aplicado los ajustes solicitados en el expediente de tu producción.'
          : 'No se recibió respuesta del Agente.');

      const now = new Date().toISOString();
      const userEntry: AgentMessage = {
        id: `msg-u-${Date.now().toString(36)}`,
        role: 'user',
        focus: roleFocus,
        content: userMessageText,
        createdAt: now,
      };
      const agentEntry: AgentMessage = {
        id: `msg-a-${(Date.now() + 1).toString(36)}`,
        role: 'agent',
        focus: roleFocus,
        content: replyText,
        actions: executedActions.length > 0 ? executedActions : undefined,
        createdAt: new Date(Date.now() + 1).toISOString(),
      };

      const nextMessages = [...(project.agentMessages || []), userEntry, agentEntry].slice(-40);
      project = {
        ...project,
        agentMessages: nextMessages,
        updatedAt: now,
      };
      writeProjectFolder(userId, project);

      res.json({
        reply: replyText,
        actions: executedActions,
        project,
        messages: nextMessages,
      });
    } catch (error) {
      const message = formatGeminiApiError(error);
      console.error('Error en /api/agent/chat:', error);
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/agent/chat/:projectId', (req, res) => {
    const userId = getRequestUserId(req);
    const { projectId } = req.params;
    const project = readProjectById(userId, projectId);
    if (!project) {
      res.status(404).json({ error: 'Proyecto no encontrado.' });
      return;
    }
    const updatedProject: ProductionProject = {
      ...project,
      agentMessages: [],
      updatedAt: new Date().toISOString(),
    };
    writeProjectFolder(userId, updatedProject);
    res.json({ project: updatedProject });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/workspace-assets')) {
        next();
        return;
      }
      try {
        const htmlPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(htmlPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LumenReel Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
