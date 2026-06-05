import { authApi, userApi } from '@/shared/lib/api';

/**
 * Auth contract
 * -------------
 * The frontend keeps the access token in MEMORY (React state) only. It is
 * NEVER persisted to `localStorage` to limit XSS impact. To survive a page
 * reload, the backend must:
 *   1. Issue a refresh token as an `HttpOnly`, `Secure`, `SameSite=Lax`
 *      cookie when the user logs in / registers.
 *   2. Expose `GET /auth/refresh` that reads the cookie and returns a new
 *      access token in the response body.
 *
 * Until those endpoints exist, refreshing the tab will log the user out.
 * That is the secure default — no silent persistence of bearer tokens.
 */

export interface AuthUser {
  id: string;
  username: string;
  avatarColor: string;
  email?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  avatarColor?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

interface SessionState {
  token: string | null;
  user: AuthUser | null;
}

type SessionListener = (state: SessionState) => void;

/**
 * In-memory session store with a pub/sub mechanism so the `AuthProvider`
 * and any socket context can subscribe to token changes without polling.
 */
class SessionStore {
  private state: SessionState = { token: null, user: null };
  private listeners = new Set<SessionListener>();

  get(): SessionState {
    return this.state;
  }

  set(token: string, user: AuthUser): void {
    this.state = { token, user };
    this.emit();
  }

  clear(): void {
    this.state = { token: null, user: null };
    this.emit();
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }
}

export const sessionStore = new SessionStore();

export const authService = {
  /**
   * Try to restore a session by calling `/auth/refresh`. The backend is
   * expected to read an HttpOnly cookie and return a fresh access token.
   * Returns null if the user is not authenticated.
   */
  async restoreSession(): Promise<LoginResponse | null> {
    try {
      const res = await authApi.request<LoginResponse>('/auth/refresh', {
        method: 'POST',
      });
      if (res?.accessToken && res?.user) {
        sessionStore.set(res.accessToken, res.user);
        return res;
      }
      return null;
    } catch {
      // 401 / network error → no session. That's normal for first-time visitors.
      return null;
    }
  },

  async register(dto: RegisterDto): Promise<LoginResponse> {
    const res = await authApi.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: dto,
    });
    this.assertSession(res);
    return res;
  },

  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await authApi.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: dto,
    });
    this.assertSession(res);
    return res;
  },

  /**
   * Best-effort profile refresh. Used to pick up updated fields (avatar,
   * display name) without forcing a re-login.
   */
  async getProfile(): Promise<AuthUser | null> {
    try {
      return await userApi.request<AuthUser>('/users/me', { method: 'GET' });
    } catch {
      return null;
    }
  },

  /**
   * Clears the in-memory session. The backend `/auth/logout` endpoint
   * is responsible for invalidating the refresh-token cookie.
   */
  async logout(): Promise<void> {
    try {
      await authApi.request<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the call fails, the local session is gone.
    }
    sessionStore.clear();
  },

  assertSession(res: LoginResponse): void {
    if (!res?.accessToken || !res?.user?.id) {
      throw new Error('Invalid authentication response from server');
    }
    sessionStore.set(res.accessToken, res.user);
  },
};
