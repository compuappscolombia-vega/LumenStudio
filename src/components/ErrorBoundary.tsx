import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
    isPermissionError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'Ha ocurrido un error inesperado en el estudio.';
    let isPermissionError = false;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.error) {
        isPermissionError = parsed.error.toLowerCase().includes('permission');
        message = isPermissionError
          ? `Acceso denegado en Firestore (${parsed.operationType || 'operación'} sobre ${parsed.path || 'colección'}). Verifica que tu correo esté verificado.`
          : parsed.error;
      }
    } catch {
      // Plain error message
    }

    return {
      hasError: true,
      message,
      isPermissionError,
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Studio ErrorBoundary:', error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '', isPermissionError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B0E] text-[#F2F0EB] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-[#EF4444]/30 bg-[#14141A] p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#FCA5A5]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h1 className="font-display text-lg font-semibold">
                {this.state.isPermissionError
                  ? 'Permisos de Base de Datos'
                  : 'Error en LumenReel Studio'}
              </h1>
            </div>
            <p className="text-sm text-[#C8C3BA] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E5A93C] text-[#0B0B0E] text-xs font-semibold hover:bg-[#EDA949]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
