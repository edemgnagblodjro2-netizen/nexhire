import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useLanguage } from "@/contexts/LanguageContext";

export function OfflineBanner() {
  const { language } = useLanguage();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsubRef: { current: (() => void) | undefined } = { current: undefined };
    (async () => {
      if (Platform.OS === "web") {
        const update = () => {
          if (!cancelled) setOffline(typeof navigator !== "undefined" && !navigator.onLine);
        };
        update();
        if (typeof window !== "undefined") {
          window.addEventListener("online", update);
          window.addEventListener("offline", update);
          const cleanup = () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
          };
          if (cancelled) cleanup();
          else unsubRef.current = cleanup;
        }
        return;
      }
      try {
        const NetInfo = (await import("@react-native-community/netinfo")).default;
        if (cancelled) return;
        const state = await NetInfo.fetch();
        if (cancelled) return;
        setOffline(state.isConnected === false || state.isInternetReachable === false);
        const sub = NetInfo.addEventListener((s) => {
          if (cancelled) return;
          setOffline(s.isConnected === false || s.isInternetReachable === false);
        });
        if (cancelled) sub();
        else unsubRef.current = () => sub();
      } catch {
        // NetInfo not available — silently ignore
      }
    })();
    return () => {
      cancelled = true;
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  if (!offline) return null;

  const labels: Record<string, string> = {
    fr: "Mode hors ligne · liste sauvegardée affichée",
    en: "Offline mode · showing saved list",
    es: "Modo sin conexión · mostrando lista guardada",
    ar: "وضع عدم الاتصال · عرض القائمة المحفوظة",
  };
  const label = labels[language] ?? labels.fr;

  return (
    <View style={styles.bar} pointerEvents="none">
      <Feather name="wifi-off" size={12} color="#fff" />
      <Text style={styles.text} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#d97706",
    paddingTop: Platform.OS === "ios" ? 44 : 24,
    paddingBottom: 6,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
});
