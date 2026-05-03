import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "@/components/SafeLinearGradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "@/contexts/LanguageContext";
import { useUserProvince } from "@/contexts/UserProvinceContext";
import { type Category } from "@/data/services";
import { useServicesData } from "@/contexts/ServicesContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_ICONS, getCategoryColor } from "@/utils/categoryColors";

const ALL_CATEGORIES: Category[] = [
  "housing",
  "food",
  "mentalHealth",
  "health",
  "immigration",
  "employment",
  "family",
  "social",
  "childcare",
  "realestate",
];

function CategoryCard({ category }: { category: Category }) {
  const colors = useColors();
  const router = useRouter();
  const { t, language } = useLanguage();
  const color = getCategoryColor(category, colors);
  const icon = CATEGORY_ICONS[category];
  const { services } = useServicesData();
  const { province: userProvince } = useUserProvince();

  // La Place 0-5 is a Quebec-only government portal — only redirect QC users.
  const isExternalRedirect = category === "childcare" && userProvince === "QC";

  const serviceCount = useMemo(
    () => services.filter((s) => s.category === category).length,
    [services, category]
  );

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/results",
      params: { category, query: "" },
    });
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      onPress={handlePress}
    >
      {/* Colored top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: color }]} />

      <View style={styles.cardInner}>
        {/* Icon + badge row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.iconCircle, { backgroundColor: color + "18" }]}>
            <Feather name={icon as any} size={22} color={color} />
          </View>
          <View style={[styles.countBadge, { backgroundColor: color + "18", borderColor: color + "30" }]}>
            <Text style={[styles.countText, { color }]} numberOfLines={1}>
              {isExternalRedirect ? (language === "fr" ? "Portail" : "Portal") : serviceCount > 999 ? "999+" : serviceCount}
            </Text>
          </View>
        </View>

        {/* Name */}
        <Text
          style={[styles.catName, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {t.categories[category]}
        </Text>

        {/* Footer row */}
        <View style={styles.cardFooter}>
          <Text style={[styles.catSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {isExternalRedirect
              ? "La Place 0-5"
              : serviceCount === 1 ? t.services : t.servicesPlural}
          </Text>
          <View style={[styles.arrowBtn, { backgroundColor: color + "15" }]}>
            <Feather name={isExternalRedirect ? "external-link" : "arrow-right"} size={13} color={color} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function CategoriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { services } = useServicesData();

  const topPadding = Platform.OS === "web" ? 16 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 : insets.bottom;

  const totalServices = services.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradient header */}
      <LinearGradient
        colors={[colors.primary, "#0a5e52"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPadding + 12 }]}
      >
        <View style={styles.headerBadge}>
          <Feather name="grid" size={14} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          {language === "fr" ? "Catégories" : "Categories"}
        </Text>
        <Text style={styles.headerSub}>
          {language === "fr"
            ? `${ALL_CATEGORIES.length} catégories · ${totalServices} services disponibles`
            : `${ALL_CATEGORIES.length} categories · ${totalServices} services available`}
        </Text>
      </LinearGradient>

      <FlatList
        data={ALL_CATEGORIES}
        keyExtractor={(cat) => cat}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <CategoryCard category={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 6,
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },

  /* Grid */
  listContent: {
    padding: 14,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },

  /* Card */
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  cardInner: {
    padding: 14,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  catName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  catSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
