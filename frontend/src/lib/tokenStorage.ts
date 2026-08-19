export type AuthScope = "cliente" | "admin";

// O access token vive só em memória (não localStorage): some ao recarregar a página, e o
// bootstrap (ClienteAuthContext/AdminAuthContext) pede um novo via /auth/{scope}/refresh,
// que usa o refresh token no cookie httpOnly — invisível pra esse módulo e pro JS em geral.
const accessTokens: Record<AuthScope, string | null> = { cliente: null, admin: null };

export function getAccessToken(scope: AuthScope): string | null {
  return accessTokens[scope];
}

export function setAccessToken(scope: AuthScope, token: string | null): void {
  accessTokens[scope] = token;
}
