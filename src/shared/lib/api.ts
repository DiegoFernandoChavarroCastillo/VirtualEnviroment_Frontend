import { sessionStore } from '@/features/auth/services/auth.service';

const REALTIME_URL = (import.meta.env.VITE_REALTIME_URL ?? '').replace(/\/$/, '');

/**
 * Single API base URL.
 *
 * The backend exposes auth, user, leaderboard and connection endpoints in
 * addition to the realtime WebSocket gateways, so the frontend talks to one
 * service: the realtime microservice.
 */
const API_BASE = REALTIME_URL;

/** Alias used by socket consumers (shooter/football/socket context). */
export const realTimeURL = REALTIME_URL;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  baseUrl?: string;
}

interface MultipartRequestOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  formData: FormData;
  headers?: Record<string, string>;
  baseUrl?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private getToken(): string | null {
    return sessionStore.get().token;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, baseUrl = this.baseUrl } = options;

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[API Error Response] ${method} ${url}`, errorData);
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      const textResponse = await response.text();
      return JSON.parse(textResponse) as T;

    } catch (error) {
      throw error;
    }
  }

  async requestMultipart<T>(endpoint: string, options: MultipartRequestOptions): Promise<T> {
    const { method = 'PUT', formData, headers = {}, baseUrl = this.baseUrl } = options;

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      credentials: 'include',
      mode: 'cors',
      headers: { ...headers },
      body: formData,
    };

    const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API Error Response] ${method} ${url}`, errorData);
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    const textResponse = await response.text();
    return JSON.parse(textResponse) as T;
  }

  async requestVoid(endpoint: string, options: RequestOptions = {}): Promise<void> {
    const { method = 'GET', body, headers = {}, baseUrl = this.baseUrl } = options;

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `Request failed with status ${response.status}`);
      }

    } catch (error) {
      throw error;
    }

  }
}

export const authApi = new ApiClient(API_BASE);
export const userApi = new ApiClient(API_BASE);
export const leaderboardApi = new ApiClient(API_BASE);
