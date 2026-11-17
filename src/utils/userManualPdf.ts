import { jsPDF } from 'jspdf';

interface ManualImageResult {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ManualStepSection {
  stepNumber: string;
  title: string;
  summary: string;
  bullets: string[];
  tip: string;
  screenshotUrl: string;
  screenshotCaption: string;
}

export const MANUAL_SECTIONS: ManualStepSection[] = [
  {
    stepNumber: 'PASO 1',
    title: 'Registro e Inicio de Sesión Obligatorio',
    summary:
      'Al abrir LumenReel Studio siempre accederás primero a la pantalla de autenticación. Tu espacio de trabajo es privado y cada cuenta inicia completamente desde cero sin proyectos precargados.',
    bullets: [
      'Acceso rápido con Google: haz clic en "Continuar con Google (Registro / Acceso)" para entrar de inmediato.',
      'Registro con correo: abre la pestaña "Registrarse", escribe tu nombre profesional, correo y contraseña, y confirma el enlace enviado a tu bandeja.',
      'Aislamiento por cuenta: tus proyectos, memoria de aprendizaje y recursos generados quedan vinculados únicamente a tu usuario.',
    ],
    tip: 'Si registras una cuenta nueva con correo y contraseña, verifica tu buzón y pulsa "Ya verifiqué mi correo" para entrar al estudio.',
    screenshotUrl: '/manual/manual_01_acceso.jpg',
    screenshotCaption:
      'Figura 1. Pantalla de acceso obligatorio de LumenReel Studio con registro e inicio de sesión.',
  },
  {
    stepNumber: 'PASO 2',
    title: 'Crear un Proyecto e Ingresar Material Fuente',
    summary:
      'Una vez dentro del estudio, pulsa "Nueva producción" en la barra superior o "Crear nueva producción" en el lienzo inicial para abrir tu primer expediente cinematográfico.',
    bullets: [
      'Define título, género o estilo visual (ej. Épica Monumental IMAX, Thriller Neo-Noir, Terror Atmosférico) y fuente predeterminada.',
      'En la Mesa de Ingesta izquierda puedes pegar texto de un capítulo, subir un archivo PDF/TXT o cargar un audiolibro en MP3, WAV, M4A u OGG.',
      'Análisis previo de audio: el botón "Analizar solo audio" extrae transcripción verbatim, estilo narrativo, arco emocional, ritmo y efectos sonoros.',
      'Biblia de Continuidad: guarda detalles de personajes, vestuario y escenarios para mantener coherencia en capítulos posteriores.',
    ],
    tip: 'Al pulsar "Producir secuencia", el sistema genera de una sola vez visión visual, planos, sonido Dolby Atmos, VFX, guion y prompts de storyboard.',
    screenshotUrl: '/manual/manual_02_ingesta.jpg',
    screenshotCaption:
      'Figura 2. Barra lateral de proyectos, mesa de ingesta multimedia y área de producción.',
  },
  {
    stepNumber: 'PASO 3',
    title: 'Visión de Dirección, Gráfico Radar y Studio Intelligence',
    summary:
      'En la pestaña "Dirección" visualizas el logline, la propuesta estética, el paquete óptico de cámara, la paleta colorimétrica, el esquema de iluminación en Kelvin y el Gráfico Radar de Progreso.',
    bullets: [
      'Gráfico Radar de Progreso (Recharts): mide de 0% a 100% el nivel de detalle del proyecto activo en Guion, Diseño de iluminación, Efectos visuales y Diseño sonoro.',
      'Si tu proyecto tiene múltiples secuencias, el radar compara automáticamente el promedio del proyecto (ámbar) frente a la secuencia activa (turquesa).',
      'Studio Intelligence: analiza tus elecciones mejor valoradas (4–5 estrellas) y sugiere mejoras de dirección aplicables a tu Biblia de Continuidad con un clic.',
    ],
    tip: 'Califica cada secuencia entre 1 y 5 estrellas al pie de la vista Dirección para entrenar automáticamente a Studio Intelligence.',
    screenshotUrl: '/manual/manual_03_radar_vision.jpg',
    screenshotCaption:
      'Figura 3. Vista de Dirección con el Gráfico Radar de Progreso (Guion, Iluminación, VFX y Sonido).',
  },
  {
    stepNumber: 'PASO 4',
    title: 'Planos, Guion Técnico y Storyboard (Nano & Omni Flash)',
    summary:
      'Navega por las pestañas superiores para revisar cada departamento de la producción y generar material visual y audiovisual real para cada plano.',
    bullets: [
      'Planos y Sonido: consulta la lista completa de planos (lente en mm, movimiento de cámara, duración e intención) junto con capas Atmos, subgraves LFE y Foley.',
      'Guion: lee las escenas con encabezados slugline, acciones y diálogos; descárgalo en formato Markdown (.md) o estándar profesional Fountain (.fountain).',
      'Storyboard: genera ilustraciones fijas de cada plano usando el motor de imagen Nano y crea clips de movimiento cinematográfico con Omni Flash.',
    ],
    tip: 'Cada imagen y video generado queda almacenado en la carpeta dedicada del proyecto y se integra en la bitácora final.',
    screenshotUrl: '/manual/manual_04_storyboard.jpg',
    screenshotCaption:
      'Figura 4. Mesa de Storyboard con generación de fotogramas con Nano y video con Omni Flash.',
  },
];

async function loadManualScreenshot(url: string): Promise<ManualImageResult | null> {
  if (!url || typeof window === 'undefined' || typeof Image === 'undefined') {
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = Math.min(img.naturalWidth || 1280, 1280);
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
          dataUrl: canvas.toDataURL('image/jpeg', 0.86),
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

export async function buildUserManualPdfDocument(): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 18;

  function ensureSpace(neededMm: number) {
    if (y + neededMm > pageH - 18) {
      doc.addPage();
      y = 18;
    }
  }

  function writeParagraph(
    text: string,
    opts?: {
      bold?: boolean;
      size?: number;
      color?: [number, number, number];
      indentMm?: number;
      spacingAfter?: number;
    }
  ) {
    if (!text) return;
    const size = opts?.size ?? 9.5;
    const indent = opts?.indentMm ?? 0;
    const [r, g, b] = opts?.color ?? [42, 44, 52];
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(text, contentW - indent) as string[];
    const lineH = size * 0.44;
    for (const line of lines) {
      ensureSpace(lineH + 2);
      doc.text(line, margin + indent, y);
      y += lineH;
    }
    y += opts?.spacingAfter ?? 2.5;
  }

  // Cover Header Banner
  doc.setFillColor(14, 14, 19);
  doc.rect(margin, y, contentW, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(245, 240, 232);
  doc.text('LUMENREEL STUDIO', margin + 7, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(229, 169, 60);
  doc.text('MANUAL DE USO E INSTRUCCIONES DEL SISTEMA', margin + 7, y + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(186, 182, 174);
  doc.text(
    `Guía paso a paso con capturas reales del entorno · Actualizado ${new Date().toLocaleDateString('es-ES')}`,
    margin + 7,
    y + 30
  );
  y += 46;

  // Quick Intro
  writeParagraph('¿Qué puedes hacer con LumenReel Studio?', {
    bold: true,
    size: 12,
    color: [20, 20, 26],
    spacingAfter: 2,
  });
  writeParagraph(
    'LumenReel Studio convierte capítulos de libros, audiolibros (MP3, WAV, M4A, OGG) o historias originales en producciones cinematográficas completas. En pocos minutos obtienes visión visual, esquema de iluminación, lista de planos, mezcla sonora Dolby Atmos, diseño de VFX, guion técnico-literario, storyboard ilustrado con Nano y clips en movimiento con Omni Flash.',
    { size: 9.5, spacingAfter: 4 }
  );

  // Quick 5-step summary box
  ensureSpace(36);
  doc.setFillColor(247, 244, 237);
  doc.setDrawColor(218, 186, 122);
  doc.rect(margin, y, contentW, 34, 'FD');
  let boxY = y + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(160, 108, 22);
  doc.text('FLUJO RÁPIDO EN 5 PASOS', margin + 5, boxY);
  boxY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(40, 42, 48);
  const quickFlow = [
    '1. Inicia sesión o regístrate con Google / correo verificado.',
    '2. Crea un proyecto nuevo desde cero e ingresa tu capítulo o archivo de audio.',
    '3. Revisa la vista Dirección, el Gráfico Radar de Progreso y Studio Intelligence.',
    '4. Explora Planos y Sonido, descarga el Guion y genera Storyboard (Nano / Omni Flash).',
    '5. Aprueba la Versión Final para desbloquear la exportación oficial en Bitácora PDF.',
  ];
  for (const row of quickFlow) {
    doc.text(row, margin + 5, boxY);
    boxY += 4.6;
  }
  y += 42;

  // Step-by-step Illustrated Sections
  for (let idx = 0; idx < MANUAL_SECTIONS.length; idx++) {
    const sec = MANUAL_SECTIONS[idx];
    if (idx > 0) {
      doc.addPage();
      y = 18;
    }

    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(184, 130, 32);
    doc.text(sec.stepNumber, margin, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(20, 20, 26);
    doc.text(sec.title, margin, y);
    y += 3;

    doc.setDrawColor(220, 220, 226);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    writeParagraph(sec.summary, { size: 9.5, spacingAfter: 3 });

    for (const bullet of sec.bullets) {
      writeParagraph(`•  ${bullet}`, {
        size: 9,
        indentMm: 2,
        spacingAfter: 1.8,
      });
    }

    // Tip callout
    ensureSpace(16);
    doc.setFillColor(242, 246, 248);
    doc.setDrawColor(168, 198, 210);
    const tipLines = doc.splitTextToSize(`Consejo práctico: ${sec.tip}`, contentW - 8) as string[];
    const tipH = tipLines.length * 4.2 + 6;
    doc.rect(margin, y, contentW, tipH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(32, 86, 102);
    let tipY = y + 5;
    for (const tl of tipLines) {
      doc.text(tl, margin + 4, tipY);
      tipY += 4.2;
    }
    y += tipH + 5;

    // Real system screenshot
    const loaded = await loadManualScreenshot(sec.screenshotUrl);
    if (loaded) {
      const imgW = contentW;
      const imgH = Math.min(104, imgW * (loaded.height / loaded.width));
      const drawW = imgH * (loaded.width / loaded.height);
      const drawX = margin + (contentW - drawW) / 2;
      ensureSpace(imgH + 14);
      doc.setDrawColor(190, 192, 198);
      doc.setLineWidth(0.4);
      doc.rect(drawX - 0.5, y - 0.5, drawW + 1, imgH + 1);
      doc.addImage(loaded.dataUrl, 'JPEG', drawX, y, drawW, imgH);
      y += imgH + 5;
      writeParagraph(sec.screenshotCaption, {
        size: 8.2,
        color: [105, 105, 115],
        spacingAfter: 3,
      });
    }
  }

  // Final Step 5 Page: Final Version, Learning Engine & PDF Export
  doc.addPage();
  y = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(184, 130, 32);
  doc.text('PASO 5', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(20, 20, 26);
  doc.text('Versión Final, Autoaprendizaje y Exportación PDF', margin, y);
  y += 3;
  doc.setDrawColor(220, 220, 226);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  writeParagraph(
    'Para proteger la calidad de los documentos entregables, LumenReel Studio distingue entre secuencias en estado Borrador y secuencias aprobadas en Versión Final:',
    { size: 9.5, spacingAfter: 3 }
  );
  writeParagraph(
    '•  Aprobar Versión Final: pulsa "Aprobar Versión Final" en la barra superior de la secuencia cuando el guion, los planos y el storyboard estén listos. La secuencia queda sellada como versión definitiva.',
    { size: 9, indentMm: 2, spacingAfter: 2 }
  );
  writeParagraph(
    '•  Bitácora PDF y Biblioteca PDF: la exportación en PDF solo se habilita sobre secuencias en Versión Final. Incluye portada, visión visual, paletas, iluminación, desglose de planos, informe sonoro, VFX, guion e ilustraciones del storyboard.',
    { size: 9, indentMm: 2, spacingAfter: 2 }
  );
  writeParagraph(
    '•  Autoaprendizaje del Productor: cada secuencia finalizada extrae automáticamente aprendizajes de cámara, iluminación y sonido hacia tu memoria privada. También puedes añadir tus propias reglas desde el botón "Autoaprendizaje" en la barra lateral.',
    { size: 9, indentMm: 2, spacingAfter: 2 }
  );
  writeParagraph(
    '•  Respaldo en la nube y espacio local: todas tus producciones se sincronizan en Firestore por usuario verificado y mantienen respaldo organizado en carpetas locales de proyecto.',
    { size: 9, indentMm: 2, spacingAfter: 6 }
  );

  // Reference summary table
  ensureSpace(46);
  doc.setFillColor(20, 20, 26);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(229, 169, 60);
  doc.text('RESUMEN DE PESTAÑAS Y FUNCIONES CLAVE', margin + 4, y + 5.5);
  y += 8;

  const rows = [
    ['Dirección', 'Logline, ópticas, paleta de color, iluminación Kelvin, Gráfico Radar y Studio Intelligence.'],
    ['Planos y Sonido', 'Shot list detallado con duración, capas Dolby Atmos, subgraves LFE, Foley y análisis de audio.'],
    ['Guion', 'Guion técnico-literario por escenas con descarga en Markdown (.md) y Fountain (.fountain).'],
    ['Storyboard', 'Generación de fotogramas con Nano y clips de movimiento cinematográfico con Omni Flash.'],
    ['Autoaprendizaje', 'Reglas y criterios mejor valorados (1–5 ★) que perfeccionan futuras producciones.'],
  ];

  for (const [col1, col2] of rows) {
    ensureSpace(12);
    doc.setDrawColor(224, 224, 230);
    doc.rect(margin, y, contentW, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(25, 25, 32);
    doc.text(col1, margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(65, 68, 76);
    const wrapped = doc.splitTextToSize(col2, contentW - 44) as string[];
    doc.text(wrapped[0] || '', margin + 38, y + 6);
    y += 10;
  }

  // Page Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(125, 125, 132);
    doc.text('LumenReel Studio · Manual de Uso e Instrucciones', margin, pageH - 9);
    doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 9, {
      align: 'right',
    });
  }

  return doc;
}

export async function exportUserManualPdf(): Promise<void> {
  const doc = await buildUserManualPdfDocument();
  doc.save('LumenReel_Studio_Manual_de_Uso.pdf');
}
