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
import { usePremiumGate } from "@/hooks/usePremiumGate";
import { getCategoryColor } from "@/utils/categoryColors";
import { getOpenStatus } from "@/utils/openHours";
import { deriveServiceTags } from "@/utils/serviceTags";

interface ServiceCardProps {
  service: Service;
  compact?: boolean;
}

const TAG_PALETTE = {
  positive: { bg: "#EAF5F0", fg: "#1A5C42" },
  info: { bg: "#EEF2FF", fg: "#3730A3" },
  neutral: { bg: "#EDE8DF", fg: "#5C5341" },
  warn: { bg: "#FEF3C7", fg: "#92400E" },
} as const;

export function ServiceCard({ service, compact = false }: ServiceCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { t, language } = useLanguage();
  const categoryColor = getCategoryColor(service.category, colors);
  const { recordAttempt } = usePremiumGate();
  const tags = React.useMemo(
    () => deriveServiceTags(service, language === "fr" ? "fr" : "en"),
    [service, language],
  );

  async function handlePress() {
    Haptics.selectionAsync();
    const blocked = await recordAttempt();
    if (blocked) {
      router.push("/premium" as any);
      return;
    }
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
        {(() => {
          const status = getOpenStatus(service.hours);
          if (status.kind === "always") {
            return (
              <View style={styles.alwaysOpenBadge}>
                <Feather name="clock" size={10} color="#fff" />
                <Text style={styles.alwaysOpenText}>24/7</Text>
              </View>
            );
          }
          if (status.kind === "open") {
            return (
              <View style={styles.openNowBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openNowText}>{language === "fr" ? "Ouvert" : "Open"}</Text>
              </View>
            );
          }
          if (status.kind === "opens-at") {
            return (
              <View style={styles.opensAtBadge}>
                <Feather name="clock" size={10} color="#a16207" />
                <Text style={styles.opensAtText}>
                  {language === "fr" ? `Ouvre à ${status.label}` : `Opens at ${status.label}`}
                </Text>
              </View>
            );
          }
          if (status.kind === "closed") {
            return (
              <View style={styles.closedBadge}>
                <View style={styles.closedDot} />
                <Text style={styles.closedText}>{language === "fr" ? "Fermé" : "Closed"}</Text>
              </View>
            );
          }
          return null;
        })()}
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

      {tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {tags.map((tag) => {
            const palette = TAG_PALETTE[tag.tone];
            return (
              <View
                key={tag.label}
                style={[styles.tagChip, { backgroundColor: palette.bg }]}
              >
                <Text style={[styles.tagText, { color: palette.fg }]}>{tag.label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

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
  openNowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  openNowText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  opensAtBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  opensAtText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#a16207",
  },
  closedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  closedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#b91c1c",
  },
  closedText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#b91c1c",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
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
