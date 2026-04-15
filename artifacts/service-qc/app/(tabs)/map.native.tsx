import MapView, { Callout, Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocation } from "@/contexts/LocationContext";
import { type Service } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";

const CATEGORY_COLORS: Record<string, string> = {
  housing: "#7c3aed",
  food: "#f97316",
  mentalHealth: "#ec4899",
  health: "#10b981",
  employment: "#3b82f6",
  family: "#f59e0b",
  social: "#6366f1",
  immigration: "#0ea5e9",
  emergency: "#ef4444",
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "Tous",
  housing: "Logement",
  food: "Alimentation",
  mentalHealth: "Santé mentale",
  health: "Santé",
  employment: "Emploi",
  family: "Famille",
  social: "Social",
  immigration: "Immigration",
  emergency: "Urgence",
};

const CATEGORY_ICONS: Record<string, string> = {
  all: "map",
  housing: "home",
  food: "shopping-bag",
  mentalHealth: "heart",
  health: "plus-circle",
  employment: "briefcase",
  family: "users",
  social: "globe",
  immigration: "flag",
  emergency: "alert-triangle",
};

const QUEBEC_REGION = {
  latitude: 46.3,
  longitude: -72.6,
  latitudeDelta: 3.5,
  longitudeDelta: 3.5,
};

export default function MapScreen() {
  const colors = useColors();
  const { userLocation, requestLocation, locationStatus } = useLocation();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const modalAnim = useRef(new Animated.Value(0)).current;
  const { services } = useServicesData();

  const servicesWithCoords = useMemo(
    () => services.filter((s) => (s as any).coordinates?.lat && (s as any).coordinates?.lng),
    [services]
  );

  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(servicesWithCoords.map((s) => s.category))
    );
    return ["all", ...cats];
  }, [servicesWithCoords]);

  const filteredServices = useMemo(() => {
    if (activeCategory === "all") return servicesWithCoords;
    return servicesWithCoords.filter((s) => s.category === activeCategory);
  }, [servicesWithCoords, activeCategory]);

  const openModal = useCallback((service: Service) => {
    setSelectedService(service);
    Animated.spring(modalAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [modalAnim]);

  const closeModal = useCallback(() => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedService(null));
  }, [modalAnim]);

  const handleCall = useCallback((phone: string) => {
    const url = `tel:${phone.replace(/\s/g, "")}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir l'application téléphone.")
    );
  }, []);

  const handleLocate = useCallback(async () => {
    await requestLocation();
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        800
      );
    }
  }, [requestLocation, userLocation]);

  const handleFlyToUser = useCallback(() => {
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        800
      );
    }
  }, [userLocation]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.webFallback, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, "#0a5e52"]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Carte des services</Text>
          <Text style={styles.headerSub}>
            {filteredServices.length} services au Québec
          </Text>
        </LinearGradient>
        <View style={styles.webMessage}>
          <Feather name="smartphone" size={48} color={colors.primary} />
          <Text style={[styles.webTitle, { color: colors.foreground }]}>
            Carte disponible sur mobile
          </Text>
          <Text style={[styles.webDesc, { color: colors.mutedForeground }]}>
            La carte interactive est optimisée pour iOS et Android. Utilisez les
            onglets Services ou Catégories pour explorer les ressources.
          </Text>
          <TouchableOpacity
            style={[styles.webBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/services")}
          >
            <Feather name="list" size={18} color="#fff" />
            <Text style={styles.webBtnText}>Voir la liste des services</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const markerColor = (category: string) =>
    CATEGORY_COLORS[category] ?? "#6b7280";

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>Carte des services</Text>
        <Text style={styles.headerSub}>
          {filteredServices.length} services • Appuyez sur une épingle
        </Text>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map((cat) => {
          const active = cat === activeCategory;
          const catColor = CATEGORY_COLORS[cat] ?? colors.primary;
          const iconName = (CATEGORY_ICONS[cat] ?? "circle") as any;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? catColor : colors.card,
                  borderColor: active ? catColor : colors.border,
                },
              ]}
            >
              <Feather
                name={iconName}
                size={12}
                color={active ? "#fff" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.filterLabel,
                  { color: active ? "#fff" : colors.mutedForeground },
                ]}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={QUEBEC_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          showsScale
        >
          {filteredServices.map((service) => {
            if (!service.coordinates) return null;
            const color = markerColor(service.category);
            return (
              <Marker
                key={service.id}
                coordinate={{
                  latitude: service.coordinates.lat,
                  longitude: service.coordinates.lng,
                }}
                pinColor={color}
                onPress={() => openModal(service)}
              >
                <View style={[styles.pin, { backgroundColor: color, shadowColor: color }]}>
                  <Feather
                    name={(CATEGORY_ICONS[service.category] ?? "circle") as any}
                    size={12}
                    color="#fff"
                  />
                </View>
                <View style={[styles.pinTail, { borderTopColor: color }]} />
                <Callout tooltip>
                  <View style={styles.calloutBox}>
                    <Text style={styles.calloutName} numberOfLines={2}>
                      {service.name}
                    </Text>
                    <Text style={styles.calloutCity}>{service.city}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        <TouchableOpacity
          style={[styles.locateBtn, { backgroundColor: colors.card, shadowColor: "#000" }]}
          onPress={locationStatus === "granted" ? handleFlyToUser : handleLocate}
          activeOpacity={0.8}
        >
          <Feather
            name={locationStatus === "granted" ? "navigation" : "map-pin"}
            size={20}
            color={locationStatus === "granted" ? colors.primary : colors.mutedForeground}
          />
        </TouchableOpacity>

        <View style={[styles.legend, { backgroundColor: colors.card }]}>
          {[
            { cat: "housing", label: "Logement" },
            { cat: "food", label: "Aliment." },
            { cat: "mentalHealth", label: "Santé mentale" },
            { cat: "health", label: "Santé" },
            { cat: "emergency", label: "Urgence" },
          ].map(({ cat, label }) => (
            <View key={cat} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat] }]}
              />
              <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {selectedService && (
        <Modal transparent animationType="none" onRequestClose={closeModal}>
          <Pressable style={styles.overlay} onPress={closeModal} />
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                transform: [{ translateY: modalTranslateY }],
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetBadge,
                  {
                    backgroundColor:
                      (CATEGORY_COLORS[selectedService.category] ?? colors.primary) + "22",
                  },
                ]}
              >
                <Feather
                  name={
                    (CATEGORY_ICONS[selectedService.category] ?? "circle") as any
                  }
                  size={14}
                  color={
                    CATEGORY_COLORS[selectedService.category] ?? colors.primary
                  }
                />
                <Text
                  style={[
                    styles.sheetBadgeText,
                    {
                      color:
                        CATEGORY_COLORS[selectedService.category] ??
                        colors.primary,
                    },
                  ]}
                >
                  {CATEGORY_LABELS[selectedService.category] ??
                    selectedService.category}
                  {" · "}
                  {selectedService.subcategory}
                </Text>
              </View>
              {selectedService.isUrgent && (
                <View style={styles.urgentBadge}>
                  <Feather name="zap" size={11} color="#fff" />
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sheetName, { color: colors.foreground }]}>
              {selectedService.name}
            </Text>
            <Text style={[styles.sheetCity, { color: colors.mutedForeground }]}>
              <Feather name="map-pin" size={12} /> {selectedService.city}
            </Text>
            <Text style={[styles.sheetDesc, { color: colors.mutedForeground }]}>
              {selectedService.description}
            </Text>

            <View style={styles.sheetActions}>
              {selectedService.phone && (
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleCall(selectedService.phone!)}
                  activeOpacity={0.85}
                >
                  <Feather name="phone" size={18} color="#fff" />
                  <Text style={styles.callBtnText}>{selectedService.phone}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.detailBtn, { borderColor: colors.border }]}
                onPress={() => {
                  closeModal();
                  router.push(`/service/${selectedService.id}`);
                }}
                activeOpacity={0.85}
              >
                <Feather name="info" size={16} color={colors.mutedForeground} />
                <Text style={[styles.detailBtnText, { color: colors.mutedForeground }]}>
                  Voir la fiche complète
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    marginTop: 2,
  },
  filterBar: {
    flexGrow: 0,
    backgroundColor: "transparent",
    paddingVertical: 10,
  },
  filterContent: {
    paddingHorizontal: 14,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  mapWrapper: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
    marginTop: -1,
  },
  calloutBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    maxWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  calloutCity: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  locateBtn: {
    position: "absolute",
    bottom: 120,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
  },
  legend: {
    position: "absolute",
    bottom: 16,
    left: 16,
    borderRadius: 12,
    padding: 10,
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  sheetBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sheetBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  urgentText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  sheetName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
    lineHeight: 24,
  },
  sheetCity: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  sheetDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 18,
  },
  sheetActions: {
    gap: 10,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  callBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  webFallback: {
    flex: 1,
  },
  webMessage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  webTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  webDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  webBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  webBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
