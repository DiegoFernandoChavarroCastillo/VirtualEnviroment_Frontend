import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authService, type AuthUser, type RegisterDto, type LoginDto } from '../services/auth.service';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = authService.getToken();
    const storedUser = authService.getUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      authService.getProfile().then(setUser).catch(() => {
        authService.clearSession();
        setToken(null);
        setUser(null);
      });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    const res = await authService.login(dto);
    setToken(res.accessToken);
    setUser(res.user);
    localStorage.setItem('user_id', res.user.id);
  }, []);

  const register = useCallback(async (dto: RegisterDto) => {
    const res = await authService.register(dto);
    setToken(res.accessToken);
    setUser(res.user);
    localStorage.setItem('user_id', res.user.id);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
    localStorage.removeItem('user_id');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, isAuthenticated: !!token && !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
