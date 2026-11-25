import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthContextValue {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<string | null>;
  signOutGoogle: () => Promise<void>;
  getFreshIdToken: () => Promise<string | null>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          setIdToken(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setUser(cred.user);
      setIdToken(token);
      return token;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google Sign-In could not be completed.';
      setAuthError(message);
      return null;
    }
  }, []);

  const signOutGoogle = useCallback(async (): Promise<void> => {
    setAuthError(null);
    try {
      await signOut(auth);
      setUser(null);
      setIdToken(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign out right now.';
      setAuthError(message);
    }
  }, []);

  const getFreshIdToken = useCallback(async (): Promise<string | null> => {
    const current = auth.currentUser;
    if (!current) return null;
    try {
      const token = await current.getIdToken();
      setIdToken(token);
      return token;
    } catch {
      return null;
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        authError,
        signInWithGoogle,
        signOutGoogle,
        getFreshIdToken,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useFirebaseAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}
