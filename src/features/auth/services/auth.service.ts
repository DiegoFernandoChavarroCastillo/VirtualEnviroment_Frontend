import { authApi, userApi } from '@/shared/lib/api';

export interface AuthUser {
  id: string;
  username: string;
  avatarColor: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterDto {
  username: string;
  password: string;
  avatarColor?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_DATA_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  setSession(token: string, user: AuthUser): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    const userData = { ...user, name: user.username };
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    localStorage.setItem('user_id', user.id);
  },

  clearSession(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem('user_id');
  },

  async register(dto: RegisterDto): Promise<LoginResponse> {
    const res = await authApi.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: dto,
    });
    this.setSession(res.accessToken, res.user);
    return res;
  },

  async login(dto: LoginDto): Promise<LoginResponse> {
    const res = await authApi.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: dto,
    });
    this.setSession(res.accessToken, res.user);
    return res;
  },

  async getProfile(): Promise<AuthUser> {
    const res = await userApi.request<AuthUser>('/users/me', {
      method: 'GET',
    });
    return res;
  },

  logout(): void {
    this.clearSession();
  },
};
