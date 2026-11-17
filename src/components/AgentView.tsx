import { useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Clapperboard,
  FileText,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import type {
  AgentMessage,
  AgentRoleFocus,
  ProductionProject,
  ProductionSequence,
} from '../types/studio';
import {
  AGENT_QUICK_COMMANDS,
  AGENT_ROLE_PROFILES,
} from '../utils/agentLogic';

interface AgentViewProps {
  project: ProductionProject;
  activeSequence: ProductionSequence | null;
  isBusy: boolean;
  errorMessage: string | null;
  onSendMessage: (message: string, focus: AgentRoleFocus) => Promise<void>;
  onClearHistory: () => Promise<void>;
  onDismissError: () => void;
}

const AREA_LABELS: Record<string, string> = {
  biblia: 'Biblia de Continuidad',
  direccion: 'Dirección y Cámara',
  guion: 'Guion Técnico',
  vfx: 'VFX y SFX Prácticos',
  storyboard: 'Storyboard',
};

export function AgentView({
  project,
  activeSequence,
  isBusy,
  errorMessage,
  onSendMessage,
  onClearHistory,
  onDismissError,
}: AgentViewProps) {
  const [focus, setFocus] = useState<AgentRoleFocus>('council');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [clearing, setClearing] = useState(false);

  const messages: AgentMessage[] = project.agentMessages || [];
  const activeProfile =
    AGENT_ROLE_PROFILES.find((p) => p.id === focus) || AGENT_ROLE_PROFILES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draftPrompt.trim();
    if (!text || isBusy) return;
    onDismissError();
    setDraftPrompt('');
    try {
      await onSendMessage(text, focus);
    } catch {
      setDraftPrompt(text);
    }
  }

  async function handleQuickCommand(cmdFocus: AgentRoleFocus, prompt: string) {
    if (isBusy) return;
    setFocus(cmdFocus);
    onDismissError();
    await onSendMessage(prompt, cmdFocus);
  }

  async function handleClear() {
    if (isBusy || clearing || messages.length === 0) return;
    setClearing(true);
    try {
      await onClearHistory();
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tripartite Agent Identity Header */}
      <section
        aria-labelledby="agent-heading"
        className="rounded-xl border border-white/10 bg-[#121218] p-5 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech text-[#E5A93C]">
              <Bot className="w-4 h-4" />
              <span>Agente Cinematográfico Autónomo</span>
            </div>
            <h2
              id="agent-heading"
              className="font-display text-xl sm:text-2xl font-semibold text-[#F2F0EB]"
            >
              Director · Guionista · Experto en Efectos Especiales
            </h2>
            <p className="text-xs text-[#A7A299] max-w-2xl leading-relaxed">
              Conversa con el agente para dirigir la puesta en escena, reescribir escenas y
              diálogos del guion, o diseñar simulaciones CGI y efectos prácticos en set. El
              agente ejecuta cambios reales sobre el proyecto activo.
            </p>
          </div>

          <div className="text-xs font-mono-tech text-[#8D8981] text-right tabular-nums">
            <div className="text-[#F2F0EB] font-medium">{project.title}</div>
            <div>
              {activeSequence
                ? `Secuencia activa: ${activeSequence.title}`
                : 'Sin secuencia producida (modo Biblia y preproducción)'}
            </div>
          </div>
        </div>

        {/* Three Specialist Roles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-lg border border-white/10 bg-[#0D0D12] space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F0EB]">
              <Clapperboard className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Director de Cine</span>
            </div>
            <p className="text-[11px] text-[#8D8981] leading-relaxed">
              Puesta en escena, cámara real, ópticas, temperaturas Kelvin, bloqueo y ritmo
              dramático.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-white/10 bg-[#0D0D12] space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F0EB]">
              <FileText className="w-3.5 h-3.5 text-[#E5A93C]" />
              <span>Guionista</span>
            </div>
            <p className="text-[11px] text-[#8D8981] leading-relaxed">
              Estructura narrativa, sluglines, acción visual pura, subtexto y diálogos con
              acotaciones.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-white/10 bg-[#0D0D12] space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F2F0EB]">
              <Wand2 className="w-3.5 h-3.5 text-[#38B2AC]" />
              <span>Experto en Efectos Especiales</span>
            </div>
            <p className="text-[11px] text-[#8D8981] leading-relaxed">
              Simulaciones CGI, extensiones digitales, pirotecnia controlada, lluvia en set y
              rigs físicos.
            </p>
          </div>
        </div>
      </section>

      {/* Active Focus Selector */}
      <section aria-label="Especialidad activa del Agente" className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#C8C3BA]">
            Enfoque de respuesta del Agente
          </span>
          <span className="text-[11px] font-mono-tech text-[#8D8981]">
            {activeProfile.badge}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AGENT_ROLE_PROFILES.map((profile) => {
            const active = focus === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => setFocus(profile.id)}
                className={`px-3 py-2 rounded-lg border text-left transition-colors ${
                  active
                    ? 'border-[#E5A93C] bg-[#1C1810] text-[#F2F0EB]'
                    : 'border-white/10 bg-[#121218] text-[#9A968E] hover:border-white/25 hover:text-[#E6E2DA]'
                }`}
              >
                <div className="text-xs font-semibold truncate">{profile.label}</div>
                <div className="text-[10px] font-mono-tech text-[#8D8981] truncate mt-0.5">
                  {profile.badge}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Commands */}
      <section aria-label="Órdenes rápidas del estudio" className="space-y-2.5">
        <div className="text-xs font-medium text-[#C8C3BA]">
          Órdenes directas de producción
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {AGENT_QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd.id}
              type="button"
              disabled={isBusy}
              onClick={() => void handleQuickCommand(cmd.focus, cmd.prompt)}
              className="p-3 rounded-lg border border-white/10 bg-[#121218] hover:border-[#E5A93C]/45 hover:bg-[#171720] disabled:opacity-55 text-left transition-colors space-y-1"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5A93C]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{cmd.title}</span>
              </div>
              <p className="text-[11px] text-[#9A968E] line-clamp-2 leading-relaxed">
                {cmd.prompt}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Conversation History */}
      <section
        aria-label="Mesa de diálogo con el Agente"
        className="rounded-xl border border-white/10 bg-[#101015] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 bg-[#13131A]">
          <span className="text-xs font-semibold text-[#F2F0EB]">
            Sesión de Dirección y Edición ({messages.length})
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing || isBusy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/10 hover:bg-white/5 text-[11px] text-[#9A968E] hover:text-[#F2F0EB] disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar historial</span>
            </button>
          )}
        </div>

        <div className="p-4 space-y-4 max-h-[440px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="py-10 text-center space-y-2 max-w-md mx-auto">
              <Bot className="w-7 h-7 text-[#E5A93C] mx-auto" />
              <div className="text-sm font-medium text-[#F2F0EB]">
                El Agente está listo para recibir tus órdenes
              </div>
              <p className="text-xs text-[#8D8981] leading-relaxed">
                Pídele reescribir una escena, definir lentes y Kelvin, planificar simulaciones
                CGI y SFX prácticos o actualizar la Biblia de Continuidad.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              const profileLabel =
                AGENT_ROLE_PROFILES.find((p) => p.id === msg.focus)?.label ||
                'Consejo Completo';
              return (
                <article
                  key={msg.id}
                  className={`rounded-lg border p-4 space-y-2.5 ${
                    isUser
                      ? 'border-white/10 bg-[#171720] ml-6 sm:ml-12'
                      : 'border-[#E5A93C]/25 bg-[#121218] mr-2 sm:mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tech">
                    <span
                      className={
                        isUser
                          ? 'text-[#C8C3BA] font-semibold'
                          : 'text-[#E5A93C] font-semibold'
                      }
                    >
                      {isUser ? 'Productor (Tú)' : `Agente LumenReel · ${profileLabel}`}
                    </span>
                    <span className="text-[#7D7971]">
                      {new Date(msg.createdAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="space-y-1.5 rounded-lg border border-[#38B2AC]/30 bg-[#0F2121] p-2.5">
                      <div className="text-[11px] font-semibold text-[#5EEAD4]">
                        Acciones ejecutadas sobre el proyecto:
                      </div>
                      <ul className="space-y-1">
                        {msg.actions.map((act, idx) => (
                          <li
                            key={`${msg.id}-act-${idx}`}
                            className="flex items-start gap-2 text-[11px] text-[#D7F5F2]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#38B2AC] shrink-0 mt-0.5" />
                            <span>
                              <strong className="font-medium">
                                [{AREA_LABELS[act.affectedArea] || act.affectedArea}]
                              </strong>{' '}
                              {act.summary}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-xs sm:text-[13px] text-[#E6E2DA] leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </article>
              );
            })
          )}

          {isBusy && (
            <div className="rounded-lg border border-[#E5A93C]/30 bg-[#151412] p-3.5 text-xs text-[#E5A93C] font-mono-tech">
              El Agente (Director · Guionista · Experto VFX) está deliberando y actualizando el
              expediente...
            </div>
          )}
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-[#121218] space-y-3">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-[#EF4444]/35 bg-[#3B1515]/50 px-3 py-2 text-xs text-[#FCA5A5] leading-relaxed"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label htmlFor="agent-prompt-input" className="sr-only">
              Instrucción para el Agente Director, Guionista y Experto en Efectos Especiales
            </label>
            <textarea
              id="agent-prompt-input"
              rows={3}
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              disabled={isBusy}
              placeholder="Ordena al Agente qué dirigir, reescribir en el guion o diseñar en VFX/SFX (ej: Añade tormenta eléctrica con lluvia práctica en set y reescribe el diálogo final con más tensión)..."
              className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] p-3 text-xs text-[#F2F0EB] leading-relaxed placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none resize-y"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-[#8D8981]">
              Enfoque activo: <strong className="text-[#C8C3BA]">{activeProfile.label}</strong>
            </span>
            <button
              type="submit"
              disabled={isBusy || !draftPrompt.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] disabled:opacity-55 text-[#0B0B0E] text-xs font-semibold transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBusy ? 'Procesando...' : 'Enviar al Agente'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
