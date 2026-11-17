import { useState } from 'react';
import { BookOpen, Clapperboard, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { exportUserManualPdf } from '../utils/userManualPdf';

function mapFirebaseAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('auth/operation-not-allowed')) {
    return 'El acceso con correo y contraseña aún no está habilitado en Firebase Console. Activa el proveedor Email/Password en Authentication > Sign-in method o ingresa directamente con Google.';
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
    return 'Se cerró la ventana de Google antes de completar el acceso.';
  }
  if (raw.includes('auth/popup-blocked')) {
    return 'El navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes e inténtalo de nuevo.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Demasiados intentos recientes. Espera unos minutos e inténtalo de nuevo.';
  }
  return raw || 'No se pudo completar la autenticación.';
}

export function AuthGate() {
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

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithGoogle();
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
      } else {
        await registerWithEmail({ displayName, email, password });
        setNotice(
          'Cuenta creada. Enviamos un enlace de verificación a tu correo para habilitar el acceso al estudio.'
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
      if (!ok) {
        setNotice('Tu correo aún aparece pendiente de verificación.');
      }
    } catch (err) {
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F2F0EB] flex flex-col justify-between px-4 py-8 sm:px-8">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <Clapperboard className="w-5 h-5 text-[#E5A93C] shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-[#F2F0EB] whitespace-nowrap">
            LumenReel Studio
          </span>
        </div>
        <span className="hidden sm:inline text-xs font-mono-tech text-[#8D8981] whitespace-nowrap">
          Acceso exclusivo para miembros registrados
        </span>
      </header>

      <main className="max-w-5xl w-full mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Editorial Introduction */}
        <section className="lg:col-span-6 space-y-5">
          <p className="text-xs font-mono-tech text-[#E5A93C]">
            Agente Cinematográfico · Director · Guionista · Experto en Efectos Especiales
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2F0EB] leading-tight text-balance">
            Inicia sesión para abrir tu mesa de producción desde cero.
          </h1>
          <p className="text-sm sm:text-[15px] text-[#B8B3AA] leading-relaxed max-w-[54ch]">
            Cada cuenta dispone de un agente autónomo que dirige puesta en escena, redacta
            guiones, planifica VFX/SFX, analiza audiolibros y genera fotogramas con Nano y Omni
            Flash. Regístrate con Google o correo electrónico para empezar una producción nueva.
          </p>

          <dl className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="font-semibold text-[#F2F0EB]">Proyectos desde cero</dt>
              <dd className="text-[#8D8981] mt-1">
                Sin plantillas precargadas ni material ajeno; tú defines cada capítulo,
                audiolibro o historia.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#F2F0EB]">Continuidad privada</dt>
              <dd className="text-[#8D8981] mt-1">
                Tus guiones, bitácoras en PDF final y recursos visuales quedan vinculados
                exclusivamente a tu usuario.
              </dd>
            </div>
          </dl>
        </section>

        {/* Right Authentication Panel */}
        <section
          aria-labelledby="auth-gate-title"
          className="lg:col-span-6 w-full max-w-md mx-auto rounded-xl border border-white/12 bg-[#121218] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/10">
            <h2 id="auth-gate-title" className="font-display text-lg font-semibold text-[#F2F0EB]">
              {user && !isVerified
                ? 'Verifica tu correo electrónico'
                : mode === 'login'
                  ? 'Iniciar sesión en LumenReel Studio'
                  : 'Registrar nueva cuenta'}
            </h2>
            <p className="text-xs text-[#8D8981] mt-0.5">
              {user && !isVerified
                ? 'Confirma tu cuenta para habilitar el acceso al espacio de trabajo.'
                : 'Acceso obligatorio antes de entrar a la interfaz de producción.'}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {user && !isVerified ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-white/10 bg-[#0B0B0E] space-y-1.5">
                  <div className="text-sm font-semibold text-[#F2F0EB]">
                    {user.displayName || 'Director LumenReel'}
                  </div>
                  <div className="text-xs font-mono-tech text-[#9A968E]">{user.email}</div>
                  <div className="pt-1 flex items-center gap-2 text-xs text-[#E5A93C]">
                    <MailCheck className="w-3.5 h-3.5" />
                    <span>Verificación de correo pendiente</span>
                  </div>
                </div>

                <p className="text-xs text-[#C8C3BA] leading-relaxed">
                  Abre el enlace de confirmación enviado a{' '}
                  <span className="font-mono-tech text-[#F2F0EB]">{user.email}</span> y luego
                  pulsa &ldquo;Ya verifiqué mi correo&rdquo;.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCheckVerified}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E5A93C] hover:bg-[#EDA949] text-[#0B0B0E] text-xs font-semibold disabled:opacity-60"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ya verifiqué mi correo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={busy}
                    className="px-4 py-2 rounded-lg border border-white/12 text-xs font-medium text-[#E6E2DA] hover:bg-white/5 disabled:opacity-60"
                  >
                    Reenviar correo
                  </button>
                </div>

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

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-[#8D8981]">
                    ¿Prefieres usar Google?
                  </span>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="text-xs font-medium text-[#FCA5A5] hover:underline"
                  >
                    Cerrar sesión / Cambiar cuenta
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-white/20 bg-[#1B1B24] hover:bg-[#252532] disabled:opacity-60 text-xs font-semibold text-[#F2F0EB] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-2H12z"
                    />
                    <path
                      fill="#34A853"
                      d="M3.6 7.5l3.2 2.3C7.7 7.6 9.7 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 8.3 2.5 5.1 4.6 3.6 7.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12 21.5c2.6 0 4.8-.9 6.4-2.3l-3-2.5c-.8.6-1.9 1-3.4 1-3.8 0-5.2-2.5-5.4-3.7l-3.2 2.5c1.5 3 4.7 5 8.6 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M21.1 12.2c0-.6-.1-1.1-.2-2H12v3.9h5.4c-.3 1.4-1.1 2.4-2 3l3 2.5c1.8-1.6 2.7-4.1 2.7-7.4z"
                    />
                  </svg>
                  <span>Continuar con Google (Registro / Acceso)</span>
                </button>

                <div className="flex items-center gap-3 text-[11px] text-[#7D7971]">
                  <div className="h-px flex-1 bg-white/10" />
                  <span>o accede con tu correo</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div
                  role="tablist"
                  aria-label="Modo de acceso"
                  className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#09090C] border border-white/10"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setNotice(null);
                    }}
                    className={`py-2 rounded-md text-xs font-medium ${
                      mode === 'login'
                        ? 'bg-[#23232E] text-[#F2F0EB] border border-[#E5A93C]/35'
                        : 'text-[#8D8981] hover:text-[#E6E2DA] border border-transparent'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'register'}
                    onClick={() => {
                      setMode('register');
                      setError(null);
                      setNotice(null);
                    }}
                    className={`py-2 rounded-md text-xs font-medium ${
                      mode === 'register'
                        ? 'bg-[#23232E] text-[#F2F0EB] border border-[#E5A93C]/35'
                        : 'text-[#8D8981] hover:text-[#E6E2DA] border border-transparent'
                    }`}
                  >
                    Registrarse
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'register' && (
                    <div>
                      <label
                        htmlFor="gate-display-name"
                        className="block text-xs font-medium text-[#C8C3BA] mb-1"
                      >
                        Nombre del productor / director
                      </label>
                      <input
                        id="gate-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ej: Elena Morales"
                        className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="gate-email"
                      className="block text-xs font-medium text-[#C8C3BA] mb-1"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id="gate-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="director@estudio.com"
                      className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="gate-password"
                      className="block text-xs font-medium text-[#C8C3BA] mb-1"
                    >
                      Contraseña
                    </label>
                    <input
                      id="gate-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-lg border border-white/12 bg-[#0B0B0E] px-3 py-2 text-xs text-[#F2F0EB] placeholder:text-[#6E6A63] focus:border-[#E5A93C] focus:outline-none"
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

                <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-[11px] text-[#8D8981]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#38B2AC] shrink-0" />
                  <span>
                    Si aún no tienes cuenta, regístrate con Google o en la pestaña Registrarse.
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#6E6A63]">
        <span>LumenReel Studio · Producción y Dirección Cinematográfica</span>
        <button
          type="button"
          onClick={() => void exportUserManualPdf()}
          className="inline-flex items-center gap-1.5 text-[#C8C3BA] hover:text-[#E5A93C] transition-colors whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#E5A93C]" />
          <span>Manual de uso (PDF)</span>
        </button>
      </footer>
    </div>
  );
}
