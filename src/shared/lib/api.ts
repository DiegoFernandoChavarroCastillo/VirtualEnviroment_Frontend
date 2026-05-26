const usersURL = import.meta.env.VITE_USER_MGMT_URL;
const authURL = import.meta.env.VITE_AUTH_MGMT_URL;
const activitiesURL = import.meta.env.VITE_ACTIVITIES_MGMT_URL;
export const connectionsURL =  import.meta.env.VITE_CONNECTIONS_MGMT_URL;
export const realTimeURL = import.meta.env.VITE_VIRTUAL_ENVIRONMENT_URL;
const reportsURL = import.meta.env.VITE_REPORTS_SERVICE_URL;


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
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    localStorage.removeItem('auth_token');
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

  setTokenFromResponse(response: { token?: string }): void {
    if (response.token) {
      this.setToken(response.token);
    }
  }
}

export const REPORT_TYPE = {
  USER: 'USER',
  CONTENT: 'CONTENT',
};

export const REPORT_REASON = {
  SPAM: 'SPAM',
  COMPORTAMIENTO_INAPROPIADO: 'COMPORTAMIENTO_INAPROPIADO',
  CONTENIDO_OFENSIVO: 'CONTENIDO_OFENSIVO',
  ACOSO: 'ACOSO',
  FRAUD: 'FRAUD',
  INFORMACION_FALSA: 'INFORMACION_FALSA',
  OTRO: 'OTRO',
};


export const AUTH_API_BASE = 'auth';
export const USERS_API_BASE = 'users';
export const REPORTS_API_BASE = 'reports';
export const ACTIVITIES_API_BASE = 'activities';
export const userApi = new ApiClient(usersURL);
export const authApi = new ApiClient(authURL);
export const activityApi = new ApiClient(activitiesURL);
export const connectionsApi = new ApiClient(connectionsURL);
export const reportsApi = new ApiClient(reportsURL);
