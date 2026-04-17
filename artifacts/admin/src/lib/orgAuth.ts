const TOKEN_KEY = "az_org_token";

export function getOrgToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeOrgToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearOrgToken() {
  localStorage.removeItem(TOKEN_KEY);
}
