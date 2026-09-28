interface ApiResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

interface ApiSystemConfig {
  baseURL: string;
  headers?: Record<string, string>;
}

type SessionExpiredCallback = (options: { stay: () => void; logout: () => void }) => void;

class ApiSystem {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private sessionExpiredCallback: SessionExpiredCallback | null = null;
  private activityTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly ACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(config: ApiSystemConfig) {
    this.baseURL = config.baseURL;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.headers,
    };
    this.startActivityMonitor();
  }

  private startActivityMonitor() {
    if (typeof window === "undefined") return;
    const resetTimer = () => {
      if (this.activityTimer) clearTimeout(this.activityTimer);
      this.activityTimer = setTimeout(() => {
        this.handleInactivity();
      }, this.ACTIVITY_TIMEOUT_MS);
    };
    ["mousedown", "keydown", "touchstart", "scroll"].forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );
    resetTimer();
  }

  private handleInactivity() {
    const token = localStorage.getItem("access_token");
    if (token && !this.isTokenExpired(token)) {
      this.refreshTokenSilently();
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  setSessionExpiredHandler(callback: SessionExpiredCallback | null) {
    this.sessionExpiredCallback = callback;
  }

  private notifySessionExpired() {
    if (this.sessionExpiredCallback) {
      this.sessionExpiredCallback({
        stay: () => this.refreshTokenSilently(),
        logout: () => this.clearAuth(),
      });
    }
  }

  private clearAuth() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_role_id");
    localStorage.removeItem("auth_id_empresa");
    localStorage.removeItem("auth_empresa_principal");
    this.removeHeader("Authorization");
    window.location.href = "/login";
  }

  private async refreshTokenSilently(): Promise<string | null> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      this.notifySessionExpired();
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) throw new Error("Refresh failed");

        const data = await response.json();
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        if (newAccessToken) {
          localStorage.setItem("access_token", newAccessToken);
          this.setHeader("Authorization", `Bearer ${newAccessToken}`);
        }
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }

        this.isRefreshing = false;
        return newAccessToken;
      } catch {
        this.isRefreshing = false;
        this.notifySessionExpired();
        return null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>,
    isRetry = false
  ): Promise<ApiResponse<T>> {
    let url = `${this.baseURL}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
    };
    const storedToken = localStorage.getItem("access_token");
    const token = storedToken?.trim();
    const isGarbage =
      !token || token === "undefined" || token === "null" || token === "[object Object]";
    if (!isGarbage && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: "omit",
    };

    if (data && method !== "GET") {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (response.status === 401 && !isRetry) {
      const newToken = await this.refreshTokenSilently();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        const retryConfig = { ...config, headers };
        const retryResponse = await fetch(url, retryConfig);
        if (retryResponse.ok) {
          const text = await retryResponse.text();
          const responseData = text ? JSON.parse(text) : null;
          return { data: responseData as T, status: retryResponse.status, ok: retryResponse.ok };
        }
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `Error ${response.status}`,
        response.status,
        errorData
      );
    }

    const text = await response.text();
    const responseData = text ? JSON.parse(text) : null;

    return {
      data: responseData as T,
      status: response.status,
      ok: response.ok,
    };
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, params);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data);
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data);
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data);
  }

  async delete<T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, params);
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }
}


export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const apiSystem = new ApiSystem({
  baseURL: import.meta.env.VITE_API_SYSTEM_URL,
});

export { ApiSystem };
export type { ApiResponse, ApiSystemConfig };
