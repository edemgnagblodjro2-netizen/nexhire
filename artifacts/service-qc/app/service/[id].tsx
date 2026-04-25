import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
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

import { useLanguage } from "@/contexts/LanguageContext";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";
import { getApiBaseUrl } from "@/lib/apiBase";
import WaitTimeWidget from "@/components/WaitTimeWidget";

async function trackServiceAction(serviceId: string, action: "view" | "call" | "click") {
  try {
    await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
  } catch {
    // Silent: tracking should never block UX
  }
}

export default function ServiceDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services } = useServicesData();

  const service = services.find((s) => s.id === id);

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (id) {
      trackServiceAction(id, "view");
    }
  }, [id]);

  if (!service) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          {t.serviceNotFound}
        </Text>
      </View>
    );
  }

  const categoryColor = getCategoryColor(service.category, colors);
  const icon = CATEGORY_ICONS[service.category] as keyof typeof Feather.glyphMap;

  function handleCall() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackServiceAction(service!.id, "call");
    Linking.openURL(`tel:${service!.phone.replace(/\s/g, "")}`);
  }

  function handleWebsite() {
    if (!service?.website) return;
    Haptics.selectionAsync();
    trackServiceAction(service.id, "click");
    Linking.openURL(service.website);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
          {t.serviceDetails}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPadding + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderLeftColor: categoryColor,
            },
          ]}
        >
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: categoryColor + "18" },
              ]}
            >
              <Feather name={icon} size={26} color={categoryColor} />
            </View>

            <View style={styles.heroMeta}>
              <View
                style={[styles.badge, { backgroundColor: categoryColor + "20" }]}
              >
                <Text style={[styles.badgeText, { color: categoryColor }]}>
                  {t.categories[service.category]}
                </Text>
              </View>
              {service.isUrgent && (
                <View
                  style={[
                    styles.urgentBadge,
                    { backgroundColor: colors.urgentLight },
                  ]}
                >
                  <Feather name="zap" size={11} color={colors.urgent} />
                  <Text style={[styles.urgentText, { color: colors.urgent }]}>
                    {t.urgent}
                  </Text>
                </View>
              )}
              {service.badgeVerified && (
                <View style={styles.verifiedBadge}>
                  <Feather name="check-circle" size={11} color="#fff" />
                  <Text style={styles.verifiedText}>Vérifié</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={[styles.name, { color: colors.foreground }]}>
            {service.name}
          </Text>
          <Text style={[styles.subcategory, { color: colors.mutedForeground }]}>
            {service.subcategory}
          </Text>
        </View>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            {t.description}
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {service.description}
          </Text>
        </View>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            {t.location}
          </Text>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={categoryColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {service.city}
              </Text>
              {service.address && (
                <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>
                  {service.address}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            {t.hours}
          </Text>
          <View style={styles.infoRow}>
            <Feather name="clock" size={16} color={categoryColor} />
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {service.hours ?? t.hoursUnavailable}
            </Text>
          </View>
        </View>

        <WaitTimeWidget serviceId={service.id} accentColor={categoryColor} />

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleCall}
            activeOpacity={0.85}
          >
            <Feather name="phone" size={20} color="#fff" />
            <View>
              <Text style={styles.actionBtnLabel}>{t.callNow}</Text>
              <Text style={styles.actionBtnSub}>{service.phone}</Text>
            </View>
          </TouchableOpacity>

          {service.website ? (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.secondary ?? colors.muted,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleWebsite}
              activeOpacity={0.85}
            >
              <Feather name="globe" size={20} color={colors.primary} />
              <View>
                <Text style={[styles.actionBtnLabel, { color: colors.primary }]}>
                  {t.visitWebsite}
                </Text>
                <Text
                  style={[
                    styles.actionBtnSub,
                    { color: colors.mutedForeground },
                  ]}
                  numberOfLines={1}
                >
                  {service.website.replace("https://", "")}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    textAlign: "center",
    marginTop: 100,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  content: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    flex: 1,
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
  },
  subcategory: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "Inter_400Regular",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  infoSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 18,
  },
  actionsSection: {
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  actionBtnSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
