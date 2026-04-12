import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { Platform } from "react-native";

import type { Coordinates } from "@/data/services";

interface LocationContextValue {
  userLocation: Coordinates | null;
  locationError: string | null;
  locationStatus: "idle" | "requesting" | "granted" | "denied";
  requestLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue>({
  userLocation: null,
  locationError: null,
  locationStatus: "idle",
  requestLocation: async () => {},
});

export function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");

  const requestLocation = useCallback(async () => {
    setLocationStatus("requesting");
    setLocationError(null);

    try {
      if (Platform.OS === "web") {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              setLocationStatus("granted");
              resolve();
            },
            (err) => {
              setLocationError(err.message);
              setLocationStatus("denied");
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Permission refusée");
          setLocationStatus("denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationStatus("granted");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de localisation";
      setLocationError(msg);
      setLocationStatus("denied");
    }
  }, []);

  return (
    <LocationContext.Provider
      value={{ userLocation, locationError, locationStatus, requestLocation }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
