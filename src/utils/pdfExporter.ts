import { jsPDF } from 'jspdf';
import type { ProductionProject, ProductionSequence } from '../types/studio';
import { canExportPdfForSequence, getFinalSequences } from './learningEngine';

interface ImageLoadResult {
  dataUrl: string;
  width: number;
  height: number;
}

async function loadImageAsJpegDataUrl(url: string): Promise<ImageLoadResult | null> {
  if (!url || typeof window === 'undefined' || typeof Image === 'undefined') {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = Math.min(img.naturalWidth || 960, 1024);
        const aspect =
          img.naturalWidth && img.naturalHeight ? img.naturalHeight / img.naturalWidth : 9 / 16;
        const targetH = Math.round(targetW * aspect);
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: targetW,
          height: targetH,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length !== 6) return [180, 140, 60];
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return [180, 140, 60];
  return [r, g, b];
}

function createPdfWriter(docTitle: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 20;

  function ensureSpace(neededMm: number) {
    if (y + neededMm > pageH - 18) {
      doc.addPage();
      y = 20;
    }
  }

  function addSectionHeader(title: string) {
    ensureSpace(14);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(184, 130, 32);
    doc.text(title.toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(210, 180, 120);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  }

  function addParagraph(text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) {
    if (!text) return;
    const fontSize = opts?.size ?? 9.5;
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    const [r, g, b] = opts?.color ?? [42, 42, 48];
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    const lineH = fontSize * 0.44;
    for (const line of lines) {
      ensureSpace(lineH + 2);
      doc.text(line, margin, y);
      y += lineH;
    }
    y += 2.2;
  }

  function addKeyValue(label: string, value: string) {
    if (!value) return;
    addParagraph(`${label}: ${value}`, { size: 9 });
  }

  async function renderSequenceBody(project: ProductionProject, sequence: ProductionSequence) {
    // Sequence Banner
    ensureSpace(34);
    doc.setFillColor(20, 20, 26);
    doc.rect(margin, y, contentW, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(245, 240, 232);
    doc.text(sequence.title.slice(0, 68), margin + 5, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(229, 169, 60);
    doc.text(
      `VERSIÓN FINAL APROBADA · ${sequence.aspectRatio} · ${sequence.directorStyle}`,
      margin + 5,
      y + 16
    );
    doc.setTextColor(180, 176, 168);
    doc.text(
      `${sequence.cameraSystem} | ${sequence.lensPackage} | ${sequence.filmStockOrLut}`.slice(0, 95),
      margin + 5,
      y + 22.5
    );
    y += 34;

    // 1. Logline & Vision
    addSectionHeader('1. Visión de Dirección y Concepto Visual');
    addParagraph(`Logline: ${sequence.logline}`, { bold: true, size: 10 });
    addParagraph(sequence.directorVision);

    // Color Palette swatches
    if (sequence.colorPalette.length > 0) {
      ensureSpace(18);
      const swatchW = Math.min(34, contentW / Math.max(sequence.colorPalette.length, 1) - 3);
      sequence.colorPalette.slice(0, 5).forEach((swatch, idx) => {
        const sx = margin + idx * (swatchW + 3);
        const [r, g, b] = hexToRgb(swatch.hex);
        doc.setFillColor(r, g, b);
        doc.rect(sx, y, swatchW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(35, 35, 42);
        doc.text(`${swatch.name.slice(0, 16)} (${swatch.hex})`, sx, y + 11);
      });
      y += 16;
    }

    // 2. Lighting
    addSectionHeader('2. Diseño de Iluminación y Fotografía');
    addKeyValue('Luz Principal (Key Light)', sequence.lighting.keyLight);
    addKeyValue('Ratio de Contraste', sequence.lighting.fillRatio);
    addKeyValue('Contraluz / Rim', sequence.lighting.rimAndBacklight);
    addKeyValue('Temperatura de Color', sequence.lighting.colorTemperatureKelvin);
    addKeyValue('Atmósfera / Haze', sequence.lighting.atmosphereAndHaze);

    // 3. Audio Analysis Report (if present)
    if (sequence.audioAnalysis) {
      addSectionHeader('3. Informe de Dirección y Diseño Sonoro (Audio Fuente)');
      addKeyValue('Estilo de Narración', sequence.audioAnalysis.narrationStyle);
      addKeyValue('Arco Emocional', sequence.audioAnalysis.emotionalArc);
      addKeyValue('Ritmo y Cadencia', sequence.audioAnalysis.rhythmAndPacing);
      if (sequence.audioAnalysis.detectedSoundEffects.length > 0) {
        addKeyValue(
          'Efectos Detectados',
          sequence.audioAnalysis.detectedSoundEffects.join(' · ')
        );
      }
      addKeyValue('Recomendaciones de Dirección', sequence.audioAnalysis.directingRecommendations);
      addParagraph(`Transcripción Verbatim:\n${sequence.audioAnalysis.transcription}`, {
        size: 8.5,
        color: [65, 65, 72],
      });
    }

    // 4. Shot List
    addSectionHeader('4. Desglose Técnico de Planos');
    for (const shot of sequence.shotList) {
      addParagraph(
        `[${shot.shotNumber}] ${shot.shotType} · ${shot.lensMm} · ${shot.movement} (${shot.durationSec}s) — ${shot.framingNote}. Intención: ${shot.psychologicalIntent}`,
        { size: 9 }
      );
    }

    // 5. Sound & VFX
    addSectionHeader('5. Mezcla Dolby Atmos, Foley y VFX');
    addKeyValue('Capas Atmos', sequence.soundDesign.atmosLayers.join(' | '));
    addKeyValue('Subgraves (LFE)', sequence.soundDesign.subBassCue);
    addKeyValue('Foley', sequence.soundDesign.foleyDetails.join(' | '));
    addKeyValue('Silencios Dramáticos', sequence.soundDesign.silenceBeats);
    addKeyValue(
      `Score Musical (${sequence.soundDesign.tempoBpm} BPM)`,
      sequence.soundDesign.musicalScore
    );
    addKeyValue('Elementos CGI / VFX', sequence.vfx.cgiElements.join(' | '));
    addKeyValue('Efectos Prácticos (SFX)', sequence.vfx.practicalSfx.join(' | '));
    addKeyValue('Locaciones y Sets', sequence.vfx.locationsAndSets);
    addKeyValue('Vestuario y Maquillaje', sequence.vfx.wardrobeAndMakeup);

    // 6. Screenplay
    addSectionHeader('6. Guion Técnico-Literario');
    for (const scene of sequence.screenplay) {
      addParagraph(`ESCENA ${scene.sceneNumber}: ${scene.slugline}`, {
        bold: true,
        size: 10,
        color: [20, 20, 26],
      });
      for (const beat of scene.beats) {
        if (beat.type === 'dialogue') {
          addParagraph(
            `${(beat.character || 'PERSONAJE').toUpperCase()}${beat.parenthetical ? ` (${beat.parenthetical})` : ''}: ${beat.text}`,
            { size: 9 }
          );
        } else if (beat.type === 'camera') {
          addParagraph(`[CÁMARA] ${beat.text}`, { size: 8.5, color: [158, 108, 22] });
        } else if (beat.type === 'sound') {
          addParagraph(`[SONIDO] ${beat.text}`, { size: 8.5, color: [48, 92, 132] });
        } else {
          addParagraph(beat.text, { size: 9 });
        }
      }
    }

    // 7. Storyboard Illustrations
    if (sequence.storyboardFrames.length > 0) {
      addSectionHeader('7. Storyboard Ilustrado y Prompts de Cámara');
      for (const frame of sequence.storyboardFrames) {
        ensureSpace(75);
        addParagraph(`${frame.title} (${frame.shotRef} · ${frame.cameraSpec})`, {
          bold: true,
          size: 9.5,
        });
        if (frame.imageUrl) {
          const loaded = await loadImageAsJpegDataUrl(frame.imageUrl);
          if (loaded) {
            const imgW = Math.min(contentW, 130);
            const imgH = imgW * (loaded.height / loaded.width);
            ensureSpace(imgH + 8);
            doc.addImage(loaded.dataUrl, 'JPEG', margin, y, imgW, imgH);
            y += imgH + 4;
          }
        }
        addParagraph(`Prompt visual: ${frame.visualPrompt}`, { size: 8.5, color: [75, 75, 82] });
        addParagraph(`Movimiento de cámara: ${frame.veoMotionPrompt}`, {
          size: 8.5,
          color: [75, 75, 82],
        });
      }
    }

    addSectionHeader('Continuidad Registrada');
    addParagraph(sequence.continuitySummary || project.continuityBible);
  }

  function addFooters() {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(125, 125, 132);
      doc.text(
        `LumenReel Studio · Bitácora Oficial de Producción (${docTitle.slice(0, 42)})`,
        margin,
        pageH - 9
      );
      doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 9, {
        align: 'right',
      });
    }
  }

  return { doc, renderSequenceBody, addSectionHeader, addParagraph, addFooters };
}

export async function exportSequencePdf(
  project: ProductionProject,
  sequence: ProductionSequence
): Promise<void> {
  if (!canExportPdfForSequence(sequence)) {
    throw new Error(
      'Solo se puede exportar la bitácora en PDF cuando la secuencia está aprobada en Versión Final.'
    );
  }

  const writer = createPdfWriter(project.title);
  writer.addParagraph(`LUMENREEL STUDIO — BITÁCORA DE PRODUCCIÓN`, {
    bold: true,
    size: 16,
    color: [20, 20, 26],
  });
  writer.addParagraph(
    `Proyecto: ${project.title} · Género: ${project.genreStyle} · Emitido: ${new Date().toLocaleDateString('es-ES')}`,
    { size: 9, color: [95, 95, 102] }
  );
  await writer.renderSequenceBody(project, sequence);
  writer.addFooters();

  const safeSlug = `${project.title}-${sequence.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  writer.doc.save(`${safeSlug || 'bitacora_final'}.pdf`);
}

export async function exportLibraryPdf(project: ProductionProject): Promise<void> {
  const finalSequences = getFinalSequences(project);
  if (finalSequences.length === 0) {
    throw new Error(
      'Este proyecto aún no tiene secuencias en Versión Final para exportar en la Biblioteca PDF.'
    );
  }

  const writer = createPdfWriter(project.title);
  writer.addParagraph(`BIBLIOTECA DE PRODUCCIÓN — ${project.title.toUpperCase()}`, {
    bold: true,
    size: 16,
    color: [20, 20, 26],
  });
  writer.addParagraph(
    `${project.genreStyle} · ${finalSequences.length} ${finalSequences.length === 1 ? 'secuencia aprobada en Versión Final' : 'secuencias aprobadas en Versión Final'}`,
    { size: 9.5, color: [95, 95, 102] }
  );
  if (project.continuityBible) {
    writer.addSectionHeader('Biblia de Continuidad Maestra');
    writer.addParagraph(project.continuityBible);
  }

  for (let idx = 0; idx < finalSequences.length; idx++) {
    if (idx > 0) {
      writer.doc.addPage();
    }
    await writer.renderSequenceBody(project, finalSequences[idx]);
  }
  writer.addFooters();

  const safeSlug = project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  writer.doc.save(`${safeSlug || 'biblioteca'}_final.pdf`);
}
