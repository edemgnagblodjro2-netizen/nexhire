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
  if (!_authTokenGetter) return null;
  return _authTokenGetter();
}
