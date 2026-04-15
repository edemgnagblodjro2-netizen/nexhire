import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocation } from "@/contexts/LocationContext";
import { type Service } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/contexts/LanguageContext";

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function withDistance(services: Service[], lat: number, lng: number) {
  return services
    .filter((s) => s.coordinates)
    .map((s) => ({
      ...s,
      distKm: haversineKm(lat, lng, s.coordinates!.lat, s.coordinates!.lng),
    }))
    .sort((a, b) => a.distKm - b.distKm);
}

interface EmergencySection {
  subcategory: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  label: string;
  labelEn: string;
  note: string;
  noteEn: string;
}

const SECTIONS: EmergencySection[] = [
  {
    subcategory: "Centre 911",
    icon: "phone-call",
    color: "#ef4444",
    label: "Centre de dispatch 911",
    labelEn: "911 Dispatch Center",
    note: "Dispatch temps réel — police, pompiers, ambulance",
    noteEn: "Real-time dispatch — police, fire, ambulance",
  },
  {
    subcategory: "Urgence hospitalière",
    icon: "plus-square",
    color: "#7c3aed",
    label: "Hôpital d'urgence le plus proche",
    labelEn: "Nearest Emergency Hospital",
    note: "Urgences 24h/24 — trauma, chirurgie, soins intensifs",
    noteEn: "24/7 ER — trauma, surgery, intensive care",
  },
  {
    subcategory: "Service ambulancier",
    icon: "activity",
    color: "#10b981",
    label: "Service ambulancier",
    labelEn: "Ambulance Service",
    note: "Soins préhospitaliers — TAP, défibrillation, transport",
    noteEn: "Pre-hospital care — paramedics, defibrillation, transport",
  },
  {
    subcategory: "Service de police",
    icon: "shield",
    color: "#3b82f6",
    label: "Police",
    labelEn: "Police",
    note: "Urgences, crimes, sécurité publique",
    noteEn: "Emergencies, crime, public safety",
  },
  {
    subcategory: "Service des incendies",
    icon: "zap",
    color: "#f97316",
    label: "Service des incendies",
    labelEn: "Fire Department",
    note: "Incendie, sauvetage, matières dangereuses",
    noteEn: "Fire, rescue, hazardous materials",
  },
];

export default function SOSScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userLocation, locationStatus, requestLocation } = useLocation();
  const { language } = useLanguage();
  const isFr = language !== "en";

  const [locRequested, setLocRequested] = useState(false);

  useEffect(() => {
    if (locationStatus === "idle" && !locRequested) {
      setLocRequested(true);
      requestLocation();
    }
  }, [locationStatus, locRequested, requestLocation]);

  const { services } = useServicesData();

  const servicesBySection = useMemo(() => {
    return SECTIONS.map((sec) => {
      const candidates = services.filter(
        (s) => s.subcategory === sec.subcategory
      );
      if (userLocation) {
        return withDistance(candidates, userLocation.lat, userLocation.lng).slice(0, 3);
      }
      return candidates.slice(0, 3);
    });
  }, [services, userLocation]);

  function call911() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Linking.openURL("tel:911");
  }

  function callService(phone: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#b91c1c", "#ef4444"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: (Platform.OS === "web" ? 16 : insets.top) + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { Haptics.selectionAsync(); router.back(); }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isFr ? "🚨 SOS Urgences" : "🚨 SOS Emergency"}
            </Text>
            <Text style={styles.headerSub}>
              {isFr
                ? "Services d'urgence les plus proches"
                : "Nearest emergency services"}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <TouchableOpacity
          style={styles.call911Btn}
          onPress={call911}
          activeOpacity={0.85}
        >
          <Feather name="phone-call" size={28} color="#ef4444" />
          <View>
            <Text style={styles.call911Number}>📞 911</Text>
            <Text style={styles.call911Sub}>
              {isFr ? "Appeler maintenant — Urgence vitale" : "Call now — Life emergency"}
            </Text>
          </View>
        </TouchableOpacity>

        {locationStatus === "requesting" && (
          <View style={styles.locRow}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
            <Text style={styles.locText}>
              {isFr ? "Localisation en cours…" : "Finding your location…"}
            </Text>
          </View>
        )}
        {locationStatus === "granted" && userLocation && (
          <View style={styles.locRow}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.locText}>
              {isFr ? "Services triés par distance réelle" : "Services sorted by real distance"}
            </Text>
          </View>
        )}
        {locationStatus === "denied" && (
          <View style={styles.locRow}>
            <Feather name="alert-circle" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.locText}>
              {isFr ? "Localisation refusée — résultats généraux" : "Location denied — showing general results"}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {SECTIONS.map((sec, si) => {
          const items = servicesBySection[si];
          return (
            <View key={sec.subcategory} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: sec.color + "18" }]}>
                  <Feather name={sec.icon} size={18} color={sec.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    {isFr ? sec.label : sec.labelEn}
                  </Text>
                  <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>
                    {isFr ? sec.note : sec.noteEn}
                  </Text>
                </View>
              </View>

              <View style={styles.cards}>
                {items.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    {isFr ? "Aucun service disponible" : "No services available"}
                  </Text>
                ) : (
                  items.map((svc) => {
                    const dist = (svc as any).distKm as number | undefined;
                    return (
                      <Pressable
                        key={svc.id}
                        style={({ pressed }) => [
                          styles.card,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                        onPress={() => callService(svc.phone)}
                      >
                        <View style={[styles.cardAccent, { backgroundColor: sec.color }]} />

                        <View style={styles.cardContent}>
                          <Text
                            style={[styles.cardName, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {svc.name}
                          </Text>
                          <Text style={[styles.cardCity, { color: colors.mutedForeground }]}>
                            {svc.city}
                            {dist !== undefined
                              ? `  ·  ${dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}`
                              : ""}
                          </Text>
                        </View>

                        <View style={[styles.callBadge, { backgroundColor: sec.color }]}>
                          <Feather name="phone" size={14} color="#fff" />
                          <Text style={styles.callBadgeText}>{svc.phone}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          );
        })}

        <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={16} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            {isFr
              ? "⚠️ 773 des 1 112 municipalités du Québec n'ont pas de premiers répondants. En zone rurale éloignée, les délais peuvent être plus longs. Le 911 coordonne toujours la meilleure réponse disponible."
              : "⚠️ 773 of Quebec's 1,112 municipalities have no first responders. In remote rural areas, response times may be longer. 911 always coordinates the best available response."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
  },

  call911Btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  call911Number: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#ef4444",
    letterSpacing: -0.5,
  },
  call911Sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },

  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
  },

  body: {
    padding: 16,
    gap: 24,
  },

  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectionNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  cards: {
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flex: 1,
    gap: 3,
    paddingLeft: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 18,
  },
  cardCity: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  callBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  callBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
