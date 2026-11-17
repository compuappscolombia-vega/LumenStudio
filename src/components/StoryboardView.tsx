import { useState, useEffect } from 'react';
import { Check, Copy, Film, ImagePlus, Maximize2, Video, X } from 'lucide-react';
import type {
  ProductionProject,
  ProductionSequence,
  StoryboardCard,
} from '../types/studio';

interface StoryboardViewProps {
  userId: string;
  projectId: string;
  sequence: ProductionSequence;
  onProjectMediaUpdated: (project: ProductionProject) => Promise<void>;
}

export function StoryboardView({
  userId,
  projectId,
  sequence,
  onProjectMediaUpdated,
}: StoryboardViewProps) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generatingImgId, setGeneratingImgId] = useState<string | null>(null);
  const [generatingVidId, setGeneratingVidId] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<Record<string, 'image' | 'video'>>({});
  const [mediaError, setMediaError] = useState<string | null>(null);

  const activeCard: StoryboardCard | null =
    sequence.storyboardFrames.find((f) => f.id === activeCardId) || null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveCardId(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
  }

  async function handleGenerateImage(frame: StoryboardCard) {
    setGeneratingImgId(frame.id);
    setMediaError(null);
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          projectId,
          sequenceId: sequence.id,
          frameId: frame.id,
          prompt: frame.visualPrompt,
          aspectRatio: frame.aspectRatio || sequence.aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo generar la imagen con Nano.');
      }
      if (data.project) {
        setBrokenImages((prev) => ({ ...prev, [frame.id]: false }));
        setMediaMode((prev) => ({ ...prev, [frame.id]: 'image' }));
        await onProjectMediaUpdated(data.project as ProductionProject);
      }
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : 'Error generando imagen con Nano.'
      );
    } finally {
      setGeneratingImgId(null);
    }
  }

  async function handleGenerateVideo(frame: StoryboardCard) {
    setGeneratingVidId(frame.id);
    setMediaError(null);
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          projectId,
          sequenceId: sequence.id,
          frameId: frame.id,
          prompt: `${frame.veoMotionPrompt} (${frame.visualPrompt})`,
          aspectRatio: frame.aspectRatio || sequence.aspectRatio,
          duration: '6s',
          imageUrl: frame.imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo generar el video con Omni Flash.');
      }
      if (data.project) {
        setMediaMode((prev) => ({ ...prev, [frame.id]: 'video' }));
        await onProjectMediaUpdated(data.project as ProductionProject);
      }
    } catch (err) {
      setMediaError(
        err instanceof Error ? err.message : 'Error generando video con Omni Flash.'
      );
    } finally {
      setGeneratingVidId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F2F0EB]">
            Storyboard y Generación Visual (Nano &amp; Omni Flash)
          </h2>
          <p className="text-xs text-[#8D8981] mt-0.5">
            Genera fotogramas con Nano (gemini-nano-banana-2.1) y clips en movimiento con Omni Flash (gemini-omni-1.2-flash).
          </p>
        </div>
        <span className="text-xs font-mono-tech text-[#8D8981] tabular-nums">
          {sequence.storyboardFrames.length}{' '}
          {sequence.storyboardFrames.length === 1 ? 'fotograma' : 'fotogramas'}
        </span>
      </div>

      {mediaError && (
        <div
          role="alert"
          className="rounded-lg border border-[#EF4444]/35 bg-[#3B1515]/50 px-4 py-3 text-xs text-[#FCA5A5] flex items-center justify-between gap-3"
        >
          <span>{mediaError}</span>
          <button
            type="button"
            onClick={() => setMediaError(null)}
            aria-label="Cerrar aviso de error"
            className="p-1 rounded hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sequence.storyboardFrames.map((frame) => {
          const hasImage = Boolean(frame.imageUrl) && !brokenImages[frame.id];
          const hasVideo = Boolean(frame.videoUrl);
          const showVideo = hasVideo && (mediaMode[frame.id] === 'video' || !hasImage);
          const busyImg = generatingImgId === frame.id;
          const busyVid = generatingVidId === frame.id;

          return (
            <article
              key={frame.id}
              className="rounded-xl border border-white/10 bg-[#131318] overflow-hidden flex flex-col"
            >
              <div className="relative aspect-video bg-[#08080B] border-b border-white/10 overflow-hidden">
                {showVideo && frame.videoUrl ? (
                  <video
                    src={frame.videoUrl}
                    controls
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : hasImage ? (
                  <img
                    src={frame.imageUrl}
                    alt={`${frame.title} — ${frame.shotRef}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [frame.id]: true }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#161720] via-[#0D0E14] to-[#1A1610]">
                    <Film className="w-7 h-7 text-[#E5A93C] mb-2.5" />
                    <div className="font-display text-sm font-semibold text-[#F2F0EB]">
                      {frame.title}
                    </div>
                    <div className="text-[11px] font-mono-tech text-[#8D8981] mt-1">
                      {frame.shotRef} · {frame.aspectRatio}
                    </div>
                  </div>
                )}

                {hasImage && hasVideo && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 rounded-lg bg-black/80 border border-white/15 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setMediaMode((prev) => ({ ...prev, [frame.id]: 'image' }))
                      }
                      className={`px-2 py-1 rounded-md font-medium ${
                        !showVideo
                          ? 'bg-[#E5A93C] text-[#0B0B0E]'
                          : 'text-[#D4CFC7] hover:text-white'
                      }`}
                    >
                      Foto
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMediaMode((prev) => ({ ...prev, [frame.id]: 'video' }))
                      }
                      className={`px-2 py-1 rounded-md font-medium ${
                        showVideo
                          ? 'bg-[#E5A93C] text-[#0B0B0E]'
                          : 'text-[#D4CFC7] hover:text-white'
                      }`}
                    >
                      Video
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setActiveCardId(frame.id)}
                  aria-label={`Ampliar fotograma ${frame.title}`}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/75 hover:bg-black text-[#F2F0EB] border border-white/15 transition-colors focus-visible:outline-2 focus-visible:outline-[#E5A93C]"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-[#F2F0EB]">
                      {frame.title}
                    </h3>
                    <span className="text-[11px] font-mono-tech text-[#E5A93C]">
                      {frame.shotRef}
                    </span>
                  </div>
                  <p className="text-xs font-mono-tech text-[#8D8981] mt-1">
                    {frame.cameraSpec} · {frame.aspectRatio}
                  </p>
                </div>

                {/* Nano & Omni Flash Generation Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateImage(frame)}
                    disabled={busyImg || busyVid}
                    className="flex-1 min-w-[165px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5A93C]/45 bg-[#1B1812] hover:bg-[#272116] disabled:opacity-60 text-xs font-medium text-[#F2F0EB] whitespace-nowrap transition-colors"
                  >
                    <ImagePlus className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
                    <span>
                      {busyImg ? 'Generando Nano...' : 'Generar imagen (Nano)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateVideo(frame)}
                    disabled={busyImg || busyVid}
                    className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-[#181822] hover:bg-[#222230] disabled:opacity-60 text-xs font-medium text-[#F2F0EB] whitespace-nowrap transition-colors"
                  >
                    <Video className="w-3.5 h-3.5 text-[#38B2AC] shrink-0" />
                    <span>
                      {busyVid ? 'Renderizando Omni...' : 'Generar video (Omni Flash)'}
                    </span>
                  </button>
                </div>

                <div className="space-y-3 pt-3 border-t border-white/5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-[#C8C3BA]">
                        Prompt de Fotograma (Nano)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(`${frame.id}-img`, frame.visualPrompt)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#E5A93C] hover:text-[#F4C46A]"
                      >
                        {copiedId === `${frame.id}-img` ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#A7A299] leading-relaxed line-clamp-3">
                      {frame.visualPrompt}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-[#C8C3BA]">
                        Prompt de Movimiento (Omni Flash)
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(`${frame.id}-veo`, frame.veoMotionPrompt)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#E5A93C] hover:text-[#F4C46A]"
                      >
                        {copiedId === `${frame.id}-veo` ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-[#A7A299] leading-relaxed line-clamp-2">
                      {frame.veoMotionPrompt}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeCard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
        >
          <div className="w-full max-w-4xl rounded-xl border border-white/15 bg-[#121217] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 id="lightbox-title" className="font-display text-base font-semibold text-[#F2F0EB]">
                  {activeCard.title}
                </h3>
                <p className="text-xs font-mono-tech text-[#8D8981]">
                  {activeCard.shotRef} · {activeCard.cameraSpec} · {activeCard.aspectRatio}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveCardId(null)}
                aria-label="Cerrar vista ampliada"
                className="p-2 rounded-lg text-[#C8C3BA] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-[#07070A] border-b border-white/10">
              {activeCard.videoUrl &&
              (mediaMode[activeCard.id] === 'video' || !activeCard.imageUrl) ? (
                <video
                  src={activeCard.videoUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : activeCard.imageUrl && !brokenImages[activeCard.id] ? (
                <img
                  src={activeCard.imageUrl}
                  alt={activeCard.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <Film className="w-10 h-10 text-[#E5A93C] mb-3" />
                  <p className="text-sm text-[#D4CFC7] max-w-xl">{activeCard.visualPrompt}</p>
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateImage(activeCard)}
                  disabled={generatingImgId === activeCard.id || generatingVidId === activeCard.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5A93C]/45 bg-[#1B1812] hover:bg-[#272116] disabled:opacity-60 text-xs font-medium text-[#F2F0EB]"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>
                    {generatingImgId === activeCard.id
                      ? 'Generando con Nano...'
                      : 'Generar imagen (Nano)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateVideo(activeCard)}
                  disabled={generatingImgId === activeCard.id || generatingVidId === activeCard.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 bg-[#181822] hover:bg-[#222230] disabled:opacity-60 text-xs font-medium text-[#F2F0EB]"
                >
                  <Video className="w-3.5 h-3.5 text-[#38B2AC]" />
                  <span>
                    {generatingVidId === activeCard.id
                      ? 'Generando con Omni Flash...'
                      : 'Generar video (Omni Flash)'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-medium text-[#E5A93C] mb-1">Prompt Visual (Nano)</div>
                  <p className="text-[#D4CFC7] leading-relaxed">{activeCard.visualPrompt}</p>
                </div>
                <div>
                  <div className="font-medium text-[#E5A93C] mb-1">
                    Prompt de Cámara (Omni Flash)
                  </div>
                  <p className="text-[#D4CFC7] leading-relaxed">{activeCard.veoMotionPrompt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
