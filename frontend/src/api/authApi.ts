import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { type AuthScope, getAccessToken, setAccessToken } from "@/lib/tokenStorage";

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface CreateApiOptions {
  scope: AuthScope;
  loginPath: string;
  blockedPath?: string;
  /** Escopo alternativo tentado quando não há sessão de `scope` — usado pelo clienteApi
   * para que um admin logado também consiga navegar pelas áreas comuns do site sem ter
   * uma conta de cliente. */
  fallbackScope?: AuthScope;
}

export function createApi({ scope, loginPath, blockedPath, fallbackScope }: CreateApiOptions): AxiosInstance {
  const api = axios.create({ baseURL: "/api/v1", withCredentials: true });

  api.interceptors.request.use((config) => {
    const token = getAccessToken(scope) ?? (fallbackScope ? getAccessToken(fallbackScope) : null);
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });

  let refreshing: Promise<string | null> | null = null;

  async function refreshScope(refreshScopeName: AuthScope): Promise<string | null> {
    try {
      // Sem corpo: o refresh token vai só no cookie httpOnly, o navegador anexa sozinho.
      const { data } = await axios.post(`/api/v1/auth/${refreshScopeName}/refresh`, {}, { withCredentials: true });
      setAccessToken(refreshScopeName, data.access_token);
      return data.access_token as string;
    } catch {
      setAccessToken(refreshScopeName, null);
      return null;
    }
  }

  async function refreshAccessToken(): Promise<string | null> {
    const token = await refreshScope(scope);
    if (token) return token;
    return fallbackScope ? refreshScope(fallbackScope) : null;
  }

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as RetryableConfig | undefined;
      const requestUrl: string = originalRequest?.url ?? "";
      const isAuthEndpoint = requestUrl.includes("/auth/");

      if (error.response?.status === 402 && blockedPath) {
        window.location.href = blockedPath;
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;

        if (!refreshing) {
          refreshing = refreshAccessToken().finally(() => {
            refreshing = null;
          });
        }

        const newToken = await refreshing;
        if (newToken) {
          originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
          return api(originalRequest);
        }

        window.location.href = loginPath;
      }

      return Promise.reject(error);
    },
  );

  return api;
}
