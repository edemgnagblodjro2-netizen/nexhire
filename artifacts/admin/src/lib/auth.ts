const STORAGE_KEY = "az_admin_key";

export function getStoredKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeKey(key: string) {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearKey() {
  localStorage.removeItem(STORAGE_KEY);
}
