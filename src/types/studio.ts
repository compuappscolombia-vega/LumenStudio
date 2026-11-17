export type SourceMaterialType = 'book' | 'audiobook' | 'story';

export type WorkspaceTab = 'agent' | 'vision' | 'shots' | 'screenplay' | 'storyboard';

export type AgentRoleFocus = 'council' | 'director' | 'screenwriter' | 'vfx';

export interface AgentToolAction {
  toolName: string;
  summary: string;
  affectedArea: 'biblia' | 'direccion' | 'guion' | 'vfx' | 'storyboard';
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  focus: AgentRoleFocus;
  content: string;
  actions?: AgentToolAction[];
  createdAt: string;
}

export type ThinkingDepth = 'standard' | 'deep';

export type SequenceVersionStatus = 'draft' | 'final';

export type LearningCategory =
  | 'camera'
  | 'lighting'
  | 'sound'
  | 'screenplay'
  | 'pacing'
  | 'continuity';

export interface LearningLesson {
  id: string;
  category: LearningCategory;
  insight: string;
  rating: number;
  sourceProjectTitle: string;
  createdAt: string;
}

export interface ProjectAsset {
  id: string;
  filename: string;
  kind: 'audio' | 'document' | 'image' | 'video';
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface AudioAnalysisReport {
  transcription: string;
  narrationStyle: string;
  emotionalArc: string;
  rhythmAndPacing: string;
  detectedSoundEffects: string[];
  directingRecommendations: string;
}

export interface ColorSwatch {
  name: string;
  hex: string;
  role: string;
}

export interface ShotSpec {
  shotNumber: string;
  shotType: string;
  lensMm: string;
  movement: string;
  durationSec: number;
  framingNote: string;
  psychologicalIntent: string;
}

export interface LightingSetup {
  keyLight: string;
  fillRatio: string;
  rimAndBacklight: string;
  colorTemperatureKelvin: string;
  atmosphereAndHaze: string;
}

export interface SoundDesignSpec {
  atmosLayers: string[];
  subBassCue: string;
  foleyDetails: string[];
  silenceBeats: string;
  musicalScore: string;
  tempoBpm: number;
}

export interface VfxBreakdown {
  cgiElements: string[];
  practicalSfx: string[];
  locationsAndSets: string;
  wardrobeAndMakeup: string;
}

export interface ScreenplayBeat {
  type: 'action' | 'dialogue' | 'camera' | 'sound';
  character?: string;
  parenthetical?: string;
  text: string;
}

export interface ScreenplayScene {
  sceneNumber: string;
  slugline: string;
  timeOfDay: string;
  beats: ScreenplayBeat[];
}

export interface StoryboardCard {
  id: string;
  title: string;
  shotRef: string;
  aspectRatio: string;
  cameraSpec: string;
  imageUrl?: string;
  videoUrl?: string;
  visualPrompt: string;
  veoMotionPrompt: string;
}

export interface ProductionSequence {
  id: string;
  title: string;
  versionStatus: SequenceVersionStatus;
  sourceType: SourceMaterialType;
  sourceFilename?: string;
  directorStyle: string;
  aspectRatio: string;
  cameraSystem: string;
  lensPackage: string;
  filmStockOrLut: string;
  logline: string;
  directorVision: string;
  colorPalette: ColorSwatch[];
  lighting: LightingSetup;
  shotList: ShotSpec[];
  soundDesign: SoundDesignSpec;
  audioAnalysis?: AudioAnalysisReport;
  vfx: VfxBreakdown;
  screenplay: ScreenplayScene[];
  storyboardFrames: StoryboardCard[];
  continuitySummary: string;
  sequenceRating?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductionProject {
  id: string;
  title: string;
  genreStyle: string;
  defaultSourceType: SourceMaterialType;
  continuityBible: string;
  assets?: ProjectAsset[];
  agentMessages?: AgentMessage[];
  createdAt: string;
  updatedAt: string;
  sequences: ProductionSequence[];
}

export interface DirectorStylePreset {
  id: string;
  label: string;
  references: string;
  defaultCamera: string;
  defaultLenses: string;
  defaultRatio: string;
  description: string;
}

export interface PatternMetric {
  label: string;
  detail: string;
  occurrences: number;
  avgRating: number;
  sourceProjects: string[];
}

export interface DirectorialEnhancement {
  id: string;
  category: 'camera' | 'lighting' | 'sound';
  title: string;
  recommendation: string;
  rationale: string;
  sourceProjectTitle: string;
  confidenceScore: number;
  continuitySnippet: string;
}

export interface StudioIntelligenceReport {
  totalTrackedOutcomes: number;
  finalizedSequencesCount: number;
  topCameraPatterns: PatternMetric[];
  topLightingSetups: PatternMetric[];
  topSoundscapes: PatternMetric[];
  enhancements: DirectorialEnhancement[];
}
