import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { ProductionProject } from '../types/studio';

interface AgentBlueprintModalProps {
  open: boolean;
  onClose: () => void;
  activeProject: ProductionProject | null;
}

export function AgentBlueprintModal({
  open,
  onClose,
  activeProject,
}: AgentBlueprintModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const blueprint = JSON.stringify(
    {
      agentName: 'LumenReel Studio - Agente Director, Guionista y Experto VFX/SFX',
      platform: 'https://console.cloud.google.com/agent-platform/studio',
      recommendedModel: 'gemini-4-hydrogen',
      specialties: ['Director de Cine', 'Guionista Profesional', 'Experto en Efectos Especiales VFX/SFX'],
      projectContext: activeProject
        ? {
            productionTitle: activeProject.title,
            genreStyle: activeProject.genreStyle,
            continuityBible: activeProject.continuityBible,
            sequencesIndexed: activeProject.sequences.length,
          }
        : null,
      systemInstructions:
        'Eres LumenReel, un Agente Cinematográfico Autónomo que actúa como Director de Cine, Guionista Profesional y Experto en Efectos Especiales (VFX y SFX Prácticos). Transformas capítulos de libros, audiolibros e historias en expedientes cinematográficos completos con ópticas reales, iluminación en Kelvin, shot lists, diseño Dolby Atmos, ingeniería VFX/SFX y guion técnico-literario.',
      ragRecommendation:
        'Sube el libro completo o la saga en el Data Store / RAG Engine de Agent Studio para mantener continuidad exacta a través de decenas de capítulos.',
    },
    null,
    2
  );

  async function copyBlueprint() {
    await navigator.clipboard.writeText(blueprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-blueprint-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-2xl rounded-xl border border-white/15 bg-[#131318] p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 id="agent-blueprint-heading" className="font-display text-lg font-semibold text-[#F2F0EB]">
            Plantilla para Google Cloud Agent Platform Studio
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar plantilla"
            className="p-2 rounded-lg text-[#9A968E] hover:text-[#F2F0EB] hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#A7A299] leading-relaxed mb-4">
          Copia esta configuración para desplegar el mismo agente productor en{' '}
          <span className="font-mono-tech text-[#E5A93C]">
            console.cloud.google.com/agent-platform/studio
          </span>{' '}
          con un Data Store RAG para libros extensos.
        </p>

        <pre className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-[#0B0B0E] p-4 text-xs font-mono-tech text-[#D4CFC7] leading-relaxed">
          {blueprint}
        </pre>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#C8C3BA] hover:bg-white/5"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={copyBlueprint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] text-[#0B0B0E] text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar configuración'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
