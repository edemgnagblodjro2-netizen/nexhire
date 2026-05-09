import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVICES as STATIC_SERVICES, type Service } from "@/data/services";
import { apiCategoryToCode } from "@/lib/categoryMapping";

// v6 : on bump le cache car le mapping de catégorie change le format stocké.
// v7 : ajout de serviceType + geocodePrecisionM (Phase 1 fiabilité géoloc).
// v8 : pivot Québec — bump pour invalider les caches qui contiennent des services hors-QC.
// v9 : on ré-inclut les services province-wide (Centris, Kijiji, Realtor, etc.) qui avaient été virés par erreur en v8.
// v28 : import Haute-Yamaska — +261 fiches (Granby, Waterloo, Roxton Pond, etc.). PROD ~7099.
const CACHE_KEY = "attentezero_services_cache_v28";
const CACHE_TTL_MS = 60 * 60 * 1000;

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

function mapApiService(raw: any): Service | null {
  // Convertit la catégorie BDD (français : "logement") vers le format
  // utilisé par le code mobile (anglais : "housing"). Si la catégorie est
  // inconnue, on filtre le service plutôt que d'afficher un badge vide.
  const code = apiCategoryToCode(raw.category);
  if (!code) return null;
  return {
    id: raw.id,
    name: raw.name,
    category: code,
    subcategory: raw.subcategory ?? "",
    city: raw.city ?? "",
    province: raw.province ?? "QC",
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
    // v1.1.9 — Phase 1 fiabilité géoloc
    serviceType: raw.serviceType ?? "physical",
    geocodePrecisionM: raw.geocodePrecisionM ?? undefined,
    geocodeSource: raw.geocodeSource ?? undefined,
    verifiedAt: raw.verifiedAt ?? null,
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

      // mapApiService renvoie null si la catégorie BDD est inconnue : on
      // filtre ces lignes pour éviter d'afficher des badges vides.
      // Pivot Québec : on filtre les services hors-QC à la source.
      // Exception : les services pan-canadiens marqués isProvinceWide
      // (Centris, Kijiji, Realtor, etc.) restent visibles car utiles aux
      // Québécois (plateformes de logement, lignes 1-800, etc.).
      const mapped = raw
        .map(mapApiService)
        .filter((s): s is Service => s !== null)
        .filter((s) => {
          const prov = (s.province ?? "QC") as string;
          if (prov === "QC") return true;
          // Pan-canadiens (Kijiji, Centris, Realtor, lignes 1-800) :
          // isProvinceWide ET province === "CA". Refuse "211 Alberta" etc.
          if (s.isProvinceWide && prov === "CA") return true;
          return false;
        });
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
