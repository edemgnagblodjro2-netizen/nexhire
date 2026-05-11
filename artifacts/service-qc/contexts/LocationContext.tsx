import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { Platform } from "react-native";

import type { Coordinates } from "@/data/services";

type LocationStatus = "idle" | "requesting" | "granted" | "denied";

interface LocationContextValue {
  userLocation: Coordinates | null;
  userCity: string | null;
  locationError: string | null;
  locationStatus: LocationStatus;
  requestLocation: (opts?: { force?: boolean }) => Promise<void>;
}

const LocationContext = createContext<LocationContextValue>({
  userLocation: null,
  userCity: null,
  locationError: null,
  locationStatus: "idle",
  requestLocation: async () => {},
});

async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      // Best-effort via Nominatim public endpoint (no key, polite UA).
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "fr",
            // Nominatim policy requires identifying User-Agent. Replit Workspace
            // sets the Referer automatically; keep this static so caching works.
            "User-Agent": "AttenteZero/1.1 (https://attentezero.ca)",
          },
        },
      );
      if (!r.ok) return null;
      const j = await r.json();
      return j?.address?.city || j?.address?.town || j?.address?.village || j?.address?.municipality || null;
    }
    const arr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const a = arr?.[0];
    return a?.city || a?.subregion || null;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");

  const updateLocationAndCity = useCallback(async (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setLocationStatus("granted");
    const city = await reverseGeocodeCity(lat, lng);
    if (city) setUserCity(city);
  }, []);

  const requestLocation = useCallback(async (opts?: { force?: boolean }) => {
    setLocationStatus("requesting");
    setLocationError(null);

    try {
      if (Platform.OS === "web") {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          throw new Error("Géolocalisation non disponible sur ce navigateur");
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 60_000,
          });
        });
        await updateLocationAndCity(pos.coords.latitude, pos.coords.longitude);
        return;
      }

      // Native: ensure services are enabled, then request permission
      const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!enabled) {
        setLocationError("Activez le GPS dans les réglages");
        setLocationStatus("denied");
        return;
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted" || opts?.force) {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        setLocationError("Permission refusée");
        setLocationStatus("denied");
        return;
      }

      // 1) Try last-known position first (instant, no GPS warm-up)
      try {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000,
          requiredAccuracy: 1000,
        });
        if (last) {
          await updateLocationAndCity(last.coords.latitude, last.coords.longitude);
        }
      } catch {
        // ignore — we'll fetch fresh below
      }

      // 2) Then fetch a fresh fix (with timeout safety net)
      try {
        const pos = await withTimeout(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          15000,
          "GPS timeout",
        );
        await updateLocationAndCity(pos.coords.latitude, pos.coords.longitude);
      } catch (err) {
        // If we already have a last-known fix, keep granted; otherwise mark denied
        if (!userLocation) {
          const msg = err instanceof Error ? err.message : "Erreur GPS";
          setLocationError(msg);
          setLocationStatus("denied");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de localisation";
      setLocationError(msg);
      setLocationStatus("denied");
    }
  }, [userLocation, updateLocationAndCity]);

  return (
    <LocationContext.Provider
      value={{ userLocation, userCity, locationError, locationStatus, requestLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
