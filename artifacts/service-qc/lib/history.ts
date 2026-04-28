import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "attentezero_history_v1";
const MAX_ITEMS = 20;

export type HistoryEntry = {
  serviceId: string;
  serviceName: string;
  category: string;
  city: string;
  viewedAt: number;
};

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, "viewedAt">): Promise<void> {
  try {
    const existing = await getHistory();
    const filtered = existing.filter((e) => e.serviceId !== entry.serviceId);
    const next: HistoryEntry[] = [
      { ...entry, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Silent: history is best-effort
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Silent
  }
}
