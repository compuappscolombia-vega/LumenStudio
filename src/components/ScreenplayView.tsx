import { Download, FileCheck2, Lock, Printer } from 'lucide-react';
import type { ProductionProject, ProductionSequence } from '../types/studio';
import {
  formatFountainScreenplay,
  formatScreenplayMarkdown,
} from '../utils/studioLogic';
import { canExportPdfForSequence } from '../utils/learningEngine';

interface ScreenplayViewProps {
  project: ProductionProject;
  sequence: ProductionSequence;
  onExportSequencePdf: () => Promise<void>;
  exportingPdf: boolean;
}

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function ScreenplayView({
  project,
  sequence,
  onExportSequencePdf,
  exportingPdf,
}: ScreenplayViewProps) {
  const slugSafe = sequence.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  const pdfAllowed = canExportPdfForSequence(sequence);

  function handleExportMarkdown() {
    const md = formatScreenplayMarkdown(project.title, sequence);
    triggerDownload(`${slugSafe || 'guion'}.md`, md, 'text/markdown;charset=utf-8');
  }

  function handleExportFountain() {
    const fountain = formatFountainScreenplay(project.title, sequence);
    triggerDownload(`${slugSafe || 'guion'}.fountain`, fountain, 'text/plain;charset=utf-8');
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F2F0EB]">
            Guion Técnico-Literario
          </h2>
          <p className="text-xs text-[#8D8981] font-mono-tech mt-0.5 tabular-nums">
            {sequence.screenplay.length} escenas · {sequence.aspectRatio} ·{' '}
            <span className={pdfAllowed ? 'text-[#38B2AC]' : 'text-[#E5A93C]'}>
              {pdfAllowed ? 'Versión Final' : 'Borrador'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportSequencePdf}
            disabled={!pdfAllowed || exportingPdf}
            title={
              pdfAllowed
                ? 'Exportar bitácora completa en PDF con guion, VFX e ilustraciones'
                : 'Solo disponible cuando la secuencia está en Versión Final'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
              pdfAllowed
                ? 'border-[#E5A93C]/50 bg-[#1B1812] hover:bg-[#272116] text-[#F2F0EB]'
                : 'border-white/10 bg-[#121217] text-[#6E6A63] cursor-not-allowed'
            }`}
          >
            {pdfAllowed ? (
              <FileCheck2 className="w-3.5 h-3.5 text-[#E5A93C]" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-[#6E6A63]" />
            )}
            <span>
              {exportingPdf
                ? 'Generando PDF...'
                : pdfAllowed
                  ? 'Exportar Bitácora PDF'
                  : 'PDF (Solo Versión Final)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/12 bg-[#14141B] hover:bg-[#1C1C26] text-xs font-medium text-[#E6E2DA] whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Markdown</span>
          </button>
          <button
            type="button"
            onClick={handleExportFountain}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/12 bg-[#14141B] hover:bg-[#1C1C26] text-xs font-medium text-[#E6E2DA] whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Fountain</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/12 bg-[#14141B] hover:bg-[#1C1C26] text-xs font-medium text-[#E6E2DA] whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Screenplay Sheet */}
      <article className="rounded-xl border border-white/10 bg-[#121217] px-6 sm:px-12 py-10 font-mono-tech text-[13px] leading-relaxed text-[#E2DDD4]">
        <header className="mb-10 pb-6 border-b border-white/10 text-center space-y-1.5">
          <div className="text-sm font-semibold tracking-wider text-[#F2F0EB]">
            {project.title.toUpperCase()}
          </div>
          <div className="text-xs text-[#E5A93C]">{sequence.title}</div>
          <div className="text-[11px] text-[#8D8981]">
            {sequence.cameraSystem} · {sequence.aspectRatio} ·{' '}
            {pdfAllowed ? 'VERSIÓN FINAL' : 'BORRADOR'}
          </div>
        </header>

        <div className="space-y-10 max-w-[66ch] mx-auto">
          {sequence.screenplay.map((scene) => (
            <section key={`${scene.sceneNumber}-${scene.slugline}`} className="space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-[#F2F0EB] tracking-wide border-b border-white/10 pb-1.5">
                {scene.sceneNumber}. {scene.slugline}
              </h3>

              <div className="space-y-4">
                {scene.beats.map((beat, idx) => {
                  if (beat.type === 'dialogue') {
                    return (
                      <div key={idx} className="max-w-[44ch] mx-auto space-y-1 py-1">
                        <div className="text-center font-semibold text-[#F2F0EB] tracking-wider">
                          {(beat.character || 'PERSONAJE').toUpperCase()}
                        </div>
                        {beat.parenthetical && (
                          <div className="text-center text-xs text-[#9A968E]">
                            ({beat.parenthetical})
                          </div>
                        )}
                        <p className="text-[#EAE6DE] leading-relaxed">{beat.text}</p>
                      </div>
                    );
                  }

                  if (beat.type === 'camera') {
                    return (
                      <p key={idx} className="text-xs text-[#E5A93C] leading-relaxed">
                        <span className="font-semibold">[CÁMARA]</span> {beat.text}
                      </p>
                    );
                  }

                  if (beat.type === 'sound') {
                    return (
                      <p key={idx} className="text-xs text-[#9DB4CC] leading-relaxed">
                        <span className="font-semibold">[SONIDO]</span> {beat.text}
                      </p>
                    );
                  }

                  return (
                    <p key={idx} className="text-[#D4CFC7] leading-relaxed">
                      {beat.text}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
