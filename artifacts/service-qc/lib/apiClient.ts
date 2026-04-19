import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "./apiBase";

// SecureStore key used by lib/auth.tsx to persist the mobile bearer token
// after register/login. Kept in sync here so any caller can attach it.
export const AUTH_TOKEN_KEY = "auth_session_token";

let _baseUrl: string | null = null;
let _authTokenGetter: (() => Promise<string | null> | string | null) | null = null;

export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

export function setAuthTokenGetter(
  getter: (() => Promise<string | null> | string | null) | null
): void {
  _authTokenGetter = getter;
}

export function getBaseUrl(): string | null {
  return _baseUrl;
}

export async function getAuthToken(): Promise<string | null> {
  if (_authTokenGetter) {
    const v = await _authTokenGetter();
    if (v) return v;
  }
  // Fallback: read directly from SecureStore. Lets screens use authedFetch
  // before AuthProvider has registered its getter (e.g. on cold start).
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Authenticated fetch helper.
 * - Resolves URL against the current API base when a path is passed.
 * - Attaches `Authorization: Bearer <token>` when a session token is available.
 * - Sets `Content-Type: application/json` by default; pass FormData and the
 *   browser/native runtime will set the multipart boundary itself.
 */
export async function authedFetch(
  urlOrPath: string,
  init?: RequestInit,
): Promise<Response> {
  const url = /^https?:\/\//i.test(urlOrPath)
    ? urlOrPath
    : `${getApiBaseUrl()}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;

  const token = await getAuthToken();
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((init?.headers as Record<string, string>) || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(url, { ...init, headers });
}
