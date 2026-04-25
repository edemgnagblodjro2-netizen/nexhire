import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useLanguage } from "@/contexts/LanguageContext";
import type { Service } from "@/data/services";
import { useColors } from "@/hooks/useColors";
import { getCategoryColor } from "@/utils/categoryColors";

interface ServiceCardProps {
  service: Service;
  compact?: boolean;
}

export function ServiceCard({ service, compact = false }: ServiceCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const categoryColor = getCategoryColor(service.category, colors);

  function handlePress() {
    Haptics.selectionAsync();
    router.push({
      pathname: "/service/[id]",
      params: { id: service.id },
    });
  }

  function handleCall() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${service.phone.replace(/\s/g, "")}`);
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColor + "20" },
          ]}
        >
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {t.categories[service.category]}
          </Text>
        </View>
        {service.isUrgent && (
          <View
            style={[styles.urgentBadge, { backgroundColor: colors.urgentLight }]}
          >
            <Feather name="zap" size={10} color={colors.urgent} />
            <Text style={[styles.urgentText, { color: colors.urgent }]}>
              {t.urgent}
            </Text>
          </View>
        )}
        {(service.hours?.includes("24h/24") || service.hours?.includes("24/7")) && (
          <View style={styles.alwaysOpenBadge}>
            <Feather name="clock" size={10} color="#fff" />
            <Text style={styles.alwaysOpenText}>24/7</Text>
          </View>
        )}
        {service.badgeVerified && (
          <View style={styles.verifiedBadge}>
            <Feather name="check-circle" size={10} color="#fff" />
            <Text style={styles.verifiedText}>Vérifié</Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.name, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {service.name}
      </Text>

      {!compact && (
        <Text
          style={[styles.description, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {service.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.cityRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.city, { color: colors.mutedForeground }]}>
            {service.city}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: colors.primary }]}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <Feather name="phone" size={13} color="#fff" />
          <Text style={styles.callText}>{service.phone}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  urgentText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  alwaysOpenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  alwaysOpenText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  city: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  callText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
});
