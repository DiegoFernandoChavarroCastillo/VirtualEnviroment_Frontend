import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  authService,
  sessionStore,
  type AuthUser,
  type RegisterDto,
  type LoginDto,
  type LoginResponse,
} from '../services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (dto: LoginDto) => Promise<LoginResponse>;
  register: (dto: RegisterDto) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  /**
   * Subscribe to session changes. Components (notably `SocketContext`) can
   * pass a callback and recreate sockets when the token rotates, without
   * resorting to `localStorage` polling.
   */
  subscribe: (cb: (token: string | null) => void) => () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider — single source of truth for the authenticated session.
 *
 * Security model:
 *   - The access token lives ONLY in React state (in memory).
 *   - The refresh token is an HttpOnly cookie managed by the backend.
 *   - On mount we attempt a silent refresh via `authService.restoreSession`.
 *   - Any component can subscribe to token changes through `subscribe()`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // `useSyncExternalStore` keeps React in sync with the imperative
  // `sessionStore` (login / logout / refresh from anywhere).
  const session = useSyncExternalStore(
    (cb) => sessionStore.subscribe(() => cb()),
    () => sessionStore.get(),
    () => sessionStore.get(),
  );

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await authService.restoreSession();
      if (cancelled) return;
      if (res) {
        // Optionally pick up fresh profile fields.
        const fresh = await authService.getProfile();
        if (!cancelled && fresh) {
          sessionStore.set(res.accessToken, fresh);
        }
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (dto: LoginDto) => authService.login(dto), []);
  const register = useCallback(async (dto: RegisterDto) => authService.register(dto), []);
  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const subscribe = useCallback(
    (cb: (token: string | null) => void) => sessionStore.subscribe((s) => cb(s.token)),
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        token: session.token,
        isLoading,
        isAuthenticated: !!session.token && !!session.user,
        login,
        register,
        logout,
        subscribe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
