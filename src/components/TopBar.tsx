import { UserCheck, LogIn } from 'lucide-react';
import type { WorkspaceTab } from '../types/studio';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onOpenNewProject: () => void;
  onOpenAuth: () => void;
  userLabel: string | null;
  onToggleMobileMenu: () => void;
}

const NAV_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'agent', label: 'Agente' },
  { id: 'vision', label: 'Dirección' },
  { id: 'shots', label: 'Planos y Sonido' },
  { id: 'screenplay', label: 'Guion' },
  { id: 'storyboard', label: 'Storyboard' },
];

export function TopBar({
  activeTab,
  onTabChange,
  onOpenNewProject,
  onOpenAuth,
  userLabel,
  onToggleMobileMenu,
}: TopBarProps) {
  return (
    <header className="h-16 border-b border-white/10 bg-[#0B0B0E] px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 md:gap-8 shrink-0">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Abrir lista de proyectos"
          className="lg:hidden px-2 sm:px-2.5 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-[#E6E2DA] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#E5A93C] whitespace-nowrap shrink-0"
        >
          Proyectos
        </button>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('vision');
          }}
          className="font-display text-sm sm:text-lg font-bold tracking-tight text-[#F2F0EB] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#E5A93C]"
        >
          LumenReel Studio
        </a>
      </div>

      {/* Zone 2: Primary Workspace Navigation */}
      <nav aria-label="Vistas del estudio" className="hidden md:flex items-center gap-6">
        {NAV_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#E5A93C] ${
                active
                  ? 'border-[#E5A93C] text-[#F2F0EB]'
                  : 'border-transparent text-[#9A968E] hover:text-[#F2F0EB]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Auth & Primary Action */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenAuth}
          aria-label={userLabel ? `Cuenta activa: ${userLabel}` : 'Acceder o registrarse'}
          className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-white/12 bg-[#14141B] hover:bg-[#1C1C26] text-xs font-medium text-[#E6E2DA] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#E5A93C]"
        >
          {userLabel ? (
            <>
              <UserCheck className="w-3.5 h-3.5 text-[#38B2AC] shrink-0" />
              <span className="hidden sm:inline max-w-[110px] truncate">{userLabel}</span>
            </>
          ) : (
            <>
              <LogIn className="w-3.5 h-3.5 text-[#E5A93C] shrink-0" />
              <span>Acceder</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenNewProject}
          className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] text-[#0B0B0E] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A93C]"
        >
          <span className="sm:hidden">Nueva</span>
          <span className="hidden sm:inline">Nueva producción</span>
        </button>
      </div>
    </header>
  );
}
