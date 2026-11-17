import { useState } from 'react';
import { X, MailCheck, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

function mapFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/operation-not-allowed')) {
    return 'El acceso con correo y contraseña aún no está habilitado en Firebase Console. Activa el proveedor Email/Password en Authentication > Sign-in method o accede directamente con Google.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'Ya existe una cuenta registrada con este correo electrónico.';
  }
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (raw.includes('auth/user-not-found')) {
    return 'No existe ninguna cuenta asociada a ese correo.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return 'Se cerró la ventana de acceso antes de completar la autenticación.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Demasiados intentos recientes. Espera unos minutos e inténtalo de nuevo.';
  }
  return raw || 'No se pudo completar la autenticación.';
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const {
    user,
    isVerified,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resendVerificationEmail,
    refreshAuthUser,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!open) return null;

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError('Completa tu correo electrónico y contraseña.');
      return;
    }
    if (mode === 'register' && displayName.trim().length < 2) {
      setError('Indica tu nombre profesional o de director.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        onClose();
      } else {
        await registerWithEmail({ displayName, email, password });
        setNotice(
          'Cuenta creada. Enviamos un enlace de verificación a tu correo para activar el almacenamiento en la nube.'
        );
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError(null);
    try {
      await resendVerificationEmail();
      setNotice('Correo de verificación reenviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckVerified() {
    setBusy(true);
    setError(null);
    try {
      const ok = await refreshAuthUser();
      if (ok) {
        onClose();
      } else {
        setNotice('Tu correo aún aparece pendiente de verificación.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div className="w-full max-w-md rounded-xl border border-white/12 bg-[#121218] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 id="auth-modal-title" className="font-display text-lg font-semibold text-[#F2F0EB]">
              {user ? 'Cuenta del Productor' : 'Acceso al Estudio'}
            </h2>
            <p className="text-xs text-[#8D8981] mt-0.5">
              Sincroniza tus producciones, versiones finales y aprendizaje en la base de datos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de acceso"
            className="p-2 rounded-lg text-[#9A968E] hover:text-[#F2F0EB] hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {user ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-white/10 bg-[#0B0B0E] space-y-1.5">
                <div className="text-sm font-semibold text-[#F2F0EB]">
                  {user.displayName || 'Director LumenReel'}
                </div>
                <div className="text-xs font-mono-tech text-[#9A968E]">{user.email}</div>
                <div className="pt-1 flex items-center gap-2 text-xs">
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-[#38B2AC]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Correo verificado · Sincronización Firestore activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#E5A93C]">
                      <MailCheck className="w-3.5 h-3.5" />
                      Verificación de correo pendiente
                    </span>
                  )}
                </div>
              </div>

              {!isVerified && (
                <div className="space-y-2">
                  <p className="text-xs text-[#C8C3BA] leading-relaxed">
                    Para proteger tus proyectos en la base de datos, confirma el enlace enviado a{' '}
                    <span className="font-mono-tech text-[#F2F0EB]">{user.email}</span>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCheckVerified}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E5A93C] text-[#0B0B0E] text-xs font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ya verifiqué mi correo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={busy}
                      className="px-3 py-2 rounded-lg border border-white/12 text-xs font-medium text-[#E6E2DA] hover:bg-white/5"
                    >
                      Reenviar correo
                    </button>
                  </div>
                </div>
              )}

              {notice && (
                <div className="rounded-lg border border-[#38B2AC]/35 bg-[#122625] px-3 py-2 text-xs text-[#A7F3D0]">
                  {notice}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#EF4444]/35 bg-[#3B1515]/50 px-3 py-2 text-xs text-[#FCA5A5]"
                >
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#FCA5A5] hover:bg-[#3B1515]/40"
                >
                  Cerrar sesión
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-[#E5A93C] text-[#0B0B0E] text-xs font-semibold"
                >
                  Continuar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-lg border border-white/15 bg-[#1A1A22] hover:bg-[#23232E] text-xs font-semibold text-[#F2F0EB] transition-colors"
              >
                Continuar con Google
              </button>

              <div className="flex items-center gap-3 text-[11px] text-[#7D7971]">
                <div className="h-px flex-1 bg-white/10" />
                <span>o con correo y contraseña</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#09090C] border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`py-2 rounded-md text-xs font-medium transition-colors ${
                    mode === 'login'
                      ? 'bg-[#1D1D26] text-[#F2F0EB]'
                      : 'text-[#8D8981] hover:text-[#E6E2DA]'
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`py-2 rounded-md text-xs font-medium transition-colors ${
                    mode === 'register'
                      ? 'bg-[#1D1D26] text-[#F2F0EB]'
                      : 'text-[#8D8981] hover:text-[#E6E2DA]'
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="auth-display-name"
                      className="block text-xs font-medium text-[#C8C3BA] mb-1"
                    >
                      Nombre del productor / director
                    </label>
                    <input
                      id="auth-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ej: Elena Morales"
                      className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] focus:border-[#E5A93C] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-[#C8C3BA] mb-1"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@estudio.com"
                    className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] focus:border-[#E5A93C] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-[#C8C3BA] mb-1"
                  >
                    Contraseña
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] focus:border-[#E5A93C] focus:outline-none"
                  />
                </div>

                {notice && (
                  <div className="rounded-lg border border-[#38B2AC]/35 bg-[#122625] px-3 py-2 text-xs text-[#A7F3D0]">
                    {notice}
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#EF4444]/35 bg-[#3B1515]/50 px-3 py-2 text-xs text-[#FCA5A5] leading-relaxed"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] disabled:opacity-60 text-[#0B0B0E] text-xs font-semibold transition-colors"
                >
                  {busy
                    ? 'Procesando...'
                    : mode === 'login'
                      ? 'Entrar al estudio'
                      : 'Registrar cuenta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
