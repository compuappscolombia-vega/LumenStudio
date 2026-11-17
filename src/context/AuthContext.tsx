import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';
import { ensureUserProfileInFirestore } from '../services/firestoreSync';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    displayName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser && nextUser.emailVerified) {
        try {
          await ensureUserProfileInFirestore(nextUser);
        } catch (err) {
          console.error('Error sincronizando perfil de usuario:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    if (cred.user && cred.user.emailVerified) {
      await ensureUserProfileInFirestore(cred.user);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (cred.user && cred.user.emailVerified) {
      await ensureUserProfileInFirestore(cred.user);
    }
  }

  async function registerWithEmail(params: {
    displayName: string;
    email: string;
    password: string;
  }) {
    const cred = await createUserWithEmailAndPassword(
      auth,
      params.email.trim(),
      params.password
    );
    await updateProfile(cred.user, {
      displayName: params.displayName.trim(),
    });
    await sendEmailVerification(cred.user);
    setUser({ ...cred.user });
  }

  async function resendVerificationEmail() {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  }

  async function refreshAuthUser(): Promise<boolean> {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const updated = auth.currentUser;
    setUser(updated ? ({ ...updated } as User) : null);
    if (updated?.emailVerified) {
      await ensureUserProfileInFirestore(updated);
      return true;
    }
    return false;
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isVerified: Boolean(user && user.emailVerified),
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resendVerificationEmail,
        refreshAuthUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de AuthProvider.');
  }
  return ctx;
}
