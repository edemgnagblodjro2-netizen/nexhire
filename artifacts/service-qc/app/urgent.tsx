import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "@/contexts/LocationContext";
import { type Service } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/utils/categoryColors";
import { formatDistance, haversineDistance } from "@/utils/location";

interface ServiceWithDistance extends Service {
  distanceKm: number | null;
}

function UrgentServiceItem({ service }: { service: ServiceWithDistance }) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const categoryColor = getCategoryColor(service.category, colors);

  function handleCall() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${service.phone.replace(/[-\s]/g, "")}`);
  }

  function handleDetails() {
    Haptics.selectionAsync();
    router.push({ pathname: "/service/[id]", params: { id: service.id } });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.urgentCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.93 : 1,
        },
      ]}
      onPress={handleDetails}
    >
      <View style={[styles.categoryStripe, { backgroundColor: categoryColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text
            style={[styles.serviceName, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {service.name}
          </Text>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: colors.urgent }]}
            onPress={handleCall}
            activeOpacity={0.8}
            hitSlop={8}
          >
            <Feather name="phone" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardMeta}>
          <View
            style={[
              styles.categoryPill,
              { backgroundColor: categoryColor + "18" },
            ]}
          >
            <Text
              style={[styles.categoryPillText, { color: categoryColor }]}
              numberOfLines={1}
            >
              {t.categories[service.category]}
            </Text>
          </View>

          {service.isProvinceWide ? (
            <View
              style={[
                styles.provinceTag,
                { backgroundColor: colors.muted },
              ]}
            >
              <Feather name="globe" size={10} color={colors.mutedForeground} />
              <Text
                style={[styles.provinceTagText, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {t.provinceWide}
              </Text>
            </View>
          ) : (
            <View style={styles.locationMeta}>
              <Feather name="map-pin" size={11} color={colors.mutedForeground} />
              <Text
                style={[styles.cityText, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {service.city}
              </Text>
              {service.distanceKm !== null && (
                <Text
                  style={[styles.distanceText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  · {formatDistance(service.distanceKm)} {t.away}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function UrgentScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { userLocation, locationStatus, locationError, requestLocation } =
    useLocation();

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const { services } = useServicesData();
  const urgentServices = useMemo(() => services.filter((s) => s.isUrgent), [services]);

  const sortedServices = useMemo((): ServiceWithDistance[] => {
    const withDistance: ServiceWithDistance[] = urgentServices.map((s) => ({
      ...s,
      distanceKm:
        userLocation && !s.isProvinceWide
          ? haversineDistance(userLocation, (s as any).coordinates)
          : null,
    }));

    const physical = withDistance
      .filter((s) => !s.isProvinceWide)
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });

    const provinceWide = withDistance.filter((s) => s.isProvinceWide);

    return [...physical, ...provinceWide];
  }, [urgentServices, userLocation]);

  function handleLocate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestLocation();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.urgent, paddingTop: topPadding + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{t.urgentTitle}</Text>
          <Text style={styles.headerSub}>
            {sortedServices.length} {t.urgentSubtitle}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.alertBanner,
          {
            backgroundColor: colors.urgentLight,
            borderColor: colors.urgent + "30",
          },
        ]}
      >
        <Feather name="alert-circle" size={18} color={colors.urgent} />
        <Text style={[styles.alertText, { color: colors.urgent }]}>
          {t.urgentAlert}
          <Text style={styles.alertPhone}>911</Text>
        </Text>
      </View>

      <View
        style={[
          styles.locationBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {locationStatus === "idle" || locationStatus === "denied" ? (
          <View style={styles.locationBarRow}>
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
            <Text
              style={[styles.locationBarText, { color: colors.mutedForeground }]}
            >
              {locationStatus === "denied"
                ? t.locationDeniedText
                : t.nearestFirst}
            </Text>
            <TouchableOpacity
              style={[
                styles.locateBtn,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleLocate}
              activeOpacity={0.85}
            >
              <Feather name="navigation" size={13} color="#fff" />
              <Text style={styles.locateBtnText}>{t.locateMe}</Text>
            </TouchableOpacity>
          </View>
        ) : locationStatus === "requesting" ? (
          <View style={styles.locationBarRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.locationBarText, { color: colors.mutedForeground }]}>
              {t.locating}
            </Text>
          </View>
        ) : (
          <View style={styles.locationBarRow}>
            <Feather name="navigation" size={16} color={colors.primary} />
            <Text style={[styles.locationBarText, { color: colors.primary }]}>
              {t.locationGranted}
            </Text>
            <TouchableOpacity onPress={handleLocate} hitSlop={8}>
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={sortedServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPadding + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <UrgentServiceItem service={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 20,
  },
  alertPhone: {
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  locationBar: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locationBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationBarText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  locateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  locateBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  list: { padding: 16, paddingTop: 12, gap: 0 },
  urgentCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryStripe: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  serviceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    flexShrink: 0,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  metaRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  locationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cityText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  provinceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  provinceTagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
