import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVICES as STATIC_SERVICES, type Service } from "@/data/services";

const CACHE_KEY = "attentezero_services_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type ServicesContextValue = {
  services: Service[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const ServicesContext = createContext<ServicesContextValue>({
  services: STATIC_SERVICES,
  loading: false,
  error: null,
  refresh: () => {},
});

function mapApiService(raw: any): Service {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category,
    subcategory: raw.subcategory ?? "",
    city: raw.city ?? "",
    phone: raw.phone ?? "",
    website: raw.website ?? "",
    description: raw.description ?? "",
    address: raw.address ?? undefined,
    hours: raw.hours ?? undefined,
    isUrgent: raw.isUrgent ?? false,
    isProvinceWide: raw.isProvinceWide ?? false,
    coordinates:
      raw.lat != null && raw.lng != null
        ? { lat: raw.lat, lng: raw.lng }
        : undefined,
  } as unknown as Service;
}

async function loadCached(): Promise<Service[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.data as Service[];
  } catch {
    return null;
  }
}

async function saveCache(data: Service[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch {}
}

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [services, setServices] = useState<Service[]>(STATIC_SERVICES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (!forceRefresh) {
      const cached = await loadCached();
      if (cached && cached.length > 0) {
        setServices(cached);
        setLoading(false);
        return;
      }
    }

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "https://quebec-aid-finder.replit.app";
      const res = await fetch(`${apiUrl}/api/services`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw: any[] = await res.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error("Empty response");

      const mapped = raw.map(mapApiService);
      setServices(mapped);
      await saveCache(mapped);
    } catch (err: any) {
      const cached = await loadCached();
      if (cached && cached.length > 0) {
        setServices(cached);
      } else {
        setServices(STATIC_SERVICES);
      }
      setError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices(false);
  }, [fetchServices]);

  return (
    <ServicesContext.Provider
      value={{ services, loading, error, refresh: () => fetchServices(true) }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServicesData() {
  return useContext(ServicesContext);
}
