import { useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Lightbulb,
  Sparkles,
  Star,
  Sun,
  Volume2,
} from 'lucide-react';
import type {
  DirectorialEnhancement,
  ProductionProject,
  ProductionSequence,
  StudioIntelligenceReport,
} from '../types/studio';
import { ProductionRadarChart } from './ProductionRadarChart';

interface VisionViewProps {
  project: ProductionProject;
  sequence: ProductionSequence;
  continuityBible: string;
  intelligence: StudioIntelligenceReport;
  onRateSequence: (rating: number, note: string) => Promise<void>;
  onApplyEnhancement: (snippet: string) => Promise<void>;
}

const CATEGORY_META: Record<
  DirectorialEnhancement['category'],
  { label: string; icon: typeof Camera }
> = {
  camera: { label: 'Cámara y Óptica', icon: Camera },
  lighting: { label: 'Iluminación', icon: Sun },
  sound: { label: 'Diseño Sonoro', icon: Volume2 },
};

export function VisionView({
  project,
  sequence,
  continuityBible,
  intelligence,
  onRateSequence,
  onApplyEnhancement,
}: VisionViewProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(
    sequence.sequenceRating || 5
  );
  const [ratingNote, setRatingNote] = useState('');
  const [savingRating, setSavingRating] = useState(false);
  const [ratingSavedMsg, setRatingSavedMsg] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function handleCopyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1400);
    } catch {
      // Clipboard blocked in non-secure context; ignore silently
    }
  }

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    setSavingRating(true);
    setRatingSavedMsg(null);
    try {
      await onRateSequence(selectedRating, ratingNote);
      setRatingNote('');
      setRatingSavedMsg(
        selectedRating >= 4
          ? 'Elecciones registradas en Studio Intelligence para futuras secuencias.'
          : 'Valoración guardada en la secuencia.'
      );
      setTimeout(() => setRatingSavedMsg(null), 3500);
    } finally {
      setSavingRating(false);
    }
  }

  async function handleApply(enhancement: DirectorialEnhancement) {
    setApplyingId(enhancement.id);
    try {
      await onApplyEnhancement(enhancement.continuitySnippet);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Logline & Director Vision */}
      <section aria-labelledby="vision-heading" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#9A968E] font-mono-tech">
          <span>{sequence.directorStyle}</span>
          <span aria-hidden="true">·</span>
          <span>Formato {sequence.aspectRatio}</span>
          {sequence.sourceFilename && (
            <>
              <span aria-hidden="true">·</span>
              <span>Fuente: {sequence.sourceFilename}</span>
            </>
          )}
        </div>

        <h2
          id="vision-heading"
          className="font-display text-2xl sm:text-3xl font-semibold text-[#F2F0EB] leading-tight text-balance max-w-3xl"
        >
          {sequence.logline}
        </h2>

        <p className="text-[15px] text-[#CFCAC0] leading-relaxed max-w-[70ch]">
          {sequence.directorVision}
        </p>
      </section>

      {/* Production Progress Radar Chart (Recharts) */}
      <ProductionRadarChart project={project} activeSequence={sequence} />

      {/* Camera & Optical Package */}
      <section aria-labelledby="optics-heading" className="pt-6 border-t border-white/10">
        <h3 id="optics-heading" className="font-display text-sm font-semibold text-[#E5A93C] mb-4">
          01. Paquete Óptico y Cámara
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-white/10 bg-[#131318]">
            <div className="text-xs text-[#8D8981] mb-1">Sistema de Cámara</div>
            <div className="text-sm font-semibold text-[#F2F0EB]">{sequence.cameraSystem}</div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-[#131318]">
            <div className="text-xs text-[#8D8981] mb-1">Juego de Lentes</div>
            <div className="text-sm font-semibold text-[#F2F0EB]">{sequence.lensPackage}</div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-[#131318]">
            <div className="text-xs text-[#8D8981] mb-1">Emulsión / LUT Maestro</div>
            <div className="text-sm font-semibold text-[#F2F0EB]">{sequence.filmStockOrLut}</div>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section aria-labelledby="palette-heading" className="pt-6 border-t border-white/10">
        <h3 id="palette-heading" className="font-display text-sm font-semibold text-[#E5A93C] mb-4">
          02. Paleta de Color y Colorimetría
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {sequence.colorPalette.map((swatch) => (
            <button
              key={`${swatch.name}-${swatch.hex}`}
              type="button"
              onClick={() => handleCopyHex(swatch.hex)}
              className="group text-left rounded-xl border border-white/10 bg-[#131318] overflow-hidden hover:border-white/25 transition-colors focus-visible:outline-2 focus-visible:outline-[#E5A93C]"
            >
              <div
                className="h-16 w-full border-b border-white/10"
                style={{ backgroundColor: swatch.hex }}
              />
              <div className="p-3">
                <div className="text-xs font-semibold text-[#F2F0EB] truncate">{swatch.name}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono-tech text-[#8D8981]">
                  <span>{swatch.hex}</span>
                  {copiedHex === swatch.hex ? (
                    <Check className="w-3 h-3 text-[#22C55E]" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="mt-1 text-[11px] text-[#7D7971] line-clamp-1">{swatch.role}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Lighting Plot */}
      <section aria-labelledby="lighting-heading" className="pt-6 border-t border-white/10">
        <h3 id="lighting-heading" className="font-display text-sm font-semibold text-[#E5A93C] mb-4">
          03. Esquema de Iluminación y Atmósfera
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-white/10 bg-[#131318] space-y-3">
            <div>
              <div className="text-xs text-[#8D8981]">Luz Principal (Key Light)</div>
              <div className="text-sm text-[#EAE6DE] mt-0.5">{sequence.lighting.keyLight}</div>
            </div>
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs text-[#8D8981]">Ratio de Contraste / Relleno</div>
              <div className="text-sm text-[#EAE6DE] mt-0.5">{sequence.lighting.fillRatio}</div>
            </div>
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs text-[#8D8981]">Contraluz y Perfilado (Rim)</div>
              <div className="text-sm text-[#EAE6DE] mt-0.5">{sequence.lighting.rimAndBacklight}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-[#131318] space-y-3">
            <div>
              <div className="text-xs text-[#8D8981]">Temperaturas de Color (Kelvin)</div>
              <div className="text-sm font-mono-tech text-[#EAE6DE] mt-0.5">
                {sequence.lighting.colorTemperatureKelvin}
              </div>
            </div>
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs text-[#8D8981]">Densidad Atmosférica y Niebla</div>
              <div className="text-sm text-[#EAE6DE] mt-0.5">{sequence.lighting.atmosphereAndHaze}</div>
            </div>
          </div>
        </div>
      </section>

      {/* VFX, Practical SFX & Production Design */}
      <section aria-labelledby="vfx-heading" className="pt-6 border-t border-white/10">
        <h3 id="vfx-heading" className="font-display text-sm font-semibold text-[#E5A93C] mb-4">
          04. Diseño de Producción, VFX y Efectos Prácticos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-white/10 bg-[#131318]">
            <div className="text-xs font-medium text-[#C8C3BA] mb-2">
              Efectos Visuales (CGI / Simulación)
            </div>
            <ul className="space-y-1.5 text-sm text-[#D4CFC7] list-disc pl-4">
              {sequence.vfx.cgiElements.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-xs font-medium text-[#C8C3BA] mb-2">
                Efectos Prácticos en Set (SFX)
              </div>
              <ul className="space-y-1.5 text-sm text-[#D4CFC7] list-disc pl-4">
                {sequence.vfx.practicalSfx.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-[#131318] space-y-4">
            <div>
              <div className="text-xs font-medium text-[#C8C3BA] mb-1">
                Locaciones y Construcción de Set
              </div>
              <p className="text-sm text-[#D4CFC7] leading-relaxed">
                {sequence.vfx.locationsAndSets}
              </p>
            </div>
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs font-medium text-[#C8C3BA] mb-1">
                Vestuario, Texturas y Caracterización
              </div>
              <p className="text-sm text-[#D4CFC7] leading-relaxed">
                {sequence.vfx.wardrobeAndMakeup}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Intelligence & Suggested Directorial Enhancements */}
      <section
        aria-labelledby="studio-intelligence-heading"
        className="pt-6 border-t border-white/10 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-[#E5A93C]" />
            <h3
              id="studio-intelligence-heading"
              className="font-display text-sm font-semibold text-[#E5A93C]"
            >
              05. Studio Intelligence — Mejoras de Dirección Sugeridas
            </h3>
          </div>
          <div className="text-xs font-mono-tech text-[#8D8981] tabular-nums">
            {intelligence.totalTrackedOutcomes} resultados exitosos registrados ·{' '}
            {intelligence.finalizedSequencesCount} versiones finales
          </div>
        </div>

        {/* Cross-project Pattern Benchmarks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-white/10 bg-[#111116] space-y-2">
            <div className="text-xs font-medium text-[#C8C3BA] flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Cámara de Mayor Rendimiento</span>
            </div>
            {intelligence.topCameraPatterns[0] ? (
              <>
                <div className="text-xs font-semibold text-[#F2F0EB]">
                  {intelligence.topCameraPatterns[0].label}
                </div>
                <div className="text-[11px] font-mono-tech text-[#8D8981] tabular-nums">
                  {intelligence.topCameraPatterns[0].avgRating}/5 ★ ·{' '}
                  {intelligence.topCameraPatterns[0].occurrences} reg.
                </div>
              </>
            ) : (
              <div className="text-xs text-[#7D7971]">Sin métricas suficientes aún</div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-[#111116] space-y-2">
            <div className="text-xs font-medium text-[#C8C3BA] flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Iluminación Probada</span>
            </div>
            {intelligence.topLightingSetups[0] ? (
              <>
                <div className="text-xs font-semibold text-[#F2F0EB]">
                  {intelligence.topLightingSetups[0].label}
                </div>
                <div className="text-[11px] font-mono-tech text-[#8D8981] tabular-nums">
                  {intelligence.topLightingSetups[0].avgRating}/5 ★ ·{' '}
                  {intelligence.topLightingSetups[0].occurrences} reg.
                </div>
              </>
            ) : (
              <div className="text-xs text-[#7D7971]">Sin métricas suficientes aún</div>
            )}
          </div>

          <div className="p-4 rounded-xl border border-white/10 bg-[#111116] space-y-2">
            <div className="text-xs font-medium text-[#C8C3BA] flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Paisaje Sonoro Destacado</span>
            </div>
            {intelligence.topSoundscapes[0] ? (
              <>
                <div className="text-xs font-semibold text-[#F2F0EB]">
                  {intelligence.topSoundscapes[0].label}
                </div>
                <div className="text-[11px] font-mono-tech text-[#8D8981] tabular-nums">
                  {intelligence.topSoundscapes[0].avgRating}/5 ★ ·{' '}
                  {intelligence.topSoundscapes[0].occurrences} reg.
                </div>
              </>
            ) : (
              <div className="text-xs text-[#7D7971]">Sin métricas suficientes aún</div>
            )}
          </div>
        </div>

        {/* Suggested Directorial Enhancements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {intelligence.enhancements.map((enh) => {
            const meta = CATEGORY_META[enh.category];
            const Icon = meta.icon;
            const alreadyApplied = continuityBible.includes(enh.continuitySnippet);
            const isApplying = applyingId === enh.id;

            return (
              <article
                key={enh.id}
                className="p-4 rounded-xl border border-white/10 bg-[#131318] flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tech">
                    <span className="inline-flex items-center gap-1.5 text-[#E5A93C] font-medium">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{meta.label}</span>
                    </span>
                    <span className="text-[#8D8981] tabular-nums">
                      {enh.confidenceScore}% afín
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#F2F0EB] leading-snug">
                    {enh.title}
                  </h4>
                  <p className="text-xs text-[#D4CFC7] leading-relaxed">
                    {enh.recommendation}
                  </p>
                  <p className="text-[11px] text-[#8D8981] leading-relaxed">
                    {enh.rationale}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(enh)}
                  disabled={alreadyApplied || isApplying}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    alreadyApplied
                      ? 'border-[#38B2AC]/35 bg-[#102625] text-[#5EEAD4]'
                      : 'border-white/12 bg-[#1A1A22] hover:bg-[#23232E] text-[#F2F0EB]'
                  }`}
                >
                  {alreadyApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Aplicada en Biblia</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
                      <span>{isApplying ? 'Aplicando...' : 'Aplicar a Biblia'}</span>
                    </>
                  )}
                </button>
              </article>
            );
          })}
        </div>

        {/* Rate Current Sequence Choices to Feed Studio Intelligence */}
        <form
          onSubmit={handleSubmitRating}
          className="p-4 rounded-xl border border-white/10 bg-[#0F0F14] flex flex-col lg:flex-row lg:items-end justify-between gap-3"
        >
          <div className="space-y-1.5 flex-1">
            <div className="text-xs font-semibold text-[#F2F0EB] flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Evaluar elecciones de esta secuencia para alimentar Studio Intelligence</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="sequence-rating-select" className="sr-only">
                Valoración de la secuencia
              </label>
              <select
                id="sequence-rating-select"
                value={selectedRating}
                onChange={(e) => setSelectedRating(Number(e.target.value))}
                className="rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] font-mono-tech focus:border-[#E5A93C] focus:outline-none"
              >
                <option value={5}>5 ★ — Sobresaliente (referencia)</option>
                <option value={4}>4 ★ — Muy sólida</option>
                <option value={3}>3 ★ — Aceptable</option>
                <option value={2}>2 ★ — Mejorable</option>
                <option value={1}>1 ★ — Descartar patrón</option>
              </select>

              <label htmlFor="sequence-rating-note" className="sr-only">
                Nota sobre qué funcionó mejor
              </label>
              <input
                id="sequence-rating-note"
                type="text"
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                placeholder="Opcional: qué técnica destacó (ej. dolly lento + LFE 32Hz)..."
                className="flex-1 min-w-[220px] rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none"
              />
            </div>
            {ratingSavedMsg && (
              <p className="text-[11px] text-[#5EEAD4]">{ratingSavedMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={savingRating}
            className="px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] disabled:opacity-60 text-[#0B0B0E] text-xs font-semibold whitespace-nowrap shrink-0"
          >
            {savingRating ? 'Registrando...' : 'Registrar resultado'}
          </button>
        </form>
      </section>
    </div>
  );
}
