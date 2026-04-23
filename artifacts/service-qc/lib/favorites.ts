import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "attentezero.favorites.v1";

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function setFavorites(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

export async function toggleFavorite(id: string): Promise<string[]> {
  const cur = await getFavorites();
  const exists = cur.includes(id);
  const next = exists ? cur.filter((x) => x !== id) : [...cur, id];
  await setFavorites(next);
  return next;
}

export async function isFavorite(id: string): Promise<boolean> {
  const cur = await getFavorites();
  return cur.includes(id);
}
