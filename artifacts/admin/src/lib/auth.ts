const STORAGE_KEY = "az_admin_key";
const ROLE_KEY = "az_admin_role";

export type AdminRole = "superadmin" | "b2g";

export function getStoredKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredRole(): AdminRole | null {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    if (r === "superadmin" || r === "b2g") return r;
    return null;
  } catch {
    return null;
  }
}

export function storeKey(key: string, role: AdminRole) {
  localStorage.setItem(STORAGE_KEY, key);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearKey() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ROLE_KEY);
}
